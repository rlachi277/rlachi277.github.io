import { k2e } from "../k2e.js";
import { $, d$n } from "../query.js";

const code: Record<string, [number,number]> = {
	"1": [0,0],
	"!": [10,0],
	"2": [20,0],
	"3": [30,0],
	"4": [40,0],
	"5": [50,0],
	"6": [60,0],
	"7": [70,0],
	"8": [80,0],
	"9": [90,0],
	"0": [100,0],

	"q": [5,20],
	"w": [15,20],
	"e": [25,20],
	"r": [35,20],
	"t": [45,20],
	"y": [55,20],
	"u": [65,20],
	"i": [75,20],
	"o": [85,20],
	"p": [95,20],

	"a": [10,40],
	"s": [20,40],
	"d": [30,40],
	"f": [40,40],
	"g": [50,40],
	"h": [60,40],
	"j": [70,40],
	"k": [80,40],
	"l": [90,40],

	"z": [15,60],
	"x": [25,60],
	"c": [35,60],
	"v": [45,60],
	"b": [55,60],
	"n": [65,60],
	"m": [75,60],
	",": [85,60],
	".": [95,60],
	"/": [105,60]
};

const advanceY = 70, advanceX = 105;

/*
function refresh() {
	oldcode = [];
	update();
}
*/

let rand = {cur: 0, reset: function () {this.cur = 0}, next: function () {let ocur = this.cur; this.cur = (this.cur*3+7)%255; return ocur;}};

function to_code(str: string) {
	return k2e(str).toLowerCase().replaceAll("!", "1").replaceAll("<", ",").replaceAll(">", ".").replaceAll("?", "/");
}

function update() {
	if (!kill) rand.reset();
	const txt = to_code((d$n("code") as HTMLInputElement).value) + "\n";
	let cury = 0, curx = 0;
	let maxx = 0, maxy = 0;
	let wminy = 60, wmaxy = 0;
	let lines = [], curline = "", curword = [], sep = false;
	console.log(txt);
	for (const e of txt) {
		if (e === "\n") sep = true;
		if (e === " " || e === "\n") {
			if (e === " " && (wminy === 60 && wmaxy === 0)) continue;
			if (wminy === wmaxy) {
				if (wminy === 0) wmaxy = 60;
				else if (wminy === 20) wmaxy = 40;
				else if (wminy === 40) { wminy = 30; wmaxy = 50;}
				else if (wminy === 60) wminy = 40;
			} else if (wminy === 0) wmaxy = 60;
			for (const e of curword) {
				const wcx = 10 + curx + e[0];
				const wcy = 10 + cury + e[1] - wminy;
				if (maxx < wcx) maxx = wcx;
				if (maxy < wcy) maxy = wcy;
				curline += ` ${wcx + (rand.next()-127.5)*(5/128)},${wcy + (rand.next()-127.5)*(5/128)}`;
			}
			cury += (advanceY - wminy - (60 - wmaxy));
			curword = [];
			wminy = 60, wmaxy = 0;
			if (e === "\n") {
				cury = 0;
				curx += advanceX;
			}
			if (sep) {
				lines.push(curline.trim());
				curline = "";
			}
			continue;
		}
		const curcode = code[e];
		if (e === "," || e === "." || e === "?" || e === "!" || e === ";") sep = true;
		else sep = false;
		if (curcode === undefined) continue;
		let wcx = curcode[0];
		let wcy = curcode[1];
		curword.push([wcx, wcy]);
		if (wcy < wminy) wminy = wcy;
		if (wcy > wmaxy) wmaxy = wcy;
	}
	const result = document.createDocumentFragment();
	for (const e of lines) {
		const cur = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
		cur.setAttribute("points", e);
		result.append(cur);
	}
	d$n("result").replaceChildren(result);
	d$n("result").setAttribute("width", `${maxx + 10}`);
	d$n("result").setAttribute("height", `${maxy + 10}`);
	d$n("result").setAttribute("viewbox", `0 0 ${maxx+10} ${maxy+10}`);
}

async function exportSVG() {
	const svg = d$n("result").cloneNode(true) as SVGSVGElement;
	svg.removeAttribute("id");
	svg.insertAdjacentHTML("afterbegin", "<defs><style>polyline {stroke:black;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;fill:none;}</style></defs>");
	const svgStr = (new XMLSerializer()).serializeToString(svg);
	const blob = new Blob([svgStr], { type: "image/svg+xml" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "output.svg";
	a.click();

	URL.revokeObjectURL(url);
}

let kill: NodeJS.Timeout | null = null;
function toggleAnimate() {
	if (kill === null) {
		let curr = 0;
		kill = setInterval(() => {
			rand.cur = curr;
			curr = (curr+1) % 256;
		}, 100);
	} else {
		clearInterval(kill);
	}
}
export function setup() {
	$("#code").on("input", update);
	$("#animate").on("click", toggleAnimate);
	$("#export").on("click", exportSVG);
}
