import express from "express";
import Database from 'better-sqlite3';
import { cache } from "../cache.js";

import log1 from './router_log1.js';
import log2 from './router_log2.js';
import log3 from './router_log3.js';

export const db = new Database('db/cycelog.db');
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
	CREATE TABLE IF NOT EXISTS assets (
		id INTEGER PRIMARY KEY,
		asset_type TEXT NOT NULL,
		asset_name TEXT NOT NULL,
		mime_type TEXT NOT NULL,
		content BLOB NOT NULL
	)`
).run();
db.prepare(`
	INSERT INTO posts (path, data)
	VALUES (?, ?)
	ON CONFLICT DO NOTHING
`).run("index.html", "dummy");

const router = express.Router();
export default router;

router.use(cache(60));

router.get(['/', '/index.html'], (_, res) => {
	res.render("cycelog/root.ejs");
});
router.use('/log1', log1);
router.use('/log2', log2);
router.use('/log3', log3);
