import express from 'express';
import path from 'path';
import root from './root.js';

import posts from './posts/router.js';
import cycelog from './cycelog/router.js';

import vibing from '../vibing/script/router.js';

const app = express();
// const port = 27717; // 포트포워딩됨
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(root, 'template'));

app.get('/', (_, res) => { res.render('index'); });
app.get('/index.html', (_, res) => { res.render('index'); });
app.get('/README.md', (_, res) => { res.sendFile(path.join(root, '..', 'README.md')); });
app.use('/public', express.static(path.join(root, 'public')));
app.use('/assets', express.static(path.join(root, '..', 'assets')));

app.use(express.text());
app.use(express.json());

app.use('/posts', posts);
app.use('/cycelog', cycelog);

app.use('/vibing', vibing);

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});