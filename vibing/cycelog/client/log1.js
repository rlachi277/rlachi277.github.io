import { d$ } from "../jquery.js";
import { setupDialog } from "../posts/dialog.js";
import { setupEdit } from "./log1_edit.js";

export function setup() {
	d$("log1-thead").addEventListener("click", (e) => {
		window.scrollTo(0, 0);
	});

	setupDialog();

	setupEdit();
}
