import { LOG1_TYPE_NAME } from "../../shared/cycelog/log1.js";
import { $, d$, q$ } from "../jquery.js";
import { dialog, showWarning } from "../posts/dialog.js";
import { sendDelete, sendMove, sendPatch } from "./log1_fetch.js";
import { setupGrid, getFocusState, focusOn } from "./log1_grid.js";
const S = window.getSelection();
const SYMBOLS = { ".": "·", "st": "★" };
export function setupLog1Edit() {
    setupGrid();
    for (const row of $("tbody tr"))
        setupRow(row);
}
export function setupRow(row) {
    if (!row.hasAttribute("data-id"))
        return;
    const $row = $(row);
    $row.children(".log1-td-id").on("click", onIdFieldClick);
    $row.children(".log1-td-type").on("click", onTypeFieldClick);
    $row.children(".log1-td-time").on("click", onTimeFieldClick);
    $row.children(".log1-td-content").on("click", onContentFieldClick);
    $row.children(".log1-td-content").on("keydown", onContentFieldKeydown);
    $row.children(".log1-td-content").on("input", onContentFieldInput);
}
export async function onIdFieldClick($e) {
    const e = $e.originalEvent ?? $e;
    const row = e.target.parentElement;
    const id = parseInt(row.getAttribute("data-id"));
    focusOn(id, 0, true);
    if (e.altKey)
        deleteEntryDialog(e, id);
    else if (e.shiftKey && !(e.ctrlKey || e.metaKey))
        moveEntriesDialog(id);
    else {
        const path = `../log3/${window.location.pathname.split("/").at(-1)}?edit=t#entry${id}`;
        // this *will* work on iOS Safari. only _blank doesn't work.
        if (e.ctrlKey || e.metaKey)
            window.open(path, "_blank", "noopener");
        else
            window.open(path, "_self", "noopener");
        e.preventDefault?.();
    }
}
async function deleteEntryDialog(e, id) {
    dialog(`${id}번 항목 삭제`, `
		정말로 이 항목을 삭제하시겠습니까?<br>
		이 작업은 되돌릴 수 없습니다.<br>
		3차 기록에서의 반영 및 참조는 깨진 링크로 남습니다.
	`, async () => {
        try {
            await sendDelete(id);
            const row = e.target.parentElement;
            if (row.matches("tr:only-child")) {
                row.remove();
                focusOn(-1, 0, false);
                return true;
            }
            if (row.matches("tr:first-child")) {
                row.remove();
                const { row: curR, col: curC } = getFocusState();
                let newR = curR + 1;
                while ($("tbody tr:first-child").length !== 0 && $("tbody tr:first-child").attr("data-id") === undefined) {
                    $("tbody tr:first-child").remove();
                    newR += 1;
                }
                focusOn(newR, curC, true);
                return true;
            }
            else if (row.matches("tr:last-child")) {
                row.remove();
                const { row: curR, col: curC } = getFocusState();
                let newR = curR - 1;
                while ($("tbody tr:last-child").length !== 0 && $("tbody tr:last-child").attr("data-id") === undefined) {
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
            const $row = $(row);
            $row.children(".log1-td-id, .log1-td-type, .log1-td-time, .log1-td-content").off("click");
            $row.children(".log1-td-content").off("keydown");
            $row.children(".log1-td-content").off("input");
            return true;
        }
        catch (e) {
            alert(`오류: ${e}`);
            return false;
        }
    }, true)();
}
async function moveEntriesDialog(id) {
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
        else if (endId < id) {
            showWarning("끝 번호가 시작 번호보다 작습니다.");
            return false;
        }
        else if (delta === 0) {
            showWarning("이 동작은 아무것도 하지 않습니다.");
            return false;
        }
        else if (id + delta <= 0) {
            showWarning("이 동작은 자연수가 아닌 항목 번호를 만듭니다.");
            return false;
        }
        try {
            await sendMove(id, endId, delta);
            const { row: curR, col: curC } = getFocusState();
            focusOn(curR + delta, curC, true);
            window.location.reload();
            return true;
        }
        catch (e) {
            if (e.status !== 400)
                throw e;
            showWarning(e.reason);
            return false;
        }
    })();
}
async function onTypeFieldClick($e) {
    const e = $e.originalEvent ?? $e;
    const row = e.target.parentElement;
    const id = parseInt(row.getAttribute("data-id"));
    focusOn(id, 1, true);
    const cur = parseInt(row.getAttribute("data-type") ?? 0);
    dialog(`${id}번 항목 유형 변경`, `
		<label><input type="radio" name="log1-type" value="1"${cur === 1 ? " checked autofocus" : ""}>공부</label>
		<label><input type="radio" name="log1-type" value="2"${cur === 2 ? " checked autofocus" : ""}>대화</label>
		<label><input type="radio" name="log1-type" value="3"${cur === 3 ? " checked autofocus" : ""}>생각</label>
		<br>
		<label><input type="radio" name="log1-type" value="4"${cur === 4 ? " checked autofocus" : ""}>일상</label>
		<label><input type="radio" name="log1-type" value="5"${cur === 5 ? " checked autofocus" : ""}>작업</label>
		<label><input type="radio" name="log1-type" value="6"${cur === 6 ? " checked autofocus" : ""}>정보</label>
	`, async () => {
        const type = q$(`input[name="log1-type"]:checked`)[0]?.value;
        if (type == undefined) { // ???
            showWarning("값을 입력하세요.");
            return false;
        }
        try {
            await sendPatch({ id: id, type: type });
            e.target.textContent = LOG1_TYPE_NAME[type];
            row.setAttribute("data-type", type);
            return true;
        }
        catch (e) {
            alert(`오류: ${e}`);
            return false;
        }
    })();
}
async function onTimeFieldClick($e) {
    const e = $e.originalEvent ?? $e;
    const row = e.currentTarget.parentElement;
    const id = parseInt(row.getAttribute("data-id"));
    focusOn(id, 2, true);
    const cur = row.getAttribute("data-time") ?? "";
    const wrapper = e.currentTarget.firstChild;
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
            await sendPatch({ id: id, time: time });
            wrapper.textContent = time;
            row.setAttribute("data-time", time);
            return true;
        }
        catch (e) {
            alert(`오류: ${e}`);
            return false;
        }
    })();
}
async function onContentFieldClick($e) {
    const e = $e.originalEvent ?? $e;
    focusOn(parseInt(e.target.parentElement.getAttribute("data-id")), 3, true);
    e.target.setAttribute("contenteditable", "plaintext-only");
    if (!e.target.contains(S.anchorNode)) {
        S.selectAllChildren(e.target);
        S.collapseToEnd();
    }
}
async function onContentFieldKeydown($e) {
    const e = $e.originalEvent ?? $e;
    if (e.target.getAttribute("contenteditable") !== "plaintext-only")
        return;
    e.stopPropagation();
    if (e.key === "Enter") {
        e.preventDefault();
        submitContent(e.target);
        return;
    }
    else if (e.key === "Escape") {
        e.preventDefault();
        cancelContent(e.target);
        S.removeAllRanges();
        return;
    }
    else if (e.key === "Tab") {
        e.preventDefault();
        if (!S.isCollapsed)
            return;
        if (S.anchorNode.nodeType !== Node.TEXT_NODE)
            return;
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
        onContentFieldInput(e);
        return;
    }
}
async function onContentFieldInput($e) {
    const e = $e.originalEvent ?? $e;
    e.target.classList.add("log1-edited");
}
async function submitContent(target) {
    const id = parseInt(target.parentElement.getAttribute("data-id"));
    if (target.getAttribute("contenteditable") !== "plaintext-only")
        return;
    target.classList.remove("log1-edited");
    target.removeAttribute("contenteditable");
    const content = target.textContent;
    try {
        await sendPatch({ id: id, content: content });
        return true;
    }
    catch (e) {
        alert(`오류: ${e}`);
        return false;
    }
}
async function cancelContent(target) {
    const id = parseInt(target.parentElement.getAttribute("data-id"));
    if (target.getAttribute("contenteditable") !== "plaintext-only")
        return;
    target.classList.remove("log1-edited");
    target.removeAttribute("contenteditable");
    try {
        const data = await sendPatch({ id: id }, true);
        target.textContent = data.content;
        return true;
    }
    catch (e) {
        alert(`오류: ${e}`);
        return false;
    }
}
