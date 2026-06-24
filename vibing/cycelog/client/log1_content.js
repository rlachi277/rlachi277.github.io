import { showWarning } from "../posts/dialog.js";
import { patchLog1 } from "./log1_api.js";

const selection = window.getSelection();
const SYMBOLS = {".": "·", "st": "★"};

let focusOnCell = null;

export function setupContentEditing(focusOn) {
	focusOnCell = focusOn;
}

export async function contentClickHandler($event) {
	const event = $event.originalEvent ?? $event;
	const id = parseInt(event.target.parentElement.getAttribute("data-id"));
	focusOnCell?.(id, 3, true);
	event.target.setAttribute("contenteditable", "plaintext-only");
	if (!event.target.contains(selection.anchorNode)) {
		selection.selectAllChildren(event.target);
		selection.collapseToEnd();
	}
}

export async function contentKeydownHandler($event) {
	const event = $event.originalEvent ?? $event;
	if (event.target.getAttribute("contenteditable") !== "plaintext-only") return;
	if (event.key === "Enter") {
		event.preventDefault();
		event.stopPropagation();
		submitContent(event.target);
		return;
	}
	if (event.key === "Escape") {
		event.preventDefault();
		event.stopPropagation();
		cancelContent(event.target);
		selection.removeAllRanges();
		return;
	}
	if (event.key !== "Tab") return;

	event.preventDefault();
	if (!selection.isCollapsed) return;
	if (selection.anchorNode.nodeType !== Node.TEXT_NODE) return;
	const text = event.target.textContent.substring(0, selection.anchorOffset);
	const cmd = text.match(/\]([^\]]*)\]$/)?.[1];
	if (cmd == undefined || !Object.hasOwn(SYMBOLS, cmd)) {
		showWarning("잘못된 기호 명령어입니다.");
		return;
	}

	const range = document.createRange();
	range.setStart(selection.anchorNode, selection.anchorOffset - (cmd.length + 2));
	range.setEnd(selection.anchorNode, selection.anchorOffset);
	range.deleteContents();
	range.insertNode(document.createTextNode(SYMBOLS[cmd]));

	selection.removeAllRanges();
	selection.addRange(range);
	selection.collapseToEnd();

	event.target.normalize();
	contentInputHandler(event);
}

export async function contentInputHandler($event) {
	const event = $event.originalEvent ?? $event;
	event.target.classList.add("log1-edited");
}

async function submitContent(target) {
	const id = parseInt(target.parentElement.getAttribute("data-id"));
	if (target.getAttribute("contenteditable") !== "plaintext-only") return false;
	target.classList.remove("log1-edited");
	target.removeAttribute("contenteditable");
	const content = target.textContent;
	try {
		await patchLog1({id: id, content: content});
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

async function cancelContent(target) {
	const id = parseInt(target.parentElement.getAttribute("data-id"));
	if (target.getAttribute("contenteditable") !== "plaintext-only") return false;
	target.classList.remove("log1-edited");
	target.removeAttribute("contenteditable");
	try {
		const data = await patchLog1({id: id}, true);
		target.textContent = data.content;
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}
