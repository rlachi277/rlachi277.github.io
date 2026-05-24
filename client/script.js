import { $ } from "../script/jquery.js";
import { seri, no_lf } from "../script/posts/seri.js";

export function serialize(el, init) {
	if (el.nodeName === 'NAV') return {type: "nav", children: null};
	return seri(el, init, serialize);
}

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

const params = new URLSearchParams(window.location.search);
if (params.get("edit")) {
	import("./edit.js").then((edit) => {
		edit.start_edit($("body").get(0), true);
		$(".menu-edit").css("display", "revert");
		$("nav a").each((i, e) => {
			e.setAttribute("href", e.getAttribute("href") + "?edit=t");
		});

		$("#menu-new").on("click", edit.dialog_new_post);
		$("#menu-duplicate").on("click", edit.dialog_duplicate_post);
		$("#menu-delete").on("click", edit.dialog_delete_post);
		$("#menu-load").on("click", edit.dialog_load);

		$("#menu-inserttestp").on("click", edit.insert_test_p);
		$("#menu-inserttests").on("click", edit.insert_test_s);
		$("#menu-deletetest").on("click", edit.delete_test);
		$("#menu-stoptargeting").on("click", edit.stop_targeting);
	});
}