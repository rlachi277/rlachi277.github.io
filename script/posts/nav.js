import { deseri, sani } from '../../shared/posts/seri.js';
import { postExists } from './posts.js';

export function addPost(db, path) {
	if (path.length === 0) {
		addDirectory(db, []);
		return;
	}
	const parent = path.slice(0, -1).join('/') + '/';
	let dbResult = db.prepare('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
	if (dbResult === undefined) {
		addDirectory(db, path.slice(0, -1));
		dbResult = "[]";
	}
	const data = JSON.parse(dbResult);
	if (data.includes(path.at(-1))) return;
	data.push(path.at(-1));
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), parent);
}

function addDirectory(db, path) {
	if (path.length === 0) {
		db.prepare(`
			INSERT INTO dir (path, posts, subdir)
			VALUES ('', '[]', '[]')
			ON CONFLICT(path) DO NOTHING
		`).run();
		return;
	}
	const exist = db.prepare('SELECT id FROM dir WHERE path = ?').get(path.join('/') + '/');
	if (exist !== undefined) return;
	db.prepare(`
		INSERT INTO dir (path, posts, subdir)
		VALUES (?, '[]', '[]')
		ON CONFLICT(path) DO NOTHING
	`).run(path.join('/') + '/');
	const parent = path.slice(0, -1).join('/') + '/';
	let dbResult = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(parent)?.subdir;
	if (dbResult === undefined) {
		addDirectory(db, path.slice(0, -1));
		dbResult = "[]";
	}
	const data = JSON.parse(dbResult);
	if (data.includes(path.at(-1))) return;
	data.push(path.at(-1));
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), parent);
}

export function removePost(db, path) {
	if (path.length === 0) return;
	const parent = path.slice(0, -1).join('/') + '/';
	const dbResult = db.prepare('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
	if (dbResult === undefined) return; // ???
	const data = JSON.parse(dbResult);
	if (!data.includes(path.at(-1))) return; // ???
	data.splice(data.indexOf(path.at(-1)), 1);
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), parent);
	if (data.length === 0) {
		const parentSubdirs = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(parent)?.subdir;
		if (JSON.parse(parentSubdirs).length === 0) removeDirectory(db, path.slice(0, -1));
	}
}

function removeDirectory(db, path) {
	if (path.length === 0) {
		db.prepare(`
			DELETE FROM dir WHERE path = ''
		`).run();
		return;
	}
	const exist = db.prepare('SELECT id FROM dir WHERE path = ?').get(path.join('/') + '/');
	if (exist === undefined) return; // ???
	db.prepare(`
		DELETE FROM dir
		WHERE path = ?
	`).run(path.join('/') + '/');
	const parent = path.slice(0, -1).join('/') + '/';
	const dbResult = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(parent)?.subdir;
	if (dbResult === undefined) return; // ???
	const data = JSON.parse(dbResult);
	if (!data.includes(path.at(-1))) return; // ???
	data.splice(data.indexOf(path.at(-1)), 1);
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), parent);
	if (data.length === 0) {
		const parentPosts = db.prepare('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
		if (JSON.parse(parentPosts).length === 0) removeDirectory(db, path.slice(0, -1));
	}
}

function buildNav(db, path) {
	const data = [];
	const dbResult = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(new URL("./", `file://${path}`).pathname.substring(7));
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
	if (!parent.includes("/posts/")) return data; // root
	const parentResult = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(parent.substring(7));
	if (parentResult === undefined) return data; // ???
	data.push({name: "../", children: []});
	for (const e of JSON.parse(parentResult.subdir)) data[1].children.push(e);
	for (const e of JSON.parse(parentResult.posts)) {
		if (e === "index.html") continue;
		data[1].children.push(e);
	}

	return data;
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

export function renderNavHook(db) {
	return function (data, cur) {
		if (data.type === 'nav') return {
			type: "html",
			html: renderNav(db, cur)
		};
		return null;
	};
}