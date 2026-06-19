import { sani } from '../../shared/posts/seri.js';

export function renderNavHook(db, root) {
	return function (data, cur) {
		if (data.type === 'nav') return {
			type: "html",
			html: renderNav(db, root, cur)
		};
		return null;
	};
}

function renderNav(db, root, cur) {
	const data = buildNav(db, root, cur);

	function makeNavEntry(base, data) {
		const newData = (typeof data === 'string' || data instanceof String) ?
			{name: data, children: []} :
			data;
		const link = base + newData.name;
		const isSelf = simulateLink(cur, link ? link : "./") === cur;
		const exists = postExists(db, root, cur, link ? link : "./");
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

function buildNav(db, root, path) {
	const data = [];
	const dbResult = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(new URL("./", `file://${path}`).pathname.substring(root.length));
	data.push({name: "", children: []});
	if (dbResult === undefined) { // 404
		data[0].children.push(path.split('/').at(-1));
		return data;
	}
	for (const e of JSON.parse(dbResult.subdir)) {
		const cur = {name: e, children: []};
		const curResult = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(e);
		if (curResult === undefined) { // ???
			data[0].children.push(e);
			continue;
		}
		for (const ee of JSON.parse(curResult.subdir)) cur.children.push(ee);
		for (const ee of JSON.parse(curResult.posts)) {
			if (ee === "index.html") continue;
			cur.children.push(ee);
		}
		data[0].children.push(cur);
	}
	for (const e of JSON.parse(dbResult.posts)) {
		if (e === "index.html") continue;
		data[0].children.push(e);
	}
	if (path == "") return data;

	const parent = new URL("../", `file://${path}`).pathname;
	if (!parent.includes(root)) return data; // root
	const parentResult = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(parent.substring(root.length));
	if (parentResult === undefined) return data; // ???
	data.push({name: "../", children: []});
	for (const e of JSON.parse(parentResult.subdir)) data[1].children.push(e);
	for (const e of JSON.parse(parentResult.posts)) {
		if (e === "index.html") continue;
		data[1].children.push(e);
	}

	return data;
}

function postExists(db, root, cur, p) {
	const resolved = simulateLink(cur, p);
	if (!resolved) return false;
	if (!resolved.startsWith(root)) return false;
	const dbResult = db.prepare('SELECT COUNT(1) FROM posts WHERE path = ?').get(resolved.substring(root.length));
	return dbResult['COUNT(1)'] == 1;
}

function simulateLink(cur, p) {
	let pathname = new URL(p, `file://${cur}`).pathname;
	if (pathname.endsWith('/')) pathname += "index.html";
	return pathname;
}