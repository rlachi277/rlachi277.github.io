import { deseri, sani } from '../../shared/posts/seri.js';
import { buildNav } from './nav.js';
import { postExists } from './posts.js';

export function render(db, data, cur, init, hooks = []) {
	const newHooks = hooks.concat([(data) => {
		if (data.type === 'nav') return {
			type: "html",
			html: renderNav(db, cur)
		};
		return null;
	}]);
	return deseri(data, cur, init, newHooks);
}

function renderNav(db, cur) {
	const data = buildNav(db, cur);

	function makeNavEntry(base, data) {
		const newData = (typeof data === 'string' || data instanceof String) ?
			{name: data, children: []} :
			data;
		const link = base + newData.name;
		const isSelf = simulateLink(cur, link ? link : "./") === cur;
		const exists = fileExists(db, cur, link ? link : "./");
		const anchor = `<a${
			isSelf ?
			` class="self"` :
			(!exists ? ` class="broken"` : '')
		} href="${link ? link : './'}">${
			(!link || base) ?
			`<span class="nav-base">${sani(link ? base : './')}</span>` :
			''
		}${sani(newData.name)}</a>`;
		if (newData.children.length === 0) return `<li>${anchor}</li>`;
		let middle = "";
		for (let e of newData.children) middle += makeNavEntry(link, e);
		return `<li>${anchor}<ul>${middle}</ul></li>`;
	}
	let middle = "";
	for (let e of data) middle += makeNavEntry("", e);
	return `<nav><details open><summary>둘러보기</summary><menu>${middle}</menu></details></nav>`;
}

function simulateLink(cur, p) {
	let pathname = new URL(p, `file://${cur}`).pathname;
	if (pathname.endsWith('/')) pathname += "index.html";
	return pathname;
}

function fileExists(db, cur, p) {
	const resolved = simulateLink(cur, p);
	if (!resolved) return false;
	if (!resolved.startsWith("/posts/")) return false;
	return postExists(db, resolved.substring(7));
}