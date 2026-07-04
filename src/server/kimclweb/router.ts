import express from "express";

import notfont from './notfont.js';
import gallery from './gallery.js';
import dobbyTimer from './dobby-timer.js';
import yetAnotherTimer from './yet-another-timer.js';
import archive from './archive.js';

const router = express.Router();
export default router;

router.get('/', (_, res) => {
	res.render("kimclweb/index");
});

router.use('/notfont', notfont);
router.use('/gallery', gallery);
router.use('/dobby-timer', dobbyTimer);
router.use('/yet-another-timer', yetAnotherTimer);
router.use('/archive', archive);
