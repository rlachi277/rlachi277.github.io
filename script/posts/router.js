import express from "express";
import Database from 'better-sqlite3';
import {
	getRawPost,
	getPost,
	putPost,
	patchPost,
	deletePost
} from "./posts.js";

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

const router = express.Router();
export default router;

router.get('/raw/*path', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		return getRawPost(db, path);
	}, true);
}); // PUT-ing at /raw/* will make a secret post only accessible as raw by /raw/raw/*

router.get('/*path', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		res.setHeader('Content-Type', 'text/html');
		return getPost(db, path);
	}, true);
});

router.put('/*path', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		putPost(db, path, req.body);
	}, false);
});

router.patch('/*path', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		patchPost(db, path, req.body);
	}, false);
});

router.delete('/*path', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		deletePost(db, path);
	}, false);
});

function getPath(path) {
	let result = path.join('/');
	if (result.endsWith("/")) result += "index.html";
	return result;
}

function withErrors(res, func, sendResult) {
	try {
		if (sendResult) {
			res.status(200).send(func());
		} else {
			func();
			res.sendStatus(204);
		}
	} catch (e) {
		res.setHeader('Content-Type', 'text/plain');
		if (Number.isInteger(e)) res.sendStatus(e);
		else if (e.status != undefined) {
			if (e.reason != undefined) res.status(e.status).send(e.reason);
			else res.sendStatus(e.status);
		} else throw e;
	}
}