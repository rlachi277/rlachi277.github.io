import { $ } from "../jquery.js";
import { setupDialog } from "./dialog.js";
import { startEdit } from "./edit.js";

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

function setupMenu(menu) {
	for (const [k, v] of Object.entries(menu)) {
		$(`[data-menu="${k}"]`).on("click", v);
	}
}

export function setup(defaultMenu, editMenu) {
	onResize();
	window.addEventListener('resize', onResize);

	const scrollY = sessionStorage.getItem('scrollY');
	if (scrollY !== null) {
		window.scrollTo(0, scrollY);
		sessionStorage.removeItem('scrollY');
	}

	setupDialog();

	$(".menu-action").on("click", (e) => {
		const pparent = e.target.parentElement.parentElement;
		if (pparent.matches(":popover-open")) pparent.hidePopover();
	});
	setupMenu(defaultMenu);
	const params = new URLSearchParams(window.location.search);
	if (params.get("edit")) {
		if (!$(":root.notfound").length) startEdit($("body").get(0), true);
		$("menu .menu-edit").css("display", "revert");
		$("nav a").each((i, e) => {
			e.setAttribute("href", e.getAttribute("href") + "?edit=t");
		});
		setupMenu(editMenu);
	}
}