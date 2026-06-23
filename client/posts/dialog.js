import { d$ } from "../jquery.js";

let dialogAction = null;
export function dialog(title, main, action, danger) {
	return function () {
		d$("dialog-title").textContent = title;
		d$("dialog-main").innerHTML = main.replaceAll(/\n|\t/g, '');
		dialogAction = action;
		if (danger) {
			d$("dialog-confirm").classList.add("danger");
			d$("dialog-cancel").removeAttribute("tabindex");
		} else {
			d$("dialog-cancel").setAttribute("tabindex", "-1");
		}
		d$("dialog").showModal();
	}
}

export function setupDialog() {
	d$("dialog-confirm")?.addEventListener("click", async function () {
		if (dialogAction === null) return;
		if (await dialogAction()) d$("dialog").close();
	});

	d$("dialog")?.addEventListener("close", function () {
		d$("dialog-title").textContent = '';
		d$("dialog-main").innerHTML = '';
		d$("dialog-confirm").classList.remove("danger");
	});

	d$("warning")?.addEventListener("animationend", (e) => {
		if (e.animationName === "warning-fade") e.target.classList.remove("show");
	})
}

export function showWarning(message) {
	const warning = d$("warning");
	warning.textContent = ""; // 스크린 리더를 들고 우리 사이트까지 올 사람이 있으련지는 모르겠지만 여하튼 이걸 해야 똑같은 경고를 여러 번 띄울 때 role="alert"가 작동을 함
	warning.textContent = message;
	if (warning.classList.contains("show")) {
		warning.classList.remove("show");
		void warning.offsetHeight;
	}
	warning.classList.add("show");
}