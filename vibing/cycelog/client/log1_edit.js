import { $, d$, q$ } from "../jquery.js";
import { k2e } from "../k2e.js";
import { showWarning } from "../posts/dialog.js";
import { LOG1_TYPE_NAME } from "../../shared/cycelog/log1.js";
import { entryExists, patchLog1 } from "./log1_api.js";
import {
	setupContentEditing,
	contentClickHandler,
	contentKeydownHandler,
	contentInputHandler
} from "./log1_content.js";
import {
	setupRowActions,
	activateIdField,
	changeType,
	getIdFieldHandler,
	getTypeHandler,
	getTimeHandler
} from "./log1_row_actions.js";

let curR, curC, isFocused;

export function setupEdit() {
	setupContentEditing(focusOn);
	setupRowActions({
		focusOn: focusOn,
		getPosition: () => ({row: curR, col: curC})
	});
	$("tbody td, tfoot td").attr("tabindex", "-1");
	curR = sessionStorage.getItem("curR") !== null ?
		parseInt(sessionStorage.getItem("curR")) :
		parseInt($("tbody > tr:first-child").attr("data-row"));
	curC = sessionStorage.getItem("curC") !== null ?
		parseInt(sessionStorage.getItem("curC")) : 0;
	isFocused = JSON.parse(sessionStorage.getItem("isFocused")) ?? false;
	if (Number.isNaN(curR)) {
		curR = -1; isFocused = false;
	}
	d$("dialog")?.addEventListener("close", function () {
		focusOn(curR, curC, isFocused)
	});
	focusOn(curR, curC, isFocused);

	d$("log1-skip").addEventListener("click", (e) => focusOn(curR, curC, true));
	q$("#log1-table tbody")[0].addEventListener("keydown", onTableKeydown);
	$("tbody td").on("blur", onTableBlur);

	document.body.addEventListener("keydown", onBodyKeydown);
	$("#log1-new-type, #log1-new-time, #log1-new-content").on("blur", onNewEntryBlur);

	for (const row of $("tbody tr")) setupEntryRow(row);
}

function setupEntryRow(row) {
	const id = parseInt(row.getAttribute("data-id"));
	if (Number.isNaN(id)) return;

	const $row = $(row);
	$row.children(".log1-td-id").on("click", getIdFieldHandler(row, id));
	$row.children(".log1-td-type").on("click", getTypeHandler(row, id));
	$row.children(".log1-td-time").on("click", getTimeHandler(row, id));
	$row.children(".log1-td-content").on("click", contentClickHandler);
	$row.children(".log1-td-content").on("keydown", contentKeydownHandler);
	$row.children(".log1-td-content").on("input", contentInputHandler);
}

function focusOn(row, col, focus, block) {
	if (addingPhase !== 0 && focus) stopAdding();
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
	e.stopPropagation();
	const shortcut = e.ctrlKey || e.metaKey;
	if (e.key === "ArrowUp") {
		e.preventDefault();
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:first-child").attr("data-row")), curC, true);
			return;
		}
		focusOn(curR-1, curC, true, true);
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		if (e.target.parentElement.matches("tr:last-child")) {
			focusOn(curR, curC, false);
			advanceAdding({
				preventDefault: ()=>{},
				key: e.target.parentElement.getAttribute("data-type")
			});
		}
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:last-child").attr("data-row")), curC, true);
			return;
		}
		focusOn(curR+1, curC, true, true);
	} else if (e.key === "ArrowLeft") {
		e.preventDefault();
		if (shortcut) {
			focusOn(curR, 0, true);
			return;
		}
		focusOn(curR, curC-1, true, true);
	} else if (e.key === "ArrowRight") {
		e.preventDefault();
		if (shortcut) {
			focusOn(curR, 3, true);
			return;
		}
		focusOn(curR, curC+1, true, true);
	} else if (e.key === "Escape") {
		e.preventDefault();
		focusOn(curR, curC, false);
	} else if (e.key === "Enter") {
		e.preventDefault();
		if (curC === 0 && e.shiftKey && e.target.parentElement.hasAttribute("data-id")) {
			activateIdField(e.target, curR, true);
		}
		else if (curC === 0) return;
		else e.target.click();
	} else if (e.key === "Backspace") {
		if (curC === 0 && e.target.parentElement.hasAttribute("data-id")) {
			e.preventDefault();
			activateIdField(e.target, curR, false);
		}
	}
	if (curC === 1) {
		if (!Object.hasOwn(TYPE_KEYBIND, k2e(e.key))) return;
		const type = TYPE_KEYBIND[k2e(e.key)];
		e.preventDefault();
		changeType(document.activeElement.parentElement, curR, document.activeElement, type);
	}
}

function onTableBlur(e) {
	if (e.relatedTarget !== null) return;
	focusOn(curR, curC, false);
}

function onNewEntryBlur(e) {
	if (addingPhase === 0) return;
	if (e.relatedTarget?.matches("#log1-new-time, #log1-new-content")) return;
	stopAdding();
}

let addingPhase = 0;
const TYPE_KEYBIND = Object.freeze({
	'1': 1, 's': 1,
	'2': 2, 'd': 2,
	'3': 3, 't': 3,
	'4': 4, 'g': 4,
	'5': 5, 'w': 5,
	'6': 6, 'i': 6
});
function onBodyKeydown(e) {
	if (document.activeElement?.matches("tbody td")) return;
	if (d$("dialog").matches(":open")) return;
	if (e.key === "Escape") {
		stopAdding();
		return;
	} else if (addingPhase !== 0 && e.key === "ArrowUp") {
		const lastRow = parseInt($("tbody > tr:last-child").attr("data-row"));
		if (Number.isNaN(lastRow)) {
			stopAdding();
			return;
		}
		switch (addingPhase) {
			case 1: focusOn(lastRow, 1, true); break;
			case 2: focusOn(lastRow, 2, true); break;
			case 3: focusOn(lastRow, 3, true); break;
		}
	}
	if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
	advanceAdding(e);
}

async function advanceAdding(e) {
	switch (addingPhase) {
	case 0:
		if (!Object.hasOwn(TYPE_KEYBIND, k2e(e.key))) return;
		const newId = $("tbody > tr:last-child").length !== 0 ?
			parseInt($("tbody > tr:last-child").attr("data-row")) + 1 :
			parseInt(prompt("이 글의 첫 1차 기록의 번호를 입력하세요"));
		if (Number.isNaN(newId) || newId < 0) {
			showWarning("잘못된 번호입니다.");
			return;
		}
		if (await entryExists(newId)) {
			showWarning("번호 충돌이 발생합니다.");
			return;
		}
		const type = TYPE_KEYBIND[k2e(e.key)];
		d$("log1-new-entry").setAttribute("data-id", newId);
		d$("log1-new-entry").setAttribute("data-type", type);
		d$("log1-new-id").textContent = newId;
		d$("log1-new-type").textContent = LOG1_TYPE_NAME[type];
		d$("log1-new-type").focus();
		addingPhase = 1;
		e.preventDefault();
		break;
	case 1:
		if (e.key === "0" || e.key === "Backspace") {
			stopAdding();
			return;
		}
		if (Object.hasOwn(TYPE_KEYBIND, k2e(e.key))) {
			stopAdding();
			advanceAdding(e);
			return;
		}
		if (e.key !== "Tab") return;
		d$("log1-new-time").setAttribute("contenteditable", "plaintext-only");
		d$("log1-new-time").focus();
		addingPhase = 2;
		e.preventDefault();
		break;
	case 2:
		if (e.key !== "Tab") return;
		d$("log1-new-time").removeAttribute("contenteditable");
		d$("log1-new-entry").setAttribute("data-time", d$("log1-new-time").textContent);
		d$("log1-new-content").setAttribute("contenteditable", "plaintext-only");
		d$("log1-new-content").focus();
		addingPhase = 3;
		e.preventDefault();
		break;
	case 3:
		if (e.key !== "Enter" && e.key !== "Tab") return;
		try {
			const data = await patchLog1({
				id: parseInt(d$("log1-new-entry").getAttribute("data-id")),
				type: parseInt(d$("log1-new-entry").getAttribute("data-type")),
				time: d$("log1-new-entry").getAttribute("data-time"),
				content: d$("log1-new-content").textContent,
				getHtml: true
			}, true);
			q$("tbody")[0].insertAdjacentHTML("beforeend", data.html);

			const newId = parseInt(d$("log1-new-entry").getAttribute("data-id"));
			const newRow = q$(`tbody tr[data-id="${newId}"]`)[0];
			setupEntryRow(newRow);

			stopAdding();
			e.preventDefault();
		} catch (e) {
			alert(`오류: ${e}`);
			stopAdding();
			return;
		}
	}
}

function stopAdding() {
	if (addingPhase === 0) return;
	$("#log1-new-id, #log1-new-type, #log1-new-time, #log1-new-content").text('');
	$("#log1-new-entry").removeAttr("data-id data-type data-time");
	$("#log1-new-time, #log1-new-content").removeAttr("contenteditable")
	switch (addingPhase) {
		case 1: d$("log1-new-type").blur(); break;
		case 2: d$("log1-new-time").blur(); break;
		case 3: d$("log1-new-content").blur(); break;
	}
	addingPhase = 0;
}
