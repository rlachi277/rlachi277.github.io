import { $, d$, q$ } from "/client/jquery.js";
import { setupDialog, dialog } from "../posts/dialog.js";
import { setupEdit } from "./log1_edit.js";

const SYMBOLS = {".": "·", "st": "★"};

export function setup() {
	d$("log1-thead").addEventListener("click", (e) => {
		window.scrollTo(0, 0);
	});

	setupDialog();

	setupEdit();
}