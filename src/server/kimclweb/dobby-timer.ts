import express from "express";

const router = express.Router();
export default router;

router.get('/', (_, res) => {
	res.render("kimclweb/dobby-timer/index");
});
