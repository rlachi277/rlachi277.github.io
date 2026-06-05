import { q$, $ } from "/client/jquery.js";
import { serialize, deserialize } from "./seri.js";
import { dialog } from "./dialog.js";
import {
	clearInlineHistory,
	normalizeEditable,
	redoInline,
	runInlineCommand,
	tabCommand,
	undoInline
} from "./edit-inline.js";

const EDIT_NODE = Object.freeze({
	DETAILS: 6,
	LIST: 5,
	LI: 4,
	EDITABLE: 3,
	CONTAINER: 2,
	UNIT: 1,
	NONE: 0
});

const EDITABLE_TAGS = new Set([
	"H1", "H2", "H3", "H4", "H5", "H6",
	"P", "FIGCAPTION", "LEGEND",
	"STRONG", "EM", "B", "I", "U",
	"RUBY", "RT", "RP",
	"SUB", "SUP", "INS", "DEL",
	"SUMMARY", "A", "BUTTON"
]);

const UNIT_TAGS = new Set([
	"HGROUP", "IMG", "AUDIO", "VIDEO",
	"FIGURE", "HR", "BR",
	"TRACK", "SOURCE", "NAV"
]);

const CONTAINER_TAGS = new Set(["SECTION", "ARTICLE", "FIELDSET"]);
const LIST_TAGS = new Set(["UL", "OL"]);
const CONTENTEDITABLE_VALUE = "plaintext-only";
const PATCH_HEADERS = {"Content-type": "application/json"};
const PARAGRAPH_EDIT_SELECTOR = "p:not(hgroup p)";

let editingRoot = null;
let nextEditId = null;
let positionMap = null;
let originalContentMap = null;
let positionStack = [];

export function start_edit(el, init) {
	if (el.nodeName === "#text") {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return false;
	}
	if (el.nodeName.startsWith("#")) return undefined;
	if (el.classList.contains("new")) return undefined;

	let type = editableTypeFor(el, init);
	if (type == null) return undefined;
	if (el.nodeName === "FIELDSET" && el.matches("fieldset:has(> legend)")) type = EDIT_NODE.DETAILS;
	if (el.nodeName === "FIELDSET" && el.getAttribute("data-old") != null) {
		el.querySelectorAll(".container-bar, .middle-bar").forEach((e) => e.remove());
		el.removeAttribute("data-old");
	}
	type = applyEditClasses(el, type);

	walkEditableChildren(el);
	positionMap.set(el, Array.from(positionStack));
	if (type === EDIT_NODE.EDITABLE) registerEditableElement(el);
	return true;
}

function editableTypeFor(el, init) {
	switch (el.nodeName) {
	case "BODY":
		if (init) startEditSession(el);
		return EDIT_NODE.NONE;
	case "LI":
		return EDIT_NODE.LI;
	case "DETAILS":
		return EDIT_NODE.DETAILS;
	default:
		if (LIST_TAGS.has(el.nodeName)) return EDIT_NODE.LIST;
		if (EDITABLE_TAGS.has(el.nodeName)) return EDIT_NODE.EDITABLE;
		if (CONTAINER_TAGS.has(el.nodeName)) return EDIT_NODE.CONTAINER;
		if (UNIT_TAGS.has(el.nodeName)) return EDIT_NODE.UNIT;
		if (el.classList.contains("columns")) return EDIT_NODE.CONTAINER;
		if (el.classList.contains("color") || el.classList.contains("colorbox")) return EDIT_NODE.EDITABLE;
		return null;
	}
}

function startEditSession(root) {
	if (editingRoot != null && editingRoot !== root) stop_edit();
	editingRoot = root;
	nextEditId = 0;
	positionMap = new WeakMap();
	originalContentMap = new WeakMap();
}

function applyEditClasses(el, type) {
	if (el.getAttribute("data-old") != null) return type;

	if (type === EDIT_NODE.DETAILS) {
		if (!el.closest("li")) markContainer(el, false, true);
	} else if (type === EDIT_NODE.LIST) {
		markContainer(el, true, !el.parentElement?.closest("ul, ol, dir, menu"));
	} else if (type === EDIT_NODE.LI) {
		markListItem(el);
	} else {
		if (el.closest(".editable") && type != EDIT_NODE.CONTAINER) type = EDIT_NODE.UNIT;

		if (type === EDIT_NODE.EDITABLE) {
			el.classList.add("editable");
			if (!el.closest(".unit")) el.classList.add("unit");
		} else if (type === EDIT_NODE.CONTAINER) {
			markContainer(el, true, true);
		} else if (type === EDIT_NODE.UNIT && !el.closest(".unit")) {
			el.classList.add("unit");
		}
	}

	el.setAttribute("data-old", true);
	return type;
}

function markContainer(el, includeFirstBar, includeLastBar) {
	el.classList.add("container");
	if (includeFirstBar) prependMarker(el, "container-bar", "first-bar");
	if (includeLastBar) prependMarker(el, "container-bar", "last-bar");
	prependMarker(el, "middle-bar");
}

function markListItem(el) {
	if (!el.closest(".editable")) el.classList.add("editable");
	if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) {
		el.classList.add("unit");
	}
	if (
		el.childNodes.length === 1 &&
		el.firstChild.nodeType === Node.ELEMENT_NODE &&
		el.firstChild.tagName === "DETAILS"
	) {
		el.classList.add("unit");
	}
}

function prependMarker(el, ...classes) {
	const marker = document.createElement("span");
	marker.classList.add(...classes);
	el.prepend(marker);
}

function walkEditableChildren(el) {
	let childIndex = 0;
	el.childNodes.forEach((child) => {
		positionStack.push(childIndex);
		const childWasSerializable = start_edit(child);
		if (childWasSerializable != undefined) childIndex++;
		positionStack.pop();
	});
}

function registerEditableElement(el) {
	originalContentMap.set(el, JSON.stringify(serialize(el)));
	if (el.getAttribute("data-id") != null) return;

	el.setAttribute("data-id", nextEditId++);
	el.setAttribute("contenteditable", CONTENTEDITABLE_VALUE);
	el.addEventListener("keydown", onEditableKeydown);
	el.addEventListener("input", onEditableInput);
	el.addEventListener("blur", onEditableBlur);
}

function onEditableKeydown(e) {
	if (e.isComposing) return;

	if (e.key === "Enter" && !e.shiftKey) {
		handleSubmitKey(e);
		return;
	}
	if (e.key === "Escape") {
		handleCancelKey(e);
		return;
	}
	if (hasShortcutModifier(e) && e.key == "Backspace") {
		handleParagraphDeleteKey(e);
		return;
	}
	if (hasShortcutModifier(e) && (e.key == "ArrowUp" || e.key == "ArrowDown")) {
		handleParagraphInsertKey(e);
		return;
	}
	if (hasShortcutModifier(e)) {
		handleShortcutCommand(e);
		return;
	}
	if (e.key === "Tab") {
		tabCommand(e, onEditableInput);
		return;
	}

	clearInlineHistory();
}

function handleSubmitKey(e) {
	e.preventDefault();
	if (e.target.classList.contains("deleted")) {
		submit_delete(e.target);
		return;
	}
	if (e.target.classList.contains("new")) {
		submit_new(e.target);
		return;
	}
	if (manageConfirm(e.target, "will-submit", "will-cancel")) submit_changes(e.target);
}

function handleCancelKey(e) {
	e.preventDefault();
	if (e.target.classList.contains("deleted")) {
		e.target.classList.remove("deleted");
		return;
	}
	if (e.target.classList.contains("new")) {
		e.target.remove();
		return;
	}
	if (!manageConfirm(e.target, "will-cancel", "will-submit")) return;
	restoreOriginalContent(e.target);
	e.target.blur();
}

function handleParagraphDeleteKey(e) {
	e.preventDefault();
	if (!e.target.matches(PARAGRAPH_EDIT_SELECTOR)) return;
	e.target.classList.add("deleted");
}

function handleParagraphInsertKey(e) {
	e.preventDefault();
	if (!e.target.matches(PARAGRAPH_EDIT_SELECTOR)) return;
	const paragraph = createEditableParagraph();
	const position = (e.key == "ArrowUp") ? "beforebegin" : "afterend";
	e.target.insertAdjacentElement(position, paragraph);
}

function handleShortcutCommand(e) {
	const command = shortcutCommandFor(e);
	if (command == null) return;
	if (command === "undo") {
		if (undoInline(e.target)) e.preventDefault();
		return;
	}
	if (command === "redo") {
		if (redoInline(e.target)) e.preventDefault();
		return;
	}
	runInlineCommand(e, command, onEditableInput);
}

function shortcutCommandFor(e) {
	if (e.key === "b") return "strong";
	if (e.key === "u") return "em";
	if (e.key === ".") return "sup";
	if (e.key === ",") return "sub";
	if (e.key === "d") return "del";
	if (e.key === "e") return "ins";
	if (e.key === "k") return "a";
	if (e.key === "z" && e.shiftKey) return "redo";
	if (e.key === "z") return "undo";
	if ("0" <= e.key && e.key <= "9") return `color${e.key}`;
	return null;
}

function createEditableParagraph() {
	const paragraph = document.createElement("p");
	paragraph.classList.add("editable", "new");
	paragraph.setAttribute("contenteditable", CONTENTEDITABLE_VALUE);
	paragraph.addEventListener("keydown", onEditableKeydown);
	paragraph.addEventListener("input", onEditableInput);
	paragraph.addEventListener("blur", onEditableBlur);
	return paragraph;
}

function restoreOriginalContent(el) {
	el.innerHTML = deserialize(JSON.parse(originalContentMap.get(el)), window.location.pathname, true);
}

function hasShortcutModifier(e) {
	return e.ctrlKey || e.metaKey;
}

function manageConfirm(el, confirmClass, stopClass) {
	if (el.classList.contains(confirmClass)) return true;

	if ($(`.${stopClass}`).length !== 0) {
		$(`.${stopClass}`).removeClass(stopClass);
		return false;
	}
	if (!el.classList.contains("edited") && !el.classList.contains("deleted")) return false;

	$(`.${confirmClass}`).removeClass(confirmClass);
	el.classList.add(confirmClass);
	return false;
}

function onEditableInput(e) {
	e.target.classList.add("edited");
	if (e.target.innerHTML === "<br>" || e.target.innerHTML === "\n") e.target.innerHTML = "";
}

function onEditableBlur(e) {
	$(".will-submit").removeClass("will-submit");
	$(".will-cancel").removeClass("will-cancel");
	e.target.querySelectorAll(".select-marker").forEach((marker) => marker.remove());
	normalizeEditable(e.target);
	clearInlineHistory();
	if (JSON.stringify(serialize(e.target)) === originalContentMap.get(e.target)) {
		e.target.classList.remove("edited");
	}
}

function submit(el, shouldSerialize, splice) {
	el.innerHTML = el.innerHTML.replaceAll("\n", "<br>");
	if (el.lastChild?.nodeName === "BR") el.removeChild(el.lastChild);
	document.activeElement.blur();

	const pos = positionMap.get(el);
	const newData = shouldSerialize ? serialize(el) : undefined;
	patchPost({
		pos: pos,
		data: newData,
		splice: splice
	});
	originalContentMap.set(el, JSON.stringify(newData));
}

function patchPost(payload) {
	fetch(window.location.pathname, {
		method: "PATCH",
		headers: PATCH_HEADERS,
		body: JSON.stringify(payload)
	});
}

function submit_changes(el) {
	submit(el, true, 1);
	el.classList.remove("edited");
}

function submit_delete(el) {
	submit(el, false, 1);
	const parent = el.parentElement;
	positionStack = Array.from(positionMap.get(parent));
	el.remove();
	start_edit(parent);
}

function submit_new(el) {
	el.classList.remove("new", "edited");
	positionStack = Array.from(positionMap.get(el.parentElement));
	start_edit(el.parentElement);
	submit(el, true, 0);
}

export function submit_all() {
	document.activeElement.blur();
	q$(".edited").forEach((e) => submit_changes(e));
	q$(".new").forEach((e) => submit_new(e));
	q$(".deleted").forEach((e) => submit_delete(e));
}

export function stop_edit() {
	submit_all();
	q$(".editable").forEach((el) => {
		el.removeAttribute("data-id");
		el.removeAttribute("contenteditable");
		el.removeEventListener("keydown", onEditableKeydown);
		el.removeEventListener("input", onEditableInput);
		el.removeEventListener("blur", onEditableBlur);
		el.classList.remove("editable");
	});
	editingRoot = null;
	nextEditId = null;
	positionMap = null;
	originalContentMap = null;
}

window.addEventListener("beforeunload", (e) => {
	if ($(".edited").length != 0 || $(".new").length != 0) e.preventDefault();
});

let targetingAbort = null;
let newElementFactory = null;
let insertWithHeader = null;

function startTargeting(callback) {
	if (targetingAbort != null) stop_targeting();
	document.body.classList.add("targeting");
	targetingAbort = new AbortController();

	for (const el of document.getElementsByClassName("unit")) {
		if (el.classList.contains("editable")) el.removeAttribute("contenteditable");
	}

	addTargetListeners("unit", (el, event) => {
		event.preventDefault();
		callback(el);
	});
	addTargetListeners("first-bar", (_, event) => {
		event.preventDefault();
		callback(event.currentTarget.parentElement, true);
	});
	addTargetListeners("last-bar", (_, event) => {
		event.preventDefault();
		callback(event.currentTarget.parentElement);
	});

	document.addEventListener("keydown", (e) => {
		if (e.key == "Escape") stop_targeting();
	}, {signal: targetingAbort.signal});
}

function addTargetListeners(className, handler) {
	for (const el of document.getElementsByClassName(className)) {
		el.addEventListener("click", (event) => {
			handler(el, event);
			stop_targeting();
		}, {signal: targetingAbort.signal});
	}
}

export function stop_targeting() {
	document.body.classList.remove("targeting");
	for (const el of document.getElementsByClassName("unit")) {
		if (el.classList.contains("editable")) {
			el.setAttribute("contenteditable", CONTENTEDITABLE_VALUE);
		}
	}
	targetingAbort?.abort();
	targetingAbort = null;
	document.activeElement.blur();
}

function insert_element(after, isFirst) {
	if (after.nextSibling?.tagName === "NAV") after = after.nextSibling;
	if (newElementFactory == null) return;

	const newElement = newElementFactory instanceof Function
		? newElementFactory(after, isFirst)
		: document.createElement(newElementFactory);
	if (newElement == undefined) return; // TODO: 경고

	if (isFirst) {
		after.insertAdjacentElement("afterbegin", newElement);
		if (insertWithHeader) newElement.append(header(newElement, true));
		positionStack = Array.from(positionMap.get(after));
		start_edit(after);
	} else {
		after.insertAdjacentElement("afterend", newElement);
		if (insertWithHeader) newElement.append(header(newElement, true));
		const parent = after.parentElement;
		positionStack = Array.from(positionMap.get(parent));
		start_edit(parent);
	}

	const pos = positionMap.get(newElement);
	const newData = serialize(newElement);
	patchPost({
		pos: pos,
		data: newData,
		splice: 0
	});
	originalContentMap.set(newElement, JSON.stringify(newData));
}

function delete_element(target, isFirst) {
	if (target.nextSibling?.tagName === "NAV" || target.tagName === "NAV") return;

	const parent = target.parentElement;
	const pos = positionMap.get(target);
	patchPost({
		pos: pos,
		data: undefined,
		splice: 1
	});
	target.remove();
	start_edit(parent);
}

export function header(after, isFirst) {
	const parent = isFirst ? after : after.parentElement;
	if (parent === document.body || parent.firstChild === document.body) {
		return document.createElement("h1");
	}

	let depth = 1;
	let el = parent;
	while (el != document.body) {
		if (el.matches("section, article, fieldset, .columns")) depth++;
		el = el.parentElement;
	}
	return document.createElement(`h${Math.min(depth, 6)}`);
}

export function menu_insert(el, addHeader) {
	return function startInsertTargeting() {
		newElementFactory = el;
		insertWithHeader = addHeader;
		startTargeting(insert_element);
	};
}

export function menu_delete() {
	startTargeting((target, isFirst) => {
		dialog("요소 삭제", `
			이 &lt;${target.nodeName.toLowerCase()}&gt; 요소를 삭제하시겠습니까?<br>
			이 작업은 되돌릴 수 없습니다.
		`, () => {
			delete_element(target, isFirst);
			return true;
		}, true)();
	});
}
