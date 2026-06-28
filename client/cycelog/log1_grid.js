import { LOG1_TYPE_NAME, buildLog1Row } from "../../shared/cycelog/log1.js";
import { $, d$, q$ } from "../jquery.js";
import { k2e } from "../k2e.js";
import { showWarning } from "../posts/dialog.js";
import { sendPatch, sendExists } from "./log1_fetch.js";
import { onIdFieldClick, setupRow } from "./log1_edit.js";

let curR, curC, isFocused;

export function setupGrid() {
	$("thead").on("click", () => window.scrollTo(0, 0));
	window.addEventListener("scroll", onScroll);
	window.addEventListener("resize", onScroll);
	onScroll();

	$("tbody td, tfoot td").attr("tabindex", "-1");
	if (sessionStorage.getItem("log1Page") !== window.location.pathname) sessionStorage.clear();
	sessionStorage.setItem("log1Page", window.location.pathname);
	curR = sessionStorage.getItem("curR") !== null ?
		parseInt(sessionStorage.getItem("curR")) :
		parseInt($("tbody > tr:first-child").attr("data-row"));
	curC = sessionStorage.getItem("curC") !== null ?
		parseInt(sessionStorage.getItem("curC")) : 0;
	isFocused = JSON.parse(sessionStorage.getItem("isFocused")) ?? false;
	if (Number.isNaN(curR)) {
		curR = -1; isFocused = false;
	}
	d$("dialog")?.addEventListener("close", () => focusOn(curR, curC, isFocused));
	focusOn(curR, curC, isFocused);

	d$("log1-skip").classList.add("show");
	d$("log1-skip").addEventListener("click", () => focusOn(curR, curC, true));
	q$("#log1-table tbody")[0].addEventListener("keydown", onTableKeydown);
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
	d$("log1-table").classList.toggle("unfixed-after", atTop);
	d$("log1-table").classList.toggle("unfixed-before", atBottom);
	d$("log1-table").style.setProperty("--unfixed-top", `${maxScroll}px`);
}

export function getFocusState() {
	return {row: curR, col: curC, focus: isFocused};
}

export function focusOn(row, col, focus, block) {
	if (newEntryPhase !== 0 && focus) cancelNewEntry();
	if ($("tbody > tr").length !== 0 && row === -1) row = parseInt($("tbody > tr:first-child").attr("data-row"));
	else if (row === -1) focus = false;
	const target = q$(`tbody > tr[data-row="${row}"] > td:nth-child(${col+1})`)?.[0];
	if (target === undefined && block) return;
	const oldTarget = q$(`tbody > tr[data-row="${curR}"] > td:nth-child(${curC+1})`)?.[0];
	if (oldTarget !== undefined) oldTarget.setAttribute("tabindex", "-1");
	if (target !== undefined) {
		target.setAttribute("tabindex", "0");
		if (focus) target.focus();
		else if (oldTarget === target) oldTarget.blur();
	}
	curR = row; curC = col; isFocused = focus;
	sessionStorage.setItem("curR", curR);
	sessionStorage.setItem("curC", curC);
	sessionStorage.setItem("isFocused", focus);
}

function onTableKeydown(e) {
	if (e.target.getAttribute("contenteditable") === "plaintext-only") return;
	const shortcut = e.ctrlKey || e.metaKey;
	const row = e.target.parentElement;
	if (e.key === "ArrowUp") {
		e.preventDefault();
		e.stopPropagation();
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:first-child").attr("data-row")), curC, true);
			return;
		}
		focusOn(curR-1, curC, true, true);
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		e.stopPropagation();
		if (row.matches("tr:last-child") && curC === 1) {
			focusOn(curR, curC, false);
			advanceNewEntry({
				preventDefault: ()=>{},
				key: row.getAttribute("data-type")
			});
		}
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:last-child").attr("data-row")), curC, true);
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
		if (curC === 0 && e.shiftKey && row.hasAttribute("data-id")) {
			onIdFieldClick({
				target: e.target,
				shiftKey: true,
				altKey: false
			});
		} else if (curC === 0) return;
		else e.target.click();
	} else if (e.key === "Backspace") {
		if (curC === 0 && row.hasAttribute("data-id")) {
			e.preventDefault();
			e.stopPropagation();
			onIdFieldClick({
				target: e.target,
				shiftKey: false,
				altKey: true
			});
		}
	}
}

function onTableBlur(e) {
	if (e.relatedTarget !== null) return;
	focusOn(curR, curC, false);
}

let newEntryPhase = 0;
const LOG1_TYPE_KEYBIND = Object.freeze({
	'1': 1, 's': 1,
	'2': 2, 'd': 2,
	'3': 3, 't': 3,
	'4': 4, 'g': 4,
	'5': 5, 'w': 5,
	'6': 6, 'i': 6
});

function onBodyKeydown(e) {
	if (d$("dialog").matches(":open")) return;
	if (e.key === "Escape") {
		cancelNewEntry();
		focusOn(curR, curC, true);
		return;
	} else if (newEntryPhase !== 0 && e.key === "ArrowUp") {
		const lastRow = parseInt($("tbody > tr:last-child").attr("data-row"));
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
	if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
	advanceNewEntry(e);
}

function onNewEntryBlur(e) {
	if (newEntryPhase === 0) return;
	if (e.relatedTarget?.matches("#log1-new-time, #log1-new-content")) return;
	cancelNewEntry();
}

async function advanceNewEntry(e) {
	switch (newEntryPhase) {
	case 0:
		if (!Object.hasOwn(LOG1_TYPE_KEYBIND, k2e(e.key))) return;
		const newId = $("tbody > tr:last-child").length !== 0 ?
			parseInt($("tbody > tr:last-child").attr("data-row")) + 1 :
			parseInt(prompt("이 글의 첫 1차 기록의 번호를 입력하세요"));
		if (Number.isNaN(newId) || newId < 0) {
			showWarning("잘못된 번호입니다.");
			return;
		} else if (await sendExists(newId)) {
			showWarning("번호 충돌이 발생합니다.");
			return;
		}
		const type = LOG1_TYPE_KEYBIND[k2e(e.key)];
		d$("log1-new-entry").setAttribute("data-id", newId);
		d$("log1-new-entry").setAttribute("data-type", type);
		d$("log1-new-id").textContent = newId;
		d$("log1-new-type").textContent = LOG1_TYPE_NAME[type];
		d$("log1-new-type").focus();
		newEntryPhase = 1;
		break;
	case 1:
		if (e.key === "0" || e.key === "Backspace") {
			cancelNewEntry();
			return;
		}
		if (Object.hasOwn(LOG1_TYPE_KEYBIND, k2e(e.key))) {
			const type = LOG1_TYPE_KEYBIND[k2e(e.key)];
			d$("log1-new-entry").setAttribute("data-type", type);
			d$("log1-new-type").textContent = LOG1_TYPE_NAME[type];
			return;
		}
		if (e.key !== "Tab") return;
		d$("log1-new-time").setAttribute("contenteditable", "plaintext-only");
		d$("log1-new-time").focus();
		newEntryPhase = 2;
		break;
	case 2:
		if (e.key !== "Tab") return;
		d$("log1-new-time").removeAttribute("contenteditable");
		d$("log1-new-entry").setAttribute("data-time", d$("log1-new-time").textContent);
		d$("log1-new-content").setAttribute("contenteditable", "plaintext-only");
		d$("log1-new-content").focus();
		newEntryPhase = 3;
		break;
	case 3:
		if (e.key !== "Enter" && e.key !== "Tab") return;
		e.preventDefault(); // 뒤에 await이 있으므로 지금 실행하지 않으면 깜빡임(탭으로 페이지 최상단으로 갔다 돌아오기) 발생
		try {
			const newData = {
				id: parseInt(d$("log1-new-entry").getAttribute("data-id")),
				type: parseInt(d$("log1-new-entry").getAttribute("data-type")),
				time: d$("log1-new-entry").getAttribute("data-time"),
				content: d$("log1-new-content").textContent
			};
			await sendPatch(newData);

			q$("tbody")[0].insertAdjacentHTML("beforeend", buildLog1Row(newData.id, newData));
			const newRow = q$(`tbody tr[data-id="${newData.id}"]`)[0];
			setupRow(newRow);

			cancelNewEntry();
			focusOn(newData.id, 3, true);
		} catch (e) {
			alert(`오류: ${e}`);
			cancelNewEntry();
			return;
		}
	}
	e.preventDefault();
	window.scrollTo(0, document.documentElement.scrollHeight);
}

function cancelNewEntry() {
	if (newEntryPhase === 0) return;
	$("#log1-new-id, #log1-new-type, #log1-new-time, #log1-new-content").text('');
	$("#log1-new-entry").removeAttr("data-id data-type data-time");
	$("#log1-new-time, #log1-new-content").removeAttr("contenteditable")
	switch (newEntryPhase) {
		case 1: d$("log1-new-type").blur(); break;
		case 2: d$("log1-new-time").blur(); break;
		case 3: d$("log1-new-content").blur(); break;
	}
	newEntryPhase = 0;
}
