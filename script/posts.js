import express from "express";
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import __dirname from '../dirname.js';
import { render } from './render.js';

const router = express.Router();
export default router;

export const db = new Database('db/posts.db');
db.pragma('journal_mode = WAL');

db.prepare(`
	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY,
		path TEXT NOT NULL UNIQUE,
		data TEXT NOT NULL
	)
`).run();

let template = 'wkatlaksdy...';
fs.readFile(path.join(__dirname, 'client', 'index.html'), 'utf8', (err, data) => {
	if (err) throw err;
	template = data.replaceAll(/\n|\t/g, '');
});

router.get('/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	try {
		const rendered = render(get_post_json(path), `/posts/${path}`);
		res.setHeader('Content-Type', 'text/html');
		res.send(template.replace("###여기까지가 템플릿임###", rendered));
	} catch { res.sendStatus(404); }
});

router.put('/*path', (req, res) => {
	const path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	db.prepare(`
		INSERT INTO posts (path, data)
		VALUES (?, ?)
		ON CONFLICT(path)
		DO UPDATE SET data = excluded.data;
	`).run(path, req.body);
	res.status(200).send(req.body);
});

router.patch('/*path', (req, res) => {
	const path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	const db_res = db.prepare('SELECT data FROM posts WHERE path = ?').get(path)?.data;
	if (db_res === undefined) {
		res.sendStatus(404); return;
	}
	const { pos, data } = req.body;
	if (pos == undefined || data == undefined) {
		res.status(400).send("pos and/or data absent"); return;
	}
	if (!Array.isArray(pos)) {
		res.status(400).send("pos is not array"); return;
	}
	let old_data = JSON.parse(db_res);
	if (pos.length === 0) {
		db.prepare(`
			UPDATE posts
			SET data = ?
			WHERE path = ?;
		`).run(data, path);
		res.status(200).send(data);
		return;
	}
	let cur_data = old_data;
	pos.reverse();
	while (pos.length > 1) {
		cur_data = cur_data.children[pos.pop()];
		if (cur_data == undefined) {
			res.status(404).send("invalid pos"); return;
		}
	}
	cur_data.children[pos[0]] = data;
	db.prepare(`
		UPDATE posts
		SET data = ?
		WHERE path = ?;
	`).run(JSON.stringify(old_data), path);
	res.status(200).send(old_data);
});

router.delete('/*path', (req, res) => {
	const path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
	if (info.changes === 0) {
		res.sendStatus(404); return;
	}
	res.sendStatus(204);
});

export function get_post_json(path) {
	const db_res = get_post_raw(path);
	if (db_res === undefined) {
		throw 404;
	}
	return JSON.parse(db_res.data);
}

export function get_post_raw(path) {
	const db_res = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	return db_res;
}