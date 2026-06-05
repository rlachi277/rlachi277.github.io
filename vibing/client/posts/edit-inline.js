import { serialize, deserialize, getColor } from "./seri.js";

const COMMAND_CANCELLED = -1;
const KEEP_COMMAND = "keep";
const TEXT_COMMAND = "text";
const SELECT_MARKER_CLASS = "select-marker";
const SUB_EDITABLE_TAGS = new Set(["STRONG", "EM", "SUP", "SUB", "INS", "DEL"]);

const selection = window.getSelection();
let undoBuffer = [];
let redoBuffer = [];

export function clearInlineHistory() {
	undoBuffer = [];
	redoBuffer = [];
}

export function undoInline(el) {
	if (undoBuffer.length === 0) return false;
	redoBuffer.push(serialize(el));
	el.innerHTML = deserialize(undoBuffer.pop(), window.location.pathname, true);
	return true;
}

export function redoInline(el) {
	if (redoBuffer.length === 0) return false;
	undoBuffer.push(serialize(el));
	el.innerHTML = deserialize(redoBuffer.pop(), window.location.pathname, true);
	return true;
}

export function runInlineCommand(event, command, onChange) {
	try {
		applyInlineCommand(event, command, onChange);
	} catch (error) {
		if (error !== COMMAND_CANCELLED) throw error;
	}
}

function applyInlineCommand(event, command, onChange) {
	const range = selection.getRangeAt(0);
	if (range.collapsed) return;

	event.preventDefault();
	undoBuffer.push(serialize(event.target));
	event.target.querySelectorAll(`.${SELECT_MARKER_CLASS}`).forEach((marker) => marker.remove());

	const affected = collectAffectedNodes(range, event.target);
	const allOn = annotateFormatState(affected, event.target, command);

	if (command === "a" && affected.length !== 1) throw COMMAND_CANCELLED;

	const markerStart = splitTrailingRange(range, affected, event.target);
	const rebuiltContent = rebuildAffectedNodes(affected, command, allOn);
	const markerEnd = document.createElement("span");
	markerEnd.classList.add(SELECT_MARKER_CLASS);
	rebuiltContent.append(markerEnd);
	markerStart.after(rebuiltContent);

	range.setStartAfter(markerStart);
	range.setEndBefore(markerEnd);
	selection.removeAllRanges();
	selection.addRange(range);

	normalizeEditable(event.target);
	onChange(event);
}

function collectAffectedNodes(range, root) {
	const affected = [];
	let current = null;

	if (range.startContainer.nodeType === Node.TEXT_NODE) {
		current = range.startContainer;
		affected.push({node: current, start_offset: range.startOffset});
	} else {
		current = toTextNode(range.startContainer, range.startOffset);
		affected.push({node: current});
	}

	widenEdgeToKeptNode(affected, 0, current, root, {
		forgive: range.startContainer.nodeType !== Node.TEXT_NODE || range.startOffset === 0,
		siblingKey: "previousSibling"
	});

	current = toTextNode(nextNode(affected[0].node));
	while (current != null && range.intersectsNode(current)) {
		affected.push({node: current});
		current = toTextNode(nextNode(current));
	}

	if (range.endContainer.nodeType === Node.TEXT_NODE) {
		const startOffset = affected.pop()?.start_offset;
		if (startOffset) {
			affected.push({
				node: range.endContainer,
				start_offset: startOffset,
				end_offset: range.endOffset
			});
		} else {
			affected.push({node: range.endContainer, end_offset: range.endOffset});
		}
	}

	widenEdgeToKeptNode(affected, affected.length - 1, affected[affected.length - 1].node, root, {
		forgive: range.endContainer.nodeType !== Node.TEXT_NODE ||
			range.endOffset === range.endContainer.textContent.length,
		siblingKey: "nextSibling"
	});

	return affected;
}

function widenEdgeToKeptNode(affected, affectedIndex, node, root, options) {
	let current = node;
	let forgive = options.forgive;

	while (current != root && current.parentElement) {
		if (toCommand(current) === KEEP_COMMAND) {
			if (!forgive) throw COMMAND_CANCELLED;
			affected[affectedIndex] = {node: current};
		}
		if (current[options.siblingKey]) forgive = false;
		current = current.parentElement;
	}
}

function annotateFormatState(affected, root, command) {
	let allOn = true;

	for (const entry of affected) {
		if (
			(entry.start_offset != undefined && entry.start_offset === entry.node.textContent.length) ||
			entry.end_offset === 0
		) {
			entry.zero = true;
			continue;
		}

		let node = entry.node.parentNode;
		entry.on = false;
		if (node.nodeType !== Node.ELEMENT_NODE) continue;

		entry.formats = [];
		while (node != root) {
			const activeCommand = toCommand(node);
			if (command === activeCommand) entry.on = true;
			if (command === KEEP_COMMAND) throw COMMAND_CANCELLED;
			entry.formats.push(activeCommand);
			node = node.parentElement;
		}
		if (!entry.on) allOn = false;
	}

	return allOn;
}

function splitTrailingRange(range, affected, root) {
	const last = affected[affected.length - 1];
	if (last.end_offset != undefined) range.setStart(last.node, last.end_offset);
	else range.setStartAfter(last.node);
	range.setEndAfter(root.lastChild);

	const trailingContent = range.extractContents();
	const markerStart = document.createElement("span");
	markerStart.classList.add(SELECT_MARKER_CLASS);
	trailingContent.prepend(markerStart);
	root.append(trailingContent);
	return markerStart;
}

function rebuildAffectedNodes(affected, command, allOn) {
	const fragment = document.createDocumentFragment();

	for (const entry of affected) {
		if (entry.zero) continue;

		let node = entry.node;
		if (entry.start_offset) {
			node = document.createTextNode(entry.node.textContent.substring(entry.start_offset));
			entry.node.textContent = entry.node.textContent.substring(0, entry.start_offset);
		}
		if (command === "a") node = toggleLinkNode(node);
		node = reapplyExistingFormats(node, entry, command);
		if (command !== "a" && !allOn) {
			const wrapper = toElement(command);
			wrapper.append(node);
			node = wrapper;
		}

		fragment.append(node);
	}

	return fragment;
}

function toggleLinkNode(node) {
	if (node.nodeName !== "A") {
		const parts = node.textContent.split("|");
		if (parts.length < 1 || parts.length > 2) throw COMMAND_CANCELLED;

		const link = parts[0];
		const display = (parts.length === 2) ? parts[1] : parts[0];
		const linkElement = document.createElement("a");
		linkElement.setAttribute("href", link);
		linkElement.textContent = display;
		node.remove();
		return linkElement;
	}

	const link = node.getAttribute("href");
	const display = node.textContent;
	const text = (link === display) ? link : `${link}|${display}`;
	node.remove();
	return document.createTextNode(text);
}

function reapplyExistingFormats(node, entry, command) {
	let current = node;

	for (const format of entry.formats) {
		if (entry.on && format === command) continue;
		if (formatsConflict(command, format)) continue;
		const wrapper = toElement(format);
		wrapper.append(current);
		current = wrapper;
	}

	return current;
}

function formatsConflict(command, format) {
	return command === "ins" && format === "del" ||
		command === "del" && format === "ins" ||
		command === "sup" && format === "sub" ||
		command === "sub" && format === "sup" ||
		command !== format && (
			command.startsWith("color") && format.startsWith("color") ||
			command.startsWith("colorbox") && format.startsWith("colorbox")
		);
}

export function tabCommand(event, onChange) {
	if (
		!selection.rangeCount ||
		selection.anchorNode == selection.focusNode &&
		selection.anchorOffset == selection.focusOffset &&
		selection.anchorOffset == 0
	) return;

	event.preventDefault();
	if (!selection.isCollapsed) {
		selection.collapseToEnd();
		return;
	}

	const shortcut = findTabShortcut(event.target);
	if (shortcut == null) return;

	if (shortcut.command === "." || shortcut.command === "st") {
		replaceSymbolShortcut(event.target, shortcut, onChange);
		return;
	}

	const command = inlineCommandForTabShortcut(shortcut.command);
	if (command == null) return;

	applyBracketShortcut(event, shortcut, command, onChange);
}

function findTabShortcut(root) {
	let lastText = selection.anchorNode;
	let firstText = lastText;
	let command = null;
	let closeMode = 0;

	if (lastText.nodeType !== Node.TEXT_NODE) {
		lastText = toTextNodePrev(lastText, selection.anchorOffset);
	} else if (selection.anchorOffset === 0) {
		lastText = toTextNodePrev(prevNode(lastText));
	} else {
		if (selection.anchorOffset === 1) return null;
		const text = lastText.textContent.substring(0, selection.anchorOffset);
		if (!text.includes("]")) return null;
		command = k2e(text.match(/\]([^\]]*)$/)[1]).toLowerCase();
		if (command.length === 0) return null;
		firstText = lastText;
		closeMode = 2;
	}

	while (!closeMode && lastText) {
		const text = lastText.textContent;
		if (text.length === 0) {
			lastText = toTextNodePrev(prevNode(lastText));
			continue;
		}
		if (!text.includes("]")) return null;
		command = k2e(text.match(/\]([^\]]*)$/)[1]).toLowerCase();
		if (command.length === 0) return null;
		firstText = lastText;
		closeMode = 1;
	}

	if (command == null) throw COMMAND_CANCELLED;
	if (command === "." || command === "st") {
		return {
			command: command,
			firstText: firstText,
			lastText: lastText,
			closeMode: closeMode
		};
	}

	let openMode = 1;
	while (firstText) {
		if (firstText.textContent.includes("[")) break;
		firstText = toTextNodePrev(prevNode(firstText));
		if (!root.contains(firstText)) return null;
		openMode = 0;
	}
	if (!firstText || !firstText.textContent.includes("[")) return null;

	return {
		command: command,
		firstText: firstText,
		lastText: lastText,
		openMode: openMode,
		closeMode: closeMode
	};
}

function replaceSymbolShortcut(root, shortcut, onChange) {
	const closeIndex = shortcut.closeMode === 2
		? shortcut.lastText.textContent.lastIndexOf("]", selection.anchorOffset - 1)
		: shortcut.lastText.textContent.lastIndexOf("]");
	const cursorIndex = shortcut.closeMode === 2
		? selection.anchorOffset
		: shortcut.lastText.textContent.length;
	const range = document.createRange();
	range.setStart(shortcut.lastText, closeIndex);
	range.setEnd(shortcut.lastText, cursorIndex);
	range.deleteContents();

	const symbols = {".": "·", "st": "★"};
	range.insertNode(document.createTextNode(symbols[shortcut.command]));
	selection.removeAllRanges();
	selection.addRange(range);
	selection.collapseToEnd();
	normalizeEditable(root);
	onChange({target: root});
}

function inlineCommandForTabShortcut(command) {
	if (command === "b") return "strong";
	if (command === "u") return "em";
	if (command === ".") return "sup";
	if (command === ",") return "sub";
	if (command === "d") return "del";
	if (command === "e") return "ins";
	if ("0" <= command && command <= "9") return `color${command}`;
	if (command === "a") return "a";
	return null;
}

function applyBracketShortcut(event, shortcut, command, onChange) {
	const openIndex = shortcut.openMode === 1
		? shortcut.firstText.textContent.lastIndexOf("[", selection.anchorOffset - 1)
		: shortcut.firstText.textContent.lastIndexOf("[");
	let closeIndex = shortcut.closeMode === 2
		? shortcut.lastText.textContent.lastIndexOf("]", selection.anchorOffset - 1)
		: shortcut.lastText.textContent.lastIndexOf("]");
	const cursorIndex = shortcut.closeMode === 2
		? selection.anchorOffset
		: shortcut.lastText.textContent.length;

	const firstText = shortcut.firstText.textContent;
	shortcut.firstText.textContent = firstText.substring(0, openIndex) + firstText.substring(openIndex + 1);
	if (shortcut.firstText === shortcut.lastText) closeIndex--;

	const lastText = shortcut.lastText.textContent;
	shortcut.lastText.textContent = lastText.substring(0, closeIndex) + lastText.substring(cursorIndex);

	const range = document.createRange();
	range.setStart(shortcut.firstText, openIndex);
	range.setEnd(shortcut.lastText, closeIndex);
	selection.removeAllRanges();
	selection.addRange(range);
	runInlineCommand(event, command, onChange);
	selection.collapseToEnd();
}

function nextNode(node) {
	if (node == null) return null;
	return node.nextSibling ?? nextNode(node.parentNode);
}

function toTextNode(node, offset) {
	if (node == null) return null;
	if (offset != undefined) {
		if (node.childNodes[offset] == undefined) node = nextNode(node);
		node = node.childNodes[offset];
	}
	while (node.nodeType !== Node.TEXT_NODE) {
		if (toCommand(node) === KEEP_COMMAND) return node;
		if (node.firstChild == null) node = nextNode(node);
		if (node == null) return null;
		if (node.firstChild != null) node = node.firstChild;
	}
	return node;
}

function prevNode(node) {
	if (node == null) return null;
	return node.previousSibling ?? prevNode(node.parentNode);
}

function toTextNodePrev(node, offset) {
	if (node == null) return null;
	if (offset != undefined) {
		if (offset === 0 || node.childNodes[offset - 1] == undefined) node = prevNode(node);
		node = node.childNodes[offset - 1];
	}
	while (node.nodeType !== Node.TEXT_NODE) {
		if (toCommand(node) === KEEP_COMMAND) return node;
		if (node.lastChild == null) node = prevNode(node);
		if (node == null) return null;
		if (node.lastChild != null) node = node.lastChild;
	}
	return node;
}

export function normalizeEditable(el) {
	if (el.classList.contains(SELECT_MARKER_CLASS)) return;

	let current = el.firstChild;

	function removeNode(node) {
		const next = node.nextSibling;
		el.removeChild(node);
		return next;
	}

	while (current != null) {
		if (current.nodeType === Node.TEXT_NODE) {
			if (
				current.textContent === "" ||
				current.textContent === "\n" &&
				current.previousSibling == null &&
				current.nextSibling == null
			) {
				current = removeNode(current);
				continue;
			}
			const previous = current.previousSibling;
			if (previous != null && previous.nodeType === Node.TEXT_NODE) {
				previous.textContent += current.textContent;
				current = removeNode(current);
				continue;
			}
			current = current.nextSibling;
			continue;
		}

		if (current.nodeType !== Node.ELEMENT_NODE || toCommand(current) === KEEP_COMMAND) {
			current = current.nextSibling;
			continue;
		}

		normalizeEditable(current);
		const previous = current.previousSibling;
		if (
			previous != null &&
			previous.nodeType === Node.ELEMENT_NODE &&
			toCommand(previous) === toCommand(current)
		) {
			while (current.firstChild) previous.appendChild(current.firstChild);
		}
		if (current.firstChild == null) {
			current = removeNode(current);
			continue;
		}
		current = current.nextSibling;
	}

	el.normalize();
}

function toCommand(node) {
	if (node.nodeType === Node.TEXT_NODE) return TEXT_COMMAND;
	if (node.tagName === "SPAN") {
		if (node.classList.contains("colorbox")) return `colorbox${getColor(node.classList)}`;
		if (node.classList.contains("color")) return `color${getColor(node.classList)}`;
		return KEEP_COMMAND;
	}
	if (!SUB_EDITABLE_TAGS.has(node.tagName)) return KEEP_COMMAND;
	return node.tagName.toLowerCase();
}

function toElement(command) {
	if (command === KEEP_COMMAND) throw COMMAND_CANCELLED;
	if (command.startsWith("colorbox")) {
		const element = document.createElement("span");
		element.classList.add("colorbox");
		element.classList.add(`c${command.substring(8)}`);
		return element;
	}
	if (command.startsWith("color")) {
		const element = document.createElement("span");
		element.classList.add("color");
		element.classList.add(`c${command.substring(5)}`);
		return element;
	}
	return document.createElement(command);
}

const chcode = ["r","R","s","e","E","f","a","q","Q","t","T","d","w","W","c","z","x","v","g"];
const jucode = ["k","o","i","O","j","p","u","P","h","hk","ho","hl","y","n","nj","np","nl","b","m","ml","l"];
const jocode = ["","r","R","rt","s","sw","sg","e","f","fr","fa","fq","ft","fx","fv","fg","a","q","qt","t","T","d","w","c","z","x","v","g"];
const cscode = ["","r","R","rt","s","sw","sg","e","E","f","fr","fa","fq","ft","fx","fv","fg","a","q","Q","qt","t","T","d","w","W","c","z","x","v","g"];

function k2e(str) {
	if (!str) return null;
	let res = "";
	for (let ch of str) {
		let c = ch.charCodeAt(0);
		if (0x1100 <= c && c <= 0x1112) { res += chcode[c - 0x1100]; continue; }
		if (0x1161 <= c && c <= 0x1175) { res += jucode[c - 0x1161]; continue; }
		if (0x11a8 <= c && c <= 0x11c2) { res += jocode[c - 0x11a7]; continue; }
		if (0x3131 <= c && c <= 0x314e) { res += cscode[c - 0x3130]; continue; }
		if (0x314f <= c && c <= 0x3163) { res += jucode[c - 0x314f]; continue; }
		if (0xac00 <= c && c <= 0xd7a3) {
			c -= 0xac00;
			const chidx = Math.floor(c / 588);
			const juidx = Math.floor((c % 588) / 28);
			const joidx = c % 28;
			res += chcode[chidx];
			res += jucode[juidx];
			if (joidx === 0) continue;
			res += jocode[joidx];
			continue;
		}
		res += ch;
	}
	return res;
}
