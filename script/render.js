import __dirname from '../dirname.js';
import { get_post_raw } from './posts.js';
import { deseri, sani } from './deseri.js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';

export function render(data, cur, init) {
	if (data.type === 'nav') return render_nav(data.variant?.data, cur);
	return deseri(data, cur, init, render);
}

function render_nav(data, cur) {
	function make_li(base, data) {
		let new_data = data;
		if (typeof data === 'string' || data instanceof String) {
			new_data = { name: data, children: [] };
		}
		let link = base + new_data.name;
		let is_self = simulate_link(cur, link ? link : "./") === cur;
		let exists = file_exists(cur, link ? link : "./");
		let a = `<a${is_self ?
			` class="self"`
		: (!exists ? 
			` class="broken"` : '')} href="${link ? link : "./"}">${(!link || base) ?
			`<span class="nav-base">${sani(link ? base : "./")}</span>`
		: ''}${
			sani(new_data.name)
		}</a>`;
		if (new_data.children.length === 0) return `<li>${a}</li>`;
		let ul_middle = "";
		for (let e of new_data.children) ul_middle += make_li(link, e);
		return `<li>${a}<ul>${ul_middle}</ul></li>`;
	}
	let middle = "";
	for (let e of data) middle += make_li("", e);
	return `<nav><details open><summary>둘러보기</summary><menu>${middle}</menu></details></nav>`;
}

function simulate_link(cur, p) {
	let pathname = new URL(p, `file://${cur}`).pathname;
	if (pathname.endsWith('/')) pathname += "index.html";
	return pathname;
}

export function file_exists(cur, p) {
	let resolved = simulate_link(cur, p);
	if (!resolved) return false;
	if (resolved.startsWith("/posts/")) return get_post_raw(resolved.replace(/^\/posts\//, ""))!=undefined;
	return fs.existsSync(fileURLToPath(new URL(
		resolved.slice(1), pathToFileURL(__dirname+path.sep)
	).href));
}