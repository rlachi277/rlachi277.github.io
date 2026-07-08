import { LOG1_TYPE_NAME, buildLog1Row } from "../../shared/cycelog/log1.js";
import { $, d$, d$n, q$, q$n } from "../query.js";
import { k2e } from "../k2e.js";
import { showWarning } from "../posts/dialog.js";
import { sendPatch, sendExists } from "./log1_fetch.js";
import { onIdFieldClick, setupRow } from "./log1_edit.js";

let curR: number, curC: number, isFocused: boolean;

export function setupGrid() {
	$("thead").on("click", () => window.scrollTo(0, 0));
	window.addEventListener("scroll", onScroll);
	window.addEventListener("resize", onScroll);
	onScroll();

	$("tbody td, tfoot td").attr("tabindex", "-1");
	if (sessionStorage.getItem("log1Page") !== window.location.pathname) sessionStorage.clear();
	sessionStorage.setItem("log1Page", window.location.pathname);
	const sessionR = sessionStorage.getItem("curR");
	const sessionC = sessionStorage.getItem("curC");
	const sessionF = sessionStorage.getItem("isFocused");
	curR = sessionR !== null ?
		parseInt(sessionR) : parseInt($("tbody > tr:first-child").attr("data-row") as string);
	curC = sessionC !== null ? parseInt(sessionC) : 0;
	isFocused = sessionF !== null ? JSON.parse(sessionF) : false;
	if (Number.isNaN(curR)) {
		curR = -1; isFocused = false;
	}
	d$("dialog")?.addEventListener("close", () => focusOn(curR, curC, isFocused));
	focusOn(curR, curC, isFocused);

	q$n("#log1-table tbody").addEventListener("keydown", onTableKeydown);
	$("tbody td").on("blur", onTableBlur);

	document.body.addEventListener("keydown", onBodyKeydown);
	$("#log1-new-type, #log1-new-time, #log1-new-content").on("blur", onNewEntryBlur);
}

function onScroll() {
	// sorry people who change the default writing-mode etc. for some reason
	// i think i can't support that here
	const atTop = window.scrollY < 1;
	const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	const atBottom = window.scrollY - maxScroll > -1;
	d$n("log1-table").classList.toggle("unfixed-after", atTop);
	d$n("log1-table").classList.toggle("unfixed-before", atBottom);
	d$n("log1-table").style.setProperty("--unfixed-top", `${maxScroll}px`);
}

export function getFocusState(): {row: number, col: number, focus: boolean} {
	return {row: curR, col: curC, focus: isFocused};
}

export function focusOn(row: number, col: number, focus: boolean, block: boolean = false) {
	if (newEntryPhase !== 0 && focus) cancelNewEntry();
	if ($("tbody > tr").exists && row === -1) row = parseInt($("tbody > tr:first-child").attr("data-row") as string);
	else if (row === -1) focus = false;
	const target = q$(`tbody > tr[data-row="${row}"] > td:nth-child(${col+1})`);
	if (target === null && block) return;
	const oldTarget = q$(`tbody > tr[data-row="${curR}"] > td:nth-child(${curC+1})`);
	if (oldTarget !== null) oldTarget.setAttribute("tabindex", "-1");
	if (target !== null) {
		target.setAttribute("tabindex", "0");
		if (focus) target.focus();
		else if (oldTarget === target) oldTarget.blur();
	}
	curR = row; curC = col; isFocused = focus;
	sessionStorage.setItem("curR", curR.toString());
	sessionStorage.setItem("curC", curC.toString());
	sessionStorage.setItem("isFocused", JSON.stringify(focus));
}

function onTableKeydown(this: HTMLElement, e: KeyboardEvent) {
	if (e.isComposing) return;
	if (!(e.target instanceof HTMLElement)) return;
	const cell = e.target.closest("td");
	if (!(cell instanceof HTMLElement)) return;
	if (cell.getAttribute("contenteditable") === "plaintext-only") return;
	const row = cell.parentElement as HTMLElement;
	const shortcut = e.ctrlKey || e.metaKey;
	if (e.key === "ArrowUp") {
		e.preventDefault();
		e.stopPropagation();
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:first-child").attr("data-row") as string), curC, true);
			return;
		}
		focusOn(curR-1, curC, true, true);
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		e.stopPropagation();
		if (row.matches("tr:last-child") && curC === 1) {
			focusOn(curR, curC, false);
			advanceNewEntry({
				key: row.getAttribute("data-type") as string
			});
		}
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:last-child").attr("data-row") as string), curC, true);
			return;
		}
		focusOn(curR+1, curC, true, true);
	} else if (e.key === "ArrowLeft") {
		e.preventDefault();
		e.stopPropagation();
		if (shortcut) {
			focusOn(curR, 0, true);
			return;
		}
		focusOn(curR, curC-1, true, true);
	} else if (e.key === "ArrowRight") {
		e.preventDefault();
		e.stopPropagation();
		if (shortcut) {
			focusOn(curR, 3, true);
			return;
		}
		focusOn(curR, curC+1, true, true);
	} else if (e.key === "Escape") {
		e.preventDefault();
		e.stopPropagation();
		focusOn(curR, curC, false);
	} else if (e.key === "Enter") {
		e.preventDefault();
		e.stopPropagation();
		if (curC === 0 && row.hasAttribute("data-id")) {
			if (e.ctrlKey || e.metaKey) onIdFieldClick.call(cell, {
				shiftKey: e.shiftKey,
				altKey: false,
				ctrlKey: e.shiftKey,
				metaKey: false
			});
			else if (e.shiftKey) onIdFieldClick.call(cell, {
				shiftKey: true,
				altKey: false,
				ctrlKey: false,
				metaKey: false
			});
			return;
		}
		else cell.click();
	} else if (e.key === "Backspace") {
		if (curC === 0 && row.hasAttribute("data-id")) {
			e.preventDefault();
			e.stopPropagation();
			onIdFieldClick.call(cell, {
				shiftKey: false,
				altKey: true,
				ctrlKey: false,
				metaKey: false
			});
		}
	}
}

function onTableBlur(e: FocusEvent) {
	if (e.relatedTarget !== null) return;
	focusOn(curR, curC, false);
}

let newEntryPhase = 0;
const LOG1_TYPE_KEYBIND: Record<string,number> = Object.freeze({
	'1': 1, 's': 1,
	'2': 2, 'd': 2,
	'3': 3, 't': 3,
	'4': 4, 'g': 4,
	'5': 5, 'w': 5,
	'6': 6, 'i': 6
});

function onBodyKeydown(e: KeyboardEvent) {
	if (d$n("dialog").matches(":open")) return;
	if (e.isComposing) return;
	if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
	if (newEntryPhase !== 0 && e.key === "Escape") {
		cancelNewEntry();
		focusOn(curR, curC, true);
		return;
	} else if (newEntryPhase !== 0 && e.key === "ArrowUp") {
		const lastRow = parseInt($("tbody > tr:last-child").attr("data-row") as string);
		if (Number.isNaN(lastRow)) {
			cancelNewEntry();
			return;
		}
		switch (newEntryPhase) {
			case 1: focusOn(lastRow, 1, true); break;
			case 2: focusOn(lastRow, 2, true); break;
			case 3: focusOn(lastRow, 3, true); break;
		}
	}
	advanceNewEntry(e);
}

function onNewEntryBlur(e: FocusEvent) {
	if (newEntryPhase === 0) return;
	if ((e.relatedTarget as HTMLElement | null)?.matches("#log1-new-time, #log1-new-content")) return;
	cancelNewEntry();
}

async function advanceNewEntry(e: KeyboardEvent | {key: string}) {
	switch (newEntryPhase) {
	case 0:
		if (!Object.hasOwn(LOG1_TYPE_KEYBIND, k2e(e.key))) return;
		const newId = $("tbody > tr:last-child").exists ?
			parseInt($("tbody > tr:last-child").attr("data-row") as string) + 1 :
			parseInt(prompt("이 글의 첫 1차 기록의 번호를 입력하세요") ?? "0");
		if (Number.isNaN(newId) || newId <= 0) {
			showWarning("잘못된 번호입니다.");
			return;
		} else if (await sendExists(newId)) {
			showWarning("번호 충돌이 발생합니다.");
			return;
		}
		const type = LOG1_TYPE_KEYBIND[k2e(e.key)];
		d$n("log1-new-entry").setAttribute("data-id", newId.toString());
		d$n("log1-new-entry").setAttribute("data-type", type.toString());
		d$n("log1-new-id").textContent = newId.toString();
		d$n("log1-new-type").textContent = LOG1_TYPE_NAME[type];
		d$n("log1-new-type").focus();
		newEntryPhase = 1;
		break;
	case 1:
		if (e.key === "0" || e.key === "Backspace") {
			cancelNewEntry();
			return;
		}
		if (Object.hasOwn(LOG1_TYPE_KEYBIND, k2e(e.key))) {
			const type = LOG1_TYPE_KEYBIND[k2e(e.key)];
			d$n("log1-new-entry").setAttribute("data-type", type.toString());
			d$n("log1-new-type").textContent = LOG1_TYPE_NAME[type];
			return;
		}
		if (e.key !== "Tab") return;
		d$n("log1-new-time").setAttribute("contenteditable", "plaintext-only");
		d$n("log1-new-time").focus();
		newEntryPhase = 2;
		break;
	case 2:
		if (e.key !== "Tab") return;
		d$n("log1-new-time").removeAttribute("contenteditable");
		d$n("log1-new-entry").setAttribute("data-time", d$n("log1-new-time").textContent);
		d$n("log1-new-content").setAttribute("contenteditable", "plaintext-only");
		d$n("log1-new-content").focus();
		newEntryPhase = 3;
		break;
	case 3:
		if (e.key !== "Enter" && e.key !== "Tab") return;
		(e as KeyboardEvent).preventDefault?.(); // 뒤에 await이 있으므로 지금 실행하지 않으면 깜빡임(탭으로 페이지 최상단으로 갔다 돌아오기) 발생
		try {
			const newData = {
				id: parseInt(d$n("log1-new-entry").getAttribute("data-id") as string),
				type: parseInt(d$n("log1-new-entry").getAttribute("data-type") as string),
				time: d$n("log1-new-entry").getAttribute("data-time") as string,
				content: d$n("log1-new-content").textContent
			};
			await sendPatch(newData);

			q$n("tbody").insertAdjacentHTML("beforeend", buildLog1Row(newData.id, newData));
			const newRow = q$n(`tbody tr[data-id="${newData.id}"]`);
			setupRow(newRow);

			cancelNewEntry();
			focusOn(parseInt(newRow.getAttribute("data-row") as string), 3, true);
		} catch (e) {
			alert(`오류: ${e}`);
			cancelNewEntry();
			return;
		}
	}
	(e as KeyboardEvent).preventDefault?.();
	window.scrollTo(0, document.documentElement.scrollHeight);
}

function cancelNewEntry() {
	if (newEntryPhase === 0) return;
	$("#log1-new-id, #log1-new-type, #log1-new-time, #log1-new-content").each((e) => {e.textContent = '';});
	$("#log1-new-entry").attr("data-id", null);
	$("#log1-new-entry").attr("data-type", null);
	$("#log1-new-entry").attr("data-time", null);
	$("#log1-new-time, #log1-new-content").attr("contenteditable", null)
	switch (newEntryPhase) {
		case 1: d$n("log1-new-type").blur(); break;
		case 2: d$n("log1-new-time").blur(); break;
		case 3: d$n("log1-new-content").blur(); break;
	}
	newEntryPhase = 0;
}
