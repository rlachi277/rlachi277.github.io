import { d$ } from "/client/jquery.js";

let dialogAction = null;
let initialized = false;

export function setupDialog() {
	if (initialized) return;
	initialized = true;

	d$("dialog-confirm").addEventListener("click", async () => {
		if (dialogAction == null) return;
		if (await dialogAction()) d$("dialog").close();
	});

	d$("dialog").addEventListener("close", () => {
		d$("dialog-title").textContent = "";
		d$("dialog-main").innerHTML = "";
		d$("dialog-confirm").classList.remove("danger");
		dialogAction = null;
	});
}

export function dialog(title, main, action, danger) {
	return function openDialog() {
		d$("dialog-title").textContent = title;
		d$("dialog-main").innerHTML = main;
		dialogAction = action;
		if (danger) d$("dialog-confirm").classList.add("danger");
		d$("dialog").showModal();
	};
}
