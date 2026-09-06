import type { EntryTypeObject } from '../../shared/cycelog/cycelog_hook.js';

import express from "express";
import {
	getLog3,
	putLog3,
	patchLog3,
	deleteLog3,
	getRawLog1,
	serverWhere
} from "./cycelog.js";
import { withErrors } from "../posts/router.js";
import { renderNav } from '../posts/render_nav.js';
import { cycelogDeseriHook } from '../../shared/cycelog/cycelog_hook.js';
import { role } from '../auth.js';
import { db } from './router.js';

const router = express.Router();
export default router;

router.get(['/', '/index.html'], role("admin", true), (_, res) => {
	res.render("cycelog/log3_index.ejs", {
		nav: renderNav(db, "/cycelog/log3/", "index.html")
	});
});

router.get('/:id', role("admin", true), (req, res) => {
	const id = req.params.id;
	const types: Record<number,number> = {};
	const data = getRawLog1(db, id);
	for (const e of data) types[e.id] = e.type;
	const typeObject: EntryTypeObject = {
		has: (id) => Object.hasOwn(types, id),
		get: (id) => types[id]
	};

	const result = getLog3(
		db, "/cycelog/log3/", id, [cycelogDeseriHook(typeObject, serverWhere(db), req.query.log1 !== undefined)],
		renderNav(db, "/cycelog/log3/", id), req.query.log1 !== undefined ? data : undefined
	);
	if (result[0]) res.render("cycelog/log3.ejs", result[1]);
	else res.status(404).render("cycelog/log3_404.ejs", result[1]);
});

router.put('/:id', role("admin"), (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		putLog3(db, id, req.body);
	}, false);
});

router.patch('/:id', role("admin"), (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		patchLog3(db, id, req.body);
	}, false);
});

router.delete('/:id', role("admin"), (req, res) => {
	const id = req.params.id;
	withErrors(res, () => {
		deleteLog3(db, id);
	}, false);
});
