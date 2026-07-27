type Direction = "up" | "down" | "left" | "right";
type Cell = number | null;
type Position = {row: number; column: number};
type TileMotion = Position & {to: Position; value: number};

const size = 4;
const motionDuration = 95;
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
	const motions: TileMotion[] = [];

	for (const line of traversals) {
		const occupied = line.flatMap((position) => {
			const value = board[position.row][position.column];
			return value === null ? [] : [{...position, value}];
		});
		const merged: number[] = [];
		let destinationIndex = 0;
		for (let index = 0; index < occupied.length; index++) {
			const destination = line[destinationIndex];
			if (occupied[index].value === occupied[index + 1]?.value) {
				const value = occupied[index].value * 2;
				merged.push(value);
				score += value;
				addMotion(motions, occupied[index], destination, true);
				addMotion(motions, occupied[index + 1], destination, true);
				index++;
			} else {
				merged.push(occupied[index].value);
				addMotion(motions, occupied[index], destination);
			}
			destinationIndex++;
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
	const motionDestinations = new Set(motions.map((motion) => positionKey(motion.to)));
	render(motionDestinations);
	playMotions(motions);
	window.setTimeout(() => {
		tileLayer.querySelectorAll(".tile-awaiting-motion").forEach((tile) => tile.classList.remove("tile-awaiting-motion"));
	}, motionDuration);
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

function render(hiddenTiles = new Set<string>()): void {
	tileLayer.replaceChildren();
	board.forEach((row, rowIndex) => row.forEach((value, column) => {
		if (value === null) return;
		const tile = document.createElement("div");
		tile.className = `tile ${value <= 2048 ? `tile-${value}` : "tile-super"}`;
		tile.textContent = String(value);
		tile.style.transform = `translate(${gridOffset(column)}, ${gridOffset(rowIndex)})`;
		if (hiddenTiles.has(positionKey({row: rowIndex, column}))) tile.classList.add("tile-awaiting-motion");
		tileLayer.append(tile);
	}));
	scoreElement.textContent = String(score);
	bestScoreElement.textContent = String(bestScore);
}

function addMotion(motions: TileMotion[], from: Position & {value: number}, to: Position, includeStationary = false): void {
	if (!includeStationary && from.row === to.row && from.column === to.column) return;
	motions.push({row: from.row, column: from.column, to, value: from.value});
}

function playMotions(motions: TileMotion[]): void {
	for (const motion of motions) {
		const ghost = document.createElement("div");
		ghost.className = `tile moving-tile ${motion.value <= 2048 ? `tile-${motion.value}` : "tile-super"}`;
		ghost.textContent = String(motion.value);
		ghost.style.transform = `translate(${gridOffset(motion.column)}, ${gridOffset(motion.row)})`;
		tileLayer.append(ghost);
		void ghost.offsetWidth;
		requestAnimationFrame(() => {
			ghost.style.transform = `translate(${gridOffset(motion.to.column)}, ${gridOffset(motion.to.row)})`;
		});
		window.setTimeout(() => ghost.remove(), motionDuration);
	}
}

function gridOffset(index: number): string {
	if (index === 0) return "0";
	return `calc(${index * 100}% + ${Array.from({length: index}, () => "var(--gap)").join(" + ")})`;
}

function positionKey(position: Position): string {
	return `${position.row}:${position.column}`;
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
