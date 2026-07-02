import type { DeseriHook, SeriHook } from "../../shared/posts/seri.js";
import type { MenubarData } from "./menubar.js";

import { $ } from "../query.js";
import { setupDialog } from "./dialog.js";
import { startEdit } from "./edit.js";
import { setupMenubar } from "./menubar.js";

export type MenuActions = Record<string,EventListener>;

let isMobile = false;
function onResize() {
	if (window.matchMedia("(max-width: 480px)").matches) {
		if (isMobile) return;
		isMobile = true;
		$("nav details").attr("open", null);
		$("#menubar").css("display", "none");
	} else {
		if (!isMobile) return;
		isMobile = false;
		$("nav details").attr("open", "");
		$("#menubar").css("display", "");
	}
}

function setupMenu(menu: MenuActions | null) {
	if (menu === null) return;
	for (const [k, v] of Object.entries(menu)) {
		$(`[data-action="${k}"]`).on("click", v);
	}
}

export const SERI_HOOKS: SeriHook[] = [];
export const DESERI_HOOKS: DeseriHook[] = [];

export function setup(menuBar: MenubarData[], defaultMenu: MenuActions, editMenu: MenuActions | null = null, noEdit: boolean = false) {
	const scrollY = sessionStorage.getItem('scrollY');
	if (scrollY !== null) {
		window.scrollTo(0, parseInt(scrollY));
		sessionStorage.removeItem('scrollY');
	}
	
	setupMenubar(menuBar);
	setupDialog();

	onResize();
	window.addEventListener('resize', onResize);

	$(".menu-action").on("click", function () {
		const pparent = this.parentElement?.parentElement;
		if (pparent != undefined && pparent.matches(":popover-open")) pparent.hidePopover();
	});
	setupMenu(defaultMenu);
	const params = new URLSearchParams(window.location.search);
	if (params.get("edit")) {
		if (!noEdit && !$(":root.notfound, :root.index").exists) startEdit($("body").list[0], true);
		$("menu .menu-edit").css("display", "revert");
		$("nav a").each((e) => {
			e.setAttribute("href", e.getAttribute("href") + "?edit=t");
		});
		setupMenu(editMenu);
	}
}
