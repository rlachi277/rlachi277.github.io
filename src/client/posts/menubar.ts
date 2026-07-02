import { $, d$ } from "../query";

export type MenubarData = {
	text: string,
	action?: string,
	filter?: boolean[],
	edit?: boolean | boolean[],
	submenu?: MenubarData[]
};

export function setupMenubar(data: MenubarData[]) {
	document.body.insertAdjacentHTML("afterbegin", `<div id="menubar"></div>`);
	popoverCnt = 0; first = true;
	d$("menubar")?.append(buildMenubar(data));
}

const filterIndex = $(":root.index").exists ? 1 :
	($(":root.notfound").exists ? 2 : 0);

let popoverCnt = 0;
let first = true;
function buildMenubar(data: MenubarData[], submenu: boolean = false): HTMLElement {
	const wrapper = document.createElement(submenu ? "ul" : "menu");
	wrapper.setAttribute("role", submenu ? "menu" : "menubar");
	for (const e of data) {
		if (e.filter !== undefined && !e.filter[filterIndex]) continue;
		const li = document.createElement("li");
		li.setAttribute("role", "none");
		if (e.edit !== undefined &&
			(Array.isArray(e.edit) ? e.edit[filterIndex] : e.edit)) li.classList.add("menu-edit");
		const button = document.createElement("button");
		button.setAttribute("role", "menuitem");
		button.textContent = e.text;
		if (e.action !== undefined) {
			button.classList.add("menu-action");
			button.setAttribute("data-action", e.action);
		}
		button.setAttribute("tabindex", first ? "0" : "-1");
		first = false;
		li.append(button);
		if (e.submenu !== undefined) {
			const submenu = buildMenubar(e.submenu, true);
			popoverCnt++;
			submenu.setAttribute("id", `menu-popover-${popoverCnt}`);
			submenu.setAttribute("popover", "");
			button.setAttribute("popovertarget", `menu-popover-${popoverCnt}`);
			li.append(submenu);
		}
		wrapper.append(li);
	}
	return wrapper;
}
