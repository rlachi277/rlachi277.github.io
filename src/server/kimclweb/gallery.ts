import express from "express";

const router = express.Router();
export default router;

router.get('/', (_, res) => {
	res.status(200).render("kimclweb/gallery/index");
});

router.get('/*path', (req, res) => {
	const path = req.params.path;
	if (!path.at(-1)?.endsWith(".html")) {
		res.sendStatus(404);
		return;
	}
	path[path.length - 1] = path[path.length - 1].replace(/\.html$/, '');
	res.status(200).render(`kimclweb/gallery/${path.join('/')}`);
});
