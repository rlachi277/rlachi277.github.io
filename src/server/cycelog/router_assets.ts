import express from "express";
import { cache } from "../cache.js";
import { role } from "../auth.js";
import { db } from "./router.js";
import { accessImage, asset, deleteImage, deleteImageFromFile, storeImage } from "./assets.js";

const router = express.Router();
export default router;

router.get(["/", "/index.html"], role("admin", true), (_, res) => {
	res.render("cycelog/assets.ejs");
});

router.post("/image", role("admin"), asset, (req, res) => {
	storeImage(db, req.file, res);
});

router.post("/image/delete/", role("admin"), asset, (req, res) => {
	deleteImageFromFile(db, req.file, res);
});

router.get("/image/:name", role("admin"), cache(31536000, false, true), (req, res) => {
	accessImage(db, req.params.name, res);
});

router.delete("/image/:name", role("admin"), (req, res) => {
	deleteImage(db, req.params.name, res);
});
