import type { DeseriHook, SeriHook } from "../../shared/posts/seri.js";
import type { MenubarData } from "./menubar.js";

import { $, d$n } from "../query.js";
import DOMPurify from "../purify.es.mjs";
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

export const SERI_HOOKS: SeriHook[] = [
	function (el, _): ReturnType<SeriHook> {
		if (el.tagName === "svg") {
			return {
				type: 'svg',
				variant: {inner: DOMPurify.sanitize(el.innerHTML, {
					USE_PROFILES: {svg: true, svgFilters: true},
					NAMESPACE: "http://www.w3.org/2000/svg",
				})},
				children: null
			} as const;
		} else if (el.tagName === "math") {
			return {
				type: 'math',
				variant: {inner: DOMPurify.sanitize(el.innerHTML, {
					USE_PROFILES: {mathMl: true},
					NAMESPACE: "http://www.w3.org/1998/Math/MathML",
				})},
				children: null
			} as const;
		}
		return undefined;
	}
];
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

	d$n("nav-skip").addEventListener("click", () => {
		const title = $("h1:first-child").list[0];
		title.setAttribute("tabindex", "-1");
		title.focus();
		title.removeAttribute("tabindex");
	});

	$(".menu-action").on("click", function () {
		const pparent = this.parentElement?.parentElement;
		if (pparent != undefined && pparent.matches(":popover-open")) pparent.hidePopover();
	});
	setupMenu(defaultMenu);
	const params = new URLSearchParams(window.location.search);
	if (params.get("edit")) {
		if (!noEdit && !$(":root.notfound, :root.index").exists) startEdit(d$n("main"), true);
		$("nav a").each((e) => {
			e.setAttribute("href", e.getAttribute("href") + "?edit=t");
		});
		setupMenu(editMenu);
	}
}
