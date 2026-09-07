import { dialog, setupDialog, showWarning } from "../posts/dialog.js";
import { $, d$n } from "../query.js";

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
	$(".image-size").each((e) => {
		const image = e.parentElement?.previousElementSibling as HTMLImageElement;
		const w = image.naturalWidth, h = image.naturalHeight;
		if (w === 0 || h === 0) e.textContent = "새로고침 필요";
		else e.textContent = `${w}px × ${h}px`;
	});
	$(".image-delete-button").on("click", async function (_) {
		dialog("이미지 삭제", `이 이미지를 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.`, async () => {
			const link = this.getAttribute("data-link") as string;
			const res = await fetch(link, {method: "DELETE"});
			if (!res.ok) {
				showWarning(await res.text());
				return false;
			}
			window.location.reload();
			return true;
		}, true)();
	});
}