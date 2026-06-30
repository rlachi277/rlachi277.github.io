import { d$, d$n } from "../jquery.js";
let dialogAction = null;
export function dialog(title, main, action, danger = false) {
    return function () {
        d$n("dialog-title").textContent = title;
        d$n("dialog-main").innerHTML = main.replaceAll(/\n|\t/g, '');
        dialogAction = action;
        if (danger) {
            d$n("dialog-confirm").classList.add("danger");
            d$n("dialog-cancel").removeAttribute("tabindex");
        }
        else {
            d$n("dialog-cancel").setAttribute("tabindex", "-1");
        }
        d$n("dialog").showModal();
    };
}
export function setupDialog() {
    d$("dialog-confirm")?.addEventListener("click", async function () {
        if (dialogAction === null)
            return;
        if (await dialogAction())
            d$("dialog").close();
    });
    d$("dialog")?.addEventListener("close", function () {
        d$n("dialog-title").textContent = '';
        d$n("dialog-main").innerHTML = '';
        d$n("dialog-confirm").classList.remove("danger");
    });
    d$("warning")?.addEventListener("animationend", function (e) {
        if (e.animationName === "warning-fade")
            this.classList.remove("show");
    });
}
export function showWarning(message) {
    const warning = d$n("warning");
    warning.textContent = ""; // 스크린 리더를 들고 우리 사이트까지 올 사람이 있으련지는 모르겠지만 여하튼 이걸 해야 똑같은 경고를 여러 번 띄울 때 role="alert"가 작동을 함
    warning.textContent = message;
    if (warning.classList.contains("show")) {
        warning.classList.remove("show");
        void warning.offsetHeight;
    }
    warning.classList.add("show");
}
