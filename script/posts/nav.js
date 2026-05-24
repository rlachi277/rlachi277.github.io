import { db } from "./posts.js";

export function add_post(path) {
	if (path.length === 0) {
		add_dir([]);
		return;
	}
	if (path.at(-1) === '') path[path.length-1] = 'index.html';
	const ppath = path.slice(0, -1).join('/') + '/';
	let db_res = db.prepare('SELECT posts FROM dir WHERE path = ?').get(ppath)?.posts;
	if (db_res === undefined) {
		add_dir(path.slice(0, -1));
		db_res = "[]";
	}
	let data = JSON.parse(db_res);
	if (data.includes(path.at(-1))) return;
	data.push(path.at(-1));
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), ppath);
}

function add_dir(path) {
	if (path.length === 0) {
		db.prepare(`
			INSERT INTO dir (path, posts, subdir)
			VALUES ('', '[]', '[]')
			ON CONFLICT(path) DO NOTHING
		`).run();
		return;
	}
	let cur = db.prepare('SELECT id FROM dir WHERE path = ?').get(path.join('/') + '/');
	if (cur !== undefined) return;
	db.prepare(`
		INSERT INTO dir (path, posts, subdir)
		VALUES (?, '[]', '[]')
		ON CONFLICT(path) DO NOTHING
	`).run(path.join('/') + '/');
	const ppath = path.slice(0, -1).join('/') + '/';
	let db_res = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(ppath)?.subdir;
	if (db_res === undefined) {
		add_dir(path.slice(0, -1));
		db_res = "[]";
	}
	let data = JSON.parse(db_res);
	if (data.includes(path.at(-1))) return;
	data.push(path.at(-1));
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), ppath);
}

export function remove_post(path) {
	if (path.length === 0) return;
	if (path.at(-1) === '') path[path.length-1] = 'index.html';
	const ppath = path.slice(0, -1).join('/') + '/';
	let db_res = db.prepare('SELECT posts FROM dir WHERE path = ?').get(ppath)?.posts;
	if (db_res === undefined) return; // ???
	let data = JSON.parse(db_res);
	if (!data.includes(path.at(-1))) return; // ???
	data.splice(data.indexOf(path.at(-1)), 1);
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), ppath);
	if (data.length === 0) {
		db_res = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(ppath)?.subdir;
		if (JSON.parse(db_res).length === 0) remove_dir(path.slice(0, -1));
	}
}

function remove_dir(path) {
	if (path.length === 0) {
		db.prepare(`
			DELETE FROM dir WHERE path = ''
		`).run();
		return;
	}
	let cur = db.prepare('SELECT id FROM dir WHERE path = ?').get(path.join('/') + '/');
	if (cur === undefined) return; // ???
	db.prepare(`
		DELETE FROM dir
		WHERE path = ?
	`).run(path.join('/') + '/');
	const ppath = path.slice(0, -1).join('/') + '/';
	let db_res = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(ppath)?.subdir;
	if (db_res === undefined) return; // ???
	let data = JSON.parse(db_res);
	if (!data.includes(path.at(-1))) return; // ???
	data.splice(data.indexOf(path.at(-1)), 1);
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), ppath);
	if (data.length === 0) {
		db_res = db.prepare('SELECT posts FROM dir WHERE path = ?').get(ppath)?.posts;
		if (JSON.parse(db_res).length === 0) remove_dir(path.slice(0, -1));
	}
}

export function build_nav(path) {
	let data = [];
	const db_res = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(new URL("./", `file://${path}`).pathname.substring(7));
	if (db_res === undefined) return data; // ???
	data.push({name: "", children: []});
	for (let e of JSON.parse(db_res.subdir)) {
		let cur = {name: e, children: []};
		const cur_res = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(path);
		if (cur_res === undefined) { // ???
			data[0].children.push(e);
			continue;
		}
		for (let ee of JSON.parse(cur_res.subdir)) cur.children.push(ee);
		for (let ee of JSON.parse(cur_res.posts)) {
			if (ee === "index.html") continue;
			cur.children.push(ee);
		}
		data[0].children.push(cur);
	}
	for (let e of JSON.parse(db_res.posts)) {
		if (e === "index.html") continue;
		data[0].children.push(e);
	}
	if (path == "") return data;

	const parent_res = db.prepare('SELECT posts,subdir FROM dir WHERE path = ?').get(new URL("../", `file://${path}`).pathname.substring(7));
	if (parent_res === undefined) return data; // ???
	data.push({name: "../", children: []});
	for (let e of JSON.parse(parent_res.subdir)) data[1].children.push(e);
	for (let e of JSON.parse(parent_res.posts)) {
		if (e === "index.html") continue;
		data[1].children.push(e);
	}

	return data;
}