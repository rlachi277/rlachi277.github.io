import { entrySeriHook, entryDeseriHook } from '../../shared/cycelog/cycelog_hook.js';
import { d$ } from "../jquery.js";
import { SERI_HOOKS, DESERI_HOOKS } from "../posts/script.js";
import { dialog, showWarning } from "../posts/dialog.js";
let types;
let deseriHook;
export function setupLog3Edit(typesString) {
    types = Object.freeze(JSON.parse(typesString));
    deseriHook = entryDeseriHook(types, true, "/cycelog/");
    SERI_HOOKS.push(entrySeriHook);
    DESERI_HOOKS.push(deseriHook);
    document.body.addEventListener("keydown", onKeydown);
}
const S = window.getSelection();
function onKeydown(e) {
    if (!S.isCollapsed)
        return;
    let curEl = S.anchorNode;
    if (curEl === null)
        return;
    if (curEl.nodeType === Node.TEXT_NODE)
        curEl = curEl.parentElement;
    if (!(curEl instanceof Element))
        return;
    if (curEl.closest(".editable") === null || curEl.closest("hgroup") !== null)
        return;
    const shortcut = e.ctrlKey || e.metaKey;
    if (shortcut && e.key === "e" && !e.shiftKey) {
        insertEntry();
    }
    else if (shortcut && e.key === "e" && e.shiftKey) {
        insertReference();
    }
}
function insertEntry() {
    const range = S.getRangeAt(0);
    dialog("항목 반영", `
		<label for="dialog-entry-id">번호: </label>
		<input id="dialog-entry-id" type="number" placeholder="항목 번호 입력">
	`, () => {
        const id = parseInt(d$("dialog-entry-id").value);
        if (Number.isNaN(id)) {
            showWarning("올바르지 않은 항목 번호입니다.");
            return false;
        }
        else if (d$(`entry${id}`) !== null) {
            showWarning("해당 항목은 이미 반영되었습니다.");
            return false;
        }
        else if (!Object.hasOwn(types, id)) {
            showWarning("이 글에는 해당 번호의 항목이 없습니다.");
            return false;
        }
        const newEl = deseriHook({
            type: 'entry',
            variant: { id: id }
        }, window.location.pathname)?.html;
        if (newEl == undefined) {
            alert("오류: newEl == undefined");
            return false;
        }
        insertAtRange(range, newEl);
        return true;
    })();
}
function insertReference() {
    const range = S.getRangeAt(0);
    dialog("항목 참조", `
		<label for="dialog-entry-id">번호: </label>
		<input id="dialog-entry-id" type="number" placeholder="항목 번호 입력">
	`, () => {
        const id = parseInt(d$("dialog-entry-id").value);
        if (Number.isNaN(id)) {
            showWarning("올바르지 않은 항목 번호입니다.");
            return false;
        }
        const newEl = deseriHook({
            type: 'ref',
            variant: { id: id }
        }, window.location.pathname)?.html;
        if (newEl == undefined) {
            alert("오류: newEl == undefined");
            return false;
        }
        insertAtRange(range, newEl);
        return true;
    })();
}
function insertAtRange(range, html) {
    const marker = document.createElement("span");
    marker.classList.add("select-marker");
    range.insertNode(marker);
    marker.insertAdjacentHTML("beforebegin", html);
    range.selectNode(marker);
    range.collapse();
    S.removeAllRanges();
    S.addRange(range);
    S.anchorNode.dispatchEvent(new Event("input", { bubbles: true }));
}
