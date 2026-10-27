import { $, d$n } from "../query.js";

const alphanum = 4550; // 5 * 13 * 70
const hangul = alphanum + 11172;

function to_code(str: string) {
	function alpha_to_code(ch: number) {
		if ('0'.charCodeAt(0) <= ch && ch <= '9'.charCodeAt(0)) return 1 + (ch - '0'.charCodeAt(0));
		if ('a'.charCodeAt(0) <= ch && ch <= 'z'.charCodeAt(0)) return 11 + (ch - 'a'.charCodeAt(0));
		if ('A'.charCodeAt(0) <= ch && ch <= 'Z'.charCodeAt(0)) return 37 + (ch - 'A'.charCodeAt(0));
		return 63;
	}
	const result = [];
	let prev = -1;
	for (const ch of str) {
		if (/^[\s.,?!]$/.test(ch)) continue;
		let c = ch.charCodeAt(0);
		let flag = -1;
		if (0x1100 <= c && c <= 0x1112) {
			c -= 0x1100;
			flag = hangul + c;
		} else if (0x1161 <= c && c <= 0x1175) {
			c -= 0x1161;
			flag = hangul + 19 + c;
		} else if (0x11a8 <= c && c <= 0x11c2) {
			c -= 0x11a7;
			flag = hangul + 40 + c;
		} else if (0x3131 <= c && c <= 0x314e) {
			c -= 0x3130;
			flag = hangul + 68 + c;
		} else if (0x314f <= c && c <= 0x3163) {
			c -= 0x314f;
			flag = hangul + 19 + c;
		} else if (0xac00 <= c && c <= 0xd7a3) {
			c -= 0xac00;
			flag = alphanum + c;
		}
		if (flag !== -1) {
			if (prev !== -1) {
				result.push(prev * 64);
				prev = -1;
			}
			result.push(flag);
		} else {
			if (prev === -1) {
				prev = alpha_to_code(c);
				continue;
			}
			result.push(prev * 64 + alpha_to_code(c));
			prev = -1;
			continue;
		}
	}
	if (prev !== -1) {
		result.push(prev * 64);
	}
	return result;
}

const mashes = {
	front: ["qwer", "qwet", "qweg", "qwef", "awet", "awer", "aweg", "awef", "awev", "asdg", "asdf", "asdb", "asdv", "zsdg", "zsdf", "zsdb", "zsdv", "zxcv"],
	back: ["uiop", "yiop", "hiop", "jiop", "yuil", "tuil", "guil", "huil", "hjkl", "gjkl", "bjkl", "njkl", "bhjk"]
} as const;

const binom = [
	[1],
	[1, 1],
	[1, 2, 1],
	[1, 3, 3, 1],
	[1, 4, 6, 4, 1],
	[1, 5, 10, 10, 5, 1],
	[1, 6, 15, 20, 15, 6, 1],
	[1, 7, 21, 35, 35, 21, 7, 1]
];

function update() {
	let txt = to_code((d$n("code") as HTMLInputElement).value);
	console.log(txt);
	let result = "";
	for (const e of txt) {
		const front = mashes['front'][(e-e%910)/910];
		const back = mashes['back'][(e%910-e%70)/70];
		let order = e%70;
		console.log(`${front} ${back} ${order}`);
		let fidx = 0, bidx = 0;
		for (let i=0; i<8; i++) {
			const comp = (fidx === 4) ? 0 : binom[7-i][3-fidx]; // thx ChatGPT
			if (order >= comp) {
				order -= comp;
				result += back[bidx++];
			} else {
				result += front[fidx++];
			}
		}
	}
	d$n("result-container").textContent = result;
}

export function setup() {
	$("#code").on("input", update);
}
