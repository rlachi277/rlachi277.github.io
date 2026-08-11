import type { MenuActions } from "../posts/script.js";
import type { MenubarData } from "../posts/menubar.js";

import { setup as postsSetup } from "../posts/script.js";
import { $ } from "../query.js";
import { setupLog1Edit } from "./log1_edit.js";

export function setup(menuBar: MenubarData[], defaultMenu: MenuActions, editMenu: MenuActions) {
	postsSetup(menuBar, defaultMenu, editMenu, true);
	if ($(":root.notfound, :root.index").exists) return;
	const params = new URLSearchParams(window.location.search);
	if (params.get("edit")) setupLog1Edit();
	else {
		for (const td of document.getElementsByClassName("log1-td-id")) {
			const id = parseInt((td.parentElement as HTMLElement).getAttribute("data-id") as string);
			(td as HTMLElement).addEventListener("click", (e: PointerEvent) => {
				const path = `../log3/${window.location.pathname.split("/").at(-1)}#entry${id}`;
				/* this *will* work on iOS Safari. only _blank doesn't work. */
				if (e.ctrlKey || e.metaKey) window.open(path, "_blank", "noopener");
				else window.open(path, "_self", "noopener");
				e.preventDefault();
			});
		}
	}
}