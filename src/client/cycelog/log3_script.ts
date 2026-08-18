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
			if (href !== null) {
				const url = new URL(href, window.location.href);
				url.searchParams.set("edit", "t");
				e.setAttribute("href", url.toString());	
			}
			e.setAttribute("contenteditable", "false");
			e.setAttribute("data-edit", "");
		});
		$(".week > summary").each((e) => {
			const atrocity = document.createElement("summary");
			atrocity.classList.add("atrocity", "volatile");
			atrocity.innerHTML = e.innerHTML ?? "???";
			e.before(atrocity);
			const week = e.parentElement as HTMLDetailsElement;
			if (week.open) atrocity.firstElementChild?.setAttribute("hidden", "hidden");
			week.addEventListener("toggle", () => {
				if (week.open) atrocity.firstElementChild?.setAttribute("hidden", "hidden");
				else {
					atrocity.innerHTML = e.innerHTML ?? "???";
				}
			});
		})
		setupLog3Edit();
	}
	if (params.get("log1")) {
		$("#log1-table tr[data-id]").each((e) => {
			const id = e.id.substring(7);
			if (!$(`#entry${id}`).exists) e.setAttribute("data-nolink", "");
			else e.removeAttribute("data-nolink");
		});
	}
	postsSetup(menuBar, defaultMenu, editMenu);
}