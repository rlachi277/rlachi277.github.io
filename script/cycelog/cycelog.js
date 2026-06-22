import { patchPost, getPostFromData, postExists, deletePost } from "../posts/posts.js";

export { getPost as getLog3 } from "../posts/posts.js";
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
const LOG1_TYPE = Object.freeze({
	NONE: 0,
	STUDY: 1,
	DIALOG: 2,
	THOUGHT: 3,
	GENERAL: 4,
	WORK: 5,
	INFORMATION: 6
});
const LOG1_TYPE_NAME = Object.freeze([
	"",
	"공부",
	"대화",
	"생각",
	"일상",
	"작업",
	"정보"
]);
const LOG1_THEAD = `<thead id="log1-thead">
	<tr>
		<th scope="col">번호</th>
		<th scope="col">유형</th>
		<th scope="col">시간</th>
		<th scope="col">내용</th>
	</tr>
</thead>`.replaceAll(/\n|\t/g, '');

function getLog1Entries(db, postId) {
	const dbResult = db.prepare("SELECT id,type,time,content FROM entries WHERE post = ?").all(postId);
	if (dbResult === undefined) throw 404;
	return dbResult;
}

function buildLog1Table(db, postId) {
	const data = getLog1Entries(db, postId);
	if (data.length === 0) return `<table id="log1-table">
		${LOG1_THEAD}
		<tfoot class="empty"><tr><td></td><td></td><td></td><td></td></tr></tfoot>
	</table>`.replaceAll(/\n|\t/g, '');
	const ids = data.map((e) => e.id);
	const maxId = Math.max(...ids);
	const minId = Math.min(...ids);
	const dataById = [];
	for (const e of data) dataById[e.id] = e;
	let result = '';
	for (let i = minId; i <= maxId; i++) {
		const e = dataById[i];
		if (e === undefined) result += `<tr>
			<td class="log1-td-id"></td>
			<td class="log1-td-type"></td>
			<td class="log1-td-time"><div class="wrapper"></div></td>
			<td class="log1-td-content"></td>
		</tr>`.replaceAll(/\n|\t/g, '');
		else result += `<tr data-id="${e.id}" data-type="${e.type}" data-time="${e.time}">
			<td class="log1-td-id">${e.id}</td>
			<td class="log1-td-type">${LOG1_TYPE_NAME[e.type]}</td>
			<td class="log1-td-time"><div class="wrapper">${e.time}</div></td>
			<td class="log1-td-content">${e.content}</td>
		</tr>`.replaceAll(/\n|\t/g, '');
	}
	return `<table id="log1-table">
		${LOG1_THEAD}
		${result}
		<tfoot><tr><td></td><td></td><td></td><td></td></tr></tfoot>
	</table>`.replaceAll(/\n|\t/g, '');
}

export function getLog1(db, root, postId, template, renderHooks) {
	const data = postExists(db, postId) ? log1Header(postId) : undefined;
	const rendered = getPostFromData(data, root, postId, {
		normal: template.normal,
		notFound: template.notFound
	}, renderHooks);
	if (data === undefined) return rendered;
	return rendered.replace(LOG1_TEMPLATE_SLOT, buildLog1Table(db, postId));
}

export function postLog1(db, postId, body) {
	try {
		db.prepare(`
			INSERT INTO entries (id, type, time, content, post)
			VALUES (?, ?, ?, ?, ?)
		`).run(body.id, body.type, body.time, body.content, postId);
	} catch (e) {
		if (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
			throw {
				status: 400,
				reason: "해당 번호의 항목이 이미 존재합니다."
			};
		} else if (e.code === "SQLITE_CONSTRAINT_NOTNULL") {
			throw {
				status: 400,
				reason: "데이터가 충분히 주어지지 않았습니다."
			};
		}
		throw e;
	}
}

export function patchLog1(db, postId, body) {
	if (body.id == undefined) throw {
		status: 400,
		reason: "데이터가 충분히 주어지지 않았습니다."
	};
	let dbResult = db.prepare(`SELECT type, time, content, post FROM entries
		WHERE id = ?`).get(body.id);
	if (dbResult === undefined) dbResult = {type: 0, time: '', content: ''};
	else if (dbResult.post !== postId) throw {
		status: 400,
		reason: "해당 항목은 다른 글의 1차 기록입니다."
	};
	const newData = {
		type: body.type || dbResult.type,
		time: body.time || dbResult.time,
		content: body.content || dbResult.content
	}; // body에서의 0 또는 빈 문자열은 무시
	if (!(0 <= newData.type && newData.type <= 6)) throw {
		status: 400,
		reason: "데이터의 형식이 잘못되었습니다."
	};
	db.prepare(`
		INSERT OR REPLACE INTO entries (id, type, time, content, post)	
		VALUES (?, ?, ?, ?, ?)
	`).run(body.id, newData.type, newData.time, newData.content, postId);
	return {
		id: body.id,
		type: LOG1_TYPE_NAME[newData.type],
		time: newData.time,
		content: newData.content,
		post: postId
	};
}

export function deleteLog1(db, postId, body) {
	const info = db.prepare(`DELETE FROM entries
		WHERE id = ? AND post = ?`).run(body.id, postId);
	if (info.changes === 0) throw 404;
}

function getMoveTarget(db, postId, startId, endId, delta) {
	if (startId == undefined || endId == undefined || delta == undefined) {
		throw {
			status: 400,
			reason: "데이터가 충분히 주어지지 않았습니다."
		};
	} else if (startId > endId || delta === 0 || startId + delta <= 0) {
		throw {
			status: 400,
			reason: "데이터의 형식이 잘못되었습니다."
		};
	}
	const dbResult = db.prepare(`SELECT id, type, time, content, post FROM entries
		WHERE post = ? AND id BETWEEN ? AND ?`).all(postId, startId, endId);
	if (dbResult.length === 0) throw 404;
	const allCount = db.prepare(`SELECT COUNT(1) FROM entries
		WHERE id BETWEEN ? AND ?`).get(startId, endId)?.['COUNT(1)'];
	if (dbResult.length !== allCount) throw {
		status: 400,
		reason: "적용 범위에 다른 글의 1차 기록이 포함됩니다."
	};
	const newRangeStart = (delta > 0) ? endId+1 : startId+delta;
	const newRangeEnd = (delta > 0) ? endId+delta : startId-1;
	const newRangeCount = db.prepare(`SELECT COUNT(1) FROM entries
		WHERE id BETWEEN ? AND ?`).get(newRangeStart, newRangeEnd)?.['COUNT(1)'];
	if (newRangeCount !== 0) throw {
		status: 400,
		reason: "이 동작으로 인해 번호 충돌이 발생할 가능성이 있습니다."
	};
	db.prepare(`DELETE FROM entries WHERE id BETWEEN ? AND ?`).run(startId, endId);

	// TODO: 3차 기록 업데이트
	return dbResult;
}

export function moveLog1(db, postId, body) {
	const { startId, endId, delta } = body;
	const dbResult = getMoveTarget(db, postId, startId, endId, delta);
	db.transaction(() => {
		try {
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