import { setupDialog, showWarning } from "../posts/dialog.js";
import { d$n } from "../query.js";

export function setup() {
	setupDialog();
	d$n("image-form").addEventListener("submit", async (e) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const res = await fetch(form.action, {
			method: "POST",
			body: new FormData(form)
		});
		if (res.ok) window.location.reload();
		else showWarning(await res.text());
	});
	d$n("image-delete-form").addEventListener("submit", async (e) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const res = await fetch(form.action, {
			method: "POST",
			body: new FormData(form)
		});
		if (res.ok) window.location.reload();
		else showWarning(await res.text());
	});
}