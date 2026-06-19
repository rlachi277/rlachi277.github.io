import fs from 'fs';
import path from 'path';
import express from "express";
import Database from 'better-sqlite3';
import __dirname from '../../dirname.js';
import {
	getLog3,
	putLog3,
	patchLog3,
	deleteLog3
} from "./cycelog.js";
import { cycelogHook } from './cycelog_hook.js';
import { withErrors } from "../posts/router.js";

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

let template = 'wkatlaksdy...';
let notFoundTemplate = 'wiatlaksdy...';
fs.readFile(path.join(__dirname, 'client', 'cycelog', 'index.html'), 'utf8', (err, data) => {
	if (err) throw err;
	template = data.replaceAll(/\n|\t/g, '');
});
fs.readFile(path.join(__dirname, 'client', 'cycelog', '404.html'), 'utf8', (err, data) => {
	if (err) throw err;
	notFoundTemplate = data.replaceAll(/\n|\t/g, '');
});
const notFoundData = {
	type: "body",
	children: [
		{type: "h1", children: ["404 Not Found"]}
	]
};

const router = express.Router();
export default router;

router.get('/log3/:id', (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		res.setHeader('Content-Type', 'text/html');
		return getLog3(db, id, {
			normal: template,
			notFound: notFoundTemplate,
			notFoundData: notFoundData
		}, [cycelogHook(db)]);
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