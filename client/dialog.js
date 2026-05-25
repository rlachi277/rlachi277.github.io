import { $, d$ } from "../script/jquery.js";
import { serialize } from "./script.js";

let dialog_function = null;
let diaf_dict = {
	"new_post": new_post,
	"duplicate_post": duplicate_post,
	"load_from_json": load_from_json,
	"delete_post": delete_post
}
d$("dialog-confirm").addEventListener("click", async function () {
	if (dialog_function == null) return;
	if (await diaf_dict[dialog_function]()) d$("dialog").close();
});

d$("dialog").addEventListener("close", function () {
	d$("dialog-title").textContent = '';
	d$("dialog-main").innerHTML = '';
	d$("dialog-confirm").classList.remove("danger");
})

export function dialog(title, main, diaf, danger) {
	function f() {
		d$("dialog-title").textContent = title;
		d$("dialog-main").innerHTML = main;
		dialog_function = diaf;
		if (danger) d$("dialog-confirm").classList.add("danger");
		d$("dialog").showModal();
	}
	return f;
}


async function new_post() {
	let path = d$("dialog-new-path").value;
	let abs_path = new URL(path, `file://${window.location.pathname}`).pathname;
	if (!abs_path || !abs_path.startsWith("/posts/")) {
		// TODO: 경고
		return false;
	}
	try {
		let f = await fetch(abs_path, { method: "HEAD" });
		if (f.status !== 404) {
			if (f.status !== 200) throw f.status;
			// TODO: 경고
			return false;
		}
		let s = {type: "body",children:[{type: "h1",children: [abs_path]},{type: "nav",children: null},{type: "p",children: []}]};
		fetch(abs_path, { method: "PUT", body: JSON.stringify(s) });
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

async function duplicate_post() {
	let path = d$("dialog-new-path").value;
	let abs_path = new URL(path, `file://${window.location.pathname}`).pathname;
	if (!abs_path || !abs_path.startsWith("/posts/")) {
		// TODO: 경고
		return false;
	}
	try {
		let f = await fetch(abs_path, { method: "HEAD" });
		if (f.status !== 404) {
			if (f.status !== 200) throw f.status;
			// TODO: 경고
			return false;
		}
		let s = serialize($("body").get(0));
		fetch(abs_path, { method: "PUT", body: JSON.stringify(s) });
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

async function load_from_json() {
	let path = window.location.pathname;
	try {
		fetch(path, { method: "PUT", headers: {'Content-Type': 'text/plain'}, body: d$("dialog-json-file").files[0] });
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

async function delete_post() {
	try {
		fetch(window.location.pathname, { method: "DELETE" });
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}