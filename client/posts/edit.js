import { seri, deseri } from "/shared/posts/seri.js";
import { q$, $ } from "../jquery.js";
import {
	inlineCommands,
	inlineCleanup,
	blurCleanup
} from "./edit_inline.js";
import { showWarning } from "./dialog.js";

const EDIT_TYPE = Object.freeze({
	DETAILS: 6,
	LIST: 5,
	LI: 4,
	EDITABLE: 3,
	CONTAINER: 2,
	UNIT: 1,
	NONE: 0
});

const EDITABLES = new Set([
	"H1", "H2", "H3", "H4", "H5", "H6",
	"P", "FIGCAPTION", "LEGEND",
	"STRONG", "EM", "B", "I", "U",
	"RUBY", "RT", "RP",
	"SUB", "SUP", "INS", "DEL",
	"SUMMARY", "A", "BUTTON"
]);
const CONTAINERS = new Set([
	"SECTION", "ARTICLE", "FIELDSET"
]);
const UNITS = new Set([
	"HGROUP", "IMG", "AUDIO", "VIDEO",
	"FIGURE", "HR", "BR",
	"TRACK", "SOURCE", "NAV"
]);

let editing = false;
let editCnt = null;
let positionMap = null;
let positionStack = [];
let originalMap = null;

export function startEdit(el, init) {
	if (init) {
		if (editing) stopEdit();
		editing = true; editCnt = 0;
		positionStack = [];
		positionMap = new WeakMap();
		originalMap = new WeakMap();
		window.addEventListener("beforeunload", beforeUnload);
	} else if (!editing) return null;

	if (el.nodeType === Node.TEXT_NODE) {
		if (/^\n\s*$/.test(el.textContent)) return null;
		return false;
	}
	if (el.nodeName.startsWith("#")) return null;
	if (el.classList.contains("new")) return null;

	let type = getEditType(el);
	if (type === null) return null;
	if (el.nodeName === "FIELDSET" && el.matches("fieldset:has(> legend)")) type = EDIT_TYPE.DETAILS;
	if (el.nodeName === "FIELDSET" && el.getAttribute("data-old") !== null) {
		el.querySelectorAll(".container-bar, .middle-bar").forEach((e) => e.remove());
		el.removeAttribute("data-old");
	}
	type = applyEditType(el, type);

	positionMap.set(el, Array.from(positionStack));
	let idx = 0;
	el.childNodes.forEach((e) => {
		positionStack.push(idx);
		if (startEdit(e)) idx++;
		positionStack.pop();
	});

	if (type === EDIT_TYPE.EDITABLE) {
		originalMap.set(el, JSON.stringify(seri(el)));
		if (el.getAttribute("data-id") === null) {
			el.setAttribute("data-id", editCnt++);
			el.setAttribute("contenteditable", "plaintext-only");
			el.addEventListener("keydown", onEditableKeydown);
			el.addEventListener("input", onEditableInput);
			el.addEventListener("blur", onEditableBlur);
		}
	}

	return true;
}

function getEditType(el) {
	switch (el.nodeName) {
	case 'BODY':
		return EDIT_TYPE.NONE;
	case 'UL': case 'OL':
		return EDIT_TYPE.LIST;
	case 'LI':
		return EDIT_TYPE.LI;
	case 'DETAILS':
		return EDIT_TYPE.DETAILS;
	default:
		if (EDITABLES.has(el.nodeName)) return EDIT_TYPE.EDITABLE;
		else if (CONTAINERS.has(el.nodeName)) return EDIT_TYPE.CONTAINER;
		else if (UNITS.has(el.nodeName)) return EDIT_TYPE.UNIT;
		else {
			if (el.classList.contains("columns")) {
				return EDIT_TYPE.CONTAINER;
			} else if (el.classList.contains("color") || el.classList.contains("colorbox")) {
				return EDIT_TYPE.EDITABLE;
			} else return null;
		}
	}
	return null;
}

function applyEditType(el, type) {
	function markContainer(el, first, last) {
		el.classList.add("container");
		if (first) {
			const fbar = document.createElement("span");
			fbar.classList.add("container-bar", "first-bar");
			el.append(fbar);
		}
		const mbar = document.createElement("span");
		mbar.classList.add("container-bar", "middle-bar");
		el.append(mbar);
		if (last) {
			const lbar = document.createElement("span");
			lbar.classList.add("container-bar", "last-bar");
			el.append(lbar);
		}
	}
	if (el.getAttribute("data-old") !== null) return type;
	if (type === EDIT_TYPE.DETAILS) {
		if (!el.closest("li")) markContainer(el, false, true);
	} else if (type === EDIT_TYPE.LIST) {
		markContainer(el, true, !el.parentElement?.closest("ul, ol, dir, menu"));
	} else if (type === EDIT_TYPE.LI) {
		if (!el.closest(".editable")) el.classList.add("editable");
		el.classList.add("unit");
	} else if (type === EDIT_TYPE.CONTAINER) {
		markContainer(el, true, true);
	} else {
		if (el.closest(".editable")) type = EDIT_TYPE.UNIT;

		if (type === EDIT_TYPE.EDITABLE) {
			el.classList.add("editable");
			if (!el.closest(".unit")) el.classList.add("unit");
		}
		else if (type === EDIT_TYPE.UNIT && !el.closest(".unit")) el.classList.add("unit");
	}
	el.setAttribute("data-old", true);
	return type;
}

export function stopEdit() {
	submitAll();
	q$(".editable").forEach((e) => {
		e.removeAttribute("data-id");
		e.removeAttribute("data-old");
		e.removeAttribute("contenteditable");
		e.removeEventListener("keydown", onEditableKeydown);
		e.removeEventListener("input", onEditableInput);
		e.removeEventListener("blur", onEditableBlur);
		e.classList.remove("editable");
	});
	q$(".unit").forEach((e) => {
		e.removeAttribute("data-old");
		e.classList.remove("unit");
	});
	q$(".container").forEach((e) => {
		e.removeAttribute("data-old");
		e.classList.remove("container");
	})
	$(".container-bar").remove();
	editing = false;
	editCnt = positionMap = originalMap = null;
	positionStack = [];
	window.removeEventListener("beforeunload", beforeUnload);
}

function onEditableKeydown(e) {
	if (e.isComposing) return;
	const shortcut = e.ctrlKey || e.metaKey;
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		handleSubmitKey(e.target);
		return;
	} else if (e.key === "Escape") {
		e.preventDefault();
		handleCancelKey(e.target);
		return;
	} else if (shortcut && e.key == "Backspace") {
		e.preventDefault();
		handlePDeleteKey(e.target);
		return;
	} else if (shortcut && (e.key == "ArrowUp" || e.key == "ArrowDown") && !e.shiftKey) {
		e.preventDefault();
		handlePNavigateKey(e.target, e.key);
		return;
	} else if (shortcut && (e.key == "ArrowUp" || e.key == "ArrowDown") && e.shiftKey) {
		e.preventDefault();
		handlePInsertKey(e.target, e.key);
		return;
	}
	if (inlineCommands(shortcut, e)) onEditableInput(e);
}

function handleSubmitKey(target) {
	if (target.classList.contains("deleted")) {
		submitDelete(target);
		return;
	} else if (target.classList.contains("new")) {
		submitNew(target);
		return;
	}
	if (!manageConfirm(target, "will-submit", "will-cancel")) return;
	submitChanges(target);
}

function handleCancelKey(target) {
	if (target.classList.contains("deleted")) {
		target.classList.remove("deleted");
		return;
	} else if (target.classList.contains("new")) {
		const successor = (target.previousSibling?.matches(".editable")) ?
		target.previousSibling :
		(target.nextSibling?.matches(".editable") ? target.nextSibling : null);

		target.remove();
		
		if (successor === null) return;
		regainFocus(successor);
	}
	if (!manageConfirm(target, "will-cancel", "will-submit")) return;
	target.innerHTML = deseri(JSON.parse(originalMap.get(target)), window.location.pathname, true);
	target.blur();
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

function handlePDeleteKey(target) {
	if (!target.matches("p:not(hgroup p)")) return;
	target.classList.add("deleted");
}

function handlePNavigateKey(target, key) {
	if (!target.matches("p:not(hgroup p)")) return;
	const sibling = (key === "ArrowUp") ? "previousSibling" : "nextSibling";
	if (!target[sibling]?.matches("p:not(hgroup p)")) return;
	
	target.blur();
	if (!target.classList.contains("deleted")) {
		if (target.classList.contains("new")) submitNew(target);
		else if (target.classList.contains("edited")) submitChanges(target);
	}
	target[sibling].focus();
}

function handlePInsertKey(target, key) {
	if (!target.matches("p:not(hgroup p)")) return;

	const newP = document.createElement("p");
	newP.classList.add("editable", "new");
	newP.setAttribute("contenteditable", "plaintext-only");
	newP.addEventListener("keydown", onEditableKeydown);
	newP.addEventListener("input", onEditableInput);
	newP.addEventListener("blur", onEditableBlur);
	const pos = (key === "ArrowUp") ? "beforebegin" : "afterend";
	target.insertAdjacentElement(pos, newP);
}

function onEditableInput(e) {
	e.target.classList.add("edited");
	inlineCleanup(e.target);
}

function onEditableBlur(e) {
	$(".will-submit").removeClass("will-submit");
	$(".will-cancel").removeClass("will-cancel");
	inlineCleanup(e.target);
	blurCleanup(e.target);
	if (JSON.stringify(seri(e.target)) === originalMap.get(e.target)) {
		e.target.classList.remove("edited");
	}
}

function submit(el, makeData, splice) {
	el.innerHTML = el.innerHTML.replaceAll("\n", "<br>");
	if (el.lastChild?.nodeName === "BR") el.removeChild(el.lastChild);
	document.activeElement.blur();
	const pos = positionMap.get(el);
	const data = makeData ? seri(el) : undefined;
	fetch(window.location.pathname, {method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: data,
		splice: splice
	})});
	originalMap.set(el, JSON.stringify(data));
}

const S = window.getSelection();

function submitChanges(el) {
	submit(el, true, 1);
	el.classList.remove("edited");
	regainFocus(el);
}

function submitDelete(el) {
	submit(el, false, 1);
	const parent = el.parentElement;
	positionStack = Array.from(positionMap.get(parent));

	const successor = (el.previousSibling?.matches(".editable")) ?
		el.previousSibling :
		(el.nextSibling?.matches(".editable") ? el.nextSibling : null);

	el.remove();
	startEdit(parent);
	
	if (successor === null) return;
	regainFocus(successor);
}

function submitNew(el) {
	el.classList.remove("new", "edited");
	positionStack = Array.from(positionMap.get(el.parentElement));
	startEdit(el.parentElement);
	submit(el, true, 0);
	regainFocus(el);
}

function regainFocus(el) {
	el.focus();
	const range = document.createRange();
	range.selectNodeContents(el);
	range.collapse();
	S.removeAllRanges();
	S.addRange(range);
}

function submitAll() {
	document.activeElement.blur();
	q$(".edited").forEach((e) => submitChanges(e));
	q$(".new").forEach((e) => submitNew(e));
	// q$(".deleted").forEach((e) => submitDelete(e));
}

function beforeUnload(e) {
	if ($(".edited").length != 0 || $(".new").length != 0) e.preventDefault();
}

let targetingAbort = null;

export function startTargeting(f) {
	if (targetingAbort !== null) stopTargeting();
	document.body.classList.add("targeting");
	targetingAbort = new AbortController();

	$(".unit.editable").removeAttr("contenteditable");
	addTargetListeners("unit", f, false, false);
	addTargetListeners("first-bar", f, true, true);
	addTargetListeners("last-bar", f, true, false);

	document.addEventListener("keydown", (e) => {
		if (e.key == 'Escape') stopTargeting();
	}, {signal: targetingAbort?.signal});
}

function addTargetListeners(cls, f, parent, isFirst) {
	for (const el of document.getElementsByClassName(cls)) {
		el.addEventListener("click", (e) => {
			e.preventDefault();
			e.target.blur();
			const after = parent ? e.currentTarget.parentElement : e.currentTarget;
			if (!f(after, isFirst)) return;
			stopTargeting();
		}, {signal: targetingAbort?.signal});
	}
}

export function stopTargeting() {
	document.body.classList.remove("targeting");
	$(".unit.editable").attr("contenteditable", "plaintext-only");
	targetingAbort?.abort();
	targetingAbort = null;
	document.activeElement.blur();
}

let newElementFactory = null;
let newElementAddHeader = null;
function insertElement(after, isFirst) {
	if (after.nextSibling?.tagName === 'NAV') after = after.nextSibling;
	if (newElementFactory === null) {
		alert("오류: newElementFactory === null");
		return false;
	}
	const newElement = newElementFactory instanceof Function ?
		newElementFactory(after, isFirst) :
		document.createElement(newElementFactory);
	if (newElement === null) {
		showWarning("삽입 위치가 적절하지 않습니다.");
		return false;
	}

	if (after.tagName === 'LI' || (
		(after.tagName === 'UL' || after.tagName === 'OL') && isFirst
	)) {
		showWarning("리스트 편집은 아직 지원하지 않습니다.");
		return false;
	}

	if (isFirst) {
		after.insertAdjacentElement("afterbegin", newElement);
		if (newElementAddHeader) newElement.append(header(newElement, true));
		positionStack = Array.from(positionMap.get(after));
		startEdit(after);
	} else {
		after.insertAdjacentElement("afterend", newElement);
		if (newElementAddHeader) newElement.append(header(newElement, true));
		const parent = after.parentElement;
		positionStack = Array.from(positionMap.get(parent));
		startEdit(parent);
	}

	const pos = positionMap.get(newElement);
	const newData = seri(newElement);
	fetch(window.location.pathname, {method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: newData,
		splice: 0
	})});
	return true;
}

export function insertHgroup(target) {
	if (!/^H[1-6]$/.test(target.tagName) && target.tagName !== "HGROUP") {
		showWarning("삽입 위치가 적절하지 않습니다.");
		return false;
	}

	let newElement = null;
	if (target.tagName === "HGROUP") {
		newElement = target.querySelector("h1, h2, h3, h4, h5, h6");
		target.insertAdjacentElement("beforebegin", newElement);
		newElement.classList.add("unit");
		target.remove();
	} else {
		newElement = document.createElement("hgroup");
		target.insertAdjacentElement("beforebegin", newElement);
		newElement.append(target);
		target.classList.remove("unit");
		newElement.append(document.createElement("p"));
	}
	if (newElement === null) { // ???
		showWarning("삽입 위치가 적절하지 않습니다.");
		return false;
	}
	const parent = newElement.parentElement;
	positionStack = Array.from(positionMap.get(parent));
	startEdit(parent);
	const pos = positionMap.get(newElement);
	const newData = seri(newElement);
	fetch(window.location.pathname, {method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: newData,
		splice: 1
	})});
	return true;
}

export function deleteElement(target) {
	if (target.nextSibling?.tagName === 'NAV' || target.tagName === 'NAV') return;
	const parent = target.parentElement;
	const pos = positionMap.get(target);
	fetch(window.location.pathname, {method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: undefined,
		splice: 1
	})});
	target.remove();
	startEdit(parent);
}

export function header(after, isFirst) {
	const parent = isFirst ? after : after.parentElement;
	if (parent === document.body || parent.firstChild === document.body) {
		return document.createElement("h1");
	}
	
	let depth = 1;
	let cur = parent;
	while (cur != document.body) {
		if (cur.matches("section, article")) depth++;
		cur = cur.parentElement;
	}
	if (depth > 6) depth = 6;
	return document.createElement(`h${depth}`);
}

export function menuInsert(el, addHeader) {
	return function () {
		newElementFactory = el;
		newElementAddHeader = addHeader;
		startTargeting(insertElement);
	}
}