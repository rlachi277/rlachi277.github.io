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
			const split = e.getAttribute("href")?.split("#");
			if (split === undefined) return;
			const newHref = split.slice(0, -1).join("#") + "?edit=t#" + split.at(-1);
			e.setAttribute("href", newHref);
		});
		setupLog3Edit(window.LOG3_DATA ?? '{}');
	}
	postsSetup(menuBar, defaultMenu, editMenu);
}
