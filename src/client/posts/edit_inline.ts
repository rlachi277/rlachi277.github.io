import type { SeriData } from "../../shared/posts/seri.js";

import { seri, deseri, getColor } from "../../shared/posts/seri.js";
import { k2e } from "../k2e.js";
import { SERI_HOOKS, DESERI_HOOKS } from "./script.js";
import { showWarning } from "./dialog.js";
import { $ } from "../query.js";

type Affected = {
	node: Text | Element,
	startOffset?: number,
	endOffset?: number
};
type AffectedWithFormats  = Affected & {
	formats: string[],
	on: boolean,
	zero: boolean
};

const S = window.getSelection() as Selection;
let undoBuffer: SeriData[] = [];
let redoBuffer: SeriData[] = [];

function clearHistory() {
	undoBuffer = [];
	redoBuffer = [];
}

export function inlineCommands(this: Element, shortcut: boolean, e: KeyboardEvent) {
	if (shortcut) {
		let command = null;
		if (e.key === "z" && e.shiftKey) command = "redo";
		else if (e.key === "z") command = "undo";
		else if (e.key === "b") command = "strong";
		else if (e.key === "u") command = "em";
		else if (e.key === ".") command = "sup";
		else if (e.key === ",") command = "sub";
		else if (e.key === "d") command = "del";
		else if (e.key === "e") command = "ins";
		else if (e.key === "x" && e.shiftKey) command = "s";
		else if (e.key === "k") command = "a";
		else if ("0" <= e.key && e.key <= "9") command = `c:${e.key}`;
		else if (e.key === ";") command = "align-center";
		else if (e.key === "'") command = "align-right";
		else return false;
		
		if (command === "undo") {
			if (undoBuffer.length === 0) return false;
			redoBuffer.push(seri(this, true, SERI_HOOKS) ?? "오류");
			this.innerHTML = deseri(undoBuffer.pop() ?? "오류", window.location.pathname, true, DESERI_HOOKS) ?? "오류";
			e.preventDefault();
			return true;
		} else if (command === "redo") {
			if (redoBuffer.length === 0) return false;
			undoBuffer.push(seri(this, true, SERI_HOOKS) ?? "오류");
			this.innerHTML = deseri(redoBuffer.pop() ?? "오류", window.location.pathname, true, DESERI_HOOKS) ?? "오류";
			e.preventDefault();
			return true;
		}
		try {
			runCommand.call(this, e, command);
		} catch (e) {
			if (e !== -1) throw e;
			return false;
		}
		return true;
	}
	if (e.key === "Tab") {
		try {
			tabCommand.call(this, e);
		} catch (e) {
			if (e !== -1) throw e;
			return false;
		}
		return true;
	}
	clearHistory();
	return false;
}

function runCommand(this: Element, e: KeyboardEvent, command: string) {
	const range = S.getRangeAt(0);
	if (range.collapsed) throw -1;

	e.preventDefault();
	undoBuffer.push(seri(this, true, SERI_HOOKS) ?? "오류");

	$('.select-marker:not(.tab-select-marker)', this).remove();
	
	const affected = collectAffected(range, this);
	const allOn = annotateFormats(affected, this, command);

	const annotated = affected as AffectedWithFormats[];
	const startMarker = insertMarker(annotated, this);
	const applied = applyCommand(annotated, command, allOn);
	const endMarker = document.createElement("span");
	endMarker.classList.add("select-marker");

	applied.append(endMarker);
	startMarker.after(applied);

	normalizeEditable(this);
	returnToMarker(startMarker, endMarker);
}

function collectAffected(range: Range, root: Element): Affected[] {
	function ascendEdge(idx: number, prev: boolean, forgive: boolean) {
		let node = affected[idx].node;
		const key = prev ? "previousSibling" : "nextSibling";
		while (node !== root && node.parentElement !== null) {
			if (toCommand(node) === 'keep') {
				if (!forgive) {
					showWarning("부분적 서식 적용이 불가합니다.");
					throw -1;
				}
				affected[idx] = {node: node};
			};
			if (node[key]) forgive = false;
			node = node.parentElement;
		}
	}
	
	const affected: Affected[] = [];
	let cur = null;
	if (range.startContainer instanceof Text) {
		cur = range.startContainer;
		affected.push({node: cur, startOffset: range.startOffset});
	} else {
		cur = descendRight(range.startContainer, range.startOffset);
		if (cur === null) {
			showWarning("오류");
			throw -1;
		}
		affected.push({node: cur});
	}
	ascendEdge(0, true, !(range.startContainer instanceof Text) || range.startOffset === 0);

	cur = descendRight(nextNode(affected[0].node));
	while (cur !== null && range.intersectsNode(cur)) {
		affected.push({node: cur});
		cur = descendRight(nextNode(cur));
	}

	if (range.endContainer instanceof Text) {
		const startOffset = affected.pop()?.startOffset;
		if (startOffset) {
			affected.push({node: range.endContainer, startOffset: startOffset, endOffset: range.endOffset});
		} else affected.push({node: range.endContainer, endOffset: range.endOffset});
	}
	ascendEdge(affected.length - 1, false, !(range.endContainer instanceof Text) || range.endOffset === range.endContainer.textContent?.length);

	return affected;
}

function annotateFormats(affected: Affected[], root: Element, command: string): boolean {
	let allOn = true;
	const annotated = affected as AffectedWithFormats[];
	for (const e of annotated) {
		if ((e.startOffset !== undefined && e.startOffset === e.node.textContent?.length) || e.endOffset === 0) {
			e.zero = true;
			continue;
		}
		e.on = false;
		const node = e.node.parentNode;
		if (!(node instanceof Element)) continue;
		let nodeEl: Element = node;
	
		e.formats = [];
		while (nodeEl !== root && nodeEl.parentElement !== null) {
			const cmd = toCommand(nodeEl);
			if (cmd === command) e.on = true;
			if (cmd === 'keep') {
				showWarning("부분적 서식 적용이 불가합니다.");
				throw -1;
			}
			e.formats.push(cmd);
			nodeEl = nodeEl.parentElement;
		}
		if (!e.on) allOn = false;
	}

	if (command === 'a' && annotated.length !== 1) return true;
	return allOn;
}

function insertMarker(affected: AffectedWithFormats[], root: Element): HTMLSpanElement {
	const range = document.createRange();
	const last = affected[affected.length-1];

	if (last.endOffset !== undefined) range.setStart(last.node, last.endOffset);
	else range.setStartAfter(last.node);
	range.setEndAfter(root.lastChild ?? last.node);
	const extracted = range.extractContents();

	const marker = document.createElement("span");
	marker.classList.add("select-marker");
	extracted.prepend(marker);
	root.append(extracted);

	return marker;
}

function applyCommand(affected: AffectedWithFormats[], command: string, allOn: boolean): DocumentFragment {
	const result = document.createDocumentFragment();

	for (const e of affected) {
		if (e.zero) continue;
		let el = e.node;
		if (e.startOffset) {
			el = document.createTextNode(el.textContent.substring(e.startOffset));
			e.node.textContent = e.node.textContent.substring(0, e.startOffset);
		}
		if (command === 'a') {
			if (!allOn && el.nodeName !== 'A') {
				const args = el.textContent.split('|');
				if (!(args.length === 1 || args.length === 2)) {
					showWarning("올바르지 않은 링크 명령어입니다.")
					throw -1;
				}
				const link = args[0];
				const display = (args.length === 2) ? args[1] : args[0];
				const newElement = document.createElement('a');
				newElement.setAttribute("href", link);
				newElement.textContent = display;
				el.remove();
				el = newElement;
			} else if (allOn && el instanceof Element && el.nodeName === 'A') {
				const link = el.getAttribute("href");
				const display = document.createDocumentFragment();
				display.append(...el.childNodes);
				if (display.childNodes.length === 1 && display.textContent === link) {
					el.remove();
					el = document.createTextNode(link);
				} else {
					display.prepend(`${link}|`);
					el.remove();
					el = display as unknown as Element; // trust me bro
				}
			}
		}
		for (const format of e.formats) {
			if (e.on && format === command) continue;
			if (command === 'ins' && format === 'del' || command === 'del' && format === 'ins' ||
			command === 'sup' && format === 'sub' || command === 'sub' && format === 'sup' ||
			command.startsWith('c:') && format.startsWith('c:') ||
			command.startsWith('cb:') && format.startsWith('cb:') ||
			command.startsWith('align') && format.startsWith('align')) continue;
			const newElement = toElement(format);
			newElement.append(el);
			el = newElement;
		}
		if (command !== "a" && !allOn) {
			const newElement = toElement(command);
			newElement.append(el);
			el = newElement;
		}
		result.append(el);
	}

	return result;
}

function nextNode(node: Node | null): Node | null {
	if (node === null) return null;
	let next = node.nextSibling;
	while (next !== null && next instanceof HTMLElement && next.classList.contains("select-marker")) next = next.nextSibling;
	return next ?? nextNode(node.parentNode);
}

function descendRight(node: Node | null, offset: number | undefined = undefined): Text | Element | null {
	if (node === null) return null;
	if (offset !== undefined) {
		if (node.childNodes[offset] === undefined) node = nextNode(node);
		node = node?.childNodes[offset] ?? null;
	}
	while (node !== null && !(node instanceof Text)) {
		if (toCommand(node) === 'keep') return node as Element;
		if (node.firstChild === null) node = nextNode(node);
		if (node === null) return null;
		if (node.firstChild !== null) node = node.firstChild;
	}
	return node;
}

const SYMBOLS: Record<string,string> = {".": "·", "st": "☆", "--": "—", "nb": " "};

function tabCommand(this: Element, e: KeyboardEvent) {
	if (
		!S.rangeCount ||
		(S.anchorNode == S.focusNode &&
		S.anchorOffset == S.focusOffset &&
		S.anchorOffset == 0)
	) throw -1;

	if (!S.isCollapsed) {
		S.collapseToEnd();
		e.preventDefault();
		throw -1;
	}

	undoBuffer.push(seri(this, true, SERI_HOOKS) ?? "오류");

	const cdata = findCloseBracket(this);
	const closeTextNode = cdata.text;
	const closeFlag = cdata.flag;
	const cmd = cdata.cmd;

	const closeTextContent = closeTextNode.textContent;
	let closeIdx = closeFlag === 2 ?
		closeTextContent.lastIndexOf("]", closeTextContent.lastIndexOf("]", S.anchorOffset-1)-1) :
		closeTextContent.lastIndexOf("]", closeTextContent.lastIndexOf("]")-1);
	let cursorIdx = closeFlag === 2 ?
		closeTextContent.lastIndexOf("]", S.anchorOffset-1) + 1 :
		closeTextContent.lastIndexOf("]") + 1;
	
	if (Object.hasOwn(SYMBOLS, cmd)) {
		const range = document.createRange();
		range.setStart(closeTextNode, closeIdx);
		range.setEnd(closeTextNode, cursorIdx);
		range.deleteContents();

		const { startMarker, endMarker } = markCursor();

		range.insertNode(document.createTextNode(SYMBOLS[cmd]));
		normalizeEditable(this);
		returnToMarker(startMarker, endMarker);
		e.preventDefault();
		return;
	}

	const odata = findOpenBracket(closeTextNode, this);
	const openTextNode = odata.text;
	const openFlag = odata.flag;

	e.preventDefault();

	let command = null;
	if (cmd === "b") command = "strong";
	else if (cmd === "u") command = "em";
	else if (cmd === "^" || cmd === "sup") command = "sup";
	else if (cmd === "_" || cmd === "sub") command = "sub";
	else if (cmd === "d" || cmd === "del") command = "del";
	else if (cmd === "e" || cmd === "ins") command = "ins";
	else if (cmd === "s") command = "s";
	else if (0 <= parseInt(cmd) && parseInt(cmd) <= 10) command = `c:${cmd}`; // goodbye cursed JS moment
	else if (cmd.startsWith("cb:")) command = `cb:${cmd.substring(3)}`;
	else if (cmd.startsWith("cb")) command = `cb:${cmd.substring(2)}`;
	else if (cmd.startsWith("c:")) command = `c:${cmd.substring(2)}`;
	else if (cmd.startsWith("c")) command = `c:${cmd.substring(1)}`;
	else if (cmd === "a" || cmd === "k") command = "a";
	else if (cmd === ";" || cmd === "center") command = "align-center";
	else if (cmd === "'" || cmd === "right") command = "align-right";
	else if (cmd === "o" || cmd === "overline") command = "overline";
	if (command === null) {
		showWarning("올바르지 않은 탭 명령어입니다.");
		throw -1;
	}

	const openIdx = (openFlag === 1 && closeFlag === 2) ?
		openTextNode.textContent.lastIndexOf("[", S.anchorOffset-1) :
		openTextNode.textContent.lastIndexOf("[");

	const { startMarker, endMarker } = markCursor();

	const openText = openTextNode.textContent;
	openTextNode.textContent = openText.substring(0, openIdx) + openText.substring(openIdx+1);
	if (openFlag === 1) {
		closeIdx--;
		cursorIdx--;
	}
	const closeText = closeTextNode.textContent;
	closeTextNode.textContent = closeText.substring(0, closeIdx) + closeText.substring(cursorIdx);

	const range = document.createRange();
	range.setStart(openTextNode, openIdx);
	range.setEnd(closeTextNode, closeIdx);
	S.removeAllRanges();
	S.addRange(range);

	runCommand.call(this, e, command);
	returnToMarker(startMarker, endMarker);
}

function findCloseBracket(root: Element): {text: Text, cmd: string, flag: number} {
	let cur = S.anchorNode;
	let cmd: string | null = null, flag = 0;
	if (!(cur instanceof Text)) {
		cur = descendLeft(cur, S.anchorOffset);
	} else if (S.anchorOffset === 0) {
		cur = descendLeft(prevNode(cur));
	} else {
		if (S.anchorOffset === 1) throw -1;
		const text = cur.textContent.substring(0, S.anchorOffset).split(']');
		if (text.length < 3) throw -1;
		cmd = k2e(text.at(-2) as string).toLowerCase();
		if (cmd.length === 0) throw -1;
		flag = 2;
	}
	while (!flag && (cur instanceof Text)) {
		const text = cur.textContent.split(']');
		if (text.length < 3) {
			cur = descendLeft(prevNode(cur));
			if (!root.contains(cur)) throw -1;
			continue;
		}
		cmd = k2e(text.at(-2) as string).toLowerCase();
		if (cmd.length === 0) throw -1;
		flag = 1;
	}
	if (!(cur instanceof Text) || cmd === null) throw -1;

	return {
		text: cur,
		cmd: cmd,
		flag: flag
	};
}

function findOpenBracket(closeText: Text, root: Element): {text: Text, flag: number} {
	let cur: Text | Element | null = closeText;
	let flag = 1;
	while (cur instanceof Text) {
		if (cur.textContent.includes("[")) break;
		cur = descendLeft(prevNode(cur));
		if (!root.contains(cur)) throw -1;
		flag = 0;
	}
	if (!(cur instanceof Text) || !cur.textContent.includes("[")) throw -1;
	return {
		text: cur,
		flag: flag
	};
}

function prevNode(node: Node | null): Node | null {
	if (node === null) return null;
	let prev = node.previousSibling;
	while (prev !== null && prev instanceof HTMLElement && prev.classList.contains("select-marker")) prev = prev.previousSibling;
	return prev ?? prevNode(node.parentNode);
}

function descendLeft(node: Node | null, offset: number | undefined = undefined): Text | Element | null {
	if (node === null) return null;
	if (offset !== undefined) {
		if (offset === 0 || node.childNodes[offset-1] === undefined) node = prevNode(node);
		node = node?.childNodes[offset-1] ?? null;
	}
	while (node !== null && !(node instanceof Text)) {
		if (toCommand(node) === 'keep') return node as Element;
		if (node.lastChild === null) node = prevNode(node);
		if (node === null) return null;
		if (node.lastChild !== null) node = node.lastChild;
	}
	return node;
}

function markCursor(): {startMarker: HTMLSpanElement, endMarker: HTMLSpanElement} {
	const startMarker = document.createElement("span");
	startMarker.classList.add("select-marker", "tab-select-marker");
	const endMarker = document.createElement("span");
	endMarker.classList.add("select-marker", "tab-select-marker");

	const cursor = S.getRangeAt(0);
	cursor.insertNode(startMarker);
	startMarker.after(endMarker);
	return {
		startMarker: startMarker,
		endMarker: endMarker
	};
}

function returnToMarker(startMarker: HTMLSpanElement, endMarker: HTMLSpanElement) {
	const cursor = document.createRange();
	cursor.setStartAfter(startMarker);
	cursor.setEndBefore(endMarker);
	S.removeAllRanges();
	S.addRange(cursor);
	startMarker.remove();
	endMarker.remove();
}

function normalizeEditable(el: Element) {
	if (el.classList.contains("select-marker")) return;

	let cur = el.firstChild;

	function removeNode(n: Node) {
		const next = n.nextSibling;
		el.removeChild(n);
		return next;
	}

	while (cur !== null) {
		if (cur instanceof Text) {
			if (
				cur.textContent === '' ||
				(cur.textContent === '\n' &&
				cur.previousSibling === null &&
				cur.nextSibling === null)
			) {
				cur = removeNode(cur);
				continue;
			}
			const prev = cur.previousSibling;
			if (prev !== null && prev instanceof Text) {
				prev.textContent += cur.textContent;
				cur = removeNode(cur);
				continue;
			}
			cur = cur.nextSibling;
			continue;
		}
		if (!(cur instanceof Element) || toCommand(cur) === 'keep') {
			cur = cur.nextSibling;
			continue;
		}
		normalizeEditable(cur);
		const prev = cur.previousSibling;
		if (
			prev instanceof Element &&
			toCommand(prev) === toCommand(cur)
		) {
			while (cur.firstChild) prev.appendChild(cur.firstChild);
		}
		if (cur.firstChild === null) {
			cur = removeNode(cur);
			continue;
		}
		cur = cur.nextSibling;
	}

	el.normalize();
}

function toCommand(node: Node): string {
	if (node instanceof Text) return 'text';
	if (!(node instanceof Element)) return 'keep';
	if (node.tagName === "SPAN") {
		if (node.classList.contains('color')) {
			return `c:${getColor(node)}`;
		} else if (node.classList.contains('colorbox')) {
			return `cb:${getColor(node)}`;
		} else if (node.classList.contains('align')) {
			if (!node.classList.contains("align-center") && !node.classList.contains("align-right")) return "keep";
			return `align-${node.classList.contains("align-center") ? "center" : "right"}`;
		} else if (node.classList.contains('overline')) {
			return 'overline';
		}
		return 'keep';
	}
	const commands = ['STRONG', 'EM', 'SUP', 'SUB', 'INS', 'DEL', 'S'];
	if (!commands.includes(node.tagName)) return 'keep';
	return node.tagName.toLowerCase();
}

function toElement(cmd: string): Element {
	if (cmd === 'keep') {
		showWarning("부분적 서식 적용이 불가합니다.");
		throw -1;
	}
	if (cmd.startsWith('c:')) {
		const el = document.createElement('span');
		el.classList.add("color");
		el.setAttribute("data-color", cmd.substring(2));
		return el;
	}
	if (cmd.startsWith('cb:')) {
		const el = document.createElement('span');
		el.classList.add("colorbox");
		el.setAttribute("data-color", cmd.substring(3));
		return el;
	}
	if (cmd.startsWith('align')) {
		const el = document.createElement('span');
		el.classList.add("align", cmd);
		return el;
	}
	if (cmd === 'overline') {
		const el = document.createElement('span');
		el.classList.add("overline");
		return el;
	}
	return document.createElement(cmd);
}

export function inlineCleanup(target: Element) {
	if (target.innerHTML === '<br>' || target.innerHTML === '\n') target.innerHTML = '';
	const remove = $("font, span:not(.color, .colorbox, .align, .overline, .semantic, .select-marker)", target);
	if (target.lastChild?.nodeName === "BR" && target.lastChild.previousSibling?.nodeName !== "BR") remove.list.push(target.lastChild as HTMLElement); // br:true-last-child:not(br true+ br)
	if (remove.exists) {
		const { startMarker, endMarker } = markCursor();
		for (const e of remove.list) e.replaceWith(...e.childNodes);
		returnToMarker(startMarker, endMarker);
	}
}

export function blurCleanup(target: Element) {
	$('.select-marker:not(.dialog-marker)', target).list.forEach((e) => {
		e.replaceWith(...e.childNodes);
	});
	normalizeEditable(target);
	clearHistory();
}

export function submitCleanup(target: Element) {
	$(".dialog-marker", target).list.forEach((e) => {
		e.replaceWith(...e.childNodes);
	});
	normalizeEditable(target);
}