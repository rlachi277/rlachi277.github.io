import { start_edit } from "../script/posts/edit.js";
import { seri, no_lf } from "../script/posts/seri.js";

function serialize(el, init) {
	if (el.nodeName === 'NAV') {
		return {type: "nav", variant: {data: serialize_nav(el)}, children: null};
	}
	return seri(el, init, serialize);
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

const params = new URLSearchParams(window.location.search);
refresh_data();
if (params.get("edit") === 't') start_edit(document.querySelector('body'), true);