import { q$, $ } from "/client/jquery.js";
import { serialize, deserialize, getColor } from "./seri.js";
import { dialog } from "./script.js";

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
const COMMAND_CANCELLED = -1;
const KEEP_COMMAND = "keep";
const TEXT_COMMAND = "text";
const SELECT_MARKER_CLASS = "select-marker";
const SUB_EDITABLE_TAGS = new Set(["STRONG", "EM", "SUP", "SUB", "INS", "DEL"]);

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
	type = normalizeFieldsetType(el, type);
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
		return editableFallbackType(el);
	}
}

function editableFallbackType(el) {
	if (LIST_TAGS.has(el.nodeName)) return EDIT_NODE.LIST;
	if (EDITABLE_TAGS.has(el.nodeName)) return EDIT_NODE.EDITABLE;
	if (CONTAINER_TAGS.has(el.nodeName)) return EDIT_NODE.CONTAINER;
	if (UNIT_TAGS.has(el.nodeName)) return EDIT_NODE.UNIT;
	if (el.classList.contains("columns")) return EDIT_NODE.CONTAINER;
	if (el.classList.contains("color") || el.classList.contains("colorbox")) return EDIT_NODE.EDITABLE;
	return null;
}

function startEditSession(root) {
	if (editingRoot != null && editingRoot !== root) stop_edit();
	editingRoot = root;
	nextEditId = 0;
	positionMap = new WeakMap();
	originalContentMap = new WeakMap();
}

function normalizeFieldsetType(el, type) {
	let normalizedType = type;
	if (el.nodeName === "FIELDSET" && el.matches("fieldset:has(> legend)")) {
		normalizedType = EDIT_NODE.DETAILS;
	}
	if (el.nodeName === "FIELDSET" && el.getAttribute("data-old") != null) {
		el.querySelectorAll(".container-bar, .middle-bar").forEach((e) => e.remove());
		el.removeAttribute("data-old");
	}
	return normalizedType;
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
		type = markRegularElement(el, type);
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
	if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.ELEMENT_NODE && el.firstChild.tagName === "DETAILS") {
		el.classList.add("unit");
	}
}

function markRegularElement(el, type) {
	let adjustedType = type;
	if (el.closest(".editable") && adjustedType != EDIT_NODE.CONTAINER) adjustedType = EDIT_NODE.UNIT;

	if (adjustedType === EDIT_NODE.EDITABLE) {
		el.classList.add("editable");
		if (!el.closest(".unit")) el.classList.add("unit");
	} else if (adjustedType === EDIT_NODE.CONTAINER) {
		markContainer(el, true, true);
	} else if (adjustedType === EDIT_NODE.UNIT && !el.closest(".unit")) {
		el.classList.add("unit");
	}

	return adjustedType;
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
	el.addEventListener("keydown", on_editable_keydown);
	el.addEventListener("input", on_editable_input);
	el.addEventListener("blur", on_editable_blur);
}

function on_editable_keydown(e) {
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
		tab_command(e);
		return;
	}

	clearHistory();
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
	if (manage_confirm(e.target, "will-submit", "will-cancel")) submit_changes(e.target);
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
	if (!manage_confirm(e.target, "will-cancel", "will-submit")) return;
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
	const newParagraph = createEditableParagraph();
	const position = (e.key == "ArrowUp") ? "beforebegin" : "afterend";
	e.target.insertAdjacentElement(position, newParagraph);
}

function handleShortcutCommand(e) {
	const command = shortcutCommandFor(e);
	if (command == null) return;
	if (command === "undo") {
		if (undo(e.target)) e.preventDefault();
		return;
	}
	if (command === "redo") {
		if (redo(e.target)) e.preventDefault();
		return;
	}
	try {
		run_command(e, command);
	} catch (error) {
		if (error !== COMMAND_CANCELLED) throw error;
	}
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
	paragraph.classList.add("editable");
	paragraph.classList.add("new");
	paragraph.setAttribute("contenteditable", CONTENTEDITABLE_VALUE);
	paragraph.addEventListener("keydown", on_editable_keydown);
	paragraph.addEventListener("input", on_editable_input);
	paragraph.addEventListener("blur", on_editable_blur);
	return paragraph;
}

function undo(el) {
	if (undoBuffer.length === 0) return false;
	redoBuffer.push(serialize(el));
	el.innerHTML = deserialize(undoBuffer.pop(), window.location.pathname, true);
	return true;
}

function redo(el) {
	if (redoBuffer.length === 0) return false;
	undoBuffer.push(serialize(el));
	el.innerHTML = deserialize(redoBuffer.pop(), window.location.pathname, true);
	return true;
}

function restoreOriginalContent(el) {
	el.innerHTML = deserialize(JSON.parse(originalContentMap.get(el)), window.location.pathname, true);
}

function hasShortcutModifier(e) {
	return e.ctrlKey || e.metaKey;
}

function clearHistory() {
	undoBuffer = [];
	redoBuffer = [];
}

function manage_confirm(el, confirm_class, stop_class) {
	if (!el.classList.contains(confirm_class)) {
		if ($(`.${stop_class}`).length !== 0) {
			$(`.${stop_class}`).removeClass(stop_class);
			return false;
		}
		if (!el.classList.contains("edited") && !el.classList.contains("deleted")) return false;
		$(`.${confirm_class}`).removeClass(confirm_class);
		el.classList.add(confirm_class);
		return false;
	}
	return true;
}

function on_editable_input(e) {
	e.target.classList.add("edited");
	if (e.target.innerHTML === '<br>' || e.target.innerHTML === '\n') e.target.innerHTML = '';
}

function on_editable_blur(e) {
	$(".will-submit").removeClass("will-submit");
	$(".will-cancel").removeClass("will-cancel");
	$(e.target).find(`.${SELECT_MARKER_CLASS}`).remove();
	normalize_editable(e.target);
	clearHistory();
	if (JSON.stringify(serialize(e.target)) === originalContentMap.get(e.target)) {
		e.target.classList.remove("edited");
	}
}

function submit(el, shouldSerialize, splice) {
	el.innerHTML = el.innerHTML.replaceAll("\n","<br>");
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
	el.classList.remove("new");
	el.classList.remove("edited");
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
	q$(".editable").forEach((e) => {
		e.removeAttribute("data-id");
		e.removeAttribute("contenteditable");
		e.removeEventListener("keydown", on_editable_keydown);
		e.removeEventListener("input", on_editable_input);
		e.removeEventListener("blur", on_editable_blur);
		e.classList.remove("editable");
	});
	editingRoot = null;
	nextEditId = null;
	positionMap = null;
	originalContentMap = null;
}

window.addEventListener("beforeunload", (e) => {
	if ($(".edited").length != 0 || $(".new").length != 0) e.preventDefault();
});

const selection = window.getSelection();
let undoBuffer = [];
let redoBuffer = [];
function run_command(e, command) {
	const r = selection.getRangeAt(0);
	if (r.collapsed) return;

	e.preventDefault();
	undoBuffer.push(serialize(e.target));

	$(e.target).find(`.${SELECT_MARKER_CLASS}`).remove();
	// Gather the selected text runs, then rebuild only those runs with the requested inline format.
	let affected = [], cur = null;
	if (r.startContainer.nodeType === Node.TEXT_NODE) {
		cur = r.startContainer;
		affected.push({node: cur, start_offset: r.startOffset});
	} else {
		cur = to_text_node(r.startContainer, r.startOffset);
		affected.push({node: cur});
	}
	let n = cur, forgive = r.startContainer.nodeType !== Node.TEXT_NODE || r.startOffset === 0;
	while (n != e.target && n.parentElement) {
		if (to_command(n) === KEEP_COMMAND) {
			if (!forgive) throw COMMAND_CANCELLED;
			affected[0] = {node: n};
		};
		if (n.previousSibling) forgive = false;
		n = n.parentElement;
	}
	cur = to_text_node(next_node(affected[0].node));
	while (cur != null && r.intersectsNode(cur)) {
		affected.push({node: cur});
		cur = to_text_node(next_node(cur));
	}
	if (r.endContainer.nodeType === Node.TEXT_NODE) {
		let start_offset = affected.pop()?.start_offset;
		if (start_offset) {
			affected.push({node: r.endContainer, start_offset: start_offset, end_offset: r.endOffset});
		} else affected.push({node: r.endContainer, end_offset: r.endOffset});
	}
	n = affected[affected.length-1].node;
	forgive = r.endContainer.nodeType !== Node.TEXT_NODE || r.endOffset === r.endContainer.textContent.length;
	while (n != e.target && n.parentElement) {
		if (to_command(n) === KEEP_COMMAND) {
			if (!forgive) throw COMMAND_CANCELLED;
			affected[affected.length-1] = {node: n};
		};
		if (n.nextSibling) forgive = false;
		n = n.parentElement;
	} 

	let all_on = true;
	for (let ee of affected) {
		if ((ee.start_offset != undefined && ee.start_offset === ee.node.textContent.length) || ee.end_offset === 0) {
			ee.zero = true;
			continue;
		}
		let n = ee.node.parentNode;
		ee.on = false;
		if (n.nodeType !== Node.ELEMENT_NODE) continue;
		ee.formats = [];
		while (n != e.target) {
			let cmd = to_command(n);
			if (command === cmd) ee.on = true;
			if (command === KEEP_COMMAND) throw COMMAND_CANCELLED;
			ee.formats.push(cmd);
			n = n.parentElement;
		}
		if (!ee.on) all_on = false;
	}

	if (command === 'a' && affected.length !== 1) throw COMMAND_CANCELLED;

	let range = document.createRange();
	let last = affected[affected.length-1];

	if (last.end_offset != undefined) range.setStart(last.node, last.end_offset);
	else range.setStartAfter(last.node);
	range.setEndAfter(e.target.lastChild);
	let r_ext = range.extractContents();

	let marker_start = document.createElement("span");
	marker_start.classList.add(SELECT_MARKER_CLASS);
	r_ext.prepend(marker_start);
	e.target.append(r_ext);

	let els = document.createDocumentFragment();
	for (let ee of affected) {
		if (ee.zero) continue;
		let el = ee.node;
		if (ee.start_offset) {
			el = document.createTextNode(ee.node.textContent.substring(ee.start_offset));
			ee.node.textContent = ee.node.textContent.substring(0, ee.start_offset);
		}
		if (command === 'a') {
			if (el.nodeName !== 'A') {
				let d = el.textContent.split('|');
				if (d.length < 1 || d.length > 2) throw COMMAND_CANCELLED;
				let link = d[0];
				let display = (d.length === 2) ? d[1] : d[0];
				let new_el = document.createElement('a');
				new_el.setAttribute("href", link);
				new_el.textContent = display;
				el.remove();
				el = new_el;
			} else {
				let link = el.getAttribute("href");
				let display = el.textContent;
				let text = (link === display) ? link : `${link}|${display}`;
				el.remove();
				el = document.createTextNode(text);
			}
		}
		for (let eee of ee.formats) {
			if (ee.on && eee === command) continue;
			if (command === 'ins' && eee === 'del' || command === 'del' && eee === 'ins' ||
			command === 'sup' && eee === 'sub' || command === 'sub' && eee === 'sup' ||
			command !== eee && (command.startsWith('color') && eee.startsWith('color') ||
			command.startsWith('colorbox') && eee.startsWith('colorbox'))) continue;
			let new_el = to_element(eee);
			new_el.append(el);
			el = new_el;
		}
		if (command !== "a" && !all_on) {
			let new_el = to_element(command);
			new_el.append(el);
			el = new_el;
		}
		els.append(el);
	}

	let marker_end = document.createElement("span");
	marker_end.classList.add(SELECT_MARKER_CLASS);
	els.append(marker_end);
	marker_start.after(els);
	range.setStartAfter(marker_start);
	range.setEndBefore(marker_end);
	selection.removeAllRanges();
	selection.addRange(range);

	normalize_editable(e.target);
	on_editable_input(e);
	return;
}

function tab_command(e) {
	if (!selection.rangeCount || (selection.anchorNode == selection.focusNode && selection.anchorOffset == selection.focusOffset && selection.anchorOffset == 0)) return;
	e.preventDefault();
	if (!selection.isCollapsed) {
		selection.collapseToEnd();
		return;
	}
	let last_text = selection.anchorNode, first_text = last_text;
	let cmd = null, flag = 0;
	if (last_text.nodeType !== Node.TEXT_NODE) {
		last_text = to_text_node_prev(last_text, selection.anchorOffset);
	} else if (selection.anchorOffset === 0) {
		last_text = to_text_node_prev(prev_node(last_text));
	} else {
		if (selection.anchorOffset === 1) return;
		let t = last_text.textContent.substring(0, selection.anchorOffset);
		if (!t.includes("]")) return;
		cmd = k2e(t.match(/\]([^\]]*)$/)[1]).toLowerCase();
		if (cmd.length === 0) return;
		first_text = last_text;
		flag = 2;
	}
	while (!flag && last_text) {
		let t = last_text.textContent;
		if (t.length === 0) {
			last_text = to_text_node_prev(prev_node(last_text));
			continue;
		}
		if (!t.includes("]")) return;
		cmd = k2e(t.match(/\]([^\]]*)$/)[1]).toLowerCase();
		if (cmd.length === 0) return;
		first_text = last_text;
		flag = 1;
	}
	if (cmd == null) throw COMMAND_CANCELLED;

	if (cmd === "." || cmd === "st") {
		let close_idx = (flag === 2) ? last_text.textContent.lastIndexOf("]", selection.anchorOffset-1) : last_text.textContent.lastIndexOf("]");
		let cursor_idx = (flag === 2) ? selection.anchorOffset : last_text.textContent.length;
		let range = document.createRange();
		range.setStart(last_text, close_idx);
		range.setEnd(last_text, cursor_idx);
		range.deleteContents();
		let sym = {".": "·", "st": "★"}
		range.insertNode(document.createTextNode(sym[cmd]));
		selection.removeAllRanges();
		selection.addRange(range);
		selection.collapseToEnd();
		normalize_editable(e.target);
		return;
	}

	let flag2 = 1;
	while (first_text) {
		if (first_text.textContent.includes("[")) break;
		first_text = to_text_node_prev(prev_node(first_text));
		if (!e.target.contains(first_text)) return;
		flag2 = 0;
	}
	if (!first_text || !first_text.textContent.includes("[")) return;

	let command = null;
	if (cmd === "b") command = "strong";
	else if (cmd === "u") command = "em";
	else if (cmd === ".") command = "sup";
	else if (cmd === ",") command = "sub";
	else if (cmd === "d") command = "del";
	else if (cmd === "e") command = "ins";
	else if ("0" <= cmd && cmd <= "9") command = `color${cmd}`;
	else if (cmd === "a") command = "a";
	if (command == null) return;

	let open_idx = (flag2 === 1) ? first_text.textContent.lastIndexOf("[", selection.anchorOffset-1) : first_text.textContent.lastIndexOf("[");
	let close_idx = (flag === 2) ? last_text.textContent.lastIndexOf("]", selection.anchorOffset-1) : last_text.textContent.lastIndexOf("]");
	let cursor_idx = (flag === 2) ? selection.anchorOffset : last_text.textContent.length;
	let ft = first_text.textContent;
	first_text.textContent = ft.substring(0, open_idx) + ft.substring(open_idx+1);
	if (first_text === last_text) close_idx--;
	let lt = last_text.textContent;
	last_text.textContent = lt.substring(0, close_idx) + lt.substring(cursor_idx);
	let range = document.createRange();
	range.setStart(first_text, open_idx);
	range.setEnd(last_text, close_idx);
	selection.removeAllRanges();
	selection.addRange(range);
	try {
		run_command(e, command);
	} catch (error) {
		if (error !== COMMAND_CANCELLED) throw error;
	}
	selection.collapseToEnd();
}

function next_node(n) {
	if (n == null) return null;
	return n.nextSibling ?? next_node(n.parentNode);
}

function to_text_node(n, o) {
	if (n == null) return null;
	if (o != undefined) {
		if (n.childNodes[o] == undefined) n = next_node(n);
		n = n.childNodes[o];
	}
	while (n.nodeType !== Node.TEXT_NODE) {
		if (to_command(n) === KEEP_COMMAND) return n;
		if (n.firstChild == null) n = next_node(n);
		if (n == null) return null;
		if (n.firstChild != null) n = n.firstChild;
	}
	return n;
}

function prev_node(n) {
	if (n == null) return null;
	return n.previousSibling ?? prev_node(n.parentNode);
}

function to_text_node_prev(n, o) {
	if (n == null) return null;
	if (o != undefined) {
		if (o === 0 || n.childNodes[o-1] == undefined) n = prev_node(n);
		n = n.childNodes[o-1];
	}
	while (n.nodeType !== Node.TEXT_NODE) {
		if (to_command(n) === KEEP_COMMAND) return n;
		if (n.lastChild == null) n = prev_node(n);
		if (n == null) return null;
		if (n.lastChild != null) n = n.lastChild;
	}
	return n;
}

function normalize_editable(el) {
	if (el.classList.contains(SELECT_MARKER_CLASS)) return;

	let cur = el.firstChild;

	function remove_node(n) {
		let next = n.nextSibling;
		el.removeChild(n);
		return next;
	}

	while (cur != null) {
		if (cur.nodeType === Node.TEXT_NODE) {
			if (cur.textContent === '' || (cur.textContent === '\n' && cur.previousSibling == null && cur.nextSibling == null)) {
				cur = remove_node(cur);
				continue;
			}
			let prev = cur.previousSibling;
			if (prev != null && prev.nodeType === Node.TEXT_NODE) {
				prev.textContent += cur.textContent;
				cur = remove_node(cur);
				continue;
			}
			cur = cur.nextSibling;
			continue;
		}
		if (cur.nodeType !== Node.ELEMENT_NODE || to_command(cur) === KEEP_COMMAND) {
			cur = cur.nextSibling;
			continue;
		}
		normalize_editable(cur);
		let prev = cur.previousSibling;
		if (prev != null && prev.nodeType === Node.ELEMENT_NODE && to_command(prev) === to_command(cur)) {
			while (cur.firstChild) prev.appendChild(cur.firstChild);
		}
		if (cur.firstChild == null) {
			cur = remove_node(cur);
			continue;
		}
		cur = cur.nextSibling;
	}

	el.normalize();
}

function to_command(n) {
	if (n.nodeType === Node.TEXT_NODE) return TEXT_COMMAND;
	if (n.tagName === "SPAN") {
		if (n.classList.contains('color')) {
			return `color${getColor(n.classList)}`;
		} else if (n.classList.contains('colorbox')) {
			return `colorbox${getColor(n.classList)}`;
		}
		return KEEP_COMMAND;
	}
	if (!SUB_EDITABLE_TAGS.has(n.tagName)) return KEEP_COMMAND;
	return n.tagName.toLowerCase();
}

function to_element(cmd) {
	if (cmd === KEEP_COMMAND) throw COMMAND_CANCELLED;
	if (cmd.startsWith('colorbox')) {
		let el = document.createElement('span');
		el.classList.add("colorbox");
		el.classList.add(`c${cmd.substring(8)}`);
		return el;
	}
	if (cmd.startsWith('color')) {
		let el = document.createElement('span');
		el.classList.add("color");
		el.classList.add(`c${cmd.substring(5)}`);
		return el;
	}
	return document.createElement(cmd);
}

const chcode = ['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g']
const jucode = ['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l']
const jocode = ['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g']
const cscode = ['','r','R','rt','s','sw','sg','e','E','f','fr','fa','fq','ft','fx','fv','fg','a','q','Q','qt','t','T','d','w','W','c','z','x','v','g']
function k2e(str) {
	if (!str) return null;
	let res = ''
	for (let ch of str) {
		let c = ch.charCodeAt(0)
		if (0x1100 <= c && c <= 0x1112) { res += chcode[c - 0x1100]; continue; }
		if (0x1161 <= c && c <= 0x1175) { res += jucode[c - 0x1161]; continue; }
		if (0x11a8 <= c && c <= 0x11c2) { res += jocode[c - 0x11a7]; continue; }
		if (0x3131 <= c && c <= 0x314e) { res += cscode[c - 0x3130]; continue; }
		if (0x314f <= c && c <= 0x3163) { res += jucode[c - 0x314f]; continue; }
		if (0xac00 <= c && c <= 0xd7a3) {
			c -= 0xac00
			let chidx = Math.floor(c / 588)
			let juidx = Math.floor((c%588) / 28)
			let joidx = c%28
			res += chcode[chidx]
			res += jucode[juidx]
			if (joidx===0) continue;
			res += jocode[joidx]
			continue;
		}
		res += ch
	}
	return res;
}

let targetingAbort = null;

function start_targeting(f) {
	if (targetingAbort != null) stop_targeting();
	document.body.classList.add("targeting");
	targetingAbort = new AbortController();
	for (let el of document.getElementsByClassName("unit")) {
		if (el.classList.contains("editable")) {
			el.removeAttribute("contenteditable");
		}
		el.addEventListener("click", (e) => {
			e.preventDefault();
			f(e.currentTarget);
			stop_targeting();
		}, {signal: targetingAbort.signal});
	}
	for (let el of document.getElementsByClassName("first-bar")) {
		el.addEventListener("click", (e) => {
			e.preventDefault();
			f(e.currentTarget.parentElement, true);
			stop_targeting();
		}, {signal: targetingAbort.signal});
	}
	for (let el of document.getElementsByClassName("last-bar")) {
		el.addEventListener("click", (e) => {
			e.preventDefault();
			f(e.currentTarget.parentElement);
			stop_targeting();
		}, {signal: targetingAbort.signal});
	}

	document.addEventListener("keydown", (e) => {
		if (e.key == 'Escape') stop_targeting();
	}, {signal: targetingAbort.signal});
}

export function stop_targeting() {
	document.body.classList.remove("targeting");
	for (let el of document.getElementsByClassName("unit")) {
		if (el.classList.contains("editable")) {
			el.setAttribute("contenteditable", CONTENTEDITABLE_VALUE);
		}
	}
	targetingAbort.abort();
	targetingAbort = null;
	document.activeElement.blur();
}

let newElementFactory = null;
let insertWithHeader = null;
function insert_element(after, isFirst) {
	if (after.nextSibling?.tagName === 'NAV') after = after.nextSibling;
	if (newElementFactory == null) return;
	const newElement = createPendingElement(after, isFirst);
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

function createPendingElement(after, isFirst) {
	if (newElementFactory instanceof Function) return newElementFactory(after, isFirst);
	return document.createElement(newElementFactory);
}

function delete_element(target, isFirst) {
	if (target.nextSibling.tagName === 'NAV' || target.tagName === 'NAV') return;
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
	let parent = isFirst ? after : after.parentElement;
	if (parent === document.body || parent.firstChild === document.body) return document.createElement("h1");
	let depth = 1;
	let el = parent;
	while (el != document.body) {
		if (el.matches("section, article, fieldset, .columns")) depth++;
		el = el.parentElement;
	}
	if (depth > 6) depth = 6;
	return document.createElement(`h${depth}`);
}

export function menu_insert(el, addHeader) {
	function f() {
		newElementFactory = el;
		insertWithHeader = addHeader;
		start_targeting(insert_element);
	}
	return f;
}

export function menu_delete() {
	start_targeting((target, isFirst) => {
		dialog("요소 삭제", `
			이 &lt;${target.nodeName.toLowerCase()}&gt; 요소를 삭제하시겠습니까?<br>
			이 작업은 되돌릴 수 없습니다.
		`, () => {
			delete_element(target, isFirst);
			return true;
		}, true)();
	});
}
