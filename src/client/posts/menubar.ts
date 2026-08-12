import { $, d$ } from "../query";

export type MenubarData = {
	text: string,
	action?: string,
	filter?: boolean[],
	edit?: boolean | boolean[],
	submenu?: MenubarData[]
};

const params = new URLSearchParams(window.location.search);
const edit = params.get("edit");

export function setupMenubar(data: MenubarData[]) {
	document.body.insertAdjacentHTML("afterbegin", `<div id="menubar"></div>`);
	popoverCnt = 0; first = true;
	d$("menubar")?.append(buildMenubar(data));
	$("#menubar menu").on("keydown", onMenubarKeydown);
}

const filterIndex = $(":root.index").exists ? 1 :
	($(":root.notfound").exists ? 2 : 0);

let popoverCnt = 0;
let first = true;
function buildMenubar(data: MenubarData[], isSubmenu: boolean = false): HTMLElement {
	const wrapper = document.createElement(isSubmenu ? "ul" : "menu");
	wrapper.setAttribute("role", isSubmenu ? "menu" : "menubar");
	for (const e of data) {
		if (e.filter !== undefined && !e.filter[filterIndex]) continue;
		const li = document.createElement("li");
		li.setAttribute("role", "none");
		if (e.edit !== undefined &&
			(Array.isArray(e.edit) ? e.edit[filterIndex] : e.edit) && !edit) continue;
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
			button.addEventListener("click", () => {
				// sorry people who change the default writing-mode etc. for some reason
				// i think i can't support that here
				const rect = button.getBoundingClientRect();
				submenu.style.left = isSubmenu ? `${rect.right}px` : `${rect.left - 1}px`;
				submenu.style.top = isSubmenu ? `${rect.top - 1}px` : `${rect.bottom}px`;
			});
			li.append(submenu);
		}
		wrapper.append(li);
	}
	return wrapper;
}

function onMenubarKeydown(this: HTMLElement, e: KeyboardEvent) {
	const target = e.target as HTMLButtonElement;
	const li = target.parentElement as HTMLLIElement;
	let newTarget: HTMLButtonElement;
	switch (e.key) {
	case 'Enter': case ' ': return; // default interaction already covers
	case 'ArrowDown':
		if (li.parentElement === this && target.getAttribute("popovertarget") !== null) {
			const submenu = d$(target.getAttribute("popovertarget") as string) as HTMLUListElement;
			submenu.togglePopover({force: true, source: target});
			newTarget = submenu.firstElementChild?.firstChild as HTMLButtonElement;
			break;
		}
		newTarget = (li.nextElementSibling ?? li.parentElement?.firstElementChild)?.firstElementChild as HTMLButtonElement;
		break;
	case 'ArrowUp':
		if (li.parentElement === this && target.getAttribute("popovertarget") !== null) {
			const submenu = d$(target.getAttribute("popovertarget") as string) as HTMLUListElement;
			submenu.togglePopover({force: true, source: target});
			newTarget = submenu.lastElementChild?.firstChild as HTMLButtonElement;
			break;
		}
		newTarget = (li.previousElementSibling ?? li.parentElement?.lastElementChild)?.firstElementChild as HTMLButtonElement;
		break;
	case 'ArrowRight':
		if (li.parentElement === this) {
			newTarget = (li.nextElementSibling ?? this.firstElementChild)?.firstElementChild as HTMLButtonElement;
			if (target.getAttribute("popovertarget") !== null) {
				const submenu = d$(target.getAttribute("popovertarget") as string) as HTMLUListElement;
				if (submenu.matches(":popover-open") && newTarget.getAttribute("popovertarget") !== null) {
					const newSubmenu = d$(newTarget.getAttribute("popovertarget") as string) as HTMLUListElement;
					newSubmenu.togglePopover({force: true, source: newTarget});
				}
				submenu.togglePopover({force: false});
			}
		} else if (target.getAttribute("popovertarget") !== null) {
			const submenu = d$(target.getAttribute("popovertarget") as string) as HTMLUListElement;
			submenu.togglePopover({force: true, source: target});
			newTarget = submenu.firstElementChild?.firstChild as HTMLButtonElement;
		} else {
			newTarget = target;
			while (newTarget.parentElement?.parentElement !== this) {
				// the submenu <ul> comes directly after the button that opens it
				newTarget = newTarget.parentElement?.parentElement?.previousElementSibling as HTMLButtonElement;
			}
			const newLi = newTarget.parentElement as HTMLLIElement;
			newTarget = (newLi.nextElementSibling ?? this.firstElementChild)?.firstElementChild as HTMLButtonElement;
			if (newTarget.getAttribute("popovertarget") !== null) {
				const newSubmenu = d$(newTarget.getAttribute("popovertarget") as string) as HTMLUListElement;
				newSubmenu.togglePopover({force: true, source: newTarget});
			}
		}
		break;
	case 'ArrowLeft':
		if (li.parentElement === this) {
			newTarget = (li.previousElementSibling ?? this.lastElementChild)?.firstElementChild as HTMLButtonElement;
			if (target.getAttribute("popovertarget") !== null) {
				const submenu = d$(target.getAttribute("popovertarget") as string) as HTMLUListElement;
				if (submenu.matches(":popover-open") && newTarget.getAttribute("popovertarget") !== null) {
					const newSubmenu = d$(newTarget.getAttribute("popovertarget") as string) as HTMLUListElement;
					newSubmenu.togglePopover({force: true, source: newTarget});
				}
				submenu.togglePopover({force: false});
			}
		} else {
			newTarget = target;
			while (newTarget.parentElement?.parentElement !== this) {
				// the submenu <ul> comes directly after the button that opens it
				newTarget = newTarget.parentElement?.parentElement?.previousElementSibling as HTMLButtonElement;
			}
			const newLi = newTarget.parentElement as HTMLLIElement;
			newTarget = (newLi.previousElementSibling ?? this.lastElementChild)?.firstElementChild as HTMLButtonElement;
			if (newTarget.getAttribute("popovertarget") !== null) {
				const newSubmenu = d$(newTarget.getAttribute("popovertarget") as string) as HTMLUListElement;
				newSubmenu.togglePopover({force: true, source: newTarget});
			}
		}
		break;
	case 'Escape':
		if (li.parentElement === this) {
			if (target.getAttribute("popovertarget") !== null) {
				const submenu = d$(target.getAttribute("popovertarget") as string) as HTMLUListElement;
				if (submenu.matches(":popover-open")) {
					submenu.togglePopover(false);
					return;
				}
			}
			target.blur();
			return;
		}
		// the submenu <ul> comes directly after the button that opens it
		newTarget = li.parentElement?.previousElementSibling as HTMLButtonElement;
		const curSubmenu = li.parentElement as HTMLUListElement;
		curSubmenu.togglePopover(false);
		break;
	case 'Tab':
		newTarget = target;
		while (newTarget.parentElement?.parentElement !== this) {
			// the submenu <ul> comes directly after the button that opens it
			newTarget = newTarget.parentElement?.parentElement?.previousElementSibling as HTMLButtonElement;
		}
		target.setAttribute("tabindex", "-1");
		newTarget.setAttribute("tabindex", "0");
		$("#menubar :popover-open").each((e) => e.hidePopover());
		return;
	default: return;
	}
	newTarget?.setAttribute("tabindex", "0");
	newTarget?.focus();
	target.setAttribute("tabindex", "-1");
	e.preventDefault();
	e.stopPropagation();
}
