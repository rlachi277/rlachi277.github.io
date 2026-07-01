import type { MenuActions } from "../posts/script.js";

import { setup as postsSetup } from "../posts/script.js";
import { setupLog3Edit } from "./log3_edit.js";

declare global {
	interface Window {
		LOG3_TYPES?: string;
	}
}

export function setup(defaultMenu: MenuActions, editMenu: MenuActions) {
	const params = new URLSearchParams(window.location.search);
	if (params.get("edit")) setupLog3Edit(window.LOG3_TYPES ?? '{}');
	postsSetup(defaultMenu, editMenu);
}
