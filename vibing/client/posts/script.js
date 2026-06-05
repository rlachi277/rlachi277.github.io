import { $, d$ } from "/client/jquery.js";
import { setupDialog, dialog } from "./dialog.js";
import { serialize } from "./seri.js";

const POST_PATH_PREFIX = "/posts/";
const EXPORT_FILE_NAME = "export.json";
const MOBILE_NAV_QUERY = "(max-width: 480px)";

function currentPostElement() {
	return $("body").get(0);
}

function currentPostJson() {
	return serialize(currentPostElement());
}

function putPost(path, data, headers) {
	return fetch(path, {
		method: "PUT",
		headers: headers,
		body: data
	});
}

function refresh_data() { // 테스트용
	putPost(window.location.pathname, JSON.stringify(currentPostJson()));
}
refresh_data();

let mobile = false;
let navDetails;

function onResize(init) {
	if (init) {
		mobile = false;
		navDetails = $("nav details");
	}

	if (window.matchMedia(MOBILE_NAV_QUERY).matches) {
		if (!init || mobile) return;
		mobile = true;
		navDetails.removeAttr("open");
	} else {
		if (!mobile) return;
		mobile = false;
		navDetails.attr("open", "");
	}
}

setupDialog();
onResize(true);
window.addEventListener("resize", () => onResize());

$(".menu-action").on("click", (event) => {
	const popover = event.target.parentElement.parentElement;
	if (popover.matches(":popover-open")) popover.hidePopover();
});

$("#menu-export").on("click", exportPostJson);

function exportPostJson() {
	try {
		const file = new Blob([JSON.stringify(currentPostJson())], {type: "application/json"});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(file);
		link.download = EXPORT_FILE_NAME;
		link.click();
		URL.revokeObjectURL(link.href);
	} catch (error) {
		alert(`오류: ${error}`);
	}
}

async function createPostAtDialogPath(makePostData) {
	const path = d$("dialog-new-path").value;
	const absPath = new URL(path, `file://${window.location.pathname}`).pathname;
	if (!absPath || !absPath.startsWith(POST_PATH_PREFIX)) {
		// TODO: 경고
		return false;
	}

	try {
		const response = await fetch(absPath, {method: "HEAD"});
		if (response.status !== 404) {
			if (response.status !== 200) throw response.status;
			// TODO: 경고
			return false;
		}
		putPost(absPath, JSON.stringify(makePostData(absPath)));
		return true;
	} catch (error) {
		alert(`오류: ${error}`);
		return false;
	}
}

function setupPostFileMenus() {
	$("#menu-new").on("click", dialog("새 글", `
		<label for="dialog-new-path">경로: </label>
		<input id="dialog-new-path" placeholder="경로 입력">
	`, () => createPostAtDialogPath((path) => ({
		type: "body",
		children: [
			{type: "h1", children: [path]},
			{type: "nav", children: null},
			{type: "p", children: []}
		]
	})), false));

	$("#menu-duplicate").on("click", dialog("이 글 복제", `
		<label for="dialog-new-path">경로: </label>
		<input id="dialog-new-path" placeholder="경로 입력">
	`, () => createPostAtDialogPath(() => currentPostJson()), false));

	$("#menu-delete").on("click", dialog("이 글 삭제", `
		정말로 <strong>이 글 전체</strong>를 삭제하시겠습니까?<br>
		이 작업은 되돌릴 수 없습니다.
	`, async () => {
		try {
			fetch(window.location.pathname, {method: "DELETE"});
			return true;
		} catch (error) {
			alert(`오류: ${error}`);
			return false;
		}
	}, true));

	$("#menu-load").on("click", dialog("JSON에서 불러오기", `
		JSON 파일의 내용으로 <strong>이 글</strong>을 덮어씌웁니다.<br>
		이 작업은 되돌릴 수 없습니다.<br><br>
		<label for="dialog-json-file">파일: </label>
		<input id="dialog-json-file" type="file" accept=".json">
	`, async () => {
		try {
			putPost(
				window.location.pathname,
				d$("dialog-json-file").files[0],
				{"Content-Type": "text/plain"}
			);
			return true;
		} catch (error) {
			alert(`오류: ${error}`);
			return false;
		}
	}, true));
}

function addEditSearchParamToNavLinks() {
	$("nav a").each((i, link) => {
		link.setAttribute("href", link.getAttribute("href") + "?edit=t");
	});
}

function setupInsertMenus(edit) {
	$("#menu-insert-p").on("click", edit.menu_insert("p", false));
	$("#menu-insert-section").on("click", edit.menu_insert("section", true));
	$("#menu-insert-article").on("click", edit.menu_insert("article", true));
	$("#menu-insert-fieldset").on("click", edit.menu_insert(() => {
		const element = document.createElement("fieldset");
		element.append(document.createElement("legend"));
		return element;
	}, false));
	$("#menu-insert-legend").on("click", edit.menu_insert((after, isFirst) => {
		if (!isFirst || after.nodeName !== "FIELDSET") return undefined;
		return document.createElement("legend");
	}, false));
	$("#menu-insert-columns").on("click", edit.menu_insert(() => {
		const element = document.createElement("div");
		element.classList.add("columns");
		return element;
	}, true));
	$("#menu-insert-header").on("click", edit.menu_insert(edit.header, false));
	$("#menu-delete-element").on("click", edit.menu_delete);
	$("#menu-stoptargeting").on("click", edit.stop_targeting);
}

const params = new URLSearchParams(window.location.search);

if (params.get("edit")) {
	import("./edit.js").then((edit) => {
		edit.start_edit(currentPostElement(), true);
		$(".menu-edit").css("display", "revert");
		addEditSearchParamToNavLinks();
		setupPostFileMenus();
		setupInsertMenus(edit);
	});
}
