import express from "express";
import { get_post_json } from "./posts.js";
import { render } from './render.js';

const router = express.Router();
export default router;

router.get('/raw/*path', (req, res) => {
	let path = req.params.path.join('/');
	if (path.endsWith("/")) path += "index.html";
	try {
		res.send(get_post_json(path));
	} catch { res.sendStatus(404); }
});

router.post('/deserialize/', (req, res) => {
	const { data, cur, init } = req.body;
	res.send(render(data, cur, init));
});