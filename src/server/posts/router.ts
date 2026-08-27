import type { Response } from "express-serve-static-core";

import express from "express";
import Database from 'better-sqlite3';
import {
	getRawPost,
	getPost,
	putPost,
	patchPost,
	deletePost
} from "./posts.js";
import { renderNav } from './render_nav.js';
import { role } from "../auth.js";

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
db.prepare(`
	INSERT INTO posts (path, data)
	VALUES (?, ?)
	ON CONFLICT DO NOTHING
`).run("index.html", "dummy");

const template = "posts/post.ejs";
const notFoundTemplate = "posts/404.ejs";
const indexTemplate = "posts/index.ejs";

const router = express.Router();
export default router;

router.get('/', (_, res) => {
	res.render(indexTemplate, {
		nav: renderNav(db, "/posts/", "index.html")
	});
});

router.get('/index.html', (_, res) => {
	res.render(indexTemplate, {
		nav: renderNav(db, "/posts/", "index.html")
	});
});

router.get('/raw/*path', role("admin"), (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		return getRawPost(db, path);
	}, true);
}); // PUT-ing at /raw/* will make a secret post only accessible as raw by /raw/raw/*

router.get('/*path', (req, res) => {
	const path = getPath(req.params.path);
	const result = getPost(db, "/posts/", path, [], renderNav(db, "/posts/", path));
	if (result[0]) res.render(template, result[1]);
	else res.status(404).render(notFoundTemplate, result[1]);
});

router.put('/*path', role("user"), (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		putPost(db, path, req.body);
	}, false);
});

router.patch('/*path', role("user"), (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		patchPost(db, path, req.body);
	}, false);
});

router.delete('/*path', role("user"), (req, res) => {
	const path = getPath(req.params.path);
	withErrors(res, () => {
		deletePost(db, path);
	}, false);
});

function getPath(path: string[] = []): string {
	let result = path.join('/');
	if (result === "" || result.endsWith("/")) result += "index.html";
	return result;
}

export type HttpError = {
	readonly status: number,
	readonly reason?: string,
	readonly html?: string
};

export function withErrors(res: Response<unknown, Record<string,unknown>, number>, func: () => unknown | void, sendResult: boolean = false) {
	try {
		if (sendResult) {
			res.status(200).send(func());
		} else {
			func();
			res.sendStatus(204);
		}
	} catch (e: any) {
		if (typeof e === 'number') {
			res.setHeader('Content-Type', 'text/plain');
			res.sendStatus(e);
		} else if (typeof e?.status === "number") {
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
