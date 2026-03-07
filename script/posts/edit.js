import { q$, $ } from "../jquery.js";
import { seri, deseri } from "./seri.js";

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
}

function on_editable_input(e) {
	e.target.classList.add("edited");
	if (e.target.innerHTML === '<br>' || e.target.innerHTML === '\n') e.target.innerHTML = '';
}

function on_editable_blur(e) {
	$(".will-submit").removeClass(".will-submit");
	$(".will-cancel").removeClass(".will-cancel");
	e.target.normalize();
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