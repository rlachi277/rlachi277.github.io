import { db } from "./posts.js";

export function addPost(path) {
	if (path.length === 0) {
		addDirectory([]);
		return;
	}
	if (path.at(-1) === '') path[path.length-1] = 'index.html';
	const parent = path.slice(0, -1).join('/') + '/';
	let dbResult = db.prepare('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
	if (dbResult === undefined) {
		addDirectory(path.slice(0, -1));
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

function addDirectory(path) {
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
		addDirectory(path.slice(0, -1));
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

export function removePost(path) {
	if (path.length === 0) return;
	if (path.at(-1) === '') path[path.length-1] = 'index.html';
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
		if (JSON.parse(parentSubdirs).length === 0) removeDirectory(path.slice(0, -1));
	}
}

function removeDirectory(path) {
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
		if (JSON.parse(parentPosts).length === 0) removeDirectory(path.slice(0, -1));
	}
}

export function buildNav(path) {
	const data = [];
	const dbResult = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(new URL("./", `file://${path}`).pathname.substring(7));
	if (dbResult === undefined) return data; // ???
	data.push({name: "", children: []});
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

	const parentResult = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(new URL("../", `file://${path}`).pathname.substring(7));
	if (parentResult === undefined) return data; // ???
	data.push({name: "../", children: []});
	for (const e of JSON.parse(parentResult.subdir)) data[1].children.push(e);
	for (const e of JSON.parse(parentResult.posts)) {
		if (e === "index.html") continue;
		data[1].children.push(e);
	}

	return data;
}