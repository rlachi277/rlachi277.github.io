import express from "express";
import path from "node:path";
import {fileURLToPath} from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientDir = path.join(rootDir, "2048");

const router = express.Router();
export default router;

router.use(express.static(clientDir));
router.get("/", (_req, res) => {
	res.sendFile(path.join(clientDir, "index.html"));
});
router.get("/index.html", (_req, res) => {
	res.sendFile(path.join(clientDir, "index.html"));
});
