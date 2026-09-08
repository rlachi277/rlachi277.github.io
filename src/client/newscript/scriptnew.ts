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
	rand.reset();
	const txt = to_code((d$n("code") as HTMLInputElement).value) + "\n";
	let cury = 0, curx = 0;
	let maxx = 0, maxy = 0;
	let wminy = 60, wmaxy = 0;
	let lines = [], curline = "", curword = [], ignore = false, sep = false;
	console.log(txt);
	for (const e of txt) {
		if (e === "\n") sep = true;
		if (e === " " || e === "\n") {
			if (ignore && e === " ") continue;
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
			ignore = true;
			continue;
		}
		ignore = false;
		const curcode = code[e];
		if (e === "," || e === "." || e === "?" || e === "!" || e === ";") sep = true;
		if (curcode === undefined) continue;
		else sep = false;
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

// I didn't want to learn SVG to do this
// so I just chatgpt'd it
async function exportSVG() {
	const cellSize = 36;
	const svgUnit = 60;
	const scale = cellSize / svgUnit;
	const half = cellSize / 2;

	const stroke = 11;
	const scaledStroke = stroke * scale;

	const layers = ["center", "edgeh", "edgev", "corner"];

	let allCells: {el: HTMLElement, layer: string}[] = [];
	layers.forEach(layer => {
		$(`#${layer} .cell`).each(function (e) {
			allCells.push({
				el: e,
				layer
			});
		});
	});

	if (allCells.length === 0) {
		alert("없는뎁쇼");
		return;
	}

	let minRow = Infinity, minCol = Infinity;
	let maxRow = -Infinity, maxCol = -Infinity;

	allCells.forEach(({ el, layer }) => {
		if (layer != "center") return;
		let r = parseInt(el.getAttribute("data-row") as string);
		let c = parseInt(el.getAttribute("data-col") as string);
		minRow = Math.min(minRow, r);
		minCol = Math.min(minCol, c);
		maxRow = Math.max(maxRow, r);
		maxCol = Math.max(maxCol, c);
	});

	const width = (maxCol - minCol + 1) * cellSize;
	const height = (maxRow - minRow + 1) * cellSize;

	const svgCache = new Map();
	async function loadSVG(src: string) {
		if (svgCache.has(src)) return svgCache.get(src);
		const res = await fetch(src);
		const text = await res.text();
		svgCache.set(src, text);
		return text;
	}

	const snap = (n: number) => Math.round(n * 1000) / 1000;
	const key = (x: number, y: number) => `${x},${y}`;
	function edgeKey(x1: number, y1: number, x2: number, y2: number) {
		return (x1 < x2 || (x1 === x2 && y1 < y2))
			? `${x1},${y1}|${x2},${y2}`
			: `${x2},${y2}|${x1},${y1}`;
	}

	let segments: [number,number,number,number][] = [];
	let dots: [number,number,number][] = [];
	let circles: [number,number,number][] = [];
	let endpoints = new Set();

	for (const { el, layer } of allCells) {
		const row = parseInt(el.getAttribute("data-row") as string);
		const col = parseInt(el.getAttribute("data-col") as string);

		let baseX = (col - minCol) * cellSize;
		let baseY = (row - minRow) * cellSize;

		if (layer === "edgeh") baseX -= half;
		if (layer === "edgev") baseY -= half;
		if (layer === "corner") {
			baseX -= half;
			baseY -= half;
		}

		const imgs = $("img", el);

		for (let img of imgs.list) {
			const src = img.getAttribute("src") as string;

			try {
				const text = await loadSVG(src);
				const doc = new DOMParser().parseFromString(text, "image/svg+xml");
				const root = doc.documentElement;

				root.querySelectorAll("line").forEach(line => {
					const x1 = snap(parseFloat(line.getAttribute("x1") as string) * scale + baseX);
					const y1 = snap(parseFloat(line.getAttribute("y1") as string) * scale + baseY);
					const x2 = snap(parseFloat(line.getAttribute("x2") as string) * scale + baseX);
					const y2 = snap(parseFloat(line.getAttribute("y2") as string) * scale + baseY);

					segments.push([x1, y1, x2, y2]);
					endpoints.add(key(x1, y1));
					endpoints.add(key(x2, y2));
				});

				root.querySelectorAll("circle").forEach(c => {
					const cx = snap(parseFloat(c.getAttribute("cx") as string) * scale + baseX);
					const cy = snap(parseFloat(c.getAttribute("cy") as string) * scale + baseY);
					const r = parseFloat(c.getAttribute("r") as string) * scale;
					const sw = parseFloat(c.getAttribute("stroke-width") || "0");

					if (sw === 0) dots.push([cx, cy, r]);
					else circles.push([cx, cy, r]);
				});

			} catch (e) {
				console.warn("Failed:", src, e);
			}
		}
	}

	const filteredDots = dots.filter(([cx, cy]) => {
		return !endpoints.has(key(cx, cy));
	});

	let map = new Map();

	function addEdge(x1: number, y1: number, x2: number, y2: number) {
		const k1 = key(x1, y1);
		const k2 = key(x2, y2);

		if (!map.has(k1)) map.set(k1, []);
		if (!map.has(k2)) map.set(k2, []);

		map.get(k1).push([x2, y2]);
		map.get(k2).push([x1, y1]);
	}

	segments.forEach(([x1, y1, x2, y2]) => addEdge(x1, y1, x2, y2));

	let usedEdges = new Set();
	let chains: [number,number][][] = [];

	for (let [startKey, neighbors] of map.entries()) {
		let [sx, sy] = startKey.split(",").map(Number);

		for (let [nx, ny] of neighbors) {
			const ek = edgeKey(sx, sy, nx, ny);
			if (usedEdges.has(ek)) continue;

			let chain: [number,number][] = [[sx, sy], [nx, ny]];
			usedEdges.add(ek);

			let prev = [sx, sy];
			let curr = [nx, ny];

			while (true) {
				let nextCandidates = (map.get(key(curr[0], curr[1])) || [])
					.filter(([x, y]: [number,number]) => !(x === prev[0] && y === prev[1]));

				let next = nextCandidates.find(([x, y]: [number,number]) => {
					return !usedEdges.has(edgeKey(curr[0], curr[1], x, y));
				});

				if (!next) break;

				chain.push(next);
				usedEdges.add(edgeKey(curr[0], curr[1], next[0], next[1]));

				prev = curr;
				curr = next;
			}

			prev = [nx, ny];
			curr = [sx, sy];

			while (true) {
				let nextCandidates = (map.get(key(curr[0], curr[1])) || [])
					.filter(([x, y]: [number,number]) => !(x === prev[0] && y === prev[1]));

				let next = nextCandidates.find(([x, y]: [number,number]) => {
					return !usedEdges.has(edgeKey(curr[0], curr[1], x, y));
				});

				if (!next) break;

				chain.unshift(next);
				usedEdges.add(edgeKey(curr[0], curr[1], next[0], next[1]));

				prev = curr;
				curr = next;
			}

			chains.push(chain);
		}
	}

	function isCollinear(a: [number,number], b: [number,number], c: [number,number]) {
		const [x1, y1] = a;
		const [x2, y2] = b;
		const [x3, y3] = c;
		return (x2 - x1) * (y3 - y2) === (y2 - y1) * (x3 - x2);
	}

	function simplify(chain: [number,number][]) {
		if (chain.length <= 2) return chain;

		let result = [chain[0]];

		for (let i = 1; i < chain.length - 1; i++) {
			let prev = result[result.length - 1];
			let curr = chain[i];
			let next = chain[i + 1];

			if (!isCollinear(prev, curr, next)) {
				result.push(curr);
			}
		}

		result.push(chain[chain.length - 1]);
		return result;
	}

	let strokePath = "";

	chains.forEach(chain => {
		const simp = simplify(chain);

		strokePath += `M ${simp[0][0]} ${simp[0][1]} `;
		for (let i = 1; i < simp.length; i++) {
			strokePath += `L ${simp[i][0]} ${simp[i][1]} `;
		}
	});

	circles.forEach(([cx, cy, r]) => {
		strokePath += `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`;
	});

	let fillPath = "";

	filteredDots.forEach(([cx, cy, r]) => {
		fillPath += `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`;
	});

	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");

	svg.setAttribute("xmlns", svgNS);
	svg.setAttribute("width", (width+24).toString());
	svg.setAttribute("height", (height+24).toString());
	svg.setAttribute("viewBox", `-12 -12 ${width+24} ${height+24}`);

	const strokeEl = document.createElementNS(svgNS, "path");
	strokeEl.setAttribute("d", strokePath.trim());
	strokeEl.setAttribute("fill", "none");
	strokeEl.setAttribute("stroke", "black");
	strokeEl.setAttribute("stroke-width", scaledStroke.toString());
	strokeEl.setAttribute("stroke-linecap", "round");
	strokeEl.setAttribute("stroke-linejoin", "round");

	const fillEl = document.createElementNS(svgNS, "path");
	fillEl.setAttribute("d", fillPath.trim());
	fillEl.setAttribute("fill", "black");
	fillEl.setAttribute("stroke", "none");

	// const xtx = document.createElementNS(svgNS, "polygon")
	// xtx.setAttribute("points", `-99999999,-99999999 9999999,-9999999 99999999,99999999 -99999999,9999999`);
	// xtx.setAttribute("fill", "gray");

	// svg.appendChild(xtx);
	svg.appendChild(strokeEl);
	svg.appendChild(fillEl);

	const svgStr = new XMLSerializer().serializeToString(svg);
	const blob = new Blob([svgStr], { type: "image/svg+xml" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "output.svg";
	a.click();

	URL.revokeObjectURL(url);
}

export function setup() {
	$("#code").on("input", update);
	$("#export").on("click", exportSVG);
}
