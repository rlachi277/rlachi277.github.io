import { q$, $ } from "../jquery.js";
import { seri, deseri, getColor } from "./seri.js";

export let editing = null;
let edit_id = null;
export let edit_map = null;
export let original_map = null;

let edit_cur = [];

export function start_edit(el, init) {
	if (el.nodeName === "#text") {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return false;
	}
	if (el.nodeName.startsWith("#")) return undefined;
	let type_unset = false, editable = false;
	switch (init ? 'BODY' : el.nodeName) {
	case 'BODY':
		if (editing != null && editing !== el) stop_edit();
		editing = el; edit_id = 0;
		edit_map = new Map();
		original_map = new Map();
		break;
	case 'NAV': case 'HR': case 'BR': case 'IMG':
	case 'SECTION': case 'ARTICLE': case 'HGROUP':
	case 'FIGURE': case 'FIELDSET':
	case 'UL': case 'OL': case 'DETAILS': case 'SUMMARY':
	case 'AUDIO': case 'VIDEO': case 'TRACK': case 'SOURCE':
		break;
	case 'H1': case 'H2': case 'H3':
	case 'H4': case 'H5': case 'H6':
	case 'P': case 'FIGCAPTION': case 'LEGEND': case 'LI':
	case 'STRONG': case 'EM': case 'B': case 'I': case 'U':
	case 'RUBY': case 'RT': case 'RP':
	case 'SUB': case 'SUP': case 'INS': case 'DEL':
	case 'A': case 'BUTTON':
		editable = true;
		break;
	default:
		type_unset = true;
	}
	if (type_unset) {
		if (el.classList.contains("columns")) {
			editable = false;
		} else if (el.classList.contains("color") || el.classList.contains("colorbox")) {
			editable = true;
		} else return undefined;
	}

	if (editable && !el.closest(".editable")) el.classList.add("editable");
	else editable = false;

	let edit_curi = 0;
	el.childNodes.forEach((e) => {
		edit_cur.push(edit_curi);
		let c = start_edit(e);
		if (c != undefined) edit_curi++;
		edit_cur.pop();
	});

	if (editable) {
		original_map.set(el, JSON.stringify(seri(el)));
		edit_map.set(edit_id, {pos: Array.from(edit_cur), el: el});
		el.setAttribute("data-id", edit_id++);
		el.setAttribute("contenteditable", "plaintext-only");
		el.addEventListener("keydown", on_editable_keydown);
		el.addEventListener("input", on_editable_input);
		el.addEventListener("blur", on_editable_blur);
	}
	return true;
}

function manage_confirm(el, confirm_class, stop_class) {
	if (!el.classList.contains(confirm_class)) {
		if ($(`.${stop_class}`).length !== 0) {
			$(`.${stop_class}`).removeClass(stop_class)
			return false;
		}
		if (!el.classList.contains("edited")) return false;
		$(`.${confirm_class}`).removeClass(confirm_class);
		el.classList.add(confirm_class);
		return false;
	}
	return true;
}

function on_editable_keydown(e) {
	if (e.isComposing) return;
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		if (!manage_confirm(e.target, "will-submit", "will-cancel")) return;
		submit_changes(e.target);
		return;
	} else if (e.key === "Escape") {
		e.preventDefault();
		if (!manage_confirm(e.target, "will-cancel", "will-submit")) return;
		e.target.innerHTML = deseri(JSON.parse(original_map.get(e.target)), window.location.pathname, true);
		e.target.blur();
		return;
	}
	if (e.ctrlKey || e.metaKey) {
		let command = null;
		if (e.key === "b") command = "strong";
		else if (e.key === "u") command = "em";
		else if (e.key === ".") command = "sup";
		else if (e.key === ",") command = "sub";
		else if (e.key === "d") command = "del";
		else if (e.key === "e") command = "ins";
		else if (e.key === "z" && e.shiftKey) command = "redo";
		else if (e.key === "z") command = "undo";
		else if ("0" <= e.key && e.key <= "9") command = `color${e.key}`;
		if (command == null) return;
		
		if (command === "undo") {
			if (undo_buffer.length === 0) return;
			redo_buffer.push(seri(e.target));
			e.target.innerHTML = deseri(undo_buffer.pop(), window.location.pathname, true);
			e.preventDefault();
			return;
		} else if (command === "redo") {
			if (redo_buffer.length === 0) return;
			undo_buffer.push(seri(e.target));
			e.target.innerHTML = deseri(redo_buffer.pop(), window.location.pathname, true);
			e.preventDefault();
			return;
		}
		run_command(e, command);
		return;
	}
	if (e.key === "Tab") {
		tab_command(e);
		return;
	}
	undo_buffer = [];
	redo_buffer = [];
}

function on_editable_input(e) {
	e.target.classList.add("edited");
	if (e.target.innerHTML === '<br>' || e.target.innerHTML === '\n') e.target.innerHTML = '';
}

function on_editable_blur(e) {
	$(".will-submit").removeClass("will-submit");
	$(".will-cancel").removeClass("will-cancel");
	$(e.target).find('.select-marker').remove();
	normalize_editable(e.target);
	undo_buffer = [];
	redo_buffer = [];
	if (JSON.stringify(seri(e.target)) === original_map.get(e.target))
		e.target.classList.remove("edited");
}

function submit_changes(el) {
	el.innerHTML = el.innerHTML.replaceAll("\n","<br>");
	if (el.lastChild.nodeName === "BR") el.removeChild(el.lastChild);
	document.activeElement.blur();
	let pos = edit_map.get(parseInt(el.getAttribute("data-id"))).pos;
	let new_data = seri(el);
	fetch(window.location.pathname, { method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: new_data
	})});
	original_map.set(el, JSON.stringify(new_data));
	el.classList.remove("edited");
}

export function submit_all() {
	document.activeElement.blur();
	q$(".edited").forEach((e) => submit_changes(e));
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
	editing = edit_id = edit_map = original_map = null;
}

const s = window.getSelection();
let undo_buffer = [];
let redo_buffer = [];
function run_command(e, command) {
	const r = s.getRangeAt(0);
	if (r.collapsed) return;

	e.preventDefault();
	undo_buffer.push(seri(e.target));

	$(e.target).find('.select-marker').remove();
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
		if (to_command(n) === 'keep') {
			if (!forgive) throw -1;
			affected[0] = {node: n, keep: true};
			break;
		};
		if (n.previousSibling) forgive = false;
		n = n.parentElement;
	}
	cur = to_text_node(next_node(cur));
	while (cur != null && r.intersectsNode(cur)) {
		if (to_command(cur) === 'keep') affected.push({node: cur});
		else affected.push({node: cur});
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
		if (to_command(n) === 'keep') {
			if (!forgive) throw -1;
			affected[affected.length-1] = {node: n};
			break;
		};
		n = n.parentElement;
	}

	let all_on = true;
	for (let ee of affected) {
		if (ee.node.nodeType === Node.TEXT_NODE) {
			if (ee.start_offset === ee.node.textContent.length || ee.end_offset === 0) {
				ee.zero = true;
				continue;
			}
		} else {
			if (ee.start_offset === ee.childNodes.length || ee.end_offset === 0) {
				ee.zero = true;
				continue;
			}
		}
		let n = ee.node.parentNode;
		ee.on = false;
		if (n.nodeType !== Node.ELEMENT_NODE) continue;
		ee.formats = [];
		while (n != e.target) {
			let cmd = to_command(n);
			if (command === cmd) ee.on = true;
			ee.formats.push(cmd);
			n = n.parentElement;
		}
		if (n.nextSibling) forgive = false;
		if (!ee.on) all_on = false;
	}

	let range = document.createRange();
	let last = affected[affected.length-1];

	if (last.end_offset != undefined) range.setStart(last.node, last.end_offset);
	else range.setStartAfter(last.node);
	range.setEndAfter(e.target.lastChild);
	let r_ext = range.extractContents();

	let els = document.createDocumentFragment();
	for (let ee of affected) {
		if (ee.zero) continue;
		let el = ee.node;
		if (ee.start_offset) {
			el = document.createTextNode(ee.node.textContent.substring(ee.start_offset));
			ee.node.textContent = ee.node.textContent.substring(0, ee.start_offset);
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
		if (!all_on) {
			let new_el = to_element(command);
			new_el.append(el);
			el = new_el;
		}
		els.append(el);
	}

	let marker_start = document.createElement("span");
	let marker_end = document.createElement("span");
	marker_start.classList.add("select-marker");
	marker_end.classList.add("select-marker");
	els.prepend(marker_start); els.append(marker_end);
	e.target.append(els);
	range.setStartAfter(marker_start);
	range.setEndBefore(marker_end);
	s.removeAllRanges();
	s.addRange(range);
	e.target.append(r_ext);

	normalize_editable(e.target);
	on_editable_input(e);
	return;
}

function tab_command(e) {
	e.preventDefault();
	if (!s.isCollapsed) {
		s.collapseToEnd();
		return;
	}
	let last_text = s.anchorNode, first_text = last_text;
	let cmd = null, flag = 0;
	if (last_text.nodeType !== Node.TEXT_NODE) {
		last_text = to_text_node_prev(last_text, s.anchorOffset);
	} else if (s.anchorOffset === 0) {
		last_text = to_text_node_prev(prev_node(last_text));
	} else {
		if (s.anchorOffset === 1) return;
		let t = last_text.textContent.substring(0, s.anchorOffset);
		if (t[t.length - 2] !== "]") return;
		cmd = k2e(t[t.length - 1]).toLowerCase();
		first_text = last_text;
		flag = 2;
	}
	while (!flag && last_text) {
		let t = last_text.textContent;
		if (t.length === 0) {
			last_text = to_text_node_prev(prev_node(last_text));
			continue;
		}
		if (t.length === 1) return;
		if (t[t.length - 2] !== "]") return;
		cmd = k2e(t[t.length - 1]);
		first_text = last_text;
		flag = 1;
	}
	if (cmd == null) throw -1;
	while (first_text) {
		if (first_text.textContent.includes("[")) break;
		first_text = to_text_node_prev(prev_node(first_text));
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
	if (command == null) return;

	let open_idx = first_text.textContent.lastIndexOf("[");
	let close_idx = (flag === 2) ? s.anchorOffset - 2 : last_text.textContent.length - 2;
	let ft = first_text.textContent;
	first_text.textContent = ft.substring(0, open_idx) + ft.substring(open_idx+1);
	if (first_text === last_text) close_idx--;
	let lt = last_text.textContent;
	last_text.textContent = lt.substring(0, close_idx) + lt.substring(close_idx+2);
	let range = document.createRange();
	range.setStart(first_text, open_idx);
	range.setEnd(last_text, close_idx);
	s.removeAllRanges();
	s.addRange(range);
	run_command(e, command);
	s.collapseToEnd();
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
		if (to_command(n) === 'keep') return n;
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
		if (to_command(n) === 'keep') return n;
		if (n.lastChild == null) n = prev_node(n);
		if (n == null) return null;
		if (n.lastChild != null) n = n.lastChild;
	}
	return n;
}

function normalize_editable(el) {
	if (el.classList.contains("select-marker")) return;

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
		if (cur.nodeType !== Node.ELEMENT_NODE || to_command(cur) === 'keep') {
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
	if (n.nodeType === Node.TEXT_NODE) return 'text';
	if (n.tagName === "SPAN") {
		if (n.classList.contains('color')) {
			return `color${getColor(n.classList)}`;
		} else if (n.classList.contains('colorbox')) {
			return `colorbox${getColor(n.classList)}`;
		}
		return 'keep';
	}
	const sub_editable = ['STRONG', 'EM', 'SUP', 'SUB', 'INS', 'DEL'];
	if (!sub_editable.includes(n.tagName)) return 'keep';
	return n.tagName.toLowerCase();
}

function to_element(cmd) {
	if (cmd === 'keep') throw -1; // TODO
	if (cmd.startsWith('color')) {
		let el = document.createElement('span');
		el.classList.add("color");
		el.classList.add(`c${cmd.substring(5)}`);
		return el;
	}
	if (cmd.startsWith('colorbox')) {
		let el = document.createElement('span');
		el.classList.add("colorbox");
		el.classList.add(`c${cmd.substring(8)}`);
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