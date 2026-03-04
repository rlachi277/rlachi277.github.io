import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { render, file_exists } from './render.js';
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 8080;

const db = new Database('db/posts.db');
db.pragma('journal_mode = WAL');

db.prepare(`
	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY,
		path TEXT NOT NULL UNIQUE,
		data TEXT NOT NULL
	)
`).run();

app.get('/', (_, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/index.html', (_, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/README.md', (_, res) => { res.sendFile(path.join(__dirname, 'README.md')); });
app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(express.text());
app.use(express.json());

app.get('/rawposts/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	const db_res = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	if (db_res === undefined) {
		res.sendStatus(404); return;
	}
	res.send(JSON.parse(db_res.data));
});

const template = `
<!DOCTYPE html>
<html lang="ko">
<head>
	<title>cycweb post</title>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="/client/font/pretendardvariable-gov.css">
	<link rel="stylesheet" href="/client/colors.css">
	<link rel="stylesheet" href="/client/style.css">
</head>
<body>###REPLACEMARK###</body>
</html>
`.replaceAll(/\n|\t/g, "");
app.get('/posts/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	const db_res = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	if (db_res === undefined) {
		res.sendStatus(404); return;
	}
	const rendered = render(JSON.parse(db_res.data), `/posts/${path}`);
	console.log(template);
	res.setHeader('Content-Type', 'text/html');
	res.send(template.replace("###REPLACEMARK###", rendered));
});

app.put('/posts/*path', (req, res) => {
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

app.delete('/posts/*path', (req, res) => {
	const path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
	if (info.changes === 0) {
		res.sendStatus(404); return;
	}
	res.sendStatus(204);
});

app.patch('/posts/*path', (req, res) => {
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

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});

export function post_exists(path) {
	const db_res = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	if (db_res === undefined) return false;
	return true;
}