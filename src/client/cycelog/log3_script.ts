import type { MenuActions } from "../posts/script.js";
import type { MenubarData } from "../posts/menubar.js";

import { setup as postsSetup } from "../posts/script.js";
import { $ } from "../query.js";
import { setupLog3Edit } from "./log3_edit.js";

declare global {
	interface Window {
		LOG3_TYPES?: string;
	}
}

export function setup(menuBar: MenubarData[], defaultMenu: MenuActions, editMenu: MenuActions) {
	const params = new URLSearchParams(window.location.search);
	if (params.get("edit") && !$(":root.notfound, :root.index").exists) setupLog3Edit(window.LOG3_TYPES ?? '{}');
	postsSetup(menuBar, defaultMenu, editMenu);
}
