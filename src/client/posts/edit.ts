import { seri, deseri } from "../../shared/posts/seri.js";
import { SERI_HOOKS, DESERI_HOOKS } from "./script.js";
import { $, d$n, q$n } from "../query.js";
import {
	inlineCommands,
	inlineCleanup,
	blurCleanup
} from "./edit_inline.js";
import { showWarning } from "./dialog.js";

enum EDIT_TYPE {
	NONE, UNIT, CONTAINER, EDITABLE, LI, LIST, DETAILS
}

export type TargetHandler = (after: Element, isFirst: boolean) => boolean;

export type ElementFactory = (after: Element, isFirst: boolean) => Element | null;

const EDITABLES = new Set([
	"H1", "H2", "H3", "H4", "H5", "H6",
	"P", "FIGCAPTION", "LEGEND",
	"STRONG", "EM", "B", "I", "U", "S", "PRE",
	"RUBY", "RT", "RP",
	"SUB", "SUP", "INS", "DEL",
	"SUMMARY", "A", "BUTTON"
]);
const CONTAINERS = new Set([
	"SECTION", "ARTICLE", "FIELDSET"
]);
const UNITS = new Set([
	"HGROUP", "IMG", "AUDIO", "VIDEO",
	"FIGURE", "HR", "BR", "MATH", "SVG",
	"TRACK", "SOURCE"
]);

let editing: boolean = false;
let editCnt: number = 0;
let positionMap: WeakMap<Element,number[]> = new WeakMap();
let positionStack: number[] = [];
let originalMap: WeakMap<Element,string> = new WeakMap();

export function startEdit(el: Node, init = false): boolean {
	if (init) {
		if (editing) stopEdit();
		editing = true;
		window.addEventListener("beforeunload", beforeUnload);
	} else if (!editing) return false;

	if (!(el instanceof Element)) return false;
	if (el.classList.contains("new") || el.classList.contains("container-bar")) return false;

	let type = getEditType(el);
	if (type === null) return false;
	if (el.nodeName === "FIELDSET" && el.matches("fieldset:has(> legend)")) type = EDIT_TYPE.DETAILS;
	if (el.nodeName === "FIELDSET" && el.getAttribute("data-old") !== null) {
		$(".container-bar, .middle-bar", el).remove();
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
		originalMap.set(el, JSON.stringify(seri(el, true, SERI_HOOKS)));
		if (el.getAttribute("data-id") === null) {
			const htmlEl = el as HTMLElement;
			htmlEl.setAttribute("data-id", (editCnt++).toString());
			htmlEl.setAttribute("contenteditable", "plaintext-only");
			htmlEl.addEventListener("click", onEditableClick);
			htmlEl.addEventListener("keydown", onEditableKeydown);
			htmlEl.addEventListener("input", onEditableInput);
			htmlEl.addEventListener("blur", onEditableBlur);
		}
	}

	return true;
}

function getEditType(el: Element): EDIT_TYPE | null {
	switch (el.nodeName) {
	case 'BODY': case 'MAIN':
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
}

function applyEditType(el: Element, type: EDIT_TYPE): EDIT_TYPE {
	function markContainer(el: Element, first: boolean, last: boolean) {
		el.classList.add("container");
		if (first) {
			const fbar = document.createElement("button");
			fbar.classList.add("container-bar", "first-bar");
			el.prepend(fbar);
		}
		const mbar = document.createElement("span");
		mbar.classList.add("container-bar", "middle-bar");
		el.append(mbar);
		if (last) {
			const lbar = document.createElement("button");
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
	el.setAttribute("data-old", "");
	return type;
}

export function stopEdit() {
	submitAll();
	$(".editable").each((e) => {
		e.removeAttribute("data-id");
		e.removeAttribute("data-old");
		e.removeAttribute("contenteditable");
		e.removeEventListener("click", onEditableClick);
		e.removeEventListener("keydown", onEditableKeydown);
		e.removeEventListener("input", onEditableInput);
		e.removeEventListener("blur", onEditableBlur);
		e.classList.remove("editable");
	});
	$(".unit").each((e) => {
		e.removeAttribute("data-old");
		e.classList.remove("unit");
	});
	$(".container").each((e) => {
		e.removeAttribute("data-old");
		e.classList.remove("container");
	})
	$(".container-bar").remove();
	editing = false;
	editCnt = 0;
	positionMap = new WeakMap();
	originalMap = new WeakMap();
	positionStack = [];
	window.removeEventListener("beforeunload", beforeUnload);
}

function onEditableClick(e: PointerEvent) {
	const shortcut = e.ctrlKey || e.metaKey;
	if (!shortcut) return;
	if (!(e.target instanceof Text || e.target instanceof Element)) return;
	const target = e.target instanceof Text ? e.target.parentElement : e.target;
	if (target === null) return;
	const link = target.closest("a");
	if (link === null) return;
	e.preventDefault();
	let url = new URL(link.href);
	if (url.host === window.location.host) url.searchParams.set("edit", "t");
	// this will not work on iOS Safari, but like
	// will you Ctrl-click a link while editing a post on iOS
	if (e.shiftKey) window.open(url, "_blank", "noopener");
	else window.open(url, "_self", "noopener");
}

function onEditableKeydown(this: HTMLElement, e: KeyboardEvent) {
	if (e.isComposing) return;
	const shortcut = e.ctrlKey || e.metaKey;
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		handleSubmitKey(this);
		return;
	} else if (e.key === "Escape") {
		e.preventDefault();
		handleCancelKey(this);
		return;
	} else if (shortcut && e.key == "Backspace") {
		e.preventDefault();
		handlePDeleteKey(this);
		return;
	} else if (shortcut && (e.key == "ArrowUp" || e.key == "ArrowDown") && !e.shiftKey) {
		e.preventDefault();
		handlePNavigateKey(this, e.key);
		return;
	} else if (shortcut && (e.key == "ArrowUp" || e.key == "ArrowDown") && e.shiftKey) {
		e.preventDefault();
		handlePInsertKey(this, e.key);
		return;
	}
	if (inlineCommands.call(this, shortcut, e)) onEditableInput.call(this);
}

function handleSubmitKey(target: HTMLElement) {
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

function handleCancelKey(target: HTMLElement) {
	if (target.classList.contains("deleted")) {
		target.classList.remove("deleted");
		return;
	} else if (target.classList.contains("new")) {
		const successor = ((target.previousElementSibling?.matches(".editable")) ?
			target.previousElementSibling :
			(target.nextElementSibling?.matches(".editable") ? target.nextElementSibling : null)) as HTMLElement | null;

		target.remove();
		
		if (successor === null) return;
		regainFocus(successor);
	}
	if (!manageConfirm(target, "will-cancel", "will-submit")) return;
	target.innerHTML = deseri(JSON.parse(originalMap.get(target) as string), window.location.pathname, true, DESERI_HOOKS) ?? "";
	target.blur();
	regainFocus(target);
}

function manageConfirm(el: HTMLElement, confirmClass: string, stopClass: string): boolean {
	if (el.classList.contains(confirmClass)) return true;

	if ($(`.${stopClass}`).exists) {
		$(`.${stopClass}`).removeClass(stopClass);
		return false;
	}
	if (!el.classList.contains("edited") && !el.classList.contains("deleted")) return false;

	$(`.${confirmClass}`).removeClass(confirmClass);
	el.classList.add(confirmClass);
	return false;
}

function handlePDeleteKey(target: HTMLElement) {
	if (!target.matches("p:not(hgroup p, .new)")) return;
	target.classList.add("deleted");
}

function handlePNavigateKey(target: HTMLElement, key: string) {
	if (!target.matches("p:not(hgroup p)")) return;
	const sibling = (key === "ArrowUp") ? "previousElementSibling" : "nextElementSibling";
	if (!target[sibling]?.matches("p:not(hgroup p)")) return;
	
	target.blur();
	if (!target.classList.contains("deleted")) {
		if (target.classList.contains("new")) submitNew(target);
		else if (target.classList.contains("edited")) submitChanges(target);
	}
	(target[sibling] as HTMLElement).focus();
}

function handlePInsertKey(target: HTMLElement, key: string) {
	if (!target.matches("p:not(hgroup p)")) return;

	const newP = document.createElement("p");
	newP.classList.add("editable", "new");
	newP.setAttribute("contenteditable", "plaintext-only");
	newP.addEventListener("click", onEditableClick);
	newP.addEventListener("keydown", onEditableKeydown);
	newP.addEventListener("input", onEditableInput);
	newP.addEventListener("blur", onEditableBlur);
	const pos = (key === "ArrowUp") ? "beforebegin" : "afterend";
	target.insertAdjacentElement(pos, newP);
}

function onEditableInput(this: HTMLElement) {
	this.classList.add("edited");
	this.classList.remove("will-submit", "will-cancel");
	inlineCleanup(this);
}

function onEditableBlur(this: HTMLElement) {
	$(".will-submit").removeClass("will-submit");
	$(".will-cancel").removeClass("will-cancel");
	inlineCleanup(this);
	blurCleanup(this);
	if (JSON.stringify(seri(this, true, SERI_HOOKS)) === originalMap.get(this)) {
		this.classList.remove("edited");
	}
}

function submit(el: HTMLElement, makeData: boolean, splice: number) {
	el.innerHTML = el.innerHTML.replaceAll("\n", "<br>");
	if (el.lastChild?.nodeName === "BR") el.removeChild(el.lastChild);
	(document.activeElement as HTMLElement | null)?.blur();
	const pos = positionMap.get(el);
	const data = makeData ? seri(el, false, SERI_HOOKS) : undefined;
	fetch(window.location.pathname, {method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: data,
		splice: splice
	})}).then((res) => {
		if (!res.ok) {
			showWarning("오류 발생. 편집 내용을 별도로 저장하고 새로고침하세요.");
			stopEdit();
		}
	}).catch((_) => {
		showWarning("오류 발생. 편집 내용을 별도로 저장하고 새로고침하세요.");
		stopEdit();
	});
	originalMap.set(el, JSON.stringify(seri(el, true, SERI_HOOKS)));
}

const S = window.getSelection() as Selection;

function submitChanges(el: HTMLElement) {
	submit(el, true, 1);
	el.classList.remove("edited");
	regainFocus(el);
}

function submitDelete(el: HTMLElement) {
	submit(el, false, 1);
	const parent = el.parentElement as Element;
	positionStack = Array.from(positionMap.get(parent) as number[]);

	const successor = ((el.previousElementSibling?.matches(".editable")) ?
		el.previousElementSibling :
		(el.nextElementSibling?.matches(".editable") ? el.nextElementSibling : null)) as HTMLElement | null;

	el.remove();
	startEdit(parent);
	
	if (successor === null) return;
	regainFocus(successor);
}

function submitNew(el: HTMLElement) {
	el.classList.remove("new", "edited");
	positionStack = Array.from(positionMap.get(el.parentElement as Element) as number[]);
	startEdit(el.parentElement as Element);
	submit(el, true, 0);
	regainFocus(el);
}

function regainFocus(el: HTMLElement) {
	el.focus();
	const range = document.createRange();
	range.selectNodeContents(el);
	range.collapse();
	S.removeAllRanges();
	S.addRange(range);
}

function submitAll() {
	(document.activeElement as HTMLElement | null)?.blur();
	$(".edited").each((e) => submitChanges(e));
	$(".new").each((e) => submitNew(e));
	// q$(".deleted").forEach((e) => submitDelete(e));
}

function beforeUnload(e: BeforeUnloadEvent) {
	if ($(".edited").exists || $(".new").exists) e.preventDefault();
}

let targetingAbort: AbortController | null = null;

export function startTargeting(f: TargetHandler) {
	if (targetingAbort !== null) stopTargeting();
	document.body.classList.add("targeting");
	targetingAbort = new AbortController();

	$("*:not(#menubar):not(#menubar *)").attr("tabindex", "-1");
	$(".unit.editable").attr("contenteditable", null);
	addTargetListeners("unit", f, true, false, false);
	addTargetListeners("first-bar", f, false, true, true);
	addTargetListeners("last-bar", f, false, true, false);

	document.addEventListener("keydown", (e) => {
		if (e.key == 'Escape') stopTargeting();
	}, {signal: targetingAbort?.signal});
}

function addTargetListeners(cls: string, f: TargetHandler, keydown: boolean, parent: boolean, isFirst: boolean) {
	for (const el of (document.getElementsByClassName(cls) as HTMLCollectionOf<HTMLElement>)) {
		el.setAttribute("tabindex", "0");
		const handler = (e: Event) => {
			e.preventDefault();
			(el as HTMLElement).blur();
			const after = parent ? (el.parentElement as Element) : el;
			if (!f(after, isFirst)) return;
			stopTargeting();
		};
		el.addEventListener("click", handler, {signal: targetingAbort?.signal});
		if (keydown) el.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			e.stopPropagation();
			e.preventDefault();
			handler(e);
		}, {signal: targetingAbort?.signal});
	}
}

export function stopTargeting() {
	document.body.classList.remove("targeting");
	$(".unit.editable").attr("contenteditable", "plaintext-only");
	$("*:not(#menubar):not(#menubar *)").attr("tabindex", null);
	targetingAbort?.abort();
	targetingAbort = null;
	(document.activeElement as HTMLElement | null)?.blur();
}

let newElementFactory: null | string | ElementFactory = null;
let newElementAddHeader: null | boolean = null;
function insertElement(after: Element, isFirst: boolean) {
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
		positionStack = Array.from(positionMap.get(after) as number[]);
		startEdit(after);
	} else {
		after.insertAdjacentElement("afterend", newElement);
		if (newElementAddHeader) newElement.append(header(newElement, true));
		const parent = after.parentElement as Element;
		positionStack = Array.from(positionMap.get(parent) as number[]);
		startEdit(parent);
	}

	const pos = positionMap.get(newElement);
	const newData = seri(newElement, false, SERI_HOOKS);
	fetch(window.location.pathname, {method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: newData,
		splice: 0
	})});
	return true;
}

export function insertHgroup(target: Element) {
	if (!/^H[1-6]$/.test(target.tagName) && target.tagName !== "HGROUP") {
		showWarning("삽입 위치가 적절하지 않습니다.");
		return false;
	}

	let newElement: null | Element = null;
	if (target.tagName === "HGROUP") {
		newElement = q$n("h1, h2, h3, h4, h5, h6", target);
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
	const parent = newElement.parentElement as Element;
	positionStack = Array.from(positionMap.get(parent) as number[]);
	startEdit(parent);
	const pos = positionMap.get(newElement);
	const newData = seri(newElement, false, SERI_HOOKS);
	fetch(window.location.pathname, {method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: newData,
		splice: 1
	})});
	return true;
}

export function deleteElement(target: Element) {
	if (target.tagName === 'NAV') return;
	const parent = target.parentElement as Element;
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

export function header(after: Element, isFirst: boolean) {
	const parent = isFirst ? after : (after.parentElement as Element);
	if (parent === d$n("main") || parent === document.body) {
		return document.createElement("h1");
	}
	
	let depth = 1;
	let cur = parent;
	while (cur != d$n("main")) {
		if (cur.matches("section, article")) depth++;
		cur = cur.parentElement as Element;
	}
	if (depth > 6) depth = 6;
	return document.createElement(`h${depth}`);
}

export function menuInsert(factory: string | ElementFactory, addHeader: boolean) {
	return function () {
		newElementFactory = factory;
		newElementAddHeader = addHeader;
		startTargeting(insertElement);
	}
}