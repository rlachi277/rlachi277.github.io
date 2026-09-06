import express from "express";
import {
	getLog1,
	postLog1,
	patchLog1,
	deleteLog1,
	moveLog1,
	log1Exists,
	getRawLog1,
	log1Where
} from "./cycelog.js";
import { withErrors } from "../posts/router.js";
import { renderNav } from '../posts/render_nav.js';
import { role } from '../auth.js';
import { db } from './router.js';

const router = express.Router();
export default router;

router.get(['/', '/index.html'], role("admin", true), (_, res) => {
	res.render("cycelog/log1_index.ejs", {
		nav: renderNav(db, "/cycelog/log1/", "index.html")
	});
});

router.get('/:id', role("admin", true), (req, res) => {
	const id = req.params.id;
	const result = getLog1(db, "/cycelog/log1/", id, [], renderNav(db, "/cycelog/log1/", id));
	if (result[0]) res.render("cycelog/log1.ejs", result[1]);
	else res.status(404).render("cycelog/log1_404.ejs", result[1]);
});

router.post('/:id', role("admin"), (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		postLog1(db, id, req.body);
	});
});

router.patch('/:id', role("admin"), (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		return patchLog1(db, id, req.body);
	}, true);
});

router.delete('/:id', role("admin"), (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		deleteLog1(db, id, req.body);
	});
});

router.post('/:id/move', role("admin"), (req, res) => {
	withErrors(res, () => {
		moveLog1(db, req.params.id, req.body);
	});
});

router.get('/:id/raw', role("admin"), (req, res) => {
	withErrors(res, () => {
		return getRawLog1(db, req.params.id);
	}, true);
});

router.get('/exists/:id', role("admin"), (req, res) => {
	withErrors(res, () => {
		return log1Exists(db, parseInt(req.params.id));
	}, true);
});

router.get('/where/:id', role("admin"), (req, res) => {
	withErrors(res, () => {
		return log1Where(db, parseInt(req.params.id));
	}, true);
});