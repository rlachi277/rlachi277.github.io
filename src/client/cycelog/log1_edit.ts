import type { EntryRow } from "../../server/cycelog/cycelog.js";

import { LOG1_TYPE_NAME } from "../../shared/cycelog/log1.js";
import { $, d$n, q$n } from "../query.js";
import { dialog, showWarning } from "../posts/dialog.js";
import { sendDelete, sendMove, sendPatch } from "./log1_fetch.js";
import { setupGrid, getFocusState, focusOn } from "./log1_grid.js";
import { k2e } from "../k2e.js";

const S = window.getSelection() as Selection;
const SYMBOLS: Record<string,string> = {".": "·", "st": "★"};

export function setupLog1Edit() {
	setupGrid();
	for (const row of $("tbody tr").list) setupRow(row);
}

export function setupRow(row: HTMLElement) {
	if (!row.hasAttribute("data-id")) return;
	q$n(".log1-td-id", row).addEventListener("click", onIdFieldClick);
	q$n(".log1-td-type", row).addEventListener("click", onTypeFieldClick);
	q$n(".log1-td-time", row).addEventListener("click", onTimeFieldClick);
	q$n(".log1-td-content", row).addEventListener("click", onContentFieldClick);
	q$n(".log1-td-content", row).addEventListener("keydown", onContentFieldKeydown);
	q$n(".log1-td-content", row).addEventListener("input", onContentFieldInput);
}

export async function onIdFieldClick(this: HTMLElement, e: PointerEvent | Record<'shiftKey'|'ctrlKey'|'altKey'|'metaKey',boolean>) {
	const row = this.parentElement as HTMLElement;
	const id = parseInt(row.getAttribute("data-id") as string);
	focusOn(parseInt(row.getAttribute("data-row") as string), 0, true);
	if (e.altKey) deleteEntryDialog.call(this, id);
	else if (e.shiftKey && !(e.ctrlKey || e.metaKey)) moveEntriesDialog(id);
	else {
		const path = `../log3/${window.location.pathname.split("/").at(-1)}?edit=t#entry${id}`;
		// this *will* work on iOS Safari. only _blank doesn't work.
		if (e.ctrlKey || e.metaKey) window.open(path, "_blank", "noopener");
		else window.open(path, "_self", "noopener");
		(e as PointerEvent).preventDefault?.();
	}
}

async function deleteEntryDialog(this: HTMLElement, id: number) {
	dialog(`${id}번 항목 삭제`, `
		정말로 이 항목을 삭제하시겠습니까?<br>
		이 작업은 되돌릴 수 없습니다.<br>
		3차 기록에서의 반영 및 참조는 깨진 링크로 남습니다.
	`, async () => {
		try {
			await sendDelete(id);
			const row = this.parentElement as HTMLElement;
			if (row.matches("tr:only-child")) {
				row.remove();
				focusOn(-1, 0, false);
				return true;
			}
			if (row.matches("tr:first-child")) {
				row.remove();
				const { row: curR, col: curC } = getFocusState();
				let newR = curR + 1;
				while ($("tbody tr:first-child").exists && $("tbody tr:first-child").attr("data-id") === undefined) {
					$("tbody tr:first-child").remove();
					newR += 1;
				}
				focusOn(newR, curC, true);
				return true;
			} else if (row.matches("tr:last-child")) {
				row.remove();
				const { row: curR, col: curC } = getFocusState();
				let newR = curR - 1;
				while ($("tbody tr:last-child").exists && $("tbody tr:last-child").attr("data-id") === undefined) {
					$("tbody tr:last-child").remove();
					newR -= 1;
				}
				focusOn(newR, curC, true);
				return true;
			}
			row.querySelectorAll(".log1-td-id, .log1-td-type, .log1-time-wrapper, .log1-td-content").forEach((e) => {
				e.textContent = '';
			});
			row.removeAttribute("data-id");
			row.removeAttribute("data-type");
			row.removeAttribute("data-time");

			q$n(".log1-td-id", row).removeEventListener("click", onIdFieldClick);
			q$n(".log1-td-type", row).removeEventListener("click", onTypeFieldClick);
			q$n(".log1-td-time", row).removeEventListener("click", onTimeFieldClick);
			q$n(".log1-td-content", row).removeEventListener("click", onContentFieldClick);
			q$n(".log1-td-content", row).removeEventListener("keydown", onContentFieldKeydown);
			q$n(".log1-td-content", row).removeEventListener("input", onContentFieldInput);

			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true)();
}

async function moveEntriesDialog(id: number) {
	dialog(`번호 옮기기`, `
		<label>
			${id}번부터 
			<input id="dialog-end-id" type="number" value="${id}" min="${id}">
			번까지의 항목의
		</label><br>
		<label>
			번호를 
			<input id="dialog-delta" type="number" value="1">
			만큼 변경합니다.
		</label><br>
		<strong>3차 기록의 반영 및 참조는 수동으로 바꿔야 합니다.</strong>
	`, async () => {
		const endIdStr = (d$n("dialog-end-id") as HTMLInputElement).value;
		const deltaStr = (d$n("dialog-delta") as HTMLInputElement).value;
		if (endIdStr === '' || deltaStr === '') {
			showWarning("값을 입력하세요.");
			return false;
		}
		const endId = Number(endIdStr);
		const delta = Number(deltaStr);
		if (!Number.isInteger(endId) || !Number.isInteger(delta)) {
			showWarning("정수가 아닌 값이 입력되었습니다.");
			return false;
		} else if (endId < id) {
			showWarning("끝 번호가 시작 번호보다 작습니다.");
			return false;
		} else if (delta === 0) {
			showWarning("이 동작은 아무것도 하지 않습니다.");
			return false;
		} else if (id + delta <= 0) {
			showWarning("이 동작은 자연수가 아닌 항목 번호를 만듭니다.");
			return false;
		}
		try {
			await sendMove(id, endId, delta);
			const { row: curR, col: curC } = getFocusState();
			focusOn(curR + delta, curC, true);
			window.location.reload();
			return true;
		} catch (e) {
			if (!isHttpError(e) || e.status !== 400) throw e;
			showWarning(e.reason ?? "오류");
			return false;
		}
	})();
}

function isHttpError(e: unknown): e is {status: number, reason?: string, html?: string} {
	return typeof e === "object" && e !== null && typeof (e as {status?: unknown}).status === "number";
}

async function onTypeFieldClick(this: HTMLElement) {
	const row = this.parentElement as HTMLElement;
	const id = parseInt(row.getAttribute("data-id") as string);
	focusOn(parseInt(row.getAttribute("data-row") as string), 1, true);
	const cur = parseInt(row.getAttribute("data-type") ?? "0");
	dialog(`${id}번 항목 유형 변경`, `
		<label><input type="radio" name="log1-type" value="1"${cur===1 ? " checked autofocus" : ""}>공부</label>
		<label><input type="radio" name="log1-type" value="2"${cur===2 ? " checked autofocus" : ""}>대화</label>
		<label><input type="radio" name="log1-type" value="3"${cur===3 ? " checked autofocus" : ""}>생각</label>
		<br>
		<label><input type="radio" name="log1-type" value="4"${cur===4 ? " checked autofocus" : ""}>일상</label>
		<label><input type="radio" name="log1-type" value="5"${cur===5 ? " checked autofocus" : ""}>작업</label>
		<label><input type="radio" name="log1-type" value="6"${cur===6 ? " checked autofocus" : ""}>정보</label>
	`, async () => {
		const type = parseInt((q$n(`input[name="log1-type"]:checked`) as HTMLInputElement).value);
		if (type == undefined) { // ???
			showWarning("값을 입력하세요.");
			return false;
		}
		try {
			await sendPatch({id: id, type: type});
			this.textContent = LOG1_TYPE_NAME[type];
			row.setAttribute("data-type", type.toString());
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	})();
}

async function onTimeFieldClick(this: HTMLElement) {
	const row = this.parentElement as HTMLElement;
	const id = parseInt(row.getAttribute("data-id") as string);
	focusOn(parseInt(row.getAttribute("data-row") as string), 2, true);
	const cur = row.getAttribute("data-time") ?? "";
	const wrapper = this.firstChild as HTMLElement;
	dialog(`${id}번 항목 시간 변경`, `
		<label for="dialog-new-time">새 시간: </label>
		<input id="dialog-new-time" placeholder="${cur}">
	`, async () => {
		const time = (d$n("dialog-new-time") as HTMLInputElement).value;
		if (time == undefined || time === '') {
			showWarning("값을 입력하세요.");
			return false;
		}
		try {
			await sendPatch({id: id, time: time});
			wrapper.textContent = time;
			row.setAttribute("data-time", time);
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	})();
}

async function onContentFieldClick(this: HTMLElement) {
	focusOn(parseInt((this.parentElement as HTMLElement).getAttribute("data-row") as string), 3, true);
	this.setAttribute("contenteditable", "plaintext-only");
	if (!this.contains(S.anchorNode)) {
		S.selectAllChildren(this);
		S.collapseToEnd();
	}
}

async function onContentFieldKeydown(this: HTMLElement, e: KeyboardEvent) {
	if (e.isComposing) return;
	if (this.getAttribute("contenteditable") !== "plaintext-only") return;
	e.stopPropagation();
	if (e.key === "Enter") {
		e.preventDefault();
		submitContent(this);
		return;
	} else if (e.key === "Escape") {
		e.preventDefault();
		cancelContent(this);
		S.removeAllRanges();
		return;
	} else if (e.key === "Tab") {
		e.preventDefault();
		if (!S.isCollapsed) return;
		if (!(S.anchorNode instanceof Text)) return;
		const text = this.textContent.substring(0, S.anchorOffset);
		const cmd = text.match(/\]([^\]]*)\]$/)?.[1];
		if (cmd == undefined || !Object.hasOwn(SYMBOLS, k2e(cmd.toLowerCase()))) {
			showWarning("잘못된 기호 명령어입니다.");
			return;
		}

		const range = document.createRange();
		range.setStart(S.anchorNode, S.anchorOffset - (cmd.length + 2));
		range.setEnd(S.anchorNode, S.anchorOffset);
		range.deleteContents();
		range.insertNode(document.createTextNode(SYMBOLS[k2e(cmd.toLowerCase())]));

		S.removeAllRanges();
		S.addRange(range);
		S.collapseToEnd();

		this.normalize();
		onContentFieldInput.call(this);
		return;
	}
}

async function onContentFieldInput(this: HTMLElement) {
	this.classList.add("log1-edited");
}

async function submitContent(target: HTMLElement): Promise<boolean> {
	const id = parseInt((target.parentElement as HTMLElement).getAttribute("data-id") as string);
	if (target.getAttribute("contenteditable") !== "plaintext-only") return false;
	target.classList.remove("log1-edited");
	target.removeAttribute("contenteditable");
	const content = target.textContent;
	try {
		await sendPatch({id: id, content: content});
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

async function cancelContent(target: HTMLElement): Promise<boolean> {
	const id = parseInt((target.parentElement as HTMLElement).getAttribute("data-id") as string);
	if (target.getAttribute("contenteditable") !== "plaintext-only") return false;
	target.classList.remove("log1-edited");
	target.removeAttribute("contenteditable");
	try {
		const data = await sendPatch({id: id}, true) as EntryRow;
		target.textContent = data.content as string;
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}
