export function addPost(db, path) {
	if (path.length === 0) path = ["index.html"];
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	let dbResult = db.prepare('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
	if (dbResult === undefined) {
		addDirectory(db, path.slice(0, -1));
		dbResult = "[]";
	}
	const data = JSON.parse(dbResult);
	if (data.includes(path.at(-1))) return;
	data.push(path.at(-1));
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), parent);
}

export function removePost(db, path) {
	if (path.length === 0) path = ["index.html"];
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	const dbResult = db.prepare('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
	if (dbResult === undefined) return; // ???
	const data = JSON.parse(dbResult);
	if (!data.includes(path.at(-1))) return; // ???
	data.splice(data.indexOf(path.at(-1)), 1);
	db.prepare(`
		UPDATE dir
		SET posts = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), parent);
	if (data.length === 0) {
		const parentSubdirs = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(parent)?.subdir;
		if (JSON.parse(parentSubdirs).length === 0) removeDirectory(db, path.slice(0, -1));
	}
}

function addDirectory(db, path) {
	const joined = path.length === 0 ? '' : path.join('/') + '/';
	const exist = db.prepare('SELECT id FROM dir WHERE path = ?').get(joined);
	if (exist !== undefined) return;
	db.prepare(`
		INSERT INTO dir (path, posts, subdir)
		VALUES (?, '[]', '[]')
		ON CONFLICT(path) DO NOTHING
	`).run(joined);
	if (path.length === 0) return;
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	let dbResult = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(parent)?.subdir;
	if (dbResult === undefined) {
		addDirectory(db, path.slice(0, -1));
		dbResult = "[]";
	}
	const data = JSON.parse(dbResult);
	if (data.includes(path.at(-1))) return;
	data.push(path.at(-1));
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data.sort()), parent);
}

function removeDirectory(db, path) {
	const joined = path.length === 0 ? '' : path.join('/') + '/';
	const exist = db.prepare('SELECT id FROM dir WHERE path = ?').get(joined);
	if (exist === undefined) return; // ???
	db.prepare(`
		DELETE FROM dir
		WHERE path = ?
	`).run(joined);
	if (path.length === 0) return;
	const parent = path.length === 1 ? '' : path.slice(0, -1).join('/') + '/';
	const dbResult = db.prepare('SELECT subdir FROM dir WHERE path = ?').get(parent)?.subdir;
	if (dbResult === undefined) return; // ???
	const data = JSON.parse(dbResult);
	if (!data.includes(path.at(-1))) return; // ???
	data.splice(data.indexOf(path.at(-1)), 1);
	db.prepare(`
		UPDATE dir
		SET subdir = ?
		WHERE path = ?;
	`).run(JSON.stringify(data), parent);
	if (data.length === 0) {
		const parentPosts = db.prepare('SELECT posts FROM dir WHERE path = ?').get(parent)?.posts;
		if (JSON.parse(parentPosts).length === 0) removeDirectory(db, path.slice(0, -1));
	}
}