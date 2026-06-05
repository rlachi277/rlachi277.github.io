import { $, d$ } from "/client/jquery.js";
import { serialize } from "./seri.js";

function refresh_data() { // 테스트용
	let s = serialize($("body").get(0));
	fetch(window.location.pathname, { method: "PUT", body: JSON.stringify(s) });
}
refresh_data();

let mobile = false;
let nav_details;
function on_resize(init) {
	if (init) {
		mobile = false;
		nav_details = $("nav details");
	}
	if (window.matchMedia("(max-width: 480px)").matches) {
		if (!init || mobile) return;
		mobile = true;
		nav_details.removeAttr("open");
	} else {
		if (!mobile) return;
		mobile = false;
		nav_details.attr("open", "");
	}
}
on_resize(true);
window.addEventListener('resize', () => on_resize());

$(".menu-action").on("click", (e) => {
	let pp = e.target.parentElement.parentElement;
	if (pp.matches(":popover-open")) pp.hidePopover();
});

$("#menu-export").on("click", () => {
	try {
		let s = serialize($("body").get(0));
		let file = new Blob([JSON.stringify(s)], {type: "application/json"});
		let a = document.createElement("a");
		a.href = URL.createObjectURL(file);
		a.download = "export.json";
		a.click();
		URL.revokeObjectURL(a.href);
	} catch (e) {
		alert(`오류: ${e}`);
	}
});

let dialog_function = null;
d$("dialog-confirm").addEventListener("click", async function () {
	if (dialog_function == null) return;
	if (await dialog_function()) d$("dialog").close();
});

d$("dialog").addEventListener("close", function () {
	d$("dialog-title").textContent = '';
	d$("dialog-main").innerHTML = '';
	d$("dialog-confirm").classList.remove("danger");
})

export function dialog(title, main, diaf, danger) {
	function f() {
		d$("dialog-title").textContent = title;
		d$("dialog-main").innerHTML = main;
		dialog_function = diaf;
		if (danger) d$("dialog-confirm").classList.add("danger");
		d$("dialog").showModal();
	}
	return f;
}

const params = new URLSearchParams(window.location.search);
if (params.get("edit")) {
	import("./edit.js").then((edit) => {
		edit.start_edit($("body").get(0), true);
		$(".menu-edit").css("display", "revert");
		$("nav a").each((i, e) => {
			e.setAttribute("href", e.getAttribute("href") + "?edit=t");
		});

		$("#menu-new").on("click", dialog("새 글", `
			<label for="dialog-new-path">경로: </label>
			<input id="dialog-new-path" placeholder="경로 입력">
		`, async () => {
			let path = d$("dialog-new-path").value;
			let abs_path = new URL(path, `file://${window.location.pathname}`).pathname;
			if (!abs_path || !abs_path.startsWith("/posts/")) {
				// TODO: 경고
				return false;
			}
			try {
				let f = await fetch(abs_path, { method: "HEAD" });
				if (f.status !== 404) {
					if (f.status !== 200) throw f.status;
					// TODO: 경고
					return false;
				}
				let s = {type: "body",children:[{type: "h1",children: [abs_path]},{type: "nav",children: null},{type: "p",children: []}]};
				fetch(abs_path, { method: "PUT", body: JSON.stringify(s) });
				return true;
			} catch (e) {
				alert(`오류: ${e}`);
				return false;
			}
		}, false));
		$("#menu-duplicate").on("click", dialog("이 글 복제", `
			<label for="dialog-new-path">경로: </label>
			<input id="dialog-new-path" placeholder="경로 입력">
		`, async () => {
			let path = d$("dialog-new-path").value;
			let abs_path = new URL(path, `file://${window.location.pathname}`).pathname;
			if (!abs_path || !abs_path.startsWith("/posts/")) {
				// TODO: 경고
				return false;
			}
			try {
				let f = await fetch(abs_path, { method: "HEAD" });
				if (f.status !== 404) {
					if (f.status !== 200) throw f.status;
					// TODO: 경고
					return false;
				}
				let s = serialize($("body").get(0));
				fetch(abs_path, { method: "PUT", body: JSON.stringify(s) });
				return true;
			} catch (e) {
				alert(`오류: ${e}`);
				return false;
			}
		}, false));
		$("#menu-delete").on("click", dialog("이 글 삭제", `
			정말로 <strong>이 글 전체</strong>를 삭제하시겠습니까?<br>
			이 작업은 되돌릴 수 없습니다.
		`, async () => {
			try {
				fetch(window.location.pathname, { method: "DELETE" });
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
			let path = window.location.pathname;
			try {
				fetch(path, { method: "PUT", headers: {'Content-Type': 'text/plain'}, body: d$("dialog-json-file").files[0] });
				return true;
			} catch (e) {
				alert(`오류: ${e}`);
				return false;
			}
		}, true));

		$("#menu-insert-p").on("click", edit.menu_insert("p", false));
		$("#menu-insert-section").on("click", edit.menu_insert("section", true));
		$("#menu-insert-article").on("click", edit.menu_insert("article", true));
		$("#menu-insert-fieldset").on("click", edit.menu_insert(() => {
			let el = document.createElement("fieldset");
			el.append(document.createElement("legend"));
			return el;
		}, false));
		$("#menu-insert-legend").on("click", edit.menu_insert((after, is_first) => {
			if (!is_first || after.nodeName !== "FIELDSET") return undefined;
			return document.createElement("legend");
		}, false));
		$("#menu-insert-columns").on("click", edit.menu_insert(() => {
			let el = document.createElement("div");
			el.classList.add("columns");
			return el;
		}, true));
		$("#menu-insert-header").on("click", edit.menu_insert(edit.header, false));
		$("#menu-delete-element").on("click", edit.menu_delete);
		$("#menu-stoptargeting").on("click", edit.stop_targeting);
	});
}
