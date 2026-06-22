import { d$ } from "/client/jquery.js";
import { dialog, showWarning } from "../posts/dialog.js";
import {
	menuInsert,
	startTargeting,
	deleteElement
} from "../posts/edit.js";
import { editMenu as superEditMenu } from "../posts/menu.js";

export { defaultMenu } from "../posts/menu.js";
export const editMenu = {
	new: dialog("새 글", `
		<label for="dialog-new-id">식별자: </label>
		<input id="dialog-new-id" placeholder="식별자 입력">
	`, async () => {
		const id = d$("dialog-new-id").value;
		if (!id || id.includes('/') || id.includes('.')) {
			showWarning("식별자가 적절하지 않습니다.");
			return false;
		}
		try {
			const res = await fetch(id, {method: "HEAD"});
			if (res.status !== 404) {
				if (res.status !== 200) throw res.status;
				showWarning("해당 식별자를 가지는 글이 이미 있습니다.");
				return false;
			}
			const res2 = await fetch(id, {method: "PUT", body: JSON.stringify({
				type: "body",
				children: [
					{type: "h1", children: [`cycelog: ${id}`]},
					{type: "nav", children: null}
				]
			})});
			if (!res2.ok) throw res2.status;
			window.location.reload();
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}),
	delete: dialog("이 글 삭제", `
		정말로 <strong>이 글 전체</strong>를 삭제하시겠습니까?<br>
		<strong style="color: var(--c-1);">3차 기록 및 1차 기록 전부가 삭제됩니다.</strong><br>
		이 작업은 되돌릴 수 없습니다.
	`, async () => {
		try {
			const res = await fetch(window.location.pathname, {method: "DELETE"});
			if (!res.ok) throw res.status;
			window.location.reload();
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true),
	load: superEditMenu.load,

	stopEdit: superEditMenu.stopEdit,

	insertWeek: menuInsert((after, isFirst) => {
		if (isFirst || after.parentElement !== document.body) return null;
		const newElement = document.createElement("section");
		newElement.classList.add("week");
		const hgroup = document.createElement("hgroup");

		// TODO: 주차 정보 채우기
		hgroup.append(document.createElement("h2"));
		hgroup.append(document.createElement("p"));
		
		newElement.append(hgroup);
		newElement.append(document.createElement("p"));
		return newElement;
	}, false),
	insertP: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === document.body) return null;
		return document.createElement("p");
	}, false),
	insertSection: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === document.body) return null;
		return document.createElement("section");
	}, true),
	insertFieldset: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === document.body) return null;
		return document.createElement("fieldset");
	}, false),
	insertColumns: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === document.body) return null;
		const el = document.createElement("div");
		el.classList.add("columns");
		return el;
	}, false),
	deleteElement: () => {
		startTargeting((target) => {
			if (target.tagName === "HGROUP" || /^H[1-6]$/.test(target.tagName)) {
				showWarning("제목은 삭제할 수 없습니다.")
				return false;
			}
			dialog("요소 삭제", `
				이 &lt;${target.nodeName.toLowerCase()}&gt; 요소를 삭제하시겠습니까?<br>
				이 작업은 되돌릴 수 없습니다.
			`, () => {
				deleteElement(target);
				return true;
			}, true)();
			return true;
		})
	},
	stopTargeting: superEditMenu.stopTargeting
};
