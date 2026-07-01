import type { EntryRow } from "../../server/cycelog/cycelog.js";

export async function sendPatch(body: EntryRow, getData: boolean = false): Promise<EntryRow | void> {
	const res = await fetch(window.location.href, {
		method: "PATCH",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify(body)
	});
	if (!res.ok) throw res.status;
	if (!getData) return;
	return await res.json();
}

export async function sendExists(id: number): Promise<boolean> {
	const res = await fetch(`./exists/${id}`);
	if (!res.ok) throw res.status;
	return await res.json();
}

export async function sendDelete(id: number) {
	const res = await fetch(window.location.href, {
		method: "DELETE",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify({id: id})
	});
	if (!res.ok) throw res.status;
}

export async function sendMove(startId: number, endId: number, delta: number) {
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
