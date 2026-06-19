import assert from "node:assert/strict";
import {after, test} from "node:test";
import {
	createGuestProfile,
	db,
	getMessagesAfter,
	insertMessage,
	normalizeMessage
} from "../script/chat/router.js";

after(() => {
	db.close();
});

test("chat profiles are anonymous but visually distinct", () => {
	const profile = createGuestProfile();

	assert.match(profile.sessionId, /^guest-/);
	assert.match(profile.name, /^Guest [0-9A-Z]+$/);
	assert.match(profile.color, /^#[0-9a-f]{6}$/);
});

test("chat messages are normalized and stored in chat.db", () => {
	const beforeId = db.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM messages").get().id;
	const profile = createGuestProfile();
	const body = `hello from test ${Date.now()}`;
	const result = normalizeMessage({...profile, body: `  ${body}  `});

	assert.equal(result.ok, true);
	assert.equal(result.message.body, body);

	const message = insertMessage(result.message);
	assert.ok(message.id > beforeId);
	assert.equal(message.body, body);
	assert.equal(message.sessionId, profile.sessionId);

	const messages = getMessagesAfter(beforeId);
	assert.equal(messages.at(-1).id, message.id);
	assert.equal(messages.at(-1).body, body);

	db.prepare("DELETE FROM messages WHERE id = ?").run(message.id);
});

test("chat messages reject blank bodies", () => {
	const result = normalizeMessage({body: "   "});

	assert.equal(result.ok, false);
	assert.equal(result.error, "Message cannot be empty.");
});

test("chat message input is bounded and color-safe", () => {
	const result = normalizeMessage({
		sessionId: "session",
		name: "A very long guest name that should be shortened",
		color: "not-css",
		body: `${"x".repeat(600)}\n${"y".repeat(700)}`
	});

	assert.equal(result.ok, true);
	assert.equal(result.message.name.length, 32);
	assert.match(result.message.color, /^#[0-9a-f]{6}$/);
	assert.equal(result.message.body.length, 1200);
	assert.match(result.message.body, /\n/);
});
