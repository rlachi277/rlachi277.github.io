import express from "express";

const router = express.Router();
export default router;

router.get('/', (_, res) => {
	res.render("newscript/index");
});

router.get('/index.html', (_, res) => {
	res.render("newscript/index");
});

router.get('/index64.html', (_, res) => {
	res.render("newscript/index64");
});
