import express from "express";
import { cache } from "../cache.js";

const router = express.Router();
export default router;

router.use(cache(31536000));

router.get(['/', '/index.html'], (_, res) => {
	res.render("newscript/index");
});

router.get('/index64.html', (_, res) => {
	res.render("newscript/index64");
});

router.get('/indexnew.html', (_, res) => {
	res.render("newscript/indexnew");
});