import { deseri } from '../../shared/posts/seri.js';
import { addPost, removePost } from "./manage_nav.js";
const TEMPLATE_SLOT = "###여기까지가 템플릿임###";
const notFoundData = {
    type: "body",
    children: [
        { type: "h1", children: ["404 Not Found"] },
        { type: "nav", children: null }
    ]
};
export function getRawPost(db, path) {
    const dbResult = db.prepare('SELECT data FROM posts WHERE path = ?').get(path);
    if (dbResult === undefined)
        throw 404;
    return JSON.parse(dbResult.data);
}
export function getPostFromData(data, root, path, template, renderHooks) {
    const { normal, notFound } = template;
    if (data != undefined) {
        const rendered = deseri(data, `${root}${path}`, true, renderHooks);
        return normal.replace(TEMPLATE_SLOT, rendered);
    }
    else {
        const rendered = deseri(notFoundData, `${root}${path}`, true, renderHooks);
        throw {
            status: 404,
            html: notFound.replace(TEMPLATE_SLOT, rendered)
        };
    }
}
export function getPost(db, root, path, template, renderHooks) {
    let data = null;
    try {
        data = getRawPost(db, path);
    }
    catch (e) {
        if (e !== 404)
            throw e;
    }
    return getPostFromData(data, root, path, template, renderHooks);
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
    if (dbResult === undefined)
        throw 404;
    const { pos, data, splice } = body;
    if (splice == undefined || pos == undefined)
        throw badRequest("데이터가 충분히 주어지지 않았습니다.");
    if (!Number.isInteger(splice) || splice < 0 || !Array.isArray(pos))
        throw badRequest("데이터의 형식이 잘못되었습니다.");
    if (splice === 0 && data == undefined)
        throw badRequest("데이터가 충분히 주어지지 않았습니다.");
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
        if (typeof cur === 'string' || cur.children === null)
            throw badRequest("올바르지 않은 위치입니다.");
        cur = cur.children[pos.pop()];
        if (cur == undefined)
            throw badRequest("올바르지 않은 위치입니다.");
    }
    if (typeof cur === 'string' || cur.children === null)
        throw badRequest("올바르지 않은 위치입니다.");
    if (cur.children.length < pos[0])
        throw badRequest("올바르지 않은 위치입니다.");
    if (data != undefined)
        cur.children.splice(pos[0], splice, data);
    else
        cur.children.splice(pos[0], splice);
    db.prepare(`
		UPDATE posts
		SET data = ?
		WHERE path = ?;
	`).run(JSON.stringify(dbData), path);
}
export function deletePost(db, path) {
    const info = db.prepare('DELETE FROM posts WHERE path = ?').run(path);
    if (info.changes === 0)
        throw 404;
    removePost(db, path.split('/'));
}
export function getIndex(root, template, renderNavHook) {
    return getPostFromData({
        type: "nav",
        children: null
    }, root, "index.html", {
        normal: template,
        notFound: template
    }, [renderNavHook]);
}
export function postExists(db, path) {
    const dbResult = db.prepare('SELECT COUNT(1) FROM posts WHERE path = ?').get(path);
    return (dbResult?.['COUNT(1)'] ?? 0) !== 0;
}
export function badRequest(reason) {
    return {
        status: 400,
        reason: reason
    };
}
