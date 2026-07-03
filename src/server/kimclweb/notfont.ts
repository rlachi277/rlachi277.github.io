import express from "express";

const router = express.Router();
export default router;

router.get('/', (_, res) => {
	res.status(200).render("kimclweb/notfont/index");
});
