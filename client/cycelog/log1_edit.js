import { $, d$, q$ } from "/client/jquery.js";
import { dialog, showWarning } from "../posts/dialog.js";

let curR, curC, isFocused;

export function setupEdit() {
	$("tbody td").attr("tabindex", "-1");
	curR = parseInt(sessionStorage.getItem("curR")) ??
		parseInt($("tbody > tr:first-child").attr("data-id"));
	curC = parseInt(sessionStorage.getItem("curC")) ?? 0;
	isFocused = JSON.parse(sessionStorage.getItem("isFocused")) ?? false;
	focusOn(curR, curC, isFocused);
	d$("log1-skip").addEventListener("click", (e) => {
		focusOn(curR, curC, true);
	});
	d$("log1-table").addEventListener("keydown", onTableKeydown);
	$("tbody td").on("blur", onTableBlur);

	for (const row of $("tbody tr")) {
		const id = parseInt(row.getAttribute("data-id"));
		if (Number.isNaN(id)) continue;
		row.querySelector(".log1-td-id")?.addEventListener("click", getIdFieldHandler(row, id));
		row.querySelector(".log1-td-type")?.addEventListener("click", getTypeHandler(row, id));
		row.querySelector(".log1-td-time")?.addEventListener("click", getTimeHandler(row, id));
		row.querySelector(".log1-td-content")?.addEventListener("click", contentClickHandler);
		row.querySelector(".log1-td-content")?.addEventListener("keydown", contentKeydownHandler);
		row.querySelector(".log1-td-content")?.addEventListener("input", contentInputHandler);
	}
}

function focusOn(row, col, focus, block) {
	// console.log(`${row} ${col} ${focus}`);
	const target = q$(`tbody > tr[data-id="${row}"] > td:nth-child(${col+1})`)?.[0];
	if (target === undefined && block) return;
	const oldTarget = q$(`tbody > tr[data-id="${curR}"] > td:nth-child(${curC+1})`)?.[0];
	if (oldTarget !== undefined) oldTarget.setAttribute("tabindex", "-1");
	if (target !== undefined) {
		target.setAttribute("tabindex", "0");
		if (focus) target.focus();
	}
	curR = row; curC = col; isFocused = focus;
	sessionStorage.setItem("curR", curR);
	sessionStorage.setItem("curC", curC);
	sessionStorage.setItem("isFocused", focus);
}

function onTableKeydown(e) {
	if (e.target.getAttribute("contenteditable") === "plaintext-only") return;
	const shortcut = e.ctrlKey || e.metaKey;
	if (e.key === "ArrowUp") {
		e.preventDefault();
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:first-child").attr("data-id")), curC, true);
			return;
		}
		focusOn(curR-1, curC, true, true);
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		if (shortcut) {
			focusOn(parseInt($("tbody > tr:last-child").attr("data-id")), curC, true);
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
		e.target.blur();
	} else if (e.key === "Enter") {
		e.preventDefault();
		if (curC === 0 && e.shiftKey) moveHandler(e, curR);
		else e.target.click();
	}
	if (curC === 1) {
		let type;
		switch (e.key) {
			case '1': case 's': type = 1; break;
			case '2': case 'd': type = 2; break;
			case '3': case 't': type = 3; break;
			case '4': case 'g': type = 4; break;
			case '5': case 'w': type = 5; break;
			case '6': case 'i': type = 6; break;
			default: return;
		}
		e.preventDefault();
		changeType(document.activeElement.parentElement, curR, document.activeElement, type);
	}
}

function onTableBlur(e) {
	if (e.relatedTarget !== null) return;
	focusOn(curR, curC, false);
}

const S = window.getSelection();
const SYMBOLS = {".": "·", "st": "★"};

function getIdFieldHandler(row, id) {
	return async function (e) {
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
			<input id="dialog-new-end-id" type="number" value="${id}" min="${id}">
			번까지의 항목의
		</label><br>
		<label>
			번호를 
			<input id="dialog-new-delta" type="number" value="1">
			만큼 변경합니다.
		</label>
	`, async () => {
		const endIdStr = d$("dialog-new-end-id").value;
		const deltaStr = d$("dialog-new-delta").value;
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
	return async function (e) {
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
		const data = await sendPatch({id: id, type: type}, true);
		target.textContent = data.type;
		row.setAttribute("data-type", type);
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}

function getTimeHandler(row, id) {
	return async function (e) {
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
				const data = await sendPatch({id: id, time: time}, true);
				e.target.firstChild.textContent = data.time;
				row.setAttribute("data-time", time);
				return true;
			} catch (e) {
				alert(`오류: ${e}`);
				return false;
			}
		})();
	}
}

async function contentClickHandler(e) {
	focusOn(parseInt(e.target.parentElement.getAttribute("data-id")), 3, true);
	e.target.setAttribute("contenteditable", "plaintext-only");
	if (!e.target.contains(S.anchorNode)) {
		S.selectAllChildren(e.target);
		S.collapseToEnd();
	}
}

async function contentKeydownHandler(e) {
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

async function contentInputHandler(e) {
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