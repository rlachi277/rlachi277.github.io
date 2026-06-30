import express from "express";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientDir = path.join(rootDir, "chat");
const dbPath = path.join(rootDir, "db", "chat.db");
mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.prepare(`
	CREATE TABLE IF NOT EXISTS messages (
		id INTEGER PRIMARY KEY,
		session_id TEXT NOT NULL,
		name TEXT NOT NULL,
		color TEXT NOT NULL,
		body TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
	)
`).run();
db.prepare("CREATE INDEX IF NOT EXISTS messages_created_id ON messages (created_at, id)").run();
const router = express.Router();
export default router;
const clients = new Set();
const palette = [
    "#0f766e",
    "#2563eb",
    "#b45309",
    "#be123c",
    "#7c3aed",
    "#15803d",
    "#c2410c",
    "#0369a1"
];
router.use("/api", express.json({ limit: "16kb" }));
router.get("/api/me", (_req, res) => {
    const profile = createGuestProfile();
    res.status(200).json(profile);
});
router.get("/api/messages", (req, res) => {
    const after = parseId(req.query.after);
    res.status(200).json({ messages: getMessagesAfter(after) });
});
router.post("/api/messages", (req, res) => {
    const result = normalizeMessage(req.body);
    if (result.ok === false) {
        res.status(400).json({ error: result.error });
        return;
    }
    const message = insertMessage(result.message);
    broadcast("message", message, message.id);
    res.status(201).json({ message: message });
});
router.get("/api/events", (req, res) => {
    const after = parseId(req.query.after ?? req.header("Last-Event-ID"));
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.write(": connected\n\n");
    sendEvent(res, "messages", { messages: getMessagesAfter(after) }, after);
    const client = { res: res };
    clients.add(client);
    const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n");
    }, 25000);
    req.on("close", () => {
        clearInterval(heartbeat);
        clients.delete(client);
    });
});
router.use(express.static(clientDir));
router.get("/", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
});
export function createGuestProfile() {
    const seed = `${Date.now()}-${Math.random()}`;
    const id = `guest-${hash(seed).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const color = palette[Math.abs(hash(id)) % palette.length];
    return {
        sessionId: id,
        name: `Guest ${Math.abs(hash(id)).toString(36).slice(0, 4).toUpperCase()}`,
        color: color
    };
}
export function normalizeMessage(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return { ok: false, error: "Expected a JSON object." };
    }
    const data = input;
    const body = normalizeBody(data.body);
    if (!body)
        return { ok: false, error: "Message cannot be empty." };
    return {
        ok: true,
        message: {
            sessionId: normalizeText(data.sessionId, 1, 96) ?? createGuestProfile().sessionId,
            name: normalizeText(data.name, 1, 32) ?? "Guest",
            color: normalizeColor(data.color),
            body: body
        }
    };
}
function normalizeText(value, min, max) {
    if (typeof value !== "string")
        return null;
    const text = value.trim().replace(/\s+/g, " ");
    if (text.length < min)
        return null;
    return text.slice(0, max);
}
function normalizeBody(value) {
    if (typeof value !== "string")
        return null;
    const text = value.trim();
    if (!text)
        return null;
    return text.slice(0, 1200);
}
function normalizeColor(value) {
    if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
        return value.toLowerCase();
    }
    return palette[Math.floor(Math.random() * palette.length)];
}
export function insertMessage(message) {
    const result = db.prepare(`
		INSERT INTO messages (session_id, name, color, body)
		VALUES (@sessionId, @name, @color, @body)
	`).run(message);
    return getMessage(result.lastInsertRowid);
}
function getMessage(id) {
    return rowToMessage(db.prepare(`
		SELECT id, session_id, name, color, body, created_at
		FROM messages
		WHERE id = ?
	`).get(id));
}
export function getMessagesAfter(after) {
    return db.prepare(`
		SELECT id, session_id, name, color, body, created_at
		FROM messages
		WHERE id > ?
		ORDER BY id ASC
		LIMIT 100
	`).all(after).map(rowToMessage);
}
function rowToMessage(row) {
    if (!isMessageRow(row))
        throw new Error("Message row not found.");
    return {
        id: row.id,
        sessionId: row.session_id,
        name: row.name,
        color: row.color,
        body: row.body,
        createdAt: row.created_at
    };
}
function isMessageRow(row) {
    return Boolean(row)
        && typeof row === "object"
        && typeof row.id === "number"
        && typeof row.session_id === "string"
        && typeof row.name === "string"
        && typeof row.color === "string"
        && typeof row.body === "string"
        && typeof row.created_at === "string";
}
function parseId(value) {
    const source = Array.isArray(value) ? value[0] : value;
    const id = typeof source === "string" ? Number.parseInt(source, 10) : Number(source);
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
}
function broadcast(event, data, id) {
    for (const client of clients) {
        sendEvent(client.res, event, data, id);
    }
}
function sendEvent(res, event, data, id) {
    if (Number.isSafeInteger(Number(id)) && Number(id) > 0) {
        res.write(`id: ${id}\n`);
    }
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
function hash(text) {
    let value = 0;
    for (let i = 0; i < text.length; i++) {
        value = ((value << 5) - value) + text.charCodeAt(i);
        value |= 0;
    }
    return value;
}
