import { d$n, q$ } from "../query.js";
import { dialog, showWarning } from "../posts/dialog.js";
import {
	menuInsert,
	startTargeting,
	deleteElement
} from "../posts/edit.js";
import { defaultMenu as superDefaultMenu, editMenu as superEditMenu } from "../posts/menu.js";
import { sani } from "../../shared/posts/seri.js";

export const defaultMenu = {
	export: superDefaultMenu.export,
	
	startEdit: superDefaultMenu.startEdit,

	toLog1: () => {
		const path = `../log1/${window.location.pathname.split('/').at(-1)}${window.location.search}`;
		window.location.href = path;
	},
	toggleLog1: () => {
		try {
			sessionStorage.clear();
			const url = new URL(window.location.href);
			if (url.searchParams.get("log1") !== null) {
				url.searchParams.delete("log1");
				if (url.hash.startsWith("#l1entry")) url.hash = "";
				window.location.href = url.toString();
			} else {
				url.searchParams.set("log1", "t");
				const href = url.toString();
				dialog("1차 기록 보기", `
					3차 기록과 1차 기록을 모두 표시합니다.<br>
					1차 기록은 편집할 수 없습니다.<br>
					성능 저하나 예상치 못한 동작이 일어날 수 있습니다.
				`, () => {
					window.location.href = href;
					return true;
				})();
			}
		} catch (e) {
			alert(`오류: ${e}`);
		}
	},
	toMark: () => {
		const target = q$(":target");
		if (target === null) return;
		target.scrollIntoView();
	},
	removeMark: () => {
		sessionStorage.setItem('scrollY', window.scrollY.toString());
		const url = new URL(window.location.href);
		url.searchParams.delete("ref");
		url.hash = "";
		window.location.href = url.toString();
	},
	collapseAll: () => {
		document.querySelectorAll("details.week").forEach((e) => {
			(e as HTMLDetailsElement).open = false;
		});
	},
	expandAll: () => {
		document.querySelectorAll("details.week").forEach((e) => {
			(e as HTMLDetailsElement).open = true;
		});
	}
}

export const editMenu = {
	new: dialog("새 글", `
		<label for="dialog-new-id">식별자: </label>
		<input id="dialog-new-id" placeholder="식별자 입력">
	`, async () => {
		const id = (d$n("dialog-new-id") as HTMLInputElement).value;
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
					{type: "h1", children: [`끾기록: ${id}`]}
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
		if (isFirst || after.parentElement !== d$n("main")) return null;
		const newElement = document.createElement("details");
		newElement.classList.add("week");
		newElement.setAttribute("role", "region");
		const summary = document.createElement("summary");
		const hgroup = document.createElement("hgroup");
		newElement.open = true;

		hgroup.append(document.createElement("h2"));
		hgroup.append(document.createElement("p"));
		
		summary.append(hgroup);
		newElement.append(summary);

		const atrocity = document.createElement("summary");
		atrocity.classList.add("atrocity", "volatile");
		atrocity.innerHTML = summary.innerHTML ?? "???";
		summary.before(atrocity);
		newElement.addEventListener("toggle", () => {
			if (newElement.open) atrocity.firstElementChild?.setAttribute("hidden", "hidden");
			else {
				atrocity.innerHTML = summary.innerHTML ?? "???";
			}
		});
		
		newElement.append(document.createElement("p"));
		return newElement;
	}, false),
	insertP: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === d$n("main")) return null;
		return document.createElement("p");
	}, false),
	insertSection: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === d$n("main")) return null;
		return document.createElement("section");
	}, true),
	insertFieldset: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === d$n("main")) return null;
		return document.createElement("fieldset");
	}, false),
	insertColumns: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === d$n("main")) return null;
		const el = document.createElement("div");
		el.classList.add("columns");
		return el;
	}, false),
	insertPre: dialog("<pre> 삽입", `
		<label for="dialog-nowrap">줄바꿈 없음: </label>
		<input id="dialog-nowrap" type="checkbox">
	`, async () => {
		const wrap = !(d$n("dialog-nowrap") as HTMLInputElement).checked;
		menuInsert((after, isFirst) => {
			if (!isFirst && after.parentElement === d$n("main")) return null;
			const el = document.createElement("pre");
			if (wrap) el.classList.add("wrap");
			return el;
		}, false)();
		return true;
	}),
	insertBlockComment: menuInsert((after, isFirst) => {
		if (!isFirst && after.parentElement === d$n("main")) return null;
		return document.createElement("ins");
	}, false),
	insertImage: dialog("이미지 삽입", `
		파일 저장소의 이미지를 삽입합니다.<br>
		<label>
			이미지 ID: <input id="dialog-image-id" type="text">
		</label><br>
		<label>
			너비: <input id="dialog-image-width" type="number" min="1" style="width: 6ch;">px, 
		</label>
		<label>
			높이: <input id="dialog-image-height" type="number" min="1" style="width: 6ch;">px
		</label>
	`, async () => {
		const imageId = (d$n(`dialog-image-id`) as HTMLInputElement).value;
		if (imageId.includes(".") || imageId.includes("/")) {
			showWarning("잘못된 입력입니다.");
			return false;
		}
		const imageWidth = parseInt((d$n(`dialog-image-width`) as HTMLInputElement).value);
		const imageHeight = parseInt((d$n(`dialog-image-height`) as HTMLInputElement).value);
		menuInsert((after, isFirst) => {
			if (!isFirst && after.parentElement === d$n("main")) return null;
			const el = document.createElement("img");
			el.setAttribute("src", `../assets/image/${sani(imageId)}`);
			el.setAttribute("width", imageWidth.toString());
			el.setAttribute("height", imageHeight.toString());
			return el;
		}, false)();
		return true;
	}),
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
