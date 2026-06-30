import express from "express";
import path from 'path';
import __dirname from '../../dirname.js';
import chat from "./chat/router.js";

const router = express.Router();
export default router;

router.use('/chat', chat);
router.use(express.static(path.join(__dirname, 'vibing')));

router.get('/', (_, res) => { res.sendFile(path.join(__dirname, 'vibing', 'index.html')); });
router.get('/index.html', (_, res) => { res.sendFile(path.join(__dirname, 'vibing', 'index.html')); });
