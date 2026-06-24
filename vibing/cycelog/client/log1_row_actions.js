import { $, d$, q$ } from "../jquery.js";
import { dialog, showWarning } from "../posts/dialog.js";
import { LOG1_TYPE_NAME } from "../../shared/cycelog/log1.js";
import { patchLog1, deleteLog1Entry, moveLog1Entries } from "./log1_api.js";

let focusOnCell = null;
let getPosition = null;

export function setupRowActions(options) {
	focusOnCell = options.focusOn;
	getPosition = options.getPosition;
}

export function getIdFieldHandler(row, id) {
	return async function ($event) {
		const event = $event.originalEvent;
		activateIdField(event.target, id, event.shiftKey);
	}
}

export function activateIdField(target, id, move) {
	focusOnCell(id, 0, true);
	if (move) moveHandler({target: target}, id);
	else deleteHandler({target: target}, id);
}

export function getTypeHandler(row, id) {
	return async function ($event) {
		const event = $event.originalEvent;
		focusOnCell(id, 1, true);
		const cur = parseInt(row.getAttribute("data-type") ?? 0);
		dialog(`${id}번 항목 유형 변경`, `
			<label><input type="radio" name="log1-type" value="1"${cur===1 ? " checked autofocus" : ""}>공부</label>
			<label><input type="radio" name="log1-type" value="2"${cur===2 ? " checked autofocus" : ""}>대화</label>
			<label><input type="radio" name="log1-type" value="3"${cur===3 ? " checked autofocus" : ""}>생각</label>
			<br>
			<label><input type="radio" name="log1-type" value="4"${cur===4 ? " checked autofocus" : ""}>일상</label>
			<label><input type="radio" name="log1-type" value="5"${cur===5 ? " checked autofocus" : ""}>작업</label>
			<label><input type="radio" name="log1-type" value="6"${cur===6 ? " checked autofocus" : ""}>정보</label>
		`, async () => {
			const type = q$(`input[name="log1-type"]:checked`)[0]?.value;
			return await changeType(row, id, event.target, type);
		})();
	}
}

export function getTimeHandler(row, id) {
	return async function ($event) {
		const event = $event.originalEvent;
		focusOnCell(id, 2, true);
		const cur = row.getAttribute("data-time") ?? "";
		dialog(`${id}번 항목 시간 변경`, `
			<label for="dialog-new-time">새 시간: </label>
			<input id="dialog-new-time" placeholder="${cur}">
		`, async () => {
			const time = d$("dialog-new-time").value;
			if (time == undefined || time === '') {
				showWarning("값을 입력하세요.");
				return false;
			}
			try {
				await patchLog1({id: id, time: time}, true);
				event.target.firstChild.textContent = time;
				row.setAttribute("data-time", time);
				return true;
			} catch (e) {
				alert(`오류: ${e}`);
				return false;
			}
		})();
	}
}

async function deleteHandler(event, id) {
	dialog(`${id}번 항목 삭제`, `
		정말로 이 항목을 삭제하시겠습니까?<br>
		이 작업은 되돌릴 수 없습니다.<br>
		3차 기록의 언급 및 참조는 깨진 링크로 남습니다.
	`, async () => {
		try {
			await deleteLog1Entry(id);
			removeRowAfterDelete(event.target.parentElement);
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true)();
}

function removeRowAfterDelete(row) {
	const position = getPosition();
	if (row.matches("tr:only-child")) {
		row.remove();
		focusOnCell(-1, 0, false);
		return;
	}
	if (row.matches("tr:first-child")) {
		row.remove();
		let newRow = position.row + 1;
		while ($("tbody tr:first-child").length !== 0 && $("tbody tr:first-child").attr("data-id") === undefined) {
			$("tbody tr:first-child").remove();
			newRow += 1;
		}
		focusOnCell(newRow, position.col, true);
		return;
	}
	if (row.matches("tr:last-child")) {
		row.remove();
		let newRow = position.row - 1;
		while ($("tbody tr:last-child").length !== 0 && $("tbody tr:last-child").attr("data-id") === undefined) {
			$("tbody tr:last-child").remove();
			newRow -= 1;
		}
		focusOnCell(newRow, position.col, true);
		return;
	}

	row.querySelectorAll(".log1-td-id, .log1-td-type, .wrapper, .log1-td-content").forEach((el) => {
		el.textContent = '';
	});
	row.removeAttribute("data-id");
	row.removeAttribute("data-type");
	row.removeAttribute("data-time");

	const $row = $(row);
	$row.children(".log1-td-id, .log1-td-type, .log1-td-time, .log1-td-content").off("click");
	$row.children(".log1-td-content").off("keydown");
	$row.children(".log1-td-content").off("input");
}

async function moveHandler(event, id) {
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
		</label>
	`, async () => {
		const endIdStr = d$("dialog-end-id").value;
		const deltaStr = d$("dialog-delta").value;
		if (endIdStr === '' || deltaStr === '') {
			showWarning("값을 입력하세요.");
			return false;
		}
		const endId = Number(endIdStr);
		const delta = Number(deltaStr);
		if (!Number.isInteger(endId) || !Number.isInteger(delta)) {
			showWarning("정수가 아닌 값이 입력되었습니다.");
			return false;
		}
		if (endId < id) {
			showWarning("끝 번호가 시작 번호보다 작습니다.");
			return false;
		}
		if (delta === 0) {
			showWarning("이 동작은 아무것도 하지 않습니다.");
			return false;
		}
		if (id + delta <= 0) {
			showWarning("이 동작은 자연수가 아닌 항목 번호를 만듭니다.");
			return false;
		}
		try {
			await moveLog1Entries(id, endId, delta);
			const position = getPosition();
			focusOnCell(position.row + delta, position.col, true);
			window.location.reload();
			return true;
		} catch (e) {
			if (e.status !== 400) throw e;
			showWarning(e.reason);
			return false;
		}
	})();
}

export async function changeType(row, id, target, type) {
	if (type == undefined) {
		showWarning("값을 입력하세요.");
		return false;
	}
	try {
		await patchLog1({id: id, type: type}, true);
		target.textContent = LOG1_TYPE_NAME[type];
		row.setAttribute("data-type", type);
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}
