import { pipeline, AutoTokenizer, PreTrainedTokenizer, FeatureExtractionPipeline } from '@huggingface/transformers';
import { $, d$n } from '../query';

export async function setup() {
	console.log("hi");

	const model = 'Xenova/all-MiniLM-L6-v2';

	const tokenizer = await AutoTokenizer.from_pretrained(model);

	const extractor = await pipeline(
		'feature-extraction',
		model
	);

	$("#generate").on("click", () => {
		generate(tokenizer, extractor)
	});
	$("#export").on("click", exportSVG);
}

function exportSVG() {
	const grid = d$n("center");
	const cells = Array.from(grid.querySelectorAll<HTMLElement>(".cell"));
	if (cells.length === 0) return;

	const positionedCells = cells.map((cell) => ({
		cell,
		rect: cell.getBoundingClientRect(),
	}));
	const minX = Math.min(...positionedCells.map(({ rect }) => rect.left));
	const minY = Math.min(...positionedCells.map(({ rect }) => rect.top));
	const maxX = Math.max(...positionedCells.map(({ rect }) => rect.right));
	const maxY = Math.max(...positionedCells.map(({ rect }) => rect.bottom));
	const width = maxX - minX;
	const height = maxY - minY;
	const svgNS = "http://www.w3.org/2000/svg";
	const output = document.createElementNS(svgNS, "svg");
	output.setAttribute("xmlns", svgNS);
	output.setAttribute("width", `${width}`);
	output.setAttribute("height", `${height}`);
	output.setAttribute("viewBox", `0 0 ${width} ${height}`);

	const background = document.createElementNS(svgNS, "rect");
	background.setAttribute("width", `${width}`);
	background.setAttribute("height", `${height}`);
	background.setAttribute("fill", "black");
	output.append(background);

	for (const { cell, rect } of positionedCells) {
		const source = cell.querySelector("svg");
		if (!source) continue;
		const group = document.createElementNS(svgNS, "g");
		group.setAttribute("transform", `translate(${rect.left - minX} ${rect.top - minY})`);
		const previousHueShift = source.style.getPropertyValue("--hueshift");
		const previousPriority = source.style.getPropertyPriority("--hueshift");
		source.style.setProperty("--hueshift", "0", "important");
		try {
			for (const sourceShape of Array.from(source.querySelectorAll<SVGElement>("*"))) {
				const shape = sourceShape.cloneNode(true) as SVGElement;
				const computed = getComputedStyle(sourceShape);
				for (const property of ["stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill"]) {
					shape.setAttribute(property, computed.getPropertyValue(property));
				}
				group.append(shape);
			}
		} finally {
			if (previousHueShift) source.style.setProperty("--hueshift", previousHueShift, previousPriority);
			else source.style.removeProperty("--hueshift");
		}
		output.append(group);
	}

	const blob = new Blob([new XMLSerializer().serializeToString(output)], { type: "image/svg+xml" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = "output.svg";
	anchor.click();
	URL.revokeObjectURL(url);
}

async function generate(tokenizer: PreTrainedTokenizer, extractor: FeatureExtractionPipeline) {
	$(".cell").remove();

	const sentence = (d$n("code") as HTMLInputElement).value;
	const tokens = tokenizer(sentence).input_ids.tolist()[0];
	
	console.log('Tokens:', tokens);

	const words = [];
	for (const id of tokens) {
  		words.push(tokenizer.decode([id]));
	}
	console.log(words);

	const output = (await extractor(sentence, {
		pooling: 'mean',
		normalize: true,
	})).tolist()[0];

	console.log('Embedding:', output);

	let curr = 0, curc = 0;
	let inv = false;
	let embedIdx = 0;
	for (const e of tokens) {
		const en = Number(e);
		const upper = Math.floor(en / 6561);
		const middle = Math.floor((en % 6561) / 81);
		const lower = en % 81;
		const uppersrc = getSymbols(upper);
		const middlesrc = getSymbols(middle);
		const lowersrc = getSymbols(lower);
		const uppercolor = getColor(output[embedIdx], output[embedIdx+1]);
		embedIdx = (embedIdx+2) % (output.length);
		const middlecolor = getColor(output[embedIdx], output[embedIdx+1]);
		embedIdx = (embedIdx+2) % (output.length);
		const lowercolor = getColor(output[embedIdx], output[embedIdx+1]);
		embedIdx = (embedIdx+2) % (output.length);
		addImage(curr, curc, uppersrc, uppercolor);
		addImage(curr + (inv?0:1), curc + (inv?1:0), middlesrc, middlecolor);
		addImage(curr + 1, curc + 1, lowersrc, lowercolor);
		curc += 1+(inv?1:0);
		inv = !inv;
		if (!inv && curc+2 >= cols) {
			curc = 0;
			curr += 2;
		}
	}
}

const grid = $("#center").list[0];

function addImage(row: number, col: number, src: string, color: string) {
	let cell = $(`[data-row="${row}"][data-col="${col}"]`, grid).list[0];
	if (cell === undefined) {
		cell = document.createElement("div");
		cell.classList.add("cell");
		cell.setAttribute("style", `grid-row: ${row+1}; grid-column: ${col+1};`);
		cell.setAttribute("data-row", row.toString());
		cell.setAttribute("data-col", col.toString());
		grid.append(cell);
	}
	return addToCell(cell, src, color);
}

function addToCell(cell: HTMLElement | null, src: string, color: string) {
	if (cell === null) return;
	const img = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	img.setAttribute("viewbox", "0 0 55 55");
	img.setAttribute("shape-rendering", "geometricPrecision");
	img.setAttribute("text-rendering", "geometricPrecision");
	img.setAttribute("style", `--color: ${color};`)
	img.innerHTML = src;
	cell.append(img);
	return true;
}

const cols = window.getComputedStyle(d$n("center")).gridTemplateColumns.split(' ').length;
const sym = {
	base: (_: boolean, __: boolean) => `<rect x="5" y="5" width="45" height="45" rx="10px" ry="10px"/>`,
	dot: (x: boolean, y: boolean) => `<circle cx="${x?35:20}" cy="${y?35:20}" r="5"/>`,
	lineh: (_: boolean, y: boolean) => `<line x1="20" y1="${y?35:20}" x2="35" y2="${y?35:20}"/>`,
	linev: (x: boolean, _: boolean) => `<line x1="${x?35:20}" y1="20" x2="${x?35:20}" y2="35"/>`,
	ul: (x: boolean, y: boolean) => `<polyline points="${x?35:20},${y?25:10} ${x?35:20},${y?35:20} ${x?25:10},${y?35:20}"/>`,
	ur: (x: boolean, y: boolean) => `<polyline points="${x?35:20},${y?25:10} ${x?35:20},${y?35:20} ${x?45:30},${y?35:20}"/>`,
	ud: (x: boolean, y: boolean) => `<line x1="${x?35:20}" y1="${y?25:10}" x2="${x?35:20}" y2="${y?45:30}"/>`,
	lr: (x: boolean, y: boolean) => `<line x1="${x?25:10}" y1="${y?35:20}" x2="${x?45:30}" y2="${y?35:20}"/>`,
	ld: (x: boolean, y: boolean) => `<polyline points="${x?35:20},${y?45:30} ${x?35:20},${y?35:20} ${x?25:10},${y?35:20}"/>`,
	rd: (x: boolean, y: boolean) => `<polyline points="${x?35:20},${y?45:30} ${x?35:20},${y?35:20} ${x?45:30},${y?35:20}"/>`,
	ulr: (x: boolean, y: boolean) => `<line x1="${x?25:10}" y1="${y?35:20}" x2="${x?45:30}" y2="${y?35:20}"/><line x1="${x?35:20}" y1="${y?25:10}" x2="${x?35:20}" y2="${y?35:20}"/>`,
	uld: (x: boolean, y: boolean) => `<line x1="${x?25:10}" y1="${y?35:20}" x2="${x?35:20}" y2="${y?35:20}"/><line x1="${x?35:20}" y1="${y?25:10}" x2="${x?35:20}" y2="${y?45:30}"/>`,
	urd: (x: boolean, y: boolean) => `<line x1="${x?45:30}" y1="${y?35:20}" x2="${x?35:20}" y2="${y?35:20}"/><line x1="${x?35:20}" y1="${y?25:10}" x2="${x?35:20}" y2="${y?45:30}"/>`,
	lrd: (x: boolean, y: boolean) => `<line x1="${x?25:10}" y1="${y?35:20}" x2="${x?45:30}" y2="${y?35:20}"/><line x1="${x?35:20}" y1="${y?45:30}" x2="${x?35:20}" y2="${y?35:20}"/>`,
	ulrd: (x: boolean, y: boolean) => `<line x1="${x?25:10}" y1="${y?35:20}" x2="${x?45:30}" y2="${y?35:20}"/><line x1="${x?35:20}" y1="${y?25:10}" x2="${x?35:20}" y2="${y?45:30}"/>`
} as const;
type SymbolName = keyof typeof sym;

const basic: SymbolName[] = ["dot", "lr", "ud"] as const;
function getSymbols(id: number) {
	let first: SymbolName = basic[Math.floor(id/27)];
	let second: SymbolName = basic[Math.floor((id%27)/9)];
	let third: SymbolName = basic[Math.floor((id%9)/3)];
	let fourth: SymbolName = basic[Math.floor(id%3)];
	if (first == "dot") {
		if (second == "lr" && third == "ud") first = "rd";
		else if (second == "lr") first = "ur";
		else if (third == "ud") first = "ld";
	}
	if (second == "dot") {
		if (first == "lr" && fourth == "ud") second = "ld";
		else if (first == "lr") second = "ul";
		else if (fourth == "ud") second = "rd";
	}
	if (third == "dot") {
		if (fourth == "lr" && first == "ud") third = "ur";
		else if (fourth == "lr") third = "rd";
		else if (first == "ud") third = "ul";
	}
	if (fourth == "dot") {
		if (third == "lr" && second == "ud") fourth = "ul";
		else if (third == "lr") fourth = "ld";
		else if (second == "ud") fourth = "ur";
	}

	if (first == "lr" && third == "ud") first = "lrd";
	else if (first == "ud" && second == "lr") first = "urd";
	if (second == "lr" && fourth == "ud") second = "lrd";
	else if (second == "ud" && first == "lr") second = "uld";
	if (third == "lr" && first == "ud") third = "ulr";
	else if (third == "ud" && fourth == "lr") third = "urd";
	if (fourth == "lr" && second == "ud") fourth = "ulr";
	else if (fourth == "ud" && third == "lr") fourth = "uld";

	if (first == "dot" && second == "dot" && third == "dot" && fourth == "dot") {
		first = "rd";
		second = "ld";
		third = "ur";
		fourth = "ul";
	}

	let result = sym["base"](false, false);
	if (first == "dot" && second == "dot") {
		result += sym["lineh"](false, false);
		result += sym[third](false, true);
		result += sym[fourth](true, true);
	} else if (second == "dot" && fourth == "dot") {
		result += sym["linev"](true, false);
		result += sym[first](false, false);
		result += sym[third](false, true);
	} else if (third == "dot" && fourth == "dot") {
		result += sym["lineh"](false, true);
		result += sym[first](false, false);
		result += sym[second](true, false);
	} else if (first == "dot" && third == "dot") {
		result += sym["linev"](false, false);
		result += sym[second](true, false);
		result += sym[fourth](true, true);
	} else {
		result += sym[first](false, false);
		result += sym[second](true, false);
		result += sym[third](false, true);
		result += sym[fourth](true, true);
	}

	return result;
}

function getColor(a: number, b: number) {
	const mag = (a*a + b*b) ** 0.5;
	if (mag == 0) return `var(--basecolor)`;
	const targetSat = Math.min(mag*8, 1);
	const hue = Math.atan2(b, a) / (2*Math.PI) * 360;
	return `color-mix(in oklab, oklch(0.7 0.25 calc(${hue} + var(--hueshift))) ${targetSat*100}%, var(--basecolor))`;
}
