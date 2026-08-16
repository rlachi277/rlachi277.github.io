import type { MenuActions } from "../posts/script.js";
import type { MenubarData } from "../posts/menubar.js";

import { setup as postsSetup } from "../posts/script.js";
import { $, d$n, q$n } from "../query.js";
import { setupLog1Edit } from "./log1_edit.js";

export function setup(menuBar: MenubarData[], defaultMenu: MenuActions, editMenu: MenuActions) {
	postsSetup(menuBar, defaultMenu, editMenu, true);
	if ($(":root.notfound, :root.index").exists) return;

	const stickyY = parseFloat(window.getComputedStyle(q$n("thead th:first-child")).insetBlockStart); // why
	const table = d$n("log1-table");
	const firstRow = q$n("tbody tr:first-child");
	function onScroll() {
		// sorry people who change the default writing-mode etc. for some reason
		// i think i can't support that here
		const tableY = firstRow.getBoundingClientRect().top;
		table.classList.toggle("hide-before", tableY > stickyY);
	}
	$("thead").on("click", () => window.scrollTo(0, 0));
	window.addEventListener("scroll", onScroll);
	window.addEventListener("resize", onScroll);
	onScroll();

	const params = new URLSearchParams(window.location.search);
	if (params.get("edit")) setupLog1Edit();
}