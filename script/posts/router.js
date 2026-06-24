import fs from 'fs';
import path from 'path';
import express from "express";
import Database from 'better-sqlite3';
import __dirname from '../../dirname.js';
import {
	getRawPost,
	getPost,
	putPost,
	patchPost,
	deletePost
} from "./posts.js";
import { renderNavHook } from './render_nav.js';

const db = new Database('db/posts.db');
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

const template = fs.readFileSync(path.join(__dirname, 'client', 'posts', 'index.html'), 'utf8').replaceAll(/\n|\t/g, '');
const notFoundTemplate = fs.readFileSync(path.join(__dirname, 'client', 'posts', '404.html'), 'utf8').replaceAll(/\n|\t/g, '');

const router = express.Router();
export default router;

router.get('/raw/{*path}', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		return getRawPost(db, path);
	}, true);
}); // PUT-ing at /raw/* will make a secret post only accessible as raw by /raw/raw/*

router.get('/{*path}', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		res.setHeader('Content-Type', 'text/html');
		return getPost(db, "/posts/", path, {
			normal: template,
			notFound: notFoundTemplate
		}, [renderNavHook(db, "/posts/")]);
	}, true);
});

router.put('/{*path}', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		putPost(db, path, req.body);
	}, false);
});

router.patch('/{*path}', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		patchPost(db, path, req.body);
	}, false);
});

router.delete('/{*path}', (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		deletePost(db, path);
	}, false);
});

function getPath(path = []) {
	let result = path.join('/');
	if (result === "" || result.endsWith("/")) result += "index.html";
	return result;
}

export function withErrors(res, func, sendResult) {
	try {
		if (sendResult) {
			res.status(200).send(func());
		} else {
			func();
			res.sendStatus(204);
		}
	} catch (e) {
		if (Number.isInteger(e)) {
			res.setHeader('Content-Type', 'text/plain');
			res.sendStatus(e);
		}
		else if (e.status != undefined) {
			if (e.reason != undefined) {
				res.setHeader('Content-Type', 'text/plain');
				res.status(e.status).send(e.reason);
			} else if (e.html != undefined) {
				res.setHeader('Content-Type', 'text/html');
				res.status(e.status).send(e.html);
			} else res.sendStatus(e.status);
		} else throw e;
	}
}