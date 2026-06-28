import { buildLog1Table } from "../../shared/cycelog/log1.js";
import {
	getPost,
	patchPost,
	getPostFromData,
	postExists,
	deletePost,
	badRequest
} from "../posts/posts.js";

const LOG3_TYPES_SLOT = "###여기까지가 템플릿임 3###";

export function getLog3(db, root, path, template, renderHooks, types) {
	return getPost(db, root, path, template, renderHooks).replace(LOG3_TYPES_SLOT, JSON.stringify(types));
}

export { putPost as putLog3 } from "../posts/posts.js";

export function patchLog3(db, path, body) {
	const { pos, data, splice } = body;
	patchPost(db, path, {
		pos: pos,
		data: data,
		splice: splice
	});
}

export function deleteLog3(db, path) {
	deletePost(db, path);
	db.prepare(`DELETE FROM entries WHERE post = ?`).run(path);
}

const LOG1_TEMPLATE_SLOT = "###여기까지가 템플릿임 2###";
const log1Header = (id) => {
	return {
		type: "body",
		children: [
			{type: "h1", children: [`cycelog: ${id}`]},
			{type: "nav"},
			LOG1_TEMPLATE_SLOT
		]
	};
};

export function getRawLog1(db, postId) {
	const dbResult = db.prepare("SELECT id,type,time,content FROM entries WHERE post = ? ORDER BY id").all(postId);
	if (dbResult === undefined) throw 404;
	return dbResult;
}

export function getLog1(db, root, postId, template, renderHooks) {
	const data = postExists(db, postId) ? log1Header(postId) : undefined;
	const rendered = getPostFromData(data, root, postId, {
		normal: template.normal,
		notFound: template.notFound
	}, renderHooks);
	if (data === undefined) return rendered;

	return rendered.replace(LOG1_TEMPLATE_SLOT, buildLog1Table(getRawLog1(db, postId)));
}

export function postLog1(db, postId, body) {
	try {
		db.prepare(`
			INSERT INTO entries (id, type, time, content, post)
			VALUES (?, ?, ?, ?, ?)
		`).run(body.id, body.type, body.time, body.content, postId);
	} catch (e) {
		if (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") throw badRequest("해당 번호의 항목이 이미 존재합니다.");
		else if (e.code === "SQLITE_CONSTRAINT_NOTNULL") throw badRequest("데이터가 충분히 주어지지 않았습니다.");
		throw e;
	}
}

export function patchLog1(db, postId, body) {
	if (body.id == undefined) throw badRequest("데이터가 충분히 주어지지 않았습니다.");
	let dbResult = db.prepare(`SELECT type, time, content, post FROM entries
		WHERE id = ?`).get(body.id);
	if (dbResult === undefined) dbResult = {type: 0, time: '', content: ''};
	else if (dbResult.post !== postId) throw badRequest("해당 항목은 다른 글의 1차 기록입니다.");
	const newData = {
		type: body.type || dbResult.type,
		time: body.time || dbResult.time,
		content: body.content || dbResult.content
	}; // body에서의 0 또는 빈 문자열은 무시
	if (!(0 <= newData.type && newData.type <= 6)) throw badRequest("데이터의 형식이 잘못되었습니다.");
	db.prepare(`
		INSERT OR REPLACE INTO entries (id, type, time, content, post)	
		VALUES (?, ?, ?, ?, ?)
	`).run(body.id, newData.type, newData.time, newData.content, postId);
	const result = {
		id: body.id,
		type: newData.type,
		time: newData.time,
		content: newData.content,
		post: postId
	};
	return result;
}

export function deleteLog1(db, postId, body) {
	const info = db.prepare(`DELETE FROM entries
		WHERE id = ? AND post = ?`).run(body.id, postId);
	if (info.changes === 0) throw 404;
}

export function moveLog1(db, postId, body) {
	const { startId, endId, delta } = body;
	const dbResult = getMoveTarget(db, postId, startId, endId, delta);
	db.transaction(() => {
		try {
			db.prepare(`DELETE FROM entries WHERE id BETWEEN ? AND ?`).run(startId, endId);
			for (const e of dbResult) {
				postLog1(db, postId, {
					id: e.id + delta,
					type: e.type,
					time: e.time,
					content: e.content
				});
			}
		} catch (e) {
			if (e.status === 404) throw "oh no"; // ???
			throw e;
		}
	})();
}

function getMoveTarget(db, postId, startId, endId, delta) {
	if (startId == undefined || endId == undefined || delta == undefined) throw badRequest("데이터가 충분히 주어지지 않았습니다.");
	else if (startId > endId || delta === 0 || startId + delta <= 0) throw badRequest("데이터의 형식이 잘못되었습니다.");

	const dbResult = db.prepare(`SELECT id, type, time, content, post FROM entries
		WHERE post = ? AND id BETWEEN ? AND ?`).all(postId, startId, endId);
	if (dbResult.length === 0) throw 404;
	const allCount = db.prepare(`SELECT COUNT(1) FROM entries
		WHERE id BETWEEN ? AND ?`).get(startId, endId)?.['COUNT(1)'];
	if (dbResult.length !== allCount) throw badRequest("적용 범위에 다른 글의 1차 기록이 포함됩니다.");
	
	const newRangeStart = (delta > 0) ? endId+1 : startId+delta;
	const newRangeEnd = (delta > 0) ? endId+delta : startId-1;
	const newRangeCount = db.prepare(`SELECT COUNT(1) FROM entries
		WHERE id BETWEEN ? AND ?`).get(newRangeStart, newRangeEnd)?.['COUNT(1)'];
	if (newRangeCount !== 0) throw badRequest("이 동작으로 인해 번호 충돌이 발생할 가능성이 있습니다.");

	// TODO: 3차 기록 업데이트
	return dbResult;
}

export function log1Exists(db, id) {
	const cnt = db.prepare(`SELECT COUNT(1) FROM entries
		WHERE id = ?`).get(id)['COUNT(1)'];
	return cnt !== 0;
}

export { serverWhere as log1Where } from "../../shared/cycelog/cycelog_hook.js";
