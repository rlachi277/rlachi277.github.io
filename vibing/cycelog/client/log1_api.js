export async function entryExists(id) {
	const res = await fetch(`./exists/${id}`);
	if (!res.ok) throw res.status;
	return await res.json();
}

export async function patchLog1(body, getData) {
	const res = await fetch(window.location.href, {
		method: "PATCH",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify(body)
	});
	if (!res.ok) throw res.status;
	if (!getData) return undefined;
	return await res.json();
}

export async function deleteLog1Entry(id) {
	const res = await fetch(window.location.href, {
		method: "DELETE",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify({id: id})
	});
	if (!res.ok) throw res.status;
}

export async function moveLog1Entries(startId, endId, delta) {
	const res = await fetch(`${window.location.href}/move`, {
		method: "POST",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify({
			startId: startId,
			endId: endId,
			delta: delta
		})
	});
	if (!res.ok) throw {
		status: res.status,
		reason: await res.text()
	};
}
