import { d$ } from "/client/jquery.js";

let dialogAction = null;
export function dialog(title, main, action, danger) {
	return function () {
		d$("dialog-title").textContent = title;
		d$("dialog-main").innerHTML = main.replaceAll(/\n|\t/g, '');
		dialogAction = action;
		if (danger) d$("dialog-confirm").classList.add("danger");
		d$("dialog").showModal();
	}
}

export function setupDialog() {
	d$("dialog-confirm").addEventListener("click", async function () {
		if (dialogAction == null) return;
		if (await dialogAction()) d$("dialog").close();
	});

	d$("dialog").addEventListener("close", function () {
		d$("dialog-title").textContent = '';
		d$("dialog-main").innerHTML = '';
		d$("dialog-confirm").classList.remove("danger");
	});
}