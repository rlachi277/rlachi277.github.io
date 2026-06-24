import { patchPost, deletePost } from "../posts/posts.js";

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
