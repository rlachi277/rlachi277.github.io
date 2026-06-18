import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import {after, before, beforeEach, test} from "node:test";
import {chromium} from "playwright";

const root = process.cwd();
let server;
let baseUrl;
let browser;
let page;

before(async () => {
	server = http.createServer(serveStaticFile);
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const {port} = server.address();
	baseUrl = `http://127.0.0.1:${port}`;
	browser = await chromium.launch();
});

after(async () => {
	await page?.close();
	await browser?.close();
	await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
	await page?.close();
	page = await browser.newPage();
	await page.goto(`${baseUrl}/blank.html`);
});

test("Ctrl+B formats a browser selection and marks the paragraph edited", async () => {
	await setupEditableBody("<p id=\"target\">hello world</p>");
	await selectText("#target", 0, 5);
	await dispatchShortcut("#target", "b");
	await page.locator("#target").dispatchEvent("blur");

	const result = await page.locator("#target").evaluate((el) => ({
		html: el.innerHTML,
		edited: el.classList.contains("edited")
	}));
	assert.equal(result.html, "<strong>hello</strong> world");
	assert.equal(result.edited, true);
});

test("formatting inside a colorbox preserves the colorbox wrapper", async () => {
	await setupEditableBody("<p id=\"target\"><span class=\"colorbox c3\">box</span></p>");
	await selectText("#target span", 0, 3);
	await dispatchShortcut("#target", "b");
	await page.locator("#target").dispatchEvent("blur");

	const html = await page.locator("#target").evaluate((el) => el.innerHTML);
	assert.match(html, /class="colorbox c3"/);
	assert.doesNotMatch(html, /class="color cbox3"/);
	assert.match(html, /<strong>/);
});

test("Tab symbol shortcuts mark the editable as changed", async () => {
	await setupEditableBody("<p id=\"target\">].</p>");
	await placeCursor("#target");
	await page.locator("#target").dispatchEvent("keydown", {
		key: "Tab",
		bubbles: true,
		cancelable: true
	});

	const result = await page.locator("#target").evaluate((el) => ({
		text: el.textContent,
		edited: el.classList.contains("edited")
	}));
	assert.equal(result.text, "·");
	assert.equal(result.edited, true);
});

test("Tab bracket shortcut formats text and marks the editable as changed", async () => {
	await setupEditableBody("<p id=\"target\">[hello]b</p>");
	await placeCursor("#target");
	await page.locator("#target").dispatchEvent("keydown", {
		key: "Tab",
		bubbles: true,
		cancelable: true
	});
	await page.locator("#target").dispatchEvent("blur");

	const result = await page.locator("#target").evaluate((el) => ({
		html: el.innerHTML,
		edited: el.classList.contains("edited")
	}));
	assert.equal(result.html, "<strong>hello</strong>");
	assert.equal(result.edited, true);
});

test("Ctrl+K creates links from link text and display text", async () => {
	await setupEditableBody("<p id=\"target\">/posts/next.html|Next post</p>");
	await selectText("#target", 0, "/posts/next.html|Next post".length);
	await dispatchShortcut("#target", "k");
	await page.locator("#target").dispatchEvent("blur");

	const result = await page.locator("#target").evaluate((el) => ({
		html: el.innerHTML,
		edited: el.classList.contains("edited")
	}));
	assert.equal(result.html, "<a href=\"/posts/next.html\">Next post</a>");
	assert.equal(result.edited, true);
});

test("Ctrl+Z and Ctrl+Shift+Z undo and redo inline formatting", async () => {
	await setupEditableBody("<p id=\"target\">hello world</p>");
	await selectText("#target", 0, 5);
	await dispatchShortcut("#target", "b");
	await dispatchShortcut("#target", "z");

	let html = await page.locator("#target").evaluate((el) => el.innerHTML);
	assert.equal(html, "hello world");

	await dispatchShortcut("#target", "z", {shiftKey: true});
	html = await page.locator("#target").evaluate((el) => el.innerHTML);
	assert.equal(html, "<strong>hello</strong> world");
});

test("Ctrl+Backspace marks paragraphs as pending deletion", async () => {
	await setupEditableBody("<p id=\"target\">delete me</p>");
	await page.locator("#target").dispatchEvent("keydown", {
		key: "Backspace",
		ctrlKey: true,
		bubbles: true,
		cancelable: true
	});

	const deleted = await page.locator("#target").evaluate((el) => el.classList.contains("deleted"));
	assert.equal(deleted, true);
});

test("dialog setup opens, awaits actions, and resets danger state", async () => {
	await page.setContent(`<!doctype html><body>
		<dialog id="dialog">
			<h6 id="dialog-title"></h6>
			<div id="dialog-main"></div>
			<button id="dialog-confirm">확인</button>
		</dialog>
	</body>`);

	const result = await page.evaluate(async () => {
		const {setupDialog, dialog} = await import("/client/posts/dialog.js");
		setupDialog();

		let calls = 0;
		dialog("Danger", "<p>Body</p>", async () => {
			calls++;
			return calls === 2;
		}, true)();

		const el = document.getElementById("dialog");
		const confirm = document.getElementById("dialog-confirm");
		const titleBefore = document.getElementById("dialog-title").textContent;
		const mainBefore = document.getElementById("dialog-main").innerHTML;
		const dangerousBefore = confirm.classList.contains("danger");

		confirm.click();
		await new Promise((resolve) => setTimeout(resolve, 10));
		const openAfterFalse = el.open;

		confirm.click();
		await new Promise((resolve) => setTimeout(resolve, 10));

		return {
			titleBefore: titleBefore,
			mainBefore: mainBefore,
			dangerousBefore: dangerousBefore,
			openAfterFalse: openAfterFalse,
			openAfterTrue: el.open,
			titleAfterClose: document.getElementById("dialog-title").textContent,
			mainAfterClose: document.getElementById("dialog-main").innerHTML,
			dangerousAfterClose: confirm.classList.contains("danger"),
			calls: calls
		};
	});

	assert.equal(result.titleBefore, "Danger");
	assert.equal(result.mainBefore, "<p>Body</p>");
	assert.equal(result.dangerousBefore, true);
	assert.equal(result.openAfterFalse, true);
	assert.equal(result.openAfterTrue, false);
	assert.equal(result.titleAfterClose, "");
	assert.equal(result.mainAfterClose, "");
	assert.equal(result.dangerousAfterClose, false);
	assert.equal(result.calls, 2);
});

async function setupEditableBody(markup) {
	await page.setContent(`<!doctype html><body>${markup}</body>`);
	await page.evaluate(async () => {
		const edit = await import("/client/posts/edit.js");
		edit.startEdit(document.body, true);
	});
}

async function selectText(selector, start, end) {
	await page.locator(selector).evaluate((el, rangeInfo) => {
		const range = document.createRange();
		range.setStart(el.firstChild, rangeInfo.start);
		range.setEnd(el.firstChild, rangeInfo.end);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	}, {start, end});
}

async function placeCursor(selector) {
	await page.locator(selector).evaluate((el) => {
		const lastChild = el.lastChild;
		const range = document.createRange();
		range.setStart(lastChild, lastChild.textContent.length);
		range.collapse(true);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	});
}

async function dispatchShortcut(selector, key, options = {}) {
	await page.locator(selector).dispatchEvent("keydown", {
		key: key,
		ctrlKey: true,
		shiftKey: options.shiftKey ?? false,
		bubbles: true,
		cancelable: true
	});
}

async function serveStaticFile(req, res) {
	const pathname = new URL(req.url, "http://127.0.0.1").pathname;
	if (pathname === "/blank.html") {
		res.writeHead(200, {"Content-Type": "text/html"});
		res.end("<!doctype html><html><body></body></html>");
		return;
	}

	const filePath = path.join(root, pathname);
	if (!filePath.startsWith(root)) {
		res.writeHead(403);
		res.end();
		return;
	}

	try {
		const data = await fs.readFile(filePath);
		res.writeHead(200, {"Content-Type": contentType(filePath)});
		res.end(data);
	} catch {
		res.writeHead(404);
		res.end();
	}
}

function contentType(filePath) {
	if (filePath.endsWith(".js")) return "text/javascript";
	if (filePath.endsWith(".css")) return "text/css";
	if (filePath.endsWith(".html")) return "text/html";
	return "application/octet-stream";
}
