import type { Database } from 'better-sqlite3';
import type { DirData } from './manage_nav.js';

import { sani } from '../../shared/posts/seri.js';
import { postExists } from './posts.js';

type NavDataObject = {
	readonly name: string,
	readonly children: readonly NavData[]
};
type NavData = string | NavDataObject;

export function renderNav(db: Database, root: string, cur: string): string {
	cur = `${root}${cur}`;
	const data = buildNav(db, root, cur);

	function makeNavEntry(base: string, data: NavData): string {
		const newData = (typeof data === 'string') ?
			{name: data, children: []} :
			data;
		const link = base + newData.name;
		const isSelf = simulateLink(cur, link ? link : "./") === cur;
		const exists = linkExists(db, root, cur, link ? link : "./");
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
		for (const e of newData.children) middle += makeNavEntry(link, e);
		return `<li>${anchor}<ul>${middle}</ul></li>`;
	}
	let middle = "";
	for (const e of data) middle += makeNavEntry("", e);
	return `<button id="nav-skip">탐색 건너뛰기</button><nav><details open><summary>둘러보기</summary><menu>${middle}</menu></details></nav>`;
}

function buildNav(db: Database, root: string, path: string): NavData[] {
	const data: {name: string, children: NavData[]}[] = [];
	const dbResult = db.prepare<string,DirData>('SELECT posts,subdir FROM dir WHERE path = ?').get(new URL("./", `file://${path}`).pathname.substring(root.length));
	data.push({name: "", children: []});
	if (dbResult === undefined) { // 404
		data[0].children.push(path.split('/').at(-1) as string);
		return data;
	}
	for (const e of (JSON.parse(dbResult.subdir) as string[]).sort()) {
		const cur: {name: string, children: NavData[]} = {name: e, children: []};
		const curResult = db.prepare<string,DirData>('SELECT posts,subdir FROM dir WHERE path = ?').get(e);
		if (curResult === undefined) { // ???
			data[0].children.push(e);
			continue;
		}
		for (const ee of (JSON.parse(curResult.subdir) as string[]).sort()) cur.children.push(ee);
		for (const ee of (JSON.parse(curResult.posts) as string[]).sort()) {
			if (ee === "index.html") continue;
			cur.children.push(ee);
		}
		data[0].children.push(cur);
	}
	for (const e of JSON.parse(dbResult.posts).sort()) {
		if (e === "index.html") continue;
		data[0].children.push(e);
	}
	if (path == "") return data;

	const parent = new URL("../", `file://${path}`).pathname;
	if (!parent.includes(root)) return data; // root
	const parentResult = db.prepare<string,DirData>('SELECT posts,subdir FROM dir WHERE path = ?').get(parent.substring(root.length));
	if (parentResult === undefined) return data; // ???
	data.push({name: "../", children: []});
	for (const e of JSON.parse(parentResult.subdir)) data[1].children.push(e);
	for (const e of JSON.parse(parentResult.posts)) {
		if (e === "index.html") continue;
		data[1].children.push(e);
	}

	return data;
}

function linkExists(db: Database, root: string, cur: string, p: string): boolean {
	const resolved = simulateLink(cur, p);
	if (!resolved) return false;
	if (!resolved.startsWith(root)) return false;
	return postExists(db, resolved.substring(root.length));
}

function simulateLink(cur: string, p: string): string {
	let pathname = new URL(p, `file://${cur}`).pathname;
	if (pathname.endsWith('/')) pathname += "index.html";
	return pathname;
}
