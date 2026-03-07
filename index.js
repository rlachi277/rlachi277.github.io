import express from 'express';
import path from 'path';
import posts from './script/posts.js';
import putils from './script/putils.js';
import __dirname from './dirname.js';

const app = express();
const port = 8080;

app.get('/', (_, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/index.html', (_, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/README.md', (_, res) => { res.sendFile(path.join(__dirname, 'README.md')); });
app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/script', express.static(path.join(__dirname, 'script')));

app.use(express.text());
app.use(express.json());
app.use('/posts', posts);
app.use('/putils', putils);

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});