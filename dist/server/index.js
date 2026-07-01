import express from 'express';
import path from 'path';
import root from './root.js';
import posts from './posts/router.js';
import cycelog from './cycelog/router.js';
import vibing from '../vibing/script/router.js';
const app = express();
// const port = 27717; // 포트포워딩됨
const port = 8080;
app.get('/', (_, res) => { res.sendFile(path.join(root, 'dist', 'client', 'index.html')); });
app.get('/index.html', (_, res) => { res.sendFile(path.join(root, 'dist', 'client', 'index.html')); });
app.get('/README.md', (_, res) => { res.sendFile(path.join(root, 'README.md')); });
app.use('/dist', express.static(path.join(root, 'dist')));
app.use('/shared', express.static(path.join(root, 'shared')));
app.use('/assets', express.static(path.join(root, 'assets')));
app.use(express.text());
app.use(express.json());
app.use('/posts', posts);
app.use('/cycelog', cycelog);
app.use('/vibing', vibing);
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
