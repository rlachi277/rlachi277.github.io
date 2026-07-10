import express from "express";
import path from 'path';
import root from '../../server/root.js';
import chat from "./chat/router.js";
import pdfds from "./pdfds/router.js";

const router = express.Router();
export default router;

router.use('/chat', chat);
router.use('/pdfds', pdfds);
router.use(express.static(path.join(root, 'vibing')));

router.get('/', (_, res) => { res.sendFile(path.join(root, 'vibing', 'index.html')); });
router.get('/index.html', (_, res) => { res.sendFile(path.join(root, 'vibing', 'index.html')); });
