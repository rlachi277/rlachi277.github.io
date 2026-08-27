import "./auth.css";

import { html } from "../shared/template.js";
import { d$n } from "./query.js";

export function setupAuth() {
	document.body.insertAdjacentHTML("afterbegin", html`<div id="auth">
		<h6>사용자 인증</h6>
		<label>인증 키: <input id="auth-key"></label><button id="auth-post">인증</button>
		<p>현재 인증: <span id="auth-cur">방문자</span></p>
	</div>`);
	d$n("auth-post").addEventListener("click", async function () {
		const res = await fetch("/auth/", {
			method: "POST",
			body: (d$n("auth-key") as HTMLInputElement).value
		});
		const data = await res.json();
		updateCur(data.role);
	});
	fetch("/auth/").then((res) => {
		return res.json();
	}).then((data) => {
		updateCur(data.role);
	});
}

function updateCur(role: string) {
	if (role === "admin") {
		d$n("auth-cur").textContent = "관리자";
		d$n("auth-cur").setAttribute("data-cur", "2");
	} else if (role === "user") {
		d$n("auth-cur").textContent = "사용자";
		d$n("auth-cur").setAttribute("data-cur", "1");
	} else {
		d$n("auth-cur").textContent = "방문자";
		d$n("auth-cur").setAttribute("data-cur", "0");
	}
}