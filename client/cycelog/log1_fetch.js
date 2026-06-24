export async function sendPatch(body, getData) {
	const res = await fetch(window.location.href, {
		method: "PATCH",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify(body)
	});
	if (!res.ok) throw res.status;
	if (!getData) return undefined;
	return await res.json();
}

export async function sendExists(id) {
	const res = await fetch(`./exists/${id}`);
	if (!res.ok) throw res.status;
	return await res.json();
}

export async function sendDelete(id) {
	const res = await fetch(window.location.href, {
		method: "DELETE",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify({id: id})
	});
	if (!res.ok) throw res.status;
}

export async function sendMove(startId, endId, delta) {
	const res = await fetch(`${window.location.origin}${window.location.pathname}/move`, {
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