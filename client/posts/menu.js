import { seri } from "/shared/posts/seri.js";
import { $, d$ } from "/client/jquery.js";
import { dialog, showWarning } from "./dialog.js";
import {
	startTargeting,
	menuInsert,
	insertHgroup,
	deleteElement,
	header,
	stopTargeting
} from "./edit.js";

export const defaultMenu = {
	export: () => {
		try {
			const data = seri($("body").get(0));
			const file = new Blob([JSON.stringify(data)], {type: "application/json"});
			const anchor = document.createElement("a");
			anchor.href = URL.createObjectURL(file);
			anchor.download = "export.json";
			anchor.click();
			URL.revokeObjectURL(anchor.href);
		} catch (e) {
			alert(`오류: ${e}`);
		}
	},

	startEdit: () => {
		try {
			sessionStorage.setItem('scrollY', window.scrollY);
			window.location.search = "edit=t";
		} catch (e) {
			alert(`오류: ${e}`);
		}
	}
};

export const editMenu = {
	new: dialog("새 글", `
		<label for="dialog-new-path">경로: </label>
		<input id="dialog-new-path" placeholder="경로 입력">
	`, () => newPost(d$("dialog-new-path").value, {
		type: "body",
		children: [
			{type: "h1", children: [`${d$("dialog-new-path").value} @ ${window.location.pathname}`]},
			{type: "nav",children: null},
			{type: "p",children: []}
		]
	}), false),
	duplicate: dialog("이 글 복제", `
		<label for="dialog-new-path">경로: </label>
		<input id="dialog-new-path" placeholder="경로 입력">
	`, () => newPost(d$("dialog-new-path").value, seri($("body").get(0))), false),
	delete: dialog("이 글 삭제", `
		정말로 <strong>이 글 전체</strong>를 삭제하시겠습니까?<br>
		이 작업은 되돌릴 수 없습니다.
	`, async () => {
		try {
			await checkFetch(fetch(window.location.pathname, {method: "DELETE"}));
			window.location.reload();
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true),
	load: dialog("JSON에서 불러오기", `
		JSON 파일의 내용으로 <strong>이 글</strong>을 덮어씌웁니다.<br>
		이 작업은 되돌릴 수 없습니다.<br><br>
		<label for="dialog-json-file">파일: </label>
		<input id="dialog-json-file" type="file" accept=".json">
	`, async () => {
		const path = window.location.pathname;
		try {
			await checkFetch(fetch(path, {
				method: "PUT",
				headers: {'Content-Type': 'text/plain'},
				body: d$("dialog-json-file").files[0]
			}));
			$(".edited, .new").removeClass("edited new");
			window.location.reload();
			return true;
		} catch (e) {
			alert(`오류: ${e}`);
			return false;
		}
	}, true),

	stopEdit: () => {
		try {
			sessionStorage.setItem('scrollY', window.scrollY);
			window.location.search = "";
		} catch (e) {
			alert(`오류: ${e}`);
		}
	},

	insertP: menuInsert("p", false),
	insertSection: menuInsert("section", true),
	insertArticle: menuInsert("article", true),
	insertFieldset: menuInsert(() => {
		const el = document.createElement("fieldset");
		el.append(document.createElement("legend"));
		return el;
	}, false),
	insertLegend: menuInsert((after, isFirst) => {
		if (!isFirst || after.nodeName !== "FIELDSET") return null;
		return document.createElement("legend");
	}, false),
	insertColumns: menuInsert(() => {
		const el = document.createElement("div");
		el.classList.add("columns");
		return el;
	}, false),
	insertHeader: menuInsert(header, false),
	insertHgroup: () => {
		startTargeting(insertHgroup);
	},
	deleteElement: () => {
		startTargeting((target) => {
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
	stopTargeting: stopTargeting
};

async function checkFetch(promise) {
	const res = await promise;
	if (!res.ok) throw res.status;
}

async function newPost(path, data) {
	const absPath = new URL(path, `file://${window.location.pathname}`).pathname;
	if (!absPath || !absPath.startsWith("/posts/")) {
		showWarning("경로가 적절하지 않습니다.");
		return false;
	}
	try {
		const res = await fetch(absPath, {method: "HEAD"});
		if (res.status !== 404) {
			if (res.status !== 200) throw res.status;
			showWarning("해당 경로에 글이 이미 있습니다.");
			return false;
		}
		await checkFetch(fetch(absPath, {method: "PUT", body: JSON.stringify(data)}));
		window.location.reload();
		return true;
	} catch (e) {
		alert(`오류: ${e}`);
		return false;
	}
}