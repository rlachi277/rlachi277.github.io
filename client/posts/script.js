import { $, d$ } from "/client/jquery.js";
import { serialize } from "./seri.js";
import { setupDialog, dialog } from "./dialog.js";

/*
function refreshData() { // 테스트용
	const data = serialize($("body").get(0));
	fetch(window.location.pathname, {method: "PUT", body: JSON.stringify(data)});
}
refreshData();
*/

let isMobile = false;
const navDetails = $("nav details");

function onResize() {
	if (window.matchMedia("(max-width: 480px)").matches) {
		if (isMobile) return;
		isMobile = true;
		navDetails.removeAttr("open");
	} else {
		if (!isMobile) return;
		isMobile = false;
		navDetails.attr("open", "");
	}
}
onResize();
window.addEventListener('resize', onResize);

function setupDefaultMenus() {
	$(".menu-action").on("click", (e) => {
		const pparent = e.target.parentElement.parentElement;
		if (pparent.matches(":popover-open")) pparent.hidePopover();
	});

	$("#menu-export").on("click", () => {
		try {
			const data = serialize($("body").get(0));
			const file = new Blob([JSON.stringify(data)], {type: "application/json"});
			const anchor = document.createElement("a");
			anchor.href = URL.createObjectURL(file);
			anchor.download = "export.json";
			anchor.click();
			URL.revokeObjectURL(anchor.href);
		} catch (e) {
			alert(`오류: ${e}`);
		}
	});
}

function setupEditMenus(edit) {
	async function check(promise) {
		const res = await promise;
		if (!res.ok) throw res.status;
	}

	async function newPost(path, data) {
		const absPath = new URL(path, `file://${window.location.pathname}`).pathname;
		if (!absPath || !absPath.startsWith("/posts/")) {
			// TODO: 경고
			return false;
		}
		try {
			const res = await fetch(absPath, {method: "HEAD"});
			if (res.status !== 404) {
				if (res.status !== 200) throw res.status;
				// TODO: 경고
				return false;
			}
			check(fetch(absPath, {method: "PUT", body: JSON.stringify(data)}));
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}

	$("#menu-new").on("click", dialog("새 글", `
		<label for="dialog-new-path">경로: </label>
		<input id="dialog-new-path" placeholder="경로 입력">
	`, () => newPost(d$("dialog-new-path").value, {
		type: "body",
		children: [
			{type: "h1", children: [`${d$("dialog-new-path").value} @ ${window.location.pathname}`]},
			{type: "nav",children: null},
			{type: "p",children: []}
		]
	}), false));
	$("#menu-duplicate").on("click", dialog("이 글 복제", `
		<label for="dialog-new-path">경로: </label>
		<input id="dialog-new-path" placeholder="경로 입력">
	`, () => newPost(d$("dialog-new-path").value, serialize($("body").get(0))), false));
	$("#menu-delete").on("click", dialog("이 글 삭제", `
		정말로 <strong>이 글 전체</strong>를 삭제하시겠습니까?<br>
		이 작업은 되돌릴 수 없습니다.
	`, async () => {
		try {
			check(fetch(window.location.pathname, {method: "DELETE"}));
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true));
	$("#menu-load").on("click",dialog("JSON에서 불러오기", `
		JSON 파일의 내용으로 <strong>이 글</strong>을 덮어씌웁니다.<br>
		이 작업은 되돌릴 수 없습니다.<br><br>
		<label for="dialog-json-file">파일: </label>
		<input id="dialog-json-file" type="file" accept=".json">
	`, async () => {
		const path = window.location.pathname;
		try {
			check(fetch(path, {
				method: "PUT",
				headers: {'Content-Type': 'text/plain'},
				body: d$("dialog-json-file").files[0]
			}));
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true));

	$("#menu-insert-p").on("click", edit.menuInsert("p", false));
	$("#menu-insert-section").on("click", edit.menuInsert("section", true));
	$("#menu-insert-article").on("click", edit.menuInsert("article", true));
	$("#menu-insert-fieldset").on("click", edit.menuInsert(() => {
		const el = document.createElement("fieldset");
		el.append(document.createElement("legend"));
		return el;
	}, false));
	$("#menu-insert-legend").on("click", edit.menuInsert((after, isFirst) => {
		if (!isFirst || after.nodeName !== "FIELDSET") return undefined;
		return document.createElement("legend");
	}, false));
	$("#menu-insert-columns").on("click", edit.menuInsert(() => {
		const el = document.createElement("div");
		el.classList.add("columns");
		return el;
	}, true));
	$("#menu-insert-header").on("click", edit.menuInsert(edit.header, false));
	$("#menu-delete-element").on("click", edit.menuDelete);
	$("#menu-stoptargeting").on("click", edit.stopTargeting);
}

setupDialog();
setupDefaultMenus();
const params = new URLSearchParams(window.location.search);
if (params.get("edit")) {
	import("./edit.js").then((edit) => {
		edit.startEdit($("body").get(0), true);
		$(".menu-edit").css("display", "revert");
		$("nav a").each((i, e) => {
			e.setAttribute("href", e.getAttribute("href") + "?edit=t");
		});
		setupEditMenus(edit);
	});
}
