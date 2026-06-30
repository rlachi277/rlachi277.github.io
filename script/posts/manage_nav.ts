import { Database } from "better-sqlite3";
import { DirRow } from "./posts.js";

export function addPost(db: Database, path: string[]) {
	if (path.length === 0) path = ["index.html"];
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	let dbResult = db.prepare<string,DirRow>('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
	if (dbResult === undefined) {
		addDirectory(db, path.slice(0, -1));
		dbResult = "[]";
	}
	const data = JSON.parse(dbResult) as string[];
	if (data.includes(path.at(-1) as string)) return;
	data.push(path.at(-1) as string);
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), parent);
}

export function removePost(db: Database, path: string[]) {
	if (path.length === 0) path = ["index.html"];
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	const dbResult = db.prepare<string,DirRow>('SELECT posts, subdir FROM dir WHERE path = ?').get(parent);
	if (dbResult === undefined) return; // ???
	const data = JSON.parse(dbResult.posts as string) as string[];
	if (!data.includes(path.at(-1) as string)) return; // ???
	data.splice(data.indexOf(path.at(-1) as string), 1);
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), parent);
	if (data.length === 0) {
		if ((JSON.parse(dbResult.subdir as string) as string[]).length === 0) removeDirectory(db, path.slice(0, -1));
	}
}

function addDirectory(db: Database, path: string[]) {
	const joined = path.length === 0 ? '' : path.join('/') + '/';
	const exist = db.prepare<string,DirRow>('SELECT id FROM dir WHERE path = ?').get(joined);
	if (exist !== undefined) return;
	db.prepare(`
		INSERT INTO dir (path, posts, subdir)
		VALUES (?, '[]', '[]')
		ON CONFLICT(path) DO NOTHING
	`).run(joined);
	if (path.length === 0) return;
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	let dbResult = db.prepare<string,DirRow>('SELECT subdir FROM dir WHERE path = ?').get(parent)?.subdir;
	if (dbResult === undefined) {
		addDirectory(db, path.slice(0, -1));
		dbResult = "[]";
	}
	const data = JSON.parse(dbResult) as string[];
	if (data.includes(path.at(-1) as string)) return;
	data.push(path.at(-1) as string);
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), parent);
}

function removeDirectory(db: Database, path: string[]) {
	const joined = path.length === 0 ? '' : path.join('/') + '/';
	const exist = db.prepare<string,DirRow>('SELECT id FROM dir WHERE path = ?').get(joined);
	if (exist === undefined) return; // ???
	db.prepare(`
		DELETE FROM dir
		WHERE path = ?
	`).run(joined);
	if (path.length === 0) return;
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	const dbResult = db.prepare<string,DirRow>('SELECT posts, subdir FROM dir WHERE path = ?').get(parent);
	if (dbResult === undefined) return; // ???
	const data = JSON.parse(dbResult.subdir as string) as string[];
	if (!data.includes(path.at(-1) as string)) return; // ???
	data.splice(data.indexOf(path.at(-1) as string), 1);
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), parent);
	if (data.length === 0) {
		if ((JSON.parse(dbResult.posts as string) as string[]).length === 0) removeDirectory(db, path.slice(0, -1));
	}
}