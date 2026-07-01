import express from "express";
import path from 'path';
import root from '../../server/root.js';
import chat from "./chat/router.js";

const router = express.Router();
export default router;

router.use('/chat', chat);
router.use(express.static(path.join(root, 'dist', 'vibing')));

router.get('/', (_, res) => { res.sendFile(path.join(root, 'dist', 'vibing', 'index.html')); });
router.get('/index.html', (_, res) => { res.sendFile(path.join(root, 'dist', 'vibing', 'index.html')); });
