import express from "express";
import Database from 'better-sqlite3';
import {
	getLog3,
	putLog3,
	patchLog3,
	deleteLog3,
	getLog1,
	postLog1,
	patchLog1,
	deleteLog1,
	moveLog1,
	log1Exists,
	getRawLog1,
	log1Where,
	getIndex,
	serverWhere
} from "./cycelog.js";
import { withErrors } from "../posts/router.js";
import { renderNavHook } from '../posts/render_nav.js';
import { entryDeseriHook } from '../../shared/cycelog/cycelog_hook.js';

const db = new Database('db/cycelog.db');
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
	CREATE TABLE IF NOT EXISTS entries (
		id INTEGER PRIMARY KEY,
		type INTEGER NOT NULL,
		time TEXT NOT NULL,
		content TEXT NOT NULL,
		post TEXT NOT NULL
	)`
).run();
db.prepare(`
	INSERT INTO posts (path, data)
	VALUES (?, ?)
	ON CONFLICT DO NOTHING
`).run("index.html", "dummy");

const router = express.Router();
export default router;

const log1Hook = renderNavHook(db, "/cycelog/log1/");
const log3Hook = renderNavHook(db, "/cycelog/log3/");

router.get('/', (_, res) => {
	res.redirect('log3/');
});


const log1Template = "cycelog/log1.ejs";
const log1NotFoundTemplate = "cycelog/log1_404.ejs";
const log1IndexTemplate = "cycelog/log1_index.ejs";

router.get('/log1/', (_, res) => {
	const result = getIndex("/cycelog/log1/", log1Hook);
	res.status(200).render(log1IndexTemplate, result);
});

router.get('/log1/:id', (req, res) => {
	const id = req.params.id;
	const result = getLog1(db, "/cycelog/log1/", id, [log1Hook]);
	if (result[0]) res.status(200).render(log1Template, result[1]);
	else res.status(404).render(log1NotFoundTemplate, result[1]);
});

router.post('/log1/:id', (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		postLog1(db, id, req.body);
	});
});

router.patch('/log1/:id', (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		return patchLog1(db, id, req.body);
	}, true);
});

router.delete('/log1/:id', (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		deleteLog1(db, id, req.body);
	});
});

router.post('/log1/:id/move', (req, res) => {
	withErrors(res, () => {
		moveLog1(db, req.params.id, req.body);
	});
});

router.get('/log1/:id/raw', (req, res) => {
	withErrors(res, () => {
		return getRawLog1(db, req.params.id);
	}, true);
});

router.get('/log1/exists/:id', (req, res) => {
	withErrors(res, () => {
		return log1Exists(db, parseInt(req.params.id));
	}, true);
});

router.get('/log1/where/:id', (req, res) => {
	withErrors(res, () => {
		return log1Where(db, parseInt(req.params.id));
	}, true);
});


const log3Template = "cycelog/log3.ejs";
const log3NotFoundTemplate = "cycelog/log3_404.ejs";
const log3IndexTemplate = "cycelog/log3_index.ejs";

router.get('/log3/', (_, res) => {
	const result = getIndex("/cycelog/log3/", log3Hook);
	res.status(200).render(log3IndexTemplate, result);
});

router.get('/log3/:id', (req, res) => {
	const id = req.params.id;
	const types: Record<number,number> = {};
	const data = getRawLog1(db, id);
	for (const e of data) types[e.id] = e.type;

	const result = getLog3(db, "/cycelog/log3/", id, [log3Hook, entryDeseriHook(types, serverWhere(db))], types);
	if (result[0]) res.status(200).render(log3Template, result[1]);
	else res.status(404).render(log3NotFoundTemplate, result[1]);
});

router.put('/log3/:id', (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		putLog3(db, id, req.body);
	}, false);
});

router.patch('/log3/:id', (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		patchLog3(db, id, req.body);
	}, false);
});

router.delete('/log3/:id', (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		deleteLog3(db, id);
	}, false);
});
