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
	await page.locator("#target").evaluate((el) => {
		const range = document.createRange();
		range.setStart(el.firstChild, el.firstChild.length);
		range.collapse(true);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	});
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

async function setupEditableBody(markup) {
	await page.setContent(`<!doctype html><body>${markup}</body>`);
	await page.evaluate(async () => {
		const edit = await import("/client/posts/edit.js");
		edit.start_edit(document.body, true);
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

async function dispatchShortcut(selector, key) {
	await page.locator(selector).dispatchEvent("keydown", {
		key: key,
		ctrlKey: true,
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
