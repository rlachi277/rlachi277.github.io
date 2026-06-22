import { $, d$, q$ } from "/client/jquery.js";
import { setupDialog, dialog } from "../posts/dialog.js";
import {
	getIdFieldHandler,
	getTypeHandler,
	getTimeHandler,
	contentClickHandler,
	contentKeydownHandler
} from "./log1_edit.js";

const SYMBOLS = {".": "·", "st": "★"};

export function setup() {
	d$("log1-thead").addEventListener("click", (e) => {
		window.scrollTo(0, 0);
	});

	setupDialog();

	for (const row of $("tbody tr")) {
		const id = parseInt(row.getAttribute("data-id"));
		if (Number.isNaN(id)) continue;
		row.querySelector(".log1-td-id")?.addEventListener("click", getIdFieldHandler(row, id));
		row.querySelector(".log1-td-type")?.addEventListener("click", getTypeHandler(row, id));
		row.querySelector(".log1-td-time")?.addEventListener("click", getTimeHandler(row, id));
		row.querySelector(".log1-td-content")?.addEventListener("click", contentClickHandler);
		row.querySelector(".log1-td-content")?.addEventListener("keydown", contentKeydownHandler);
	}
}