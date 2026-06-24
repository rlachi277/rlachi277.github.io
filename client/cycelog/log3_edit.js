import { entrySeriHook, entryDeseriHook, clientWhere } from '../../shared/cycelog/cycelog_hook.js';
import { d$ } from "../jquery.js";
import { SERI_HOOKS, DESERI_HOOKS } from "../posts/script.js";
import { dialog, showWarning } from "../posts/dialog.js";

export async function setupLog3Edit() {
	await setTypes();
}

const S = window.getSelection();
const types = [];

async function setTypes() {
	const res = await fetch(`../log1/${window.location.pathname.split('/').at(-1)}/raw`);
	if (!res.ok) throw res.status;
	const data = await res.json();
	for (const e of data) types[e.id] = e.type;

	SERI_HOOKS.push(entrySeriHook);
	DESERI_HOOKS.push(entryDeseriHook(types, clientWhere("/cycelog/"), true));
}

function onEditableKeydown(e) {
	if (!S.isCollapsed) return;
	const shortcut = e.ctrlKey || e.metaKey;
	if (shortcut && e.key === "e") insertEntry();
}

function insertEntry() {
	dialog("항목 언급", `
		<label for="dialog-entry-id">번호: </label>
		<input id="dialog-entry-id" placeholder="항목 번호 입력">
	`, () => {
		const id = parseInt(d$("dialog-entry-id"));
		if (Number.isNaN(id)) {
			showWarning("올바르지 않은 항목 번호입니다.");
			return false;
		}
	})
}