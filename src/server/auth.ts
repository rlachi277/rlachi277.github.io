import crypto from "node:crypto";
import express, { Request, Response, NextFunction } from "express";

import log from "./log.js";

function adminKeyLetter() {
	const first = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // 전부
	const mid = [0, 1, 20]; // ㅏㅐㅣ
	const end = [0, 1, 4, 7, 16, 21]; // 없음 + ㄱㄴㄷㅁㅇ
	const f = crypto.randomInt(first.length);
	const m = crypto.randomInt(mid.length);
	const e = crypto.randomInt(end.length);
	return String.fromCharCode(0xAC00 + 21*28*first[f] + 28*mid[m] + end[e]);
}

export const ADMIN_KEY = `${adminKeyLetter()}${adminKeyLetter()}${adminKeyLetter()}${adminKeyLetter()}`
export const USER_KEY = crypto.randomInt(0, 10000).toString().padStart(4, "0");

log(`관리자 인증 키는 ${ADMIN_KEY}, 일반 사용자 인증 키는 ${USER_KEY}입니다.`);

const router = express.Router();
export default router;

function getKey(cookie: string | undefined) {
	if (cookie === undefined) return null;
	for (const s of cookie.split(';')) {
		const pair = s.split('=');
		if (pair.length !== 2) continue;
		if (pair[0].trim() !== 'Key') continue;
		return decodeURIComponent(pair[1].trim());
	}
	return null;
}

router.get('/', (req, res) => {
	const key = getKey(req.headers.cookie);
	sendAuthResult(res, key);
});

router.post('/', (req, res) => {
	const key = req.body;
	res.setHeader("Set-Cookie", `Key=${encodeURIComponent(key)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400;`);
	sendAuthResult(res, key);
});

function sendAuthResult(res: Response, key: string | null) {
	if (key === ADMIN_KEY) {
		res.status(200).json({role: "admin"});
	} else if (key === USER_KEY) {
		res.status(200).json({role: "user"});
	} else {
		res.setHeader("Set-Cookie", `Key=no; HttpOnly; SameSite=Lax; Path=/; Max-Age=0;`);
		res.status(200).json({role: "none"});
	}
}

export function role(required: "user" | "admin", html: boolean = false): <P>(
	req: Request<P>,
	res: Response,
	next: NextFunction
) => void {
	return (req, res, next) => {
		const key = getKey(req.headers.cookie);
		const role = (key === ADMIN_KEY) ? 2 : ((key === USER_KEY) ? 1 : 0);
		if (role === 0) {
			res.status(401);
			if (html) res.render('401');
			else res.json({error: "인증 키 필요"});
			return;
		} else if (role === 1 && required === "admin") {
			if (html) res.render('403');
			else res.status(403).json({error: "관리자 인증 키 필요"});
			return;
		}
		next();
	}
}