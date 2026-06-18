import { seri, deseri, getColor } from "/shared/posts/seri.js";
import { $ } from "/client/jquery.js";

const S = window.getSelection();
let undoBuffer = [];
let redoBuffer = [];

export function tryUndo(target) {
	if (undoBuffer.length === 0) return false;
	redoBuffer.push(seri(target));
	target.innerHTML = deseri(undoBuffer.pop(), window.location.pathname, true);
	return true;
}

export function tryRedo(target) {
	if (redoBuffer.length === 0) return false;
	undoBuffer.push(seri(target));
	target.innerHTML = deseri(redoBuffer.pop(), window.location.pathname, true);
	return true;
}

export function clearHistory() {
	undoBuffer = [];
	redoBuffer = [];
}

export function runCommand(e, command) {
	const range = S.getRangeAt(0);
	if (range.collapsed) throw -1;

	e.preventDefault();
	undoBuffer.push(seri(e.target));

	$(e.target).find('.select-marker').remove();
	
	const affected = collectAffected(range, e.target);
	const allOn = annotateFormats(affected, e.target, command);

	const startMarker = insertMarker(affected, e.target);
	const applied = applyCommand(affected, command, allOn);
	const endMarker = document.createElement("span");
	endMarker.classList.add("select-marker");

	applied.append(endMarker);
	startMarker.after(applied);

	range.setStartAfter(startMarker);
	range.setEndBefore(endMarker);
	S.removeAllRanges();
	S.addRange(range);

	normalizeEditable(e.target);
}

function collectAffected(range, root) {
	function ascendEdge(affected, idx, root, prev, forgive) {
		let node = affected[idx].node;
		const key = prev ? "previousSibling" : "nextSibling";
		while (node != root && node.parentElement) {
			if (toCommand(node) === 'keep') {
				if (!forgive) throw -1;
				affected[idx] = {node: node};
			};
			if (node[key]) forgive = false;
			node = node.parentElement;
		}
	}
	
	const affected = [];
	let cur = null;
	if (range.startContainer.nodeType === Node.TEXT_NODE) {
		cur = range.startContainer;
		affected.push({node: cur, startOffset: range.startOffset});
	} else {
		cur = descendRight(range.startContainer, range.startOffset);
		affected.push({node: cur});
	}
	ascendEdge(affected, 0, root, true, range.startContainer.nodeType !== Node.TEXT_NODE || range.startOffset === 0);

	cur = descendRight(nextNode(affected[0].node));
	while (cur != null && range.intersectsNode(cur)) {
		affected.push({node: cur});
		cur = descendRight(nextNode(cur));
	}

	if (range.endContainer.nodeType === Node.TEXT_NODE) {
		const startOffset = affected.pop()?.startOffset;
		if (startOffset) {
			affected.push({node: range.endContainer, startOffset: startOffset, endOffset: range.endOffset});
		} else affected.push({node: range.endContainer, endOffset: range.endOffset});
	}
	ascendEdge(affected, affected.length - 1, root, false, range.endContainer.nodeType !== Node.TEXT_NODE || range.endOffset === range.endContainer.textContent.length);

	return affected;
}

function annotateFormats(affected, root, command) {
	let allOn = true;
	for (const e of affected) {
		if ((e.startOffset != undefined && e.startOffset === e.node.textContent.length) || e.endOffset === 0) {
			e.zero = true;
			continue;
		}
		let node = e.node.parentNode;
		e.on = false;
		if (node.nodeType !== Node.ELEMENT_NODE) continue;

		e.formats = [];
		while (node != root) {
			const cmd = toCommand(node);
			if (cmd === command) e.on = true;
			if (cmd === 'keep') throw -1;
			e.formats.push(cmd);
			node = node.parentElement;
		}
		if (!e.on) allOn = false;
	}

	if (command === 'a' && affected.length !== 1) return true;
	return allOn;
}

function insertMarker(affected, root) {
	const range = document.createRange();
	const last = affected[affected.length-1];

	if (last.endOffset != undefined) range.setStart(last.node, last.endOffset);
	else range.setStartAfter(last.node);
	range.setEndAfter(root.lastChild);
	const extracted = range.extractContents();

	const marker = document.createElement("span");
	marker.classList.add("select-marker");
	extracted.prepend(marker);
	root.append(extracted);

	return marker;
}

function applyCommand(affected, command, allOn) {
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
				if (!(args.length === 1 || args.length === 2)) throw -1;
				const link = args[0];
				const display = (args.length === 2) ? args[1] : args[0];
				const newElement = document.createElement('a');
				newElement.setAttribute("href", link);
				newElement.textContent = display;
				el.remove();
				el = newElement;
			} else if (allOn && el.nodeName === 'A') {
				const link = el.getAttribute("href");
				const display = document.createDocumentFragment();
				display.append(...el.childNodes);
				if (display.childNodes.length === 1 && display.textContent === link) {
					el.remove();
					el = document.createTextNode(link);
				} else {
					display.prepend(`${link}|`);
					el.remove();
					el = display;
				}
			}
		}
		for (const format of e.formats) {
			if (e.on && format === command) continue;
			if (command === 'ins' && format === 'del' || command === 'del' && format === 'ins' ||
			command === 'sup' && format === 'sub' || command === 'sub' && format === 'sup' ||
			command.startsWith('color') && format.startsWith('color') ||
			command.startsWith('colorbox') && format.startsWith('colorbox')) continue;
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

function nextNode(node) {
	if (node == null) return null;
	return node.nextSibling ?? nextNode(node.parentNode);
}

function descendRight(node, offset) {
	if (node == null) return null;
	if (offset != undefined) {
		if (node.childNodes[offset] == undefined) node = nextNode(node);
		node = node.childNodes[offset];
	}
	while (node.nodeType !== Node.TEXT_NODE) {
		if (toCommand(node) === 'keep') return node;
		if (node.firstChild == null) node = nextNode(node);
		if (node == null) return null;
		if (node.firstChild != null) node = node.firstChild;
	}
	return node;
}

const SYMBOLS = {".": "·", "st": "★"};

export function tabCommand(e) {
	if (
		!S.rangeCount ||
		(S.anchorNode == S.focusNode &&
		S.anchorOffset == S.focusOffset &&
		S.anchorOffset == 0)
	) return;

	e.preventDefault();
	if (!S.isCollapsed) {
		S.collapseToEnd();
		throw -1;
	}

	const cdata = findCloseBracket(e.target);
	const closeTextNode = cdata.text;
	const closeFlag = cdata.flag;
	const cmd = cdata.cmd;

	let closeIdx = closeFlag === 2 ? 
		closeTextNode.textContent.lastIndexOf("]", S.anchorOffset-1) : 
		closeTextNode.textContent.lastIndexOf("]");
	let cursorIdx = closeFlag === 2 ? 
		S.anchorOffset : 
		closeTextNode.textContent.length;
	
	if (SYMBOLS[cmd] != undefined) {
		const range = document.createRange();
		range.setStart(closeTextNode, closeIdx);
		range.setEnd(closeTextNode, cursorIdx);
		range.deleteContents();

		range.insertNode(document.createTextNode(SYMBOLS[cmd]));
		S.removeAllRanges();
		S.addRange(range);
		S.collapseToEnd();
		normalizeEditable(e.target);
		return;
	}

	const odata = findOpenBracket(closeTextNode, e.target);
	const openTextNode = odata.text;
	const openFlag = odata.flag;

	let command = null;
	if (cmd === "b") command = "strong";
	else if (cmd === "u") command = "em";
	else if (cmd === ".") command = "sup";
	else if (cmd === ",") command = "sub";
	else if (cmd === "d") command = "del";
	else if (cmd === "e") command = "ins";
	else if ("0" <= cmd && cmd <= "9") command = `color${cmd}`;
	else if (cmd === "a") command = "a";
	else throw -1;

	const openIdx = openFlag === 1 ? 
		openTextNode.textContent.lastIndexOf("[", S.anchorOffset-1) : 
		openTextNode.textContent.lastIndexOf("[");

	const openText = openTextNode.textContent;
	openTextNode.textContent = openText.substring(0, openIdx) + openText.substring(openIdx+1);
	if (openTextNode === closeTextNode) {
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

	runCommand(e, command);
	S.collapseToEnd();
}

function findCloseBracket(root) {
	let cur = S.anchorNode;
	let cmd = null, flag = 0;
	if (cur.nodeType !== Node.TEXT_NODE) {
		cur = descendLeft(cur, S.anchorOffset);
	} else if (S.anchorOffset === 0) {
		cur = descendLeft(prevNode(cur));
	} else {
		if (S.anchorOffset === 1) throw -1;
		let text = cur.textContent.substring(0, S.anchorOffset);
		if (!text.includes("]")) throw -1;
		cmd = k2e(text.match(/\]([^\]]*)$/)[1]).toLowerCase();
		if (cmd.length === 0) throw -1;
		flag = 2;
	}
	while (!flag && cur) {
		let text = cur.textContent;
		if (text.length === 0) {
			cur = descendLeft(prevNode(cur));
			if (!root.contains(cur)) throw -1;
			continue;
		}
		if (!text.includes("]")) throw -1;
		cmd = k2e(text.match(/\]([^\]]*)$/)[1]).toLowerCase();
		if (cmd.length === 0) throw -1;
		flag = 1;
	}
	if (cmd == null) throw -1;

	return {
		text: cur,
		cmd: cmd,
		flag: flag
	};
}

function findOpenBracket(closeText, root) {
	let cur = closeText;
	let flag = 1;
	while (cur) {
		if (cur.textContent.includes("[")) break;
		cur = descendLeft(prevNode(cur));
		if (!root.contains(cur)) throw -1;
		flag = 0;
	}
	if (!cur || !cur.textContent.includes("[")) throw -1;
	return {
		text: cur,
		flag: flag
	};
}

function prevNode(node) {
	if (node == null) return null;
	return node.previousSibling ?? prevNode(node.parentNode);
}

function descendLeft(node, offset) {
	if (node == null) return null;
	if (offset != undefined) {
		if (offset === 0 || node.childNodes[offset-1] == undefined) node = prevNode(node);
		node = node.childNodes[offset-1];
	}
	while (node.nodeType !== Node.TEXT_NODE) {
		if (toCommand(node) === 'keep') return node;
		if (node.lastChild == null) node = prevNode(node);
		if (node == null) return null;
		if (node.lastChild != null) node = node.lastChild;
	}
	return node;
}

export function normalizeEditable(el) {
	if (el.classList.contains("select-marker")) return;

	let cur = el.firstChild;

	function removeNode(n) {
		const next = n.nextSibling;
		el.removeChild(n);
		return next;
	}

	while (cur != null) {
		if (cur.nodeType === Node.TEXT_NODE) {
			if (
				cur.textContent === '' ||
				(cur.textContent === '\n' &&
				cur.previousSibling == null &&
				cur.nextSibling == null)
			) {
				cur = removeNode(cur);
				continue;
			}
			const prev = cur.previousSibling;
			if (prev != null && prev.nodeType === Node.TEXT_NODE) {
				prev.textContent += cur.textContent;
				cur = removeNode(cur);
				continue;
			}
			cur = cur.nextSibling;
			continue;
		}
		if (cur.nodeType !== Node.ELEMENT_NODE || toCommand(cur) === 'keep') {
			cur = cur.nextSibling;
			continue;
		}
		normalizeEditable(cur);
		const prev = cur.previousSibling;
		if (
			prev != null &&
			prev.nodeType === Node.ELEMENT_NODE &&
			toCommand(prev) === toCommand(cur)
		) {
			while (cur.firstChild) prev.appendChild(cur.firstChild);
		}
		if (cur.firstChild == null) {
			cur = removeNode(cur);
			continue;
		}
		cur = cur.nextSibling;
	}

	el.normalize();
}

function toCommand(node) {
	if (node.nodeType === Node.TEXT_NODE) return 'text';
	if (node.tagName === "SPAN") {
		if (node.classList.contains('color')) {
			return `color${getColor(node.classList)}`;
		} else if (node.classList.contains('colorbox')) {
			return `colorbox${getColor(node.classList)}`;
		}
		return 'keep';
	}
	const commands = ['STRONG', 'EM', 'SUP', 'SUB', 'INS', 'DEL'];
	if (!commands.includes(node.tagName)) return 'keep';
	return node.tagName.toLowerCase();
}

function toElement(cmd) {
	if (cmd === 'keep') throw -1;
	if (cmd.startsWith('colorbox')) {
		const el = document.createElement('span');
		el.classList.add("colorbox", `c${cmd.substring(8)}`);
		return el;
	}
	if (cmd.startsWith('color')) {
		const el = document.createElement('span');
		el.classList.add("color", `c${cmd.substring(5)}`);
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
	let result = '';
	for (const ch of str) {
		const c = ch.charCodeAt(0);
		if (0x1100 <= c && c <= 0x1112) { result += chcode[c - 0x1100]; continue; }
		if (0x1161 <= c && c <= 0x1175) { result += jucode[c - 0x1161]; continue; }
		if (0x11a8 <= c && c <= 0x11c2) { result += jocode[c - 0x11a7]; continue; }
		if (0x3131 <= c && c <= 0x314e) { result += cscode[c - 0x3130]; continue; }
		if (0x314f <= c && c <= 0x3163) { result += jucode[c - 0x314f]; continue; }
		if (0xac00 <= c && c <= 0xd7a3) {
			c -= 0xac00;
			const chidx = Math.floor(c / 588);
			const juidx = Math.floor((c%588) / 28);
			const joidx = c%28;
			result += chcode[chidx];
			result += jucode[juidx];
			if (joidx===0) continue;
			result += jocode[joidx];
			continue;
		}
		result += ch;
	}
	return result;
}