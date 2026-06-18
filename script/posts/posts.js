import fs from 'fs';
import path from 'path';
import __dirname from '../../dirname.js';
import { render } from './render.js';
import { addPost, removePost } from "./nav.js";

let template = 'wkatlaksdy...';
fs.readFile(path.join(__dirname, 'client', 'posts', 'index.html'), 'utf8', (err, data) => {
	if (err) throw err;
	template = data.replaceAll(/\n|\t/g, '');
});

export function getRawPost(db, path) {
	const dbResult = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	if (dbResult === undefined) throw 404;
	return JSON.parse(dbResult.data);
}

export function getPost(db, path) {
	const rendered = render(db, getRawPost(db, path), `/posts/${path}`);
	return template.replace("###여기까지가 템플릿임###", rendered);
}

export function putPost(db, path, body) {
	db.prepare(`
		INSERT INTO posts (path, data)
		VALUES (?, ?)
		ON CONFLICT(path)
		DO UPDATE SET data = excluded.data;
	`).run(path, body);
	addPost(db, path.split('/'));
}

export function patchPost(db, path, body) {
	const dbResult = db.prepare('SELECT data FROM posts WHERE path = ?').get(path)?.data;
	if (dbResult === undefined) throw 404;

	const { pos, data, splice } = body;
	if (splice == undefined || pos == undefined) throw {
		status: 400,
		reason: "necessary arguments absent"
	};
	if (!Number.isInteger(splice) || splice < 0 || !Array.isArray(pos)) throw {
		status: 400,
		reason: "format error"
	};
	if (splice === 0 && data == undefined) throw {
		status: 400,
		reason: "data absent"
	};
	const dbData = JSON.parse(dbResult);
	if (pos.length === 0) {
		db.prepare(`
			UPDATE posts
			SET data = ?
			WHERE path = ?;
		`).run(data, path);
		return;
	}
	let cur = dbData;
	pos.reverse();
	while (pos.length > 1) {
		cur = cur.children[pos.pop()];
		if (cur == undefined) throw {
			status: 400,
			reason: "invalid pos"
		};
	}
	if (cur.children.length < pos[0]) throw {
		status: 400,
		reason: "invalid pos"
	};
	if (data != undefined) cur.children.splice(pos[0], splice, data);
	else cur.children.splice(pos[0], splice);
	db.prepare(`
		UPDATE posts
		SET data = ?
		WHERE path = ?;
	`).run(JSON.stringify(dbData), path);
}

export function deletePost(db, path) {
	const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
	if (info.changes === 0) throw 404;
	removePost(db, path.split('/'));
}

export function postExists(db, path) {
	const dbResult = db.prepare('SELECT COUNT(1) FROM posts WHERE path = ?').get(path);
	return dbResult['COUNT(1)'] == 1;
}