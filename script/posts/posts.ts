import type { Database } from 'better-sqlite3';
import type { DeseriHook, MutableSeriData, SeriData } from '../../shared/posts/seri.js';

import { deseri } from '../../shared/posts/seri.js';
import { addPost, removePost } from "./manage_nav.js";

export type PostRow = {
	readonly id?: number,
	readonly path?: string,
	readonly data?: string
};

export type DirRow = {
	readonly id?: number,
	readonly path?: string,
	readonly posts?: string,
	readonly subdir?: string
};

export type CountRow = {
	readonly 'COUNT(1)': number
};

export type PostTemplate = {
	readonly normal: string,
	readonly notFound: string
};

export type PatchBody = {
	readonly pos?: number[],
	readonly data?: SeriData,
	readonly splice?: number
}

const TEMPLATE_SLOT = "###여기까지가 템플릿임###";
const notFoundData = {
	type: "body",
	children: [
		{type: "h1", children: ["404 Not Found"]},
		{type: "nav", children: null}
	]
} as const;

export function getRawPost(db: Database, path: string): SeriData {
	const dbResult = db.prepare<string,PostRow>('SELECT data FROM posts WHERE path = ?').get(path);
	if (dbResult === undefined || dbResult.data === undefined) throw 404;
	return JSON.parse(dbResult.data) as SeriData;
}

export function getPostFromData(data: SeriData | null | undefined, root: string, path: string, template: PostTemplate, renderHooks: DeseriHook[]): string {
	const { normal, notFound } = template;
	if (data != undefined) {
		const rendered = deseri(data, `${root}${path}`, true, renderHooks);
		return normal.replace(TEMPLATE_SLOT, rendered ?? "");
	} else {
		const rendered = deseri(notFoundData, `${root}${path}`, true, renderHooks);
		throw {
			status: 404,
			html: notFound.replace(TEMPLATE_SLOT, rendered ?? "")
		};
	}
}

export function getPost(db: Database, root: string, path: string, template: PostTemplate, renderHooks: DeseriHook[]): string {
	let data: SeriData | null = null;
	try {
		data = getRawPost(db, path);
	} catch (e) {
		if (e !== 404) throw e;
	}
	return getPostFromData(data, root, path, template, renderHooks);
}

export function putPost(db: Database, path: string, body: string) {
	db.prepare(`
		INSERT INTO posts (path, data)
		VALUES (?, ?)
		ON CONFLICT(path)
		DO UPDATE SET data = excluded.data;
	`).run(path, body);
	addPost(db, path.split('/'));
}

export function patchPost(db: Database, path: string, body: PatchBody) {
	const dbResult = db.prepare<string,PostRow>('SELECT data FROM posts WHERE path = ?').get(path)?.data;
	if (dbResult === undefined) throw 404;

	const { pos, data, splice } = body;
	if (splice == undefined || pos == undefined) throw badRequest("데이터가 충분히 주어지지 않았습니다.");
	if (!Number.isInteger(splice) || splice < 0 || !Array.isArray(pos)) throw badRequest("데이터의 형식이 잘못되었습니다.");
	if (splice === 0 && data == undefined) throw badRequest("데이터가 충분히 주어지지 않았습니다.")
	const dbData = JSON.parse(dbResult) as MutableSeriData;
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
		if (typeof cur === 'string' || cur.children === null) throw badRequest("올바르지 않은 위치입니다.");
		cur = cur.children[pos.pop() as number] as MutableSeriData;
		if (cur == undefined) throw badRequest("올바르지 않은 위치입니다.");
	}
	if (pos.length === 0) throw badRequest("올바르지 않은 위치입니다.");
	if (typeof cur === 'string' || cur.children === null) throw badRequest("올바르지 않은 위치입니다.");
	if (cur.children.length < pos[0]) throw badRequest("올바르지 않은 위치입니다.");
	if (data != undefined) cur.children.splice(pos[0], splice, data);
	else cur.children.splice(pos[0], splice);
	db.prepare(`
		UPDATE posts
		SET data = ?
		WHERE path = ?;
	`).run(JSON.stringify(dbData), path);
}

export function deletePost(db: Database, path: string) {
	const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
	if (info.changes === 0) throw 404;
	removePost(db, path.split('/'));
}

export function getIndex(root: string, template: string, renderNavHook: DeseriHook): string {
	return getPostFromData({
		type: "nav",
		children: null
	}, root, "index.html", {
		normal: template,
		notFound: template
	}, [renderNavHook]);
}

export function postExists(db: Database, path: string): boolean {
	const dbResult = db.prepare<string,CountRow>('SELECT COUNT(1) FROM posts WHERE path = ?').get(path);
	return (dbResult?.['COUNT(1)'] ?? 0) !== 0;
}

export function badRequest(reason: string) {
	return {
		status: 400,
		reason: reason
	};
}
