import { patchPost as superPatchPost } from "../posts/posts.js";

export { getPost as getLog3 } from "../posts/posts.js";
export { putPost as putLog3 } from "../posts/posts.js";

export function patchLog3(db, path, body) {
	const { pos, data, splice } = body;
	const posList = [1, pos];
	superPatchPost(db, path, {
		pos: posList,
		data: data,
		splice: splice
	});
}

export { deletePost as deleteLog3 } from "../posts/posts.js";