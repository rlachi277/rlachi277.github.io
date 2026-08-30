import net from "node:net";

function sendNotification(message: string) {
	return new Promise((resolve, reject) => {
		const socket = net.createConnection("/tmp/cycweb.sock");
		socket.on("connect", () => {
			socket.end(`${message}\n`);
		});
		socket.on("error", reject);
		socket.on("close", resolve);
	})
}

import "./index.js";
import { ADMIN_KEY, USER_KEY } from "./auth.js";

sendNotification(`관리자 인증 키는 ${ADMIN_KEY}, 일반 사용자 인증 키는 ${USER_KEY}입니다.`);
