import fs from 'fs';
import path from 'path';
import express from "express";
import Database from 'better-sqlite3';
import __dirname from '../../dirname.js';
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
	log1Exists
} from "./cycelog.js";
import { withErrors } from "../posts/router.js";
import { renderNavHook } from '../posts/render_nav.js';
import { cycelogHook } from './cycelog_hook.js';

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

const log3Template = fs.readFileSync(path.join(__dirname, 'client', 'cycelog', 'log3.html'), 'utf8').replaceAll(/\n|\t/g, '');
const log3NotFoundTemplate = fs.readFileSync(path.join(__dirname, 'client', 'cycelog', 'log3_404.html'), 'utf8').replaceAll(/\n|\t/g, '');

const router = express.Router();
export default router;

router.get('/log3/{:id}', (req, res) => {
	const id = req.params.id ?? 'index.html';
	withErrors(res, () => {
		res.setHeader('Content-Type', 'text/html');
		return getLog3(db, "/cycelog/log3/", id, {
			normal: log3Template,
			notFound: log3NotFoundTemplate
		}, [renderNavHook(db, "/cycelog/log3/"), cycelogHook(db)]);
	}, true);
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

const log1Template = fs.readFileSync(path.join(__dirname, 'client', 'cycelog', 'log1.html'), 'utf8').replaceAll(/\n|\t/g, '');
const log1NotFoundTemplate = fs.readFileSync(path.join(__dirname, 'client', 'cycelog', 'log1_404.html'), 'utf8').replaceAll(/\n|\t/g, '');

router.get('/log1/{:id}', (req, res) => {
	const id = req.params.id ?? 'index.html';
	withErrors(res, () => {
		res.setHeader('Content-Type', 'text/html');
		return getLog1(db, "/cycelog/log1/", id, {
			normal: log1Template,
			notFound: log1NotFoundTemplate
		}, [renderNavHook(db, "/cycelog/log1/"), cycelogHook(db)]);
	}, true);
});

router.post('/log1/{:id}', (req, res) => {
	const id = req.params.id ?? 'index.html';
	withErrors(res, () => {
		postLog1(db, id, req.body);
	});
});

router.patch('/log1/{:id}', (req, res) => {
	const id = req.params.id ?? 'index.html';
	withErrors(res, () => {
		return patchLog1(db, id, req.body);
	}, true);
});

router.delete('/log1/{:id}', (req, res) => {
	const id = req.params.id ?? 'index.html';
	withErrors(res, () => {
		deleteLog1(db, id, req.body);
	});
});

router.post('/log1/:id/move', (req, res) => {
	withErrors(res, () => {
		moveLog1(db, req.params.id, req.body);
	});
});

router.get('/log1/exists/:id', (req, res) => {
	withErrors(res, () => {
		return log1Exists(db, req.params.id);
	}, true);
});