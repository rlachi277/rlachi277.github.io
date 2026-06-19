import { deseri } from '../../shared/posts/seri.js';
import { addPost, removePost } from "./manage_nav.js";

const TEMPLATE_SLOT = "###여기까지가 템플릿임###";

export function getRawPost(db, path) {
	const dbResult = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
	if (dbResult === undefined) throw 404;
	return JSON.parse(dbResult.data);
}

export function getPost(db, path, template, renderHooks) {
	const { normal, notFound, notFoundData } = template;
	try {
		const rendered = deseri(getRawPost(db, path), `/posts/${path}`, true, renderHooks);
		return normal.replace(TEMPLATE_SLOT, rendered);
	} catch (e) {
		if (e !== 404) throw e;
		const rendered = deseri(notFoundData, `/posts/${path}`, true, renderHooks);
		throw {
			status: 404,
			html: notFound.replace(TEMPLATE_SLOT, rendered)
		};
	}
}

export function putPost(db, path, body) {
	db.prepare(`
		INSERT INTO posts (path, data)
		VALUES (?, ?)
		ON CONFLICT(path)
		DO UPDATE SET data = excluded.data;
	`).run(path, body);
	addPost(db, path.split('/'));
}

export function patchPost(db, path, body) {
	const dbResult = db.prepare('SELECT data FROM posts WHERE path = ?').get(path)?.data;
	if (dbResult === undefined) throw 404;

	const { pos, data, splice } = body;
	if (splice == undefined || pos == undefined) throw {
		status: 400,
		reason: "necessary arguments absent"
	};
	if (!Number.isInteger(splice) || splice < 0 || !Array.isArray(pos)) throw {
		status: 400,
		reason: "format error"
	};
	if (splice === 0 && data == undefined) throw {
		status: 400,
		reason: "data absent"
	};
	const dbData = JSON.parse(dbResult);
	if (pos.length === 0) {
		db.prepare(`
			UPDATE posts
			SET data = ?
			WHERE path = ?;
		`).run(data, path);
		return;
	}
	let cur = dbData;
	pos.reverse();
	while (pos.length > 1) {
		cur = cur.children[pos.pop()];
		if (cur == undefined) throw {
			status: 400,
			reason: "invalid pos"
		};
	}
	if (cur.children.length < pos[0]) throw {
		status: 400,
		reason: "invalid pos"
	};
	if (data != undefined) cur.children.splice(pos[0], splice, data);
	else cur.children.splice(pos[0], splice);
	db.prepare(`
		UPDATE posts
		SET data = ?
		WHERE path = ?;
	`).run(JSON.stringify(dbData), path);
}

export function deletePost(db, path) {
	const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
	if (info.changes === 0) throw 404;
	removePost(db, path.split('/'));
}