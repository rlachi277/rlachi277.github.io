import { $ } from "../jquery.js";
import { setupDialog } from "./dialog.js";
import { startEdit } from "./edit.js";

let isMobile = false;
const navDetails = $("nav details");
const menubar = $("#menubar");
function onResize() {
	if (window.matchMedia("(max-width: 480px)").matches) {
		if (isMobile) return;
		isMobile = true;
		navDetails.removeAttr("open");
		menubar.css("display", "none");
	} else {
		if (!isMobile) return;
		isMobile = false;
		navDetails.attr("open", "");
		menubar.css("display", "");
	}
}

function setupMenu(menu) {
	if (menu == undefined) return;
	for (const [k, v] of Object.entries(menu)) {
		$(`[data-menu="${k}"]`).on("click", v);
	}
}

export const SERI_HOOKS = [];
export const DESERI_HOOKS = [];

export function setup(defaultMenu, editMenu, noEdit) {
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
		if (!noEdit && !$(":root.notfound").length) startEdit($("body").get(0), true);
		$("menu .menu-edit").css("display", "revert");
		$("nav a").each((i, e) => {
			e.setAttribute("href", e.getAttribute("href") + "?edit=t");
		});
		setupMenu(editMenu);
	}
}