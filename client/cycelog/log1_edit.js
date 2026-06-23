import { $, d$, q$ } from "../jquery.js";
import { k2e } from "../k2e.js";
import { dialog, showWarning } from "../posts/dialog.js";

let curR, curC, isFocused;

export function setupEdit() {
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

	for (const row of $("tbody tr")) {
		const id = parseInt(row.getAttribute("data-id"));
		if (Number.isNaN(id)) continue;
		const $row = $(row);
		$row.children(".log1-td-id").on("click", getIdFieldHandler(row, id));
		$row.children(".log1-td-type").on("click", getTypeHandler(row, id));
		$row.children(".log1-td-time").on("click", getTimeHandler(row, id));
		$row.children(".log1-td-content").on("click", contentClickHandler);
		$row.children(".log1-td-content").on("keydown", contentKeydownHandler);
		$row.children(".log1-td-content").on("input", contentInputHandler);
	}
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
		if (curC === 0 && e.shiftKey && e.target.parentElement.hasAttribute("data-id")) moveHandler(e, curR);
		else if (curC === 0) return;
		else e.target.click();
	} else if (e.key === "Backspace") {
		if (curC === 0 && e.target.parentElement.hasAttribute("data-id")) {
			e.preventDefault();
			deleteHandler(e, curR);
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
const TYPE_NAME = Object.freeze([
	"",
	"공부",
	"대화",
	"생각",
	"일상",
	"작업",
	"정보"
]);
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
		const res = await fetch(`./exists/${newId}`);
		if (!res.ok) throw res.status;
		const exists = await res.json();
		if (exists) {
			showWarning("번호 충돌이 발생합니다.");
			return;
		}
		const type = TYPE_KEYBIND[k2e(e.key)];
		d$("log1-new-entry").setAttribute("data-id", newId);
		d$("log1-new-entry").setAttribute("data-type", type);
		d$("log1-new-id").textContent = newId;
		d$("log1-new-type").textContent = TYPE_NAME[type];
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
			const data = await sendPatch({
				id: parseInt(d$("log1-new-entry").getAttribute("data-id")),
				type: parseInt(d$("log1-new-entry").getAttribute("data-type")),
				time: d$("log1-new-entry").getAttribute("data-time"),
				content: d$("log1-new-content").textContent,
				getHtml: true
			}, true);
			q$("tbody")[0].insertAdjacentHTML("beforeend", data.html);

			const newId = parseInt(d$("log1-new-entry").getAttribute("data-id"));
			const newRow = q$(`tbody tr[data-id="${newId}"]`)[0];
			const $newRow = $(newRow);
			$newRow.children(".log1-td-id").on("click", getIdFieldHandler(newRow, newId));
			$newRow.children(".log1-td-type").on("click", getTypeHandler(newRow, newId));
			$newRow.children(".log1-td-time").on("click", getTimeHandler(newRow, newId));
			$newRow.children(".log1-td-content").on("click", contentClickHandler);
			$newRow.children(".log1-td-content").on("keydown", contentKeydownHandler);
			$newRow.children(".log1-td-content").on("input", contentInputHandler);

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

const S = window.getSelection();
const SYMBOLS = {".": "·", "st": "★"};

function getIdFieldHandler(row, id) {
	return async function ($e) {
		const e = $e.originalEvent;
		focusOn(id, 0, true);
		if (e.shiftKey) moveHandler(e, id);
		else deleteHandler(e, id);
	}
}

async function deleteHandler(e, id) {
	dialog(`${id}번 항목 삭제`, `
		정말로 이 항목을 삭제하시겠습니까?<br>
		이 작업은 되돌릴 수 없습니다.<br>
		3차 기록의 언급 및 참조는 깨진 링크로 남습니다.
	`, async () => {
		try {
			const res = await fetch(window.location.href, {
				method: "DELETE",
				headers: {'Content-type': 'application/json'},
				body: JSON.stringify({id: id})
			});
			if (!res.ok) throw res.status;

			const parent = e.target.parentElement;
			if (parent.matches("tr:only-child")) {
				parent.remove();
				focusOn(-1, 0, false);
				return true;
			}
			if (parent.matches("tr:first-child")) {
				parent.remove();
				let newR = curR + 1;
				while ($("tbody tr:first-child").length !== 0 && $("tbody tr:first-child").attr("data-id") === undefined) {
					$("tbody tr:first-child").remove();
					newR += 1;
				}
				focusOn(newR, curC, true);
				return true;
			} else if (parent.matches("tr:last-child")) {
				parent.remove();
				let newR = curR - 1;
				while ($("tbody tr:last-child").length !== 0 && $("tbody tr:last-child").attr("data-id") === undefined) {
					$("tbody tr:last-child").remove();
					newR -= 1;
				}
				focusOn(newR, curC, true);
				return true;
			}
			parent.querySelectorAll(".log1-td-id, .log1-td-type, .wrapper, .log1-td-content").forEach((e) => {
				e.textContent = '';
			});
			parent.removeAttribute("data-id");
			parent.removeAttribute("data-type");
			parent.removeAttribute("data-time");

			const $parent = $(parent);
			$parent.children(".log1-td-id, .log1-td-type, .log1-td-time, .log1-td-content").off("click");
			$parent.children(".log1-td-content").off("keydown");
			$parent.children(".log1-td-content").off("input");

			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true)();
}

async function moveHandler(e, id) {
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
			const res = await fetch(`${window.location.href}/move`, {
				method: "POST",
				headers: {'Content-type': 'application/json'},
				body: JSON.stringify({
					startId: id,
					endId: endId,
					delta: delta
				})
			});
			if (!res.ok) throw {
				status: res.status,
				reason: await res.text()
			};
			focusOn(curR + delta, curC, true);
			window.location.reload();
			return true;
		} catch (e) {
			if (e.status !== 400) throw e;
			showWarning(e.reason);
			return false;
		}
	})();
}

function getTypeHandler(row, id) {
	return async function ($e) {
		const e = $e.originalEvent;
		focusOn(id, 1, true);
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
			return await changeType(row, id, e.target, type);
		})();
	}
}

async function changeType(row, id, target, type) {
	if (type == undefined) { // ???
		showWarning("값을 입력하세요.");
		return false;
	}
	try {
		await sendPatch({id: id, type: type}, true);
		target.textContent = TYPE_NAME[type];
		row.setAttribute("data-type", type);
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

function getTimeHandler(row, id) {
	return async function ($e) {
		const e = $e.originalEvent;
		focusOn(id, 2, true);
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
				await sendPatch({id: id, time: time}, true);
				e.target.firstChild.textContent = time;
				row.setAttribute("data-time", time);
				return true;
			} catch (e) {
				alert(`오류: ${e}`);
				return false;
			}
		})();
	}
}

async function contentClickHandler($e) {
	const e = $e.originalEvent;
	focusOn(parseInt(e.target.parentElement.getAttribute("data-id")), 3, true);
	e.target.setAttribute("contenteditable", "plaintext-only");
	if (!e.target.contains(S.anchorNode)) {
		S.selectAllChildren(e.target);
		S.collapseToEnd();
	}
}

async function contentKeydownHandler($e) {
	const e = $e.originalEvent;
	if (e.target.getAttribute("contenteditable") !== "plaintext-only") return;
	if (e.key === "Enter") {
		e.preventDefault();
		e.stopPropagation();
		submitContent(e.target);
		return;
	} else if (e.key === "Escape") {
		e.preventDefault();
		e.stopPropagation();
		cancelContent(e.target);
		S.removeAllRanges();
		return;
	} else if (e.key === "Tab") {
		e.preventDefault();
		if (!S.isCollapsed) return;
		if (S.anchorNode.nodeType !== Node.TEXT_NODE) return;
		const text = e.target.textContent.substring(0, S.anchorOffset);
		const cmd = text.match(/\]([^\]]*)\]$/)?.[1];
		if (cmd == undefined || !Object.hasOwn(SYMBOLS, cmd)) {
			showWarning("잘못된 기호 명령어입니다.");
			return;
		}

		const range = document.createRange();
		range.setStart(S.anchorNode, S.anchorOffset - (cmd.length + 2));
		range.setEnd(S.anchorNode, S.anchorOffset);
		range.deleteContents();
		range.insertNode(document.createTextNode(SYMBOLS[cmd]));

		S.removeAllRanges();
		S.addRange(range);
		S.collapseToEnd();

		e.target.normalize();
		contentInputHandler(e);
		return;
	}
}

async function contentInputHandler($e) {
	const e = $e.originalEvent;
	e.target.classList.add("log1-edited");
}

async function submitContent(target) {
	const id = parseInt(target.parentElement.getAttribute("data-id"));
	if (target.getAttribute("contenteditable") !== "plaintext-only") return;
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

async function cancelContent(target) {
	const id = parseInt(target.parentElement.getAttribute("data-id"));
	if (target.getAttribute("contenteditable") !== "plaintext-only") return;
	target.classList.remove("log1-edited");
	target.removeAttribute("contenteditable");
	const content = target.textContent;
	try {
		const data = await sendPatch({id: id}, true);
		target.textContent = data.content;
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

async function sendPatch(body, getData) {
	const res = await fetch(window.location.href, {
		method: "PATCH",
		headers: {'Content-type': 'application/json'},
		body: JSON.stringify(body)
	});
	if (!res.ok) throw res.status;
	if (!getData) return;
	const data = await res.json();
	return data;
}