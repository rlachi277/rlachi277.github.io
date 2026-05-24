import express from "express";
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import __dirname from '../../dirname.js';
import { render } from './render.js';
import { add_post, remove_post } from "./nav.js";

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
db.prepare(`
	CREATE TABLE IF NOT EXISTS dir (
		id INTEGER PRIMARY KEY,
		path TEXT NOT NULL UNIQUE,
		posts TEXT NOT NULL,
		subdir TEXT NOT NULL
	)
`).run();

let template = 'wkatlaksdy...';
fs.readFile(path.join(__dirname, 'client', 'index.html'), 'utf8', (err, data) => {
	if (err) throw err;
	template = data.replaceAll(/\n|\t/g, '');
});

router.get('/raw/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	try {
		res.send(get_post_json(path));
	} catch (e) {
		if (e === 404) res.sendStatus(404);
		throw e;
	}
}); // PUTing at /raw/* will make a secret post only accessible as raw by /raw/raw/*

router.get('/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	try {
		const rendered = render(get_post_json(path), `/posts/${path}`);
		res.setHeader('Content-Type', 'text/html');
		res.send(template.replace("###여기까지가 템플릿임###", rendered));
	} catch (e) {
		if (e === 404) res.sendStatus(404);
		throw e;
	}
});

router.put('/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	db.prepare(`
		INSERT INTO posts (path, data)
		VALUES (?, ?)
		ON CONFLICT(path)
		DO UPDATE SET data = excluded.data;
	`).run(path, req.body);
	add_post(req.params.path);
	res.sendStatus(204);
});

router.patch('/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	const db_res = db.prepare('SELECT data FROM posts WHERE path = ?').get(path)?.data;
	if (db_res === undefined) {
		res.sendStatus(404); return;
	}
	const { pos, data, splice } = req.body;
	if (splice == undefined || pos == undefined) {
		res.status(400).send("necessary arguments absent"); return;
	}
	if (!Number.isInteger(splice) || splice < 0 || !Array.isArray(pos)) {
		res.status(400).send("format error"); return;
	}
	if (splice === 0 && data == undefined) {
		res.status(400).send("data absent"); return;
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
			res.status(400).send("invalid pos"); return;
		}
	}
	if (cur_data.children.length < pos[0]) {
		res.status(400).send("invalid pos"); return;
	}
	if (data != undefined) cur_data.children.splice(pos[0], splice, data);
	else cur_data.children.splice(pos[0], splice);
	db.prepare(`
		UPDATE posts
		SET data = ?
		WHERE path = ?;
	`).run(JSON.stringify(old_data), path);
	res.sendStatus(204);
});

router.delete('/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
	if (info.changes === 0) {
		res.sendStatus(404); return;
	}
	remove_post(req.params.path);
	res.sendStatus(204);
});

export function get_post_raw(path) {
	const db_res = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	return db_res;
}

function get_post_json(path) {
	const db_res = get_post_raw(path);
	if (db_res === undefined) {
		throw 404;
	}
	return JSON.parse(db_res.data);
}

export function post_exists(path) {
	const db_res = db.prepare('SELECT COUNT(1) FROM posts WHERE path = ?').get(path);
	return db_res['COUNT(1)'] == 1;
}