import type { MenuActions } from "../posts/script.js";
import type { MenubarData } from "../posts/menubar.js";

import { setup as postsSetup } from "../posts/script.js";
import { $ } from "../query.js";
import { setupLog3Edit } from "./log3_edit.js";

declare global {
	interface Window {
		LOG3_DATA?: string;
	}
}

export function setup(menuBar: MenubarData[], defaultMenu: MenuActions, editMenu: MenuActions) {
	const params = new URLSearchParams(window.location.search);
	if (params.get("edit") && !$(":root.notfound, :root.index").exists) {
		$(".entry").each((e) => {
			const href = e.getAttribute("href");
			if (href === null || !href.startsWith("./")) return;
			const url = new URL(href, window.location.href);
			url.searchParams.set("edit", "t");
			e.setAttribute("href", url.toString());
		});
		setupLog3Edit(window.LOG3_DATA ?? '{}');
	}
	postsSetup(menuBar, defaultMenu, editMenu);
}
