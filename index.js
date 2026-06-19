import express from 'express';
import path from 'path';
import __dirname from './dirname.js';

import posts from './script/posts/router.js';
import cycelog from './script/cycelog/router.js';

import vibing from './vibing/script/router.js';

const app = express();
const port = 8080;

app.get('/', (_, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/index.html', (_, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/README.md', (_, res) => { res.sendFile(path.join(__dirname, 'README.md')); });
app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(express.text());
app.use(express.json());

app.use('/posts', posts);
app.use('/cycelog', cycelog);

app.use('/vibing', vibing);

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});