import { d$, q$, $ } from "/client/jquery.js";
import { serialize, deserialize, getColor } from "./seri.js";
import { runCommand, tabCommand, normalizeEditable, tryUndo, tryRedo, clearHistory } from "./edit_inline.js";
import { dialog } from "./dialog.js";

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
	}

	if (el.nodeType === Node.TEXT_NODE) {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return false;
	}
	if (el.nodeName.startsWith("#")) return undefined;
	if (el.classList.contains("new")) return undefined;

	let type = getEditType(el);
	if (type == null) return undefined;
	if (el.nodeName === "FIELDSET" && el.matches("fieldset:has(> legend)")) type = EDIT_TYPE.DETAILS;
	if (el.nodeName === "FIELDSET" && el.getAttribute("data-old") != null) {
		el.querySelectorAll(".container-bar, .middle-bar").forEach((e) => e.remove());
		el.removeAttribute("data-old");
	}
	type = applyEditType(el, type);

	positionMap.set(el, Array.from(positionStack));
	let idx = 0;
	el.childNodes.forEach((e) => {
		positionStack.push(idx);
		if (startEdit(e) != undefined) idx++;
		positionStack.pop();
	});

	if (type === EDIT_TYPE.EDITABLE) {
		originalMap.set(el, JSON.stringify(serialize(el)));
		if (el.getAttribute("data-id") == null) {
			el.setAttribute("data-id", editCnt++);
			el.setAttribute("contenteditable", "plaintext-only");
			el.addEventListener("keydown", onEditableKeydown);
			el.addEventListener("input", onEditableInput);
			el.addEventListener("blur", onEditableBlur);
		}
	}

	return true;
}

function getEditType(el, init) {
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
		if (last) {
			const lbar = document.createElement("span");
			lbar.classList.add("container-bar", "last-bar");
			el.prepend(lbar);
		}
		const mbar = document.createElement("span");
		mbar.classList.add("container-bar", "middle-bar");
		el.prepend(mbar);
		if (first) {
			const fbar = document.createElement("span");
			fbar.classList.add("container-bar", "first-bar");
			el.prepend(fbar);
		}
	}
	if (el.getAttribute("data-old") != null) return type;
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
		e.removeAttribute("contenteditable");
		e.removeEventListener("keydown", onEditableKeydown);
		e.removeEventListener("input", onEditableInput);
		e.removeEventListener("blur", onEditableBlur);
		e.classList.remove("editable");
	});
	editing = false;
	editCnt = positionMap = originalMap = null;
	positionStack = [];
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
	} else if (shortcut && (e.key == "ArrowUp" || e.key == "ArrowDown")) {
		e.preventDefault();
		handlePInsertKey(e.target, e.key);
		return;
	}
	if (shortcut) {
		let command = null;
		if (e.key === "b") command = "strong";
		else if (e.key === "u") command = "em";
		else if (e.key === ".") command = "sup";
		else if (e.key === ",") command = "sub";
		else if (e.key === "d") command = "del";
		else if (e.key === "e") command = "ins";
		else if (e.key === "k") command = "a";
		else if (e.key === "z" && e.shiftKey) command = "redo";
		else if (e.key === "z") command = "undo";
		else if ("0" <= e.key && e.key <= "9") command = `color${e.key}`;
		else return;
		
		if (command === "undo") {
			if (tryUndo(e.target)) e.preventDefault();
			return;
		} else if (command === "redo") {
			if (tryRedo(e.target)) e.preventDefault();
			return;
		}
		try {
			runCommand(e, command);
			onEditableInput(e);
			e.preventDefault();
		} catch (e) {
			if (e !== -1) throw e;
		}
		return;
	}
	if (e.key === "Tab") {
		try {
			tabCommand(e);
			onEditableInput(e);
			e.preventDefault();
		} catch (e) {
			if (e !== -1) throw e;
		}
		return;
	}
	clearHistory();
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
		target.remove();
		return;
	}
	if (!manageConfirm(target, "will-cancel", "will-submit")) return;
	target.innerHTML = deserialize(JSON.parse(originalMap.get(target)), window.location.pathname, true);
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

function handlePInsertKey(target, key) {
	if (!target.matches("p:not(hgroup p)")) return;
	const newP = document.createElement("p");
	newP.classList.add("editable", "new");
	newP.setAttribute("contenteditable", "plaintext-only");
	newP.addEventListener("keydown", onEditableKeydown);
	newP.addEventListener("input", onEditableInput);
	newP.addEventListener("blur", onEditableBlur);
	const pos = (key == "ArrowUp") ? "beforebegin" : "afterend";
	target.insertAdjacentElement(pos, newP);
}

function onEditableInput(e) {
	e.target.classList.add("edited");
	if (e.target.innerHTML === '<br>' || e.target.innerHTML === '\n') e.target.innerHTML = '';
}

function onEditableBlur(e) {
	$(".will-submit").removeClass("will-submit");
	$(".will-cancel").removeClass("will-cancel");
	$(e.target).find('.select-marker').remove();
	normalizeEditable(e.target);
	clearHistory();
	if (JSON.stringify(serialize(e.target)) === originalMap.get(e.target)) {
		e.target.classList.remove("edited");
	}
}

function submit(el, seri, splice) {
	el.innerHTML = el.innerHTML.replaceAll("\n", "<br>");
	if (el.lastChild?.nodeName === "BR") el.removeChild(el.lastChild);
	document.activeElement.blur();
	const pos = positionMap.get(el);
	const data = seri ? serialize(el) : undefined;
	fetch(window.location.pathname, { method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: data,
		splice: splice
	})});
	originalMap.set(el, JSON.stringify(data));
}

function submitChanges(el) {
	submit(el, true, 1);
	el.classList.remove("edited");
}

function submitDelete(el) {
	submit(el, false, 1);
	const parent = el.parentElement;
	positionStack = Array.from(positionMap.get(parent));
	el.remove();
	startEdit(parent);
}

function submitNew(el) {
	el.classList.remove("new", "edited");
	positionStack = Array.from(positionMap.get(el.parentElement));
	startEdit(el.parentElement);
	submit(el, true, 0);
}

export function submitAll() {
	document.activeElement.blur();
	q$(".edited").forEach((e) => submitChanges(e));
	q$(".new").forEach((e) => submitNew(e));
	q$(".deleted").forEach((e) => submitDelete(e));
}

window.addEventListener("beforeunload", (e) => {
	if ($(".edited").length != 0 || $(".new").length != 0) e.preventDefault();
});


let targetingAbort = null;

function startTargeting(f) {
	if (targetingAbort != null) stopTargeting();
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
			const after = parent ? e.currentTarget.parentElement : e.currentTarget;
			f(after, isFirst);
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
	if (newElementFactory == null) return;
	const newElement = newElementFactory instanceof Function ? 
		newElementFactory(after, isFirst) : 
		document.createElement(newElementFactory);
	if (newElement == undefined) return; // TODO: 경고

	if (after.tagName === 'LI' || (
		(after.tagName === 'UL' || after.tagName === 'OL') && isFirst
	)) return; // TODO: 경고 / 리스트 편집 구현

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
	const newData = serialize(newElement);
	fetch(window.location.pathname, { method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: newData,
		splice: 0
	})});
	originalMap.set(newElement, JSON.stringify(newData));
}

function deleteElement(target, isFirst) {
	if (target.nextSibling?.tagName === 'NAV' || target.tagName === 'NAV') return;
	const parent = target.parentElement;
	const pos = positionMap.get(target);
	fetch(window.location.pathname, { method: "PATCH", headers: {
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
		if (cur.matches("section, article, fieldset, .columns")) depth++;
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

export function menuDelete(e) {
	startTargeting((target, isFirst) => {
		dialog("요소 삭제", `
			이 &lt;${target.nodeName.toLowerCase()}&gt; 요소를 삭제하시겠습니까?<br>
			이 작업은 되돌릴 수 없습니다.
		`, () => {
			deleteElement(target, isFirst);
			return true;
		}, true)();
	});
}
