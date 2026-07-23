type Direction = "up" | "down" | "left" | "right";
type Cell = number | null;

const size = 4;
const boardElement = required<HTMLElement>("game-board");
const tileLayer = required<HTMLElement>("tile-layer");
const scoreElement = required<HTMLElement>("score");
const bestScoreElement = required<HTMLElement>("best-score");
const messageElement = required<HTMLElement>("game-message");
const messageTitle = required<HTMLElement>("message-title");
const newGameButton = required<HTMLButtonElement>("new-game");
const tryAgainButton = required<HTMLButtonElement>("try-again");
const keepPlayingButton = required<HTMLButtonElement>("keep-playing");

let board: Cell[][] = emptyBoard();
let score = 0;
let bestScore = Number.parseInt(localStorage.getItem("vibing.2048.best") ?? "0", 10) || 0;
let won = false;
let keepPlaying = false;
let touchStart: {x: number; y: number} | null = null;

newGameButton.addEventListener("click", startGame);
tryAgainButton.addEventListener("click", startGame);
keepPlayingButton.addEventListener("click", () => {
	keepPlaying = true;
	messageElement.hidden = true;
});

window.addEventListener("keydown", (event) => {
	const direction = keyDirection(event.key);
	if (!direction) return;
	event.preventDefault();
	move(direction);
});

boardElement.addEventListener("pointerdown", (event) => {
	touchStart = {x: event.clientX, y: event.clientY};
});

boardElement.addEventListener("pointerup", (event) => {
	if (!touchStart) return;
	const dx = event.clientX - touchStart.x;
	const dy = event.clientY - touchStart.y;
	touchStart = null;
	if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
	move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});

boardElement.addEventListener("pointercancel", () => { touchStart = null; });

startGame();

function startGame(): void {
	board = emptyBoard();
	score = 0;
	won = false;
	keepPlaying = false;
	messageElement.hidden = true;
	addRandomTile();
	addRandomTile();
	render();
}

function move(direction: Direction): void {
	if ((won && !keepPlaying) || !movesAvailable()) return;
	const before = JSON.stringify(board);
	const traversals = traversal(direction);

	for (const line of traversals) {
		const values = line.map(({row, column}) => board[row][column]).filter((value): value is number => value !== null);
		const merged: number[] = [];
		for (let index = 0; index < values.length; index++) {
			if (values[index] === values[index + 1]) {
				const value = values[index] * 2;
				merged.push(value);
				score += value;
				index++;
			} else {
				merged.push(values[index]);
			}
		}
		line.forEach(({row, column}, index) => { board[row][column] = merged[index] ?? null; });
	}

	if (JSON.stringify(board) === before) return;
	addRandomTile();
	if (score > bestScore) {
		bestScore = score;
		localStorage.setItem("vibing.2048.best", String(bestScore));
	}
	if (!won && board.some((row) => row.includes(2048))) won = true;
	render();
	if (won && !keepPlaying) showMessage("You win!", true);
	else if (!movesAvailable()) showMessage("Game over!", false);
}

function traversal(direction: Direction): Array<Array<{row: number; column: number}>> {
	const reverse = direction === "right" || direction === "down";
	const indices = Array.from({length: size}, (_, index) => reverse ? size - 1 - index : index);
	return (direction === "left" || direction === "right")
		? indices.map((row) => indices.map((column) => ({row, column})))
		: indices.map((column) => indices.map((row) => ({row, column})));
}

function addRandomTile(): void {
	const available: Array<{row: number; column: number}> = [];
	board.forEach((row, rowIndex) => row.forEach((value, column) => {
		if (value === null) available.push({row: rowIndex, column});
	}));
	if (!available.length) return;
	const target = available[Math.floor(Math.random() * available.length)];
	board[target.row][target.column] = Math.random() < .1 ? 4 : 2;
}

function movesAvailable(): boolean {
	return board.some((row) => row.includes(null)) || board.some((row, rowIndex) => row.some((value, column) =>
		value === board[rowIndex + 1]?.[column] || value === row[column + 1]
	));
}

function render(): void {
	tileLayer.replaceChildren();
	board.forEach((row, rowIndex) => row.forEach((value, column) => {
		if (value === null) return;
		const tile = document.createElement("div");
		tile.className = `tile ${value <= 2048 ? `tile-${value}` : "tile-super"}`;
		tile.textContent = String(value);
		tile.style.transform = `translate(${gridOffset(column)}, ${gridOffset(rowIndex)})`;
		tileLayer.append(tile);
	}));
	scoreElement.textContent = String(score);
	bestScoreElement.textContent = String(bestScore);
}

function gridOffset(index: number): string {
	if (index === 0) return "0";
	return `calc(${index * 100}% + ${Array.from({length: index}, () => "var(--gap)").join(" + ")})`;
}

function showMessage(title: string, canContinue: boolean): void {
	messageTitle.textContent = title;
	keepPlayingButton.hidden = !canContinue;
	tryAgainButton.hidden = false;
	messageElement.hidden = false;
}

function emptyBoard(): Cell[][] {
	return Array.from({length: size}, () => Array<Cell>(size).fill(null));
}

function keyDirection(key: string): Direction | null {
	const normalized = key.toLowerCase();
	const directions: Record<string, Direction> = {arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right"};
	return directions[normalized] ?? null;
}

function required<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Missing #${id}`);
	return element as T;
}
