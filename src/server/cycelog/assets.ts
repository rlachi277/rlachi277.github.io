import type { Database } from "better-sqlite3";
import type { Response } from "express";

import multer from "multer";
import crypto from "crypto";

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {fileSize: 50_000_000}
});

export const asset = upload.single("asset");

export function storeImage(db: Database, file: Express.Multer.File | undefined, res: Response) {
	if (file === undefined) {
		res.status(400).send("파일이 첨부되지 않았습니다.");
		return;
	}
	const hash = crypto.createHash('sha256').update(file.buffer).digest('hex').substring(0, 16);
	const result = db.prepare(`
		SELECT asset_type FROM assets
		WHERE asset_type = 'image' AND asset_name = ?
	`).get(hash) as any;
	if (result !== undefined) {
		res.status(400).send("내용이 정확히 같은 자료가 이미 있습니다.");
		return;
	}
	db.prepare(`
		INSERT INTO assets (asset_type, asset_name, mime_type, content)
		VALUES (?, ?, ?, ?)
	`).run("image", hash, file.mimetype, file.buffer);
	res.setHeader("Location", `./${hash}`).sendStatus(201);
}

export function deleteImageFromFile(db: Database, file: Express.Multer.File | undefined, res: Response) {
	if (file === undefined) {
		res.status(400).send("파일이 첨부되지 않았습니다.");
		return;
	}
	const hash = crypto.createHash('sha256').update(file.buffer).digest('hex').substring(0, 16);
	deleteImage(db, hash, res);
}

export function deleteImage(db: Database, name: string, res: Response) {
	const result = db.prepare(`
		SELECT mime_type, content FROM assets
		WHERE asset_type = 'image' AND asset_name = ?
	`).get(name) as {mime_type: string, content: Buffer} | undefined;
	if (result === undefined) {
		res.status(404).send("내용이 정확히 같은 자료가 없습니다.");
		return;
	}
	db.prepare(`
		DELETE FROM assets
		WHERE asset_type = 'image' AND asset_name = ?
	`).run(name);
	res.sendStatus(204);
}

export function accessImage(db: Database, name: string, res: Response) {
	const result = db.prepare(`
		SELECT mime_type, content FROM assets
		WHERE asset_type = 'image' AND asset_name = ?
	`).get(name) as {mime_type: string, content: Buffer} | undefined;
	if (result === undefined) {
		res.sendStatus(404);
		return;
	}
	res.type(result.mime_type);
	res.setHeader("Content-Disposition", "inline");
	res.send(result.content);
}