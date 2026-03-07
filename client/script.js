let editing = null, edit_id = null;
let edit_data = null;
let edit_map = null;
let original_map = null;

let edit_cur = [];

function serialize(el, edit, init) {
	if (el.nodeName === "#text") {
		if (/^\n\s*$/.test(el.textContent)) return undefined;
		return el.textContent.replace(/\n\s*$/, "");
	}
	if (el.nodeName.startsWith("#")) return undefined;
	let result = {
		type: null,
		variant: undefined,
		children: []
	};
	let type_unset = false;
	let editable = false;
	switch (init ? 'BODY' : el.nodeName) {
	case 'BODY':
		result.type = "body";
		if (edit) {
			if (editing != null && editing !== el) stop_edit();
			start_edit(el);
		}
		break;
	case 'NAV':
		result.type = "nav";
		result.variant = {data: serialize_nav(el)};
		result.children = null;
		break;
	case 'SECTION':
		result.type = "section";
		break;
	case 'ARTICLE':
		result.type = "article";
		result.variant = {float: null};
		if (el.classList.contains('float-right')) result.variant.float = "right";
		else if (el.classList.contains('float-left')) result.variant.float = "left";
		break;
	case 'H1': case 'H2': case 'H3':
	case 'H4': case 'H5': case 'H6':
		editable = true;
	case 'HGROUP':
		result.type = el.nodeName.toLowerCase();
		break;
	case 'HR':
		result.variant = {rule: null};
		if (el.classList.contains('rule')) result.variant.rule = true;
	case 'BR':
		result.children = null;
		result.type = el.nodeName.toLowerCase();
		break;
	case 'P':
		result.type = "p";
		result.variant = {lang: null};
		if (el.getAttribute('lang') === "en") result.variant.lang = "en";
		editable = true;
		break;
	case 'FIGURE':
		result.type = "figure";
		result.variant = {float: null};
		if (el.classList.contains('float-right')) result.variant.float = "right";
		else if (el.classList.contains('float-left')) result.variant.float = "left";
		break;
	case 'FIGCAPTION':
		result.type = "figcaption";
		editable = true;
		break;
	case 'IMG':
		result.type = "img";
		result.variant = {
			src: no_lf(el.getAttribute('src')),
			alt: no_lf(el.getAttribute('alt')),
			size: 'medium'
		};
		if (el.classList.contains('large')) result.variant.size = "large";
		else if (el.classList.contains('small')) result.variant.size = "small";
		if (el.classList.contains('full')) result.variant.size = "full";
		result.children = null;
		break;
	case 'LEGEND':
		editable = true;
	case 'FIELDSET':
		result.type = el.nodeName.toLowerCase();
		break;
	case 'LI':
		editable = true;
	case 'UL': case 'DETAILS': case 'SUMMARY':
		result.type = el.nodeName.toLowerCase();
		break;
	case 'OL':
		result.type = 'ol';
		result.variant = {start: no_lf(el.getAttribute('start'))};
		break;
	case 'STRONG': case 'EM': case 'B': case 'I': case 'U':
	case 'RUBY': case 'RT': case 'RP':
	case 'SUB': case 'SUP': case 'INS': case 'DEL':
		result.type = el.nodeName.toLowerCase();
		editable = true;
		break;
	case 'AUDIO':
		result.type = "audio";
		result.variant = {
			src: no_lf(el.getAttribute('src')),
			controls: no_lf(el.getAttribute('controls')),
			crossorigin: no_lf(el.getAttribute('crossorigin')),
			loop: no_lf(el.getAttribute('loop')),
			muted: no_lf(el.getAttribute('muted')),
			preload: no_lf(el.getAttribute('preload'))
		}
		break;
	case 'VIDEO':
		result.type = "video";
		result.variant = {
			size: "medium",
			src: no_lf(el.getAttribute('src')),
			autoplay: no_lf(el.getAttribute('autoplay')),
			controls: no_lf(el.getAttribute('controls')),
			crossorigin: no_lf(el.getAttribute('crossorigin')),
			loop: no_lf(el.getAttribute('loop')),
			muted: no_lf(el.getAttribute('muted')),
			poster: no_lf(el.getAttribute('poster')),
			preload: no_lf(el.getAttribute('preload'))
		}
		if (el.classList.contains('large')) result.variant.size = "large";
		else if (el.classList.contains('small')) result.variant.size = "small";
		if (el.classList.contains('full')) result.variant.size = "full";
		break;
	case 'TRACK':
		result.type = "track";
		result.variant = {
			src: no_lf(el.getAttribute('src')),
			srclang: no_lf(el.getAttribute('srclang')),
			default: no_lf(el.getAttribute('default')),
			kind: no_lf(el.getAttribute('kind')),
			label: no_lf(el.getAttribute('label'))
		}
		break;
	case 'SOURCE':
		// currently <audio>, <video> only
		result.type = "source";
		result.variant = {
			src: no_lf(el.getAttribute('src')),
			media: no_lf(el.getAttribute('media'))
		}
		break;
	case 'A':
		result.type = "a";
		result.variant = {
			href: no_lf(el.getAttribute('href')),
			target: no_lf(el.getAttribute('target')),
			download: no_lf(el.getAttribute('download')),
			rel: no_lf(el.getAttribute('rel')),
			shape: null
		}
		if (el.classList.contains("broken")) {
			result.variant.shape = "broken";
		} else if (el.classList.contains("color")) {
			result.variant.shape = "color";
			result.variant.color = getColor(el.classList);
		} else if (el.classList.contains("colorbox")) {
			result.variant.shape = "colorbox";
			result.variant.color = getColor(el.classList);
		}
		editable = true;
		break;
	case 'BUTTON':
		result.type = "button";
		// todo: button attributes
		result.variant = {};
		if (el.classList.contains("colorbox")) {
			result.variant.shape = "colorbox";
			result.variant.color = getColor(el.classList);
		}
		editable = true;
		break;
	default:
		type_unset = true;
	}
	if (type_unset) {
		if (el.classList.contains("columns")) {
			result.type = "columns";
		} else if (el.classList.contains("color")) {
			result.type = "color";
			result.variant = {color: getColor(el.classList), click: el.classList.contains("click")};
			editable = true;
		} else if (el.classList.contains("colorbox")) {
			result.type = "colorbox";
			result.variant = {color: getColor(el.classList), click: el.classList.contains("click")};
			editable = true;
		} else {
			return undefined;
		}
	}

	if (edit && editable && !el.closest(".editable")) {
		el.classList.add("editable");
	}

	let edit_curi = 0;
	el.childNodes.forEach((e) => {
		edit_cur.push(edit_curi);
		let c = serialize(e, edit);
		if (c != undefined) {
			result.children?.push(c);
			if (edit) edit_curi++;
		}
		edit_cur.pop();
	});

	if (edit && el.classList.contains("editable")) {
		original_map.set(el, JSON.stringify(result));
		edit_map.set(edit_id, {pos: Array.from(edit_cur), el: el});
		el.setAttribute("data-id", edit_id);
		result.id = edit_id++;
		el.setAttribute("contenteditable", "plaintext-only");
		el.addEventListener("keydown", on_editable_keydown);
		el.addEventListener("input", on_editable_input);
		el.addEventListener("blur", on_editable_blur);
	}

	if (edit && init) edit_data = result;
	return result;
}

function serialize_nav(nav) {
	let menu = nav.querySelector("menu");
	let result = [];

	function serialize_li(el) {
		let a = el.childNodes[0];
		if (el.querySelector("ul") == null) {
			if (a.childNodes.length < 2) {
				if (a.childNodes.length == 0) return "";
				if (a.childNodes[0].nodeType === Node.TEXT_NODE)
					return no_lf(a.childNodes[0].textContent);
				return "";
			}
			return no_lf(a.childNodes[1].textContent);
		}
		let result = {name: "", children: []};
		setname: {
			if (a.childNodes.length < 2) {
				if (a.childNodes.length == 0) break setname;
				if (a.childNodes[0].nodeType === Node.TEXT_NODE) {
					result.name = a.childNodes[0].textContent;
					break setname;
				}
				break setname;
			}
			if (a.childNodes[1].nodeType === Node.TEXT_NODE)
				result.name = a.childNodes[1].textContent;
		}
		for (let e of el.querySelector("ul").children) {
			result.children.push(serialize_li(e));
		}
		return result;
	}
	for (let e of menu.children) result.push(serialize_li(e));
	return result;
}

async function deserialize(el, data, init) {
	let res = await fetch('/putils/deserialize/', { method: 'POST', headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		data: data, init: init?'true':'false', cur: window.location.pathname
	})});
	let text = await res.text();
	el.innerHTML = text;
}

function getColor(classList) {
	if (classList.contains("c0")) return 0;
	if (classList.contains("c1")) return 1;
	if (classList.contains("c2")) return 2;
	if (classList.contains("c3")) return 3;
	if (classList.contains("c4")) return 4;
	if (classList.contains("c5")) return 5;
	if (classList.contains("c6")) return 6;
	if (classList.contains("c7")) return 7;
	if (classList.contains("c8")) return 8;
	if (classList.contains("c9")) return 9;
	if (classList.contains("c10")) return 10;
}

function no_lf(s) {
	return s?.replaceAll("\n","") ?? null;
}

function refresh_data() {
	let s = serialize(document.querySelector('body'));
	fetch(window.location.pathname, { method: "PUT", body: JSON.stringify(s) });
}

let mobile = false;
let nav_details;
function on_resize(init) {
	if (init) {
		mobile = false;
		nav_details = document.querySelectorAll("nav details");
	}
	if (window.matchMedia("(max-width: 480px)").matches) {
		if (!init || mobile) return;
		mobile = true;
		nav_details.forEach((e) => { e.removeAttribute("open"); });
	} else {
		if (!mobile) return;
		mobile = false;
		nav_details.forEach((e) => { e.setAttribute("open", ""); });
	}
}
on_resize(true);
window.addEventListener('resize', () => on_resize());



function start_edit(el) {
	editing = el; edit_id = 0;
	edit_map = new Map();
	original_map = new Map();
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
		deserialize(e.target, JSON.parse(original_map.get(e.target)), true).then(() => {
			e.target.blur();
		});
		return;
	}
}

function manage_confirm(el, confirm_class, stop_class) {
	if (!el.classList.contains(confirm_class)) {
		if (document.querySelectorAll(`.${stop_class}`).length !== 0) {
			document.querySelectorAll(`.${stop_class}`).forEach((e) => {
				e.classList.remove(stop_class);
			});
			return false;
		}
		if (!el.classList.contains("edited")) return false;
		document.querySelectorAll(`.${confirm_class}`).forEach((e) => {
			e.classList.remove(confirm_class);
		});
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
	document.querySelectorAll(".will-submit").forEach((e) => {
		e.classList.remove("will-submit");
	});
	document.querySelectorAll(".will-cancel").forEach((e) => {
		e.classList.remove("will-cancel");
	});
	e.target.normalize();
	if (JSON.stringify(serialize(e.target)) === original_map.get(e.target))
		e.target.classList.remove("edited");
}

function submit_changes(el) {
	el.innerHTML = el.innerHTML.replaceAll("\n","<br>");
	document.activeElement.blur();
	let pos = edit_map.get(parseInt(el.getAttribute("data-id"))).pos;
	let new_data = serialize(el);
	fetch(window.location.pathname, { method: "PATCH", headers: {
		'Content-type': 'application/json'
	}, body: JSON.stringify({
		pos: pos,
		data: new_data
	})});
	original_map.set(el, JSON.stringify(new_data));
	el.classList.remove("edited");
}

function submit_all() {
	document.activeElement.blur();
	document.querySelectorAll(".edited").forEach((e) => submit_changes(e));
}

function stop_edit() {
	submit_all();
	document.querySelectorAll(".editable").forEach((e) => {
		e.removeAttribute("data-id");
		e.removeAttribute("contenteditable");
		e.removeEventListener("keydown", on_editable_keydown);
		e.removeEventListener("input", on_editable_input);
		e.removeEventListener("blur", on_editable_blur);
		e.classList.remove("editable");
	});
	editing = edit_id = edit_data = edit_map = original_map = null;
}

const params = new URLSearchParams(window.location.search);
refresh_data();
if (params.get("edit") === 't') serialize(document.querySelector('body'), true, true);