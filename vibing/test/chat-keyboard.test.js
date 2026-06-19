import assert from "node:assert/strict";
import test from "node:test";
import {getMessageEnterAction} from "../chat/keyboard.js";

test("Enter sends a chat message when no composition is active", () => {
	assert.equal(getMessageEnterAction({
		key: "Enter",
		shiftKey: false,
		isComposing: false,
		keyCode: 13
	}, false), "send");
});

test("IME composition Enter does not send a chat message", () => {
	assert.equal(getMessageEnterAction({
		key: "Enter",
		shiftKey: false,
		isComposing: true,
		keyCode: 13
	}, false), "compose");

	assert.equal(getMessageEnterAction({
		key: "Enter",
		shiftKey: false,
		isComposing: false,
		keyCode: 229
	}, false), "compose");

	assert.equal(getMessageEnterAction({
		key: "Enter",
		shiftKey: false,
		isComposing: false,
		keyCode: 13
	}, true), "compose");
});

test("Shift+Enter still makes a textarea newline", () => {
	assert.equal(getMessageEnterAction({
		key: "Enter",
		shiftKey: true,
		isComposing: false,
		keyCode: 13
	}, false), "default");
});
