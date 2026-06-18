import express from "express";
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import __dirname from '../../dirname.js';
import { render } from './render.js';
import { addPost, removePost } from "./nav.js";

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
fs.readFile(path.join(__dirname, 'client', 'posts', 'index.html'), 'utf8', (err, data) => {
	if (err) throw err;
	template = data.replaceAll(/\n|\t/g, '');
});

router.get('/raw/*path', (req, res) => {
	const path = getPath(req.params.path);
	try {
		res.send(getPostJSON(path));
	} catch (e) {
		if (e === 404) res.sendStatus(404);
		throw e;
	}
}); // PUTing at /raw/* will make a secret post only accessible as raw by /raw/raw/*

router.get('/*path', (req, res) => {
	const path = getPath(req.params.path);
	try {
		const rendered = render(getPostJSON(path), `/posts/${path}`);
		res.setHeader('Content-Type', 'text/html');
		res.send(template.replace("###여기까지가 템플릿임###", rendered));
	} catch (e) {
		if (e === 404) res.sendStatus(404);
		throw e;
	}
});

router.put('/*path', (req, res) => {
	const path = getPath(req.params.path);
	db.prepare(`
		INSERT INTO posts (path, data)
		VALUES (?, ?)
		ON CONFLICT(path)
		DO UPDATE SET data = excluded.data;
	`).run(path, req.body);
	addPost(req.params.path);
	res.sendStatus(204);
});

router.patch('/*path', (req, res) => {
	const path = getPath(req.params.path);
	const dbResult = db.prepare('SELECT data FROM posts WHERE path = ?').get(path)?.data;
	if (dbResult === undefined) {
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
	const dbData = JSON.parse(dbResult);
	if (pos.length === 0) {
		db.prepare(`
			UPDATE posts
			SET data = ?
			WHERE path = ?;
		`).run(data, path);
		res.status(200).send(data);
		return;
	}
	let cur = dbData;
	pos.reverse();
	while (pos.length > 1) {
		cur = cur.children[pos.pop()];
		if (cur == undefined) {
			res.status(400).send("invalid pos"); return;
		}
	}
	if (cur.children.length < pos[0]) {
		res.status(400).send("invalid pos"); return;
	}
	if (data != undefined) cur.children.splice(pos[0], splice, data);
	else cur.children.splice(pos[0], splice);
	db.prepare(`
		UPDATE posts
		SET data = ?
		WHERE path = ?;
	`).run(JSON.stringify(dbData), path);
	res.sendStatus(204);
});

router.delete('/*path', (req, res) => {
	const path = getPath(req.params.path);
	const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
	if (info.changes === 0) {
		res.sendStatus(404); return;
	}
	removePost(req.params.path);
	res.sendStatus(204);
});

function getPath(path) {
	let result = path.join('/');
	if (path.endsWith("/")) result += "index.html";
	return result;
}

function getRawPost(path) {
	const dbResult = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	return dbResult;
}

function getPostJSON(path) {
	const dbResult = getRawPost(path);
	if (dbResult === undefined) {
		throw 404;
	}
	return JSON.parse(dbResult.data);
}

export function postExists(path) {
	const dbResult = db.prepare('SELECT COUNT(1) FROM posts WHERE path = ?').get(path);
	return dbResult['COUNT(1)'] == 1;
}