import type { DeseriHook } from '../../shared/posts/seri.js';
import type { EntryData } from '../../shared/cycelog/cycelog_hook.js';

import { cycelogSeriHook, cycelogDeseriHook } from '../../shared/cycelog/cycelog_hook.js';
import { $, d$, d$n } from "../query.js";
import { SERI_HOOKS, DESERI_HOOKS } from "../posts/script.js";
import { dialog, showWarning } from "../posts/dialog.js";
import { clientWhere } from './log3_where.js';

const entryData: EntryData = {
	cache: {},
	has: function (id) {
		if (Object.hasOwn(this.cache as object, id)) return true;
		return d$(`l1entry${id}`) !== null;
	},
	get: function (id) {
		console.log(id);
		const cache = this.cache as Record<number,readonly [number,string,string]>;
		if (Object.hasOwn(cache, id)) return cache[id];
		const l1entry = d$(`l1entry${id}`);
		if (l1entry === null) return undefined;
		const result = [
			parseInt(l1entry.getAttribute("data-type") as string),
			l1entry.getAttribute("data-time") as string,
			l1entry.lastElementChild?.textContent as string
		] as const;
		cache[id] = result;
		return result;
	}
};
let deseriHook: DeseriHook;

export function setupLog3Edit() {
	deseriHook = cycelogDeseriHook(entryData, clientWhere("/cycelog/"), (new URLSearchParams(window.location.search)).has("log1"));
	SERI_HOOKS.push(cycelogSeriHook);
	DESERI_HOOKS.push(deseriHook);
	document.body.addEventListener("keydown", onKeydown);
}

const S = window.getSelection() as Selection;

function onKeydown(e: KeyboardEvent) {
	if (!S.isCollapsed) return;
	let curEl = S.anchorNode;
	if (curEl === null) return;
	if (curEl instanceof Text) curEl = curEl.parentElement;
	if (!(curEl instanceof Element)) return;
	if (curEl.closest(".editable") === null || curEl.closest("hgroup") !== null) return;
	const shortcut = e.ctrlKey || e.metaKey;
	if (shortcut && e.key === "e" && !e.shiftKey) {
		insertEntry();
	} else if (shortcut && e.key === "e" && e.shiftKey) {
		insertReference();
	} else if (shortcut && e.key === ".") {
		insertEndOfWeek();
	}
}

function insertEntry() {
	const range = S.getRangeAt(0);
	const marker = document.createElement("span");
	marker.classList.add("select-marker", "dialog-marker");
	range.insertNode(marker);
	const container = range.startContainer;
	const section = ((container instanceof Element) ? container : container.parentElement)?.closest("section");
	const isAtSubsection = (section instanceof HTMLElement) && (section.parentElement !== d$n("main"));
	dialog("항목 반영", `
		<label for="dialog-entry-id">번호: </label>
		<input id="dialog-entry-id" type="number" placeholder="항목 번호 입력">
		${isAtSubsection ? `
			<br>
			<label for="dialog-entry-date">날짜: </label>
			<input id="dialog-entry-date" type="text" placeholder="표시할 날짜 입력(선택)">
		` : ``}
	`, () => {
		const id = parseInt((d$n("dialog-entry-id") as HTMLInputElement).value);
		if (Number.isNaN(id)) {
			showWarning("올바르지 않은 항목 번호입니다.");
			return false;
		} else if (d$(`entry${id}`) !== null) {
			showWarning("해당 항목은 이미 반영되었습니다.");
			return false;
		} else if (!(id === 0 || id === -1 || id === -3) && !entryData.has(id)) {
			showWarning("이 글에는 해당 번호의 항목이 없습니다.");
			return false;
		}
		const date = isAtSubsection ? (d$n("dialog-entry-date") as HTMLInputElement).value : "";
		const newEl = (deseriHook({
			type: 'entry',
			variant: {id: id, date: (date !== "" ? date : null)},
			children: null
		}, window.location.pathname) as {type: 'html', html: string}).html;
		if (newEl == undefined) {
			alert("오류: newEl == undefined");
			return false;
		}
		insertAtMarker(marker, newEl);
		return true;
	})();
}

function insertReference() {
	const range = S.getRangeAt(0);
	const marker = document.createElement("span");
	marker.classList.add("select-marker", "dialog-marker");
	range.insertNode(marker);
	dialog("항목 참조", `
		<label for="dialog-entry-id">번호: </label>
		<input id="dialog-entry-id" type="number" placeholder="항목 번호 입력">
	`, () => {
		const id = parseInt((d$n("dialog-entry-id") as HTMLInputElement).value);
		if (Number.isNaN(id)) {
			showWarning("올바르지 않은 항목 번호입니다.");
			return false;
		}
		const newEl = (deseriHook({
			type: 'ref',
			variant: {id: id},
			children: null
		}, window.location.pathname) as {type: 'html', html: string}).html;
		if (newEl == undefined) {
			alert("오류: newEl == undefined");
			return false;
		}
		insertAtMarker(marker, newEl);
		return true;
	})();
}

function insertEndOfWeek() {
	const range = S.getRangeAt(0);
	const marker = document.createElement("span");
	marker.classList.add("select-marker", "dialog-marker");
	range.insertNode(marker);
	const newEl = `<span class="semantic end-of-week">그렇게 ???가 끝났다.</span>`;
	insertAtMarker(marker, newEl);
}

function insertAtMarker(marker: HTMLElement, html: string) {
	marker.insertAdjacentHTML("beforebegin", html);
	S.setPosition(marker);
	S.anchorNode?.dispatchEvent(new Event("input", {bubbles: true}));
	marker.remove();
	$(".entry[href]:not([href*='edit=t'])").each((e) => {
		const href = e.getAttribute("href");
		if (href === null) return;
		const url = new URL(href, window.location.href);
		url.searchParams.set("edit", "t");
		e.setAttribute("href", url.toString());
	});
}
