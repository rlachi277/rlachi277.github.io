import { $, d$n, q$ } from "../query.js";

const code: Record<string, string[]> = {
	A: ["line35"],
	B: ["line35", "dot6"],
	C: ["line35", "dot7"],
	D: ["line35", "dot8"],
	E: ["line35", "dot0"],
	F: ["line35", "dot0", "dot6"],
	G: ["line35", "dot0", "dot7"],
	H: ["line35", "dot0", "dot8"],
	I: ["line35", "dot1"],
	J: ["line35", "dot1", "dot6"],
	K: ["line35", "dot1", "dot7"],
	L: ["line35", "dot1", "dot8"],
	M: ["line35", "dot2"],
	N: ["line35", "dot2", "dot6"],
	O: ["line35", "dot2", "dot7"],
	P: ["line35", "dot2", "dot8"],

	Q: ["line26"],
	R: ["line26", "dot78"],
	S: ["line26", "dot8"],
	T: ["line26", "dot58"],
	U: ["line26", "dot30"],
	V: ["line26", "dot30", "dot78"],
	W: ["line26", "dot30", "dot8"],
	X: ["line26", "dot30", "dot58"],
	Y: ["line26", "dot0"],
	Z: ["line26", "dot0", "dot78"],
	a: ["line26", "dot0", "dot8"],
	b: ["line26", "dot0", "dot58"],
	c: ["line26", "dot10"],
	d: ["line26", "dot10", "dot78"],
	e: ["line26", "dot10", "dot8"],
	f: ["line26", "dot10", "dot58"],

	g: ["line08"],
	h: ["line08", "dot36"],
	i: ["line08", "dot6"],
	j: ["line08", "dot76"],
	k: ["line08", "dot12"],
	l: ["line08", "dot12", "dot36"],
	m: ["line08", "dot12", "dot6"],
	n: ["line08", "dot12", "dot76"],
	o: ["line08", "dot2"],
	p: ["line08", "dot2", "dot36"],
	q: ["line08", "dot2", "dot6"],
	r: ["line08", "dot2", "dot76"],
	s: ["line08", "dot52"],
	t: ["line08", "dot52", "dot36"],
	u: ["line08", "dot52", "dot6"],
	v: ["line08", "dot52", "dot76"],

	w: ["line17"],
	x: ["line17", "dot2"],
	y: ["line17", "dot5"],
	z: ["line17", "dot8"],
	0: ["line17", "dot0"],
	1: ["line17", "dot0", "dot2"],
	2: ["line17", "dot0", "dot5"],
	3: ["line17", "dot0", "dot8"],
	4: ["line17", "dot3"],
	5: ["line17", "dot3", "dot2"],
	6: ["line17", "dot3", "dot5"],
	7: ["line17", "dot3", "dot8"],
	8: ["line17", "dot6"],
	9: ["line17", "dot6", "dot2"],
	"+": ["line17", "dot6", "dot5"],
	"/": ["line17", "dot6", "dot8"],
	"-": ["line17", "dot6", "dot5"],
	"_": ["line17", "dot6", "dot8"]
};

/*
function refresh() {
	oldcode = [];
	update();
}
*/

// thank you mdn web docs
const TE = new TextEncoder();
// const TD = new TextDecoder();

/*
function base64ToBytes(base64: string) {
	const binString = window.atob(base64);
	return TD.decode(Uint8Array.from(binString, (m) => (m.codePointAt(0) as number)));
}
*/

let rand = {cur: 0, reset: function () {this.cur = 0}, next: function () {let ocur = this.cur; this.cur = (this.cur*3+7)%255; return ocur;}}

function bytesToBase64(str: string) {
	const bytes = TE.encode(str);
	rand.reset();
	const binString = Array.from(bytes, (x, _) => String.fromCodePoint((x+rand.next())%256)).join("");
	return window.btoa(binString);
}

function to_code(str: string) {
	let res: string[][] = []
	for (let ch of bytesToBase64(str)) {
		res.push(code[ch] ?? ["!"]);
	}
	return res;
}

let oldcode: string[][] = [];
let curr = 0, curc = 0;
let rows = 4, cols = window.getComputedStyle(d$n("center")).gridTemplateColumns.split(' ').length;
function update() {
	let txt = to_code((d$n("code") as HTMLInputElement).value);
	let common = 0;
	for (let i=0; i<Math.min(oldcode.length, txt.length); i++) {
		if (JSON.stringify(oldcode[i]) != JSON.stringify(txt[i])) break;
		common++;
	}
	console.log(common+" + \""+JSON.stringify(txt.slice(common))+"\"");
	oldcode = txt;
	txt = txt.slice(common);
	$(`#center .cell:nth-child(n+${common+1})`).remove();
	let last = $(`#center .cell:last-child`);
	if (last.exists) {
		curc = parseInt(last.attr("data-col") as string);
		curr = parseInt(last.attr("data-row") as string);
		curr++;
		if (curr % rows === 0) {
			curr -= rows;
			curc += 1;
			if (curc >= cols) {
				curr += rows;
				curc = 0;
			}
		}
	} else curc = curr = 0;
	for (const e of txt) {
		if (e.length === 0) {
			addImage(curr, curc, "!");
			removeImage(curr, curc, "!");
		}
		for (const ee of e) {
			addImage(curr, curc, ee);
		}
		curr++;
		if (curr % rows === 0) {
			curr -= rows;
			curc += 1;
			if (curc >= cols) {
				curr += rows;
				curc = 0;
			}
		}
	}
}


const layers = {
	center: $("#center"),
	edgeh: $("#edgeh"),
	edgev: $("#edgev"),
	corner: $("#corner")
};

function addImage(row: number, col: number, src: string, layer: "center" | "edgeh" | "edgev" | "corner" = "center") {
	const grid = layers[layer].list[0];
	
	let cell = $(`[data-row="${row}"][data-col="${col}"]`, grid).list[0];
	
	if (cell === undefined) {
		cell = document.createElement("div");
		cell.classList.add("cell");
		cell.setAttribute("style", `grid-row: ${row+1}; grid-column: ${col+1};`);
		cell.setAttribute("data-row", row.toString());
		cell.setAttribute("data-col", col.toString());
		grid.append(cell);
	}
	return addToCell(cell, src);
}

function removeImage(row: number, col: number, src: string, layer: "center" | "edgeh" | "edgev" | "corner" = "center") {
	const grid = layers[layer].list[0];
	
	let cell = $(`[data-row="${row}"][data-col="${col}"]`, grid).list[0];
	
	if (cell === undefined) return false;
	return removeFromCell(cell, src);
}

function addToCell(cell: HTMLElement | null, src: string) {
	if (cell === null) return;
	if (isInCell(cell, src)) return false;
	const img = document.createElement("img");
	img.setAttribute("src",`/assets/newscript/${src}.svg`);
	cell.append(img);
	cell.setAttribute(`data-${src}`, "1");
	return true;
}

function removeFromCell(cell: HTMLElement | null, src: string) {
	if (cell === null) return;
	if (!isInCell(cell, src)) return false;
	$(`[src="/assets/newscript/${src}.svg"]`, cell).remove();
	cell.removeAttribute(`data-${src}`);
	return true;
}

function isInCell(cell: HTMLElement | null, src: string) {
	if (cell === null) return false;
	return cell.getAttribute(`data-${src}`) !== null;
}

function offset(cell: HTMLElement, r: number, c: number, layer: "center" | "edgeh" | "edgev" | "corner" = "center") {
	let curr = parseInt(cell.getAttribute("data-row") as string);
	let curc = parseInt(cell.getAttribute("data-col") as string);
	return q$(`#${layer} .cell[data-row="${curr+r}"][data-col="${curc+c}"]`);
}

type Corner = 0 | 2 | 6 | 8;
type CornerOrOuter = Corner | 'u' | 'd' | 'l' | 'r';
type Edge = 1 | 3 | 5 | 7;
type Position = Corner | Edge;

function decorate() {
	$("#code").attr("disabled", "true");

	function hasDot(e: HTMLElement | null, d: Position, r: boolean = false) {
		if (e === null) return false;
		let ans = isInCell(e, `dot${d}`);
		switch (d) {
		case 0: ans ||= (isInCell(e, "dot10") || isInCell(e, "dot30") || isInCell(e, "line08") || isInCell(offset(e, 0, 0, "edgeh"), "edgeh02") || isInCell(offset(e, 0, 0, "edgev"), "edgev06")); break;
		case 2: ans ||= (isInCell(e, "dot12") || isInCell(e, "dot52") || isInCell(e, "line26") || isInCell(offset(e, 0, 1, "edgeh"), "edgeh02") || isInCell(offset(e, 0, 0, "edgev"), "edgev28")); break;
		case 6: ans ||= (isInCell(e, "dot76") || isInCell(e, "dot36") || isInCell(e, "line26") || isInCell(offset(e, 0, 0, "edgeh"), "edgeh68") || isInCell(offset(e, 1, 0, "edgev"), "edgev06")); break;
		case 8: ans ||= (isInCell(e, "dot78") || isInCell(e, "dot58") || isInCell(e, "line08") || isInCell(offset(e, 0, 1, "edgeh"), "edgeh68") || isInCell(offset(e, 1, 0, "edgev"), "edgev28")); break;
		}
		if (r && ans) removeFromCell(e, `dot${d}`);
		return ans;
	}
	function connectCorners(e: HTMLElement | null, c1: CornerOrOuter, c2: CornerOrOuter | null = null) {
		if (e === null) return;
		let r = parseInt(e.getAttribute("data-row") as string), c = parseInt(e.getAttribute("data-col") as string);
		if (c1 === 6 || c1 === 8) r++;
		if (c1 === 2 || c1 === 8) c++;
		addImage(r, c, `corner${c1}c`, "corner");
		if (c2 != null) addImage(r, c, `corner${c2}c`, "corner");
	}
	function connectEdges(e: HTMLElement, c1: Position, c2: Position) {
		let r = parseInt(e.getAttribute("data-row") as string), c = parseInt(e.getAttribute("data-col") as string);
		let a = c1, b = c2;
		if (a > b) { let c = a; a = b; b = c; }
		if ((b - a) % 3 == 0) {
			if (c1 === 6 || c1 === 7 || c1 === 8) r++;
			addImage(r, c, `edgev${a}${b}`, "edgev");
		} else {
			if (c1 === 2 || c1 === 5 || c1 === 8) c++;
			addImage(r, c, `edgeh${a}${b}`, "edgeh");
		}
	}
	function connectUp(e: HTMLElement | null, o: HTMLElement | null) {
		if (e === null || o === null) return;
		connectEdges(e, 1, 7);
		if (hasDot(e, 0) && hasDot(o, 6)) {
			removeFromCell(e, "dot0"); removeFromCell(o, "dot6");
			connectEdges(e, 0, 6);
		}
		if (hasDot(e, 2) && hasDot(o, 8)) {
			removeFromCell(e, "dot2"); removeFromCell(o, "dot8");
			connectEdges(e, 2, 8);
		}
	}
	function connectLeft(e: HTMLElement | null, o: HTMLElement | null) {
		if (e === null || o === null) return;
		connectEdges(e, 3, 5);
		if (hasDot(e, 0) && hasDot(o, 2)) {
			removeFromCell(e, "dot0"); removeFromCell(o, "dot2");
			connectEdges(e, 0, 2);
		}
		if (hasDot(e, 6) && hasDot(o, 8)) {
			removeFromCell(e, "dot6"); removeFromCell(o, "dot8");
			connectEdges(e, 6, 8);
		}
	}
	function simplifyCorner(e: HTMLElement, c1: Corner, c2: Corner) {
		if (c1 > c2) { let t = c1; c1 = c2; c2 = t; }
		removeFromCell(e, `corner${c1}c`); removeFromCell(e, `corner${c2}c`);
		addToCell(e, `corner${c1}${c2}`);
	}
	// 대각선 90도 점 잇기
	for (let e of $("#center .cell").list) {
		if (isInCell(e, "line08")) {
			let o = offset(e, 0, 1);
			if (isInCell(o, "line26")) {
				removeFromCell(e, "dot2"); removeFromCell(o, "dot0");
				connectEdges(e, 2, 0);
			}
			o = offset(e, 1, 0);
			if (isInCell(o, "line26")) {
				removeFromCell(e, "dot6"); removeFromCell(o, "dot0");
				connectEdges(e, 6, 0);
			}
		} else if (isInCell(e, "line26")) {
			let o = offset(e, 0, 1);
			if (isInCell(o, "line08")) {
				removeFromCell(e, "dot8"); removeFromCell(o, "dot6");
				connectEdges(e, 8, 6);
			}
			o = offset(e, 1, 0);
			if (isInCell(o, "line08")) {
				removeFromCell(e, "dot8"); removeFromCell(o, "dot2");
				connectEdges(e, 8, 2);
			}
		}
	}
	// 직선 90도 잇기
	for (let e of $("#center .cell").list) {
		if (isInCell(e, "line17")) {
			let o = offset(e, -1, 0);
			if (isInCell(o, "line35") && !isInCell(o, "ligc1")) {
				addToCell(o, "ligc7");
				if (hasDot(o, 7, true)) addToCell(o, "cut7");
				connectUp(e, o);
			}
			o = offset(e, 0, -1);
			if (isInCell(o, "line35")) {
				addToCell(e, "ligc3");
				if (hasDot(e, 3, true)) addToCell(e, "cut3");
				connectLeft(e, o);
			}
		} else if (isInCell(e, "line35")) {
			let o = offset(e, 0, -1);
			if (isInCell(o, "line17") && !isInCell(o, "ligc3")) {
				addToCell(o, "ligc5");
				if (hasDot(o, 5, true)) addToCell(o, "cut5");
				connectLeft(e, o);
			}
			o = offset(e, -1, 0);
			if (isInCell(o, "line17")) {
				addToCell(e, "ligc1");
				if (hasDot(e, 1, true)) addToCell(e, "cut1");
				connectUp(e, o);
			}
		}
	}
	// 직선 180도 잇기
	for (let e of $("#center .cell").list) {
		// let curr = parseInt(e.getAttribute("data-row") as string);
		// let curc = parseInt(e.getAttribute("data-col") as string);
		if (isInCell(e, "line17")) {
			let o = offset(e, -1, 0);
			if (isInCell(o, "line17")) {
				connectUp(e, o);
				// 점이 없을 수도 있게 되면서 이걸 켜면 모호해짐
				// if (removeFromCell(e, "dot0") || removeFromCell(o, "dot6")) addImage(curr, curc, "edgevle", "edgev");
				// if (removeFromCell(e, "dot2") || removeFromCell(o, "dot8")) addImage(curr, curc, "edgevre", "edgev");
			}
		} else if (isInCell(e, "line35")) {
			let o = offset(e, 0, -1);
			if (isInCell(o, "line35")) {
				connectLeft(e, o);
				// 점이 없을 수도 있게 되면서 이걸 켜면 모호해짐
				// if (removeFromCell(e, "dot0") || removeFromCell(o, "dot2")) addImage(curr, curc, "edgehue", "edgeh");
				// if (removeFromCell(e, "dot6") || removeFromCell(o, "dot8")) addImage(curr, curc, "edgehde", "edgeh");
			}
		}
	}
	// 직선 돌기 잇기(세로)
	for (let e of $("#edgeh .cell").list) {
		if (isInCell(e, "edgehue")) {
			let o = offset(e, -1, -1, "center");
			if (hasDot(o, 8, true)) connectCorners(o, 8, 'u');
			o = offset(e, -1, 0, "center");
			if (hasDot(o, 6, true)) connectCorners(o, 6, 'u');
		}
		if (isInCell(e, "edgehde")) {
			let o = offset(e, 1, -1, "center");
			if (hasDot(o, 2, true)) connectCorners(o, 2, 'd');
			o = offset(e, 1, 0, "center");
			if (hasDot(o, 0, true)) connectCorners(o, 0, 'd');
		}
	}
	// 직선 돌기 잇기(가로)
	for (let e of $("#edgev .cell").list) {
		if (isInCell(e, "edgevle")) {
			let o = offset(e, -1, -1, "center");
			if (hasDot(o, 8, true)) connectCorners(o, 8, 'l');
			o = offset(e, 0, -1, "center");
			if (hasDot(o, 2, true)) connectCorners(o, 2, 'l');
		}
		if (isInCell(e, "edgevre")) {
			let o = offset(e, -1, 1, "center");
			if (hasDot(o, 6, true)) connectCorners(o, 6, 'r');
			o = offset(e, 0, 1, "center");
			if (hasDot(o, 0, true)) connectCorners(o, 0, 'r');
		}
	}
	// 대각선 잇기
	for (let e of $("#center .cell").list) {
		if (isInCell(e, "line08")) {
			if (hasDot(offset(e, -1, -1), 8, true)) connectCorners(e, 0, 8);
			if (hasDot(offset(e, -1, 0), 6, true)) connectCorners(e, 0, 6);
			if (hasDot(offset(e, 0, -1), 2, true)) connectCorners(e, 0, 2);
			if (hasDot(offset(e, 1, 1), 0, true)) connectCorners(e, 8, 0);
			if (hasDot(offset(e, 1, 0), 2, true)) connectCorners(e, 8, 2);
			if (hasDot(offset(e, 0, 1), 6, true)) connectCorners(e, 8, 6);
		} else if (isInCell(e, "line26")) {
			if (hasDot(offset(e, -1, 1), 6, true)) connectCorners(e, 2, 6);
			if (hasDot(offset(e, -1, 0), 8, true)) connectCorners(e, 2, 8);
			if (hasDot(offset(e, 0, 1), 0, true)) connectCorners(e, 2, 0);
			if (hasDot(offset(e, 1, -1), 2, true)) connectCorners(e, 6, 2);
			if (hasDot(offset(e, 1, 0), 0, true)) connectCorners(e, 6, 0);
			if (hasDot(offset(e, 0, -1), 8, true)) connectCorners(e, 6, 8);
		}
	}
	// 선 정리
	for (let e of $("#corner .cell").list) {
		let c0 = isInCell(e, "corner0c");
		let c2 = isInCell(e, "corner2c");
		let c6 = isInCell(e, "corner6c");
		let c8 = isInCell(e, "corner8c");
		let chv = isInCell(e, "cornerdc") || isInCell(e, "cornerlc") || isInCell(e, "cornerrc") || isInCell(e, "corneruc");
		if (c0 && c2) {
			removeFromCell(offset(e, 0, 0, "edgeh"), "edgeh02");
			if (c8 || c6 || chv) removeFromCell(e, "corner02");
			else simplifyCorner(e, 0, 2);
		}
		if (c2 && c8) {
			removeFromCell(offset(e, 0, -1, "edgev"), "edgev28");
			if (c6 || c0 || chv) removeFromCell(e, "corner28");
			else simplifyCorner(e, 2, 8);
		}
		if (c8 && c6) {
			removeFromCell(offset(e, -1, 0, "edgeh"), "edgeh68");
			if (c0 || c2 || chv) removeFromCell(e, "corner68");
			else simplifyCorner(e, 8, 6);
		}
		if (c6 && c0) {
			removeFromCell(offset(e, 0, 0, "edgev"), "edgev06");
			if (c2 || c8 || chv) removeFromCell(e, "corner06");
			else simplifyCorner(e, 6, 0);
		}
	}
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
	$("#decorate").on("click", decorate);
	$("#export").on("click", exportSVG);
}
