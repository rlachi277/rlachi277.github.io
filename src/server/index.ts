import express from 'express';
import path from 'path';
import compression from 'compression';
import root from './root.js';
import auth from './auth.js';

import posts from './posts/router.js';
import cycelog from './cycelog/router.js';
import kimclweb from './kimclweb/router.js';

import newscript from '../server/newscript/router.js';
import vibing from '../vibing/script/router.js';

const app = express();
// const port = 27717; // 포트포워딩됨
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(root, 'template'));

app.get(['/', '/index.html'], (_, res) => { res.render('index'); });
app.get('/README.md', (_, res) => { res.sendFile(path.join(root, '..', 'README.md')); });
app.use('/public', express.static(path.join(root, 'public')));
app.use('/assets', express.static(path.join(root, '..', 'assets')));

app.use(express.text({limit: '50mb'}));
app.use(express.json({limit: '50mb'}));
app.use(compression());
app.use('/auth', auth);

app.use('/posts', posts);
app.use('/cycelog', cycelog);
app.use('/kimclweb', kimclweb);

app.use('/newscript', newscript);
app.use('/vibing', vibing);

app.use((_, res) => {
    res.status(404).render('404');
});

app.listen(port);
