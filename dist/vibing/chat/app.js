import { getMessageEnterAction } from "./keyboard.js";
const apiBase = new URLSearchParams(location.search).get("api") ?? new URL("api", location.href).pathname;
const profileKey = "vibing.chat.profile";
const messagesEl = document.getElementById("messages");
const statusEl = document.getElementById("connection-status");
const formEl = document.getElementById("composer");
const inputEl = document.getElementById("message-input");
const avatarEl = document.getElementById("profile-avatar");
const profileNameEl = document.getElementById("profile-name");
let profile = loadProfile();
let lastMessageId = 0;
let eventSource = null;
let composingMessage = false;
let sendAfterComposition = false;
const rendered = new Set();
applyProfile(profile);
boot();
formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = inputEl.value.trim();
    if (!body)
        return;
    inputEl.value = "";
    resizeComposer();
    try {
        await postMessage(body);
    }
    catch (error) {
        inputEl.value = body;
        setStatus("Could not send. Reconnecting...");
        connectEvents();
    }
});
inputEl.addEventListener("input", resizeComposer);
inputEl.addEventListener("compositionstart", () => {
    composingMessage = true;
});
inputEl.addEventListener("compositionend", () => {
    composingMessage = false;
    if (sendAfterComposition) {
        sendAfterComposition = false;
        requestAnimationFrame(() => formEl.requestSubmit());
    }
});
inputEl.addEventListener("keydown", (event) => {
    const action = getMessageEnterAction(event, composingMessage);
    if (action === "send") {
        event.preventDefault();
        formEl.requestSubmit();
    }
    else if (action === "compose") {
        sendAfterComposition = true;
    }
});
async function boot() {
    if (!profile) {
        profile = await createProfile();
        saveProfile(profile);
        applyProfile(profile);
    }
    await loadMessages();
    connectEvents();
    inputEl.focus();
}
async function createProfile() {
    const response = await fetch(`${apiBase}/me`, { headers: { Accept: "application/json" } });
    if (!response.ok)
        throw new Error("Unable to create a profile.");
    return response.json();
}
async function loadMessages() {
    const response = await fetch(`${apiBase}/messages?after=${lastMessageId}`, {
        headers: { Accept: "application/json" }
    });
    if (!response.ok)
        throw new Error("Unable to load messages.");
    const data = await response.json();
    renderMessages(data.messages ?? []);
}
async function postMessage(body) {
    if (!profile)
        throw new Error("No chat profile.");
    const response = await fetch(`${apiBase}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...profile, body: body })
    });
    if (!response.ok)
        throw new Error("Unable to send message.");
    const data = await response.json();
    renderMessages([data.message], { forceScroll: true });
}
function connectEvents() {
    if (eventSource)
        eventSource.close();
    eventSource = new EventSource(`${apiBase}/events?after=${lastMessageId}`);
    setStatus("Live");
    eventSource.addEventListener("open", () => setStatus("Live"));
    eventSource.addEventListener("messages", (event) => {
        const data = JSON.parse(event.data);
        renderMessages(data.messages ?? []);
    });
    eventSource.addEventListener("message", (event) => {
        renderMessages([JSON.parse(event.data)]);
    });
    eventSource.addEventListener("error", () => {
        setStatus("Reconnecting...");
    });
}
function renderMessages(messages, options = {}) {
    if (!profile)
        return;
    let shouldScroll = Boolean(options.forceScroll) || isNearBottom();
    for (const message of messages) {
        if (!message || rendered.has(message.id))
            continue;
        rendered.add(message.id);
        lastMessageId = Math.max(lastMessageId, message.id);
        const item = document.createElement("li");
        item.className = message.sessionId === profile.sessionId ? "message mine" : "message";
        const avatar = document.createElement("span");
        avatar.className = "avatar";
        avatar.style.background = message.color;
        avatar.textContent = initials(message.name);
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        const meta = document.createElement("div");
        meta.className = "meta";
        const name = document.createElement("strong");
        name.textContent = message.name;
        const time = document.createElement("time");
        time.dateTime = message.createdAt;
        time.textContent = formatTime(message.createdAt);
        const body = document.createElement("p");
        body.textContent = message.body;
        meta.append(name, time);
        bubble.append(meta, body);
        item.append(avatar, bubble);
        messagesEl.append(item);
    }
    if (shouldScroll)
        messagesEl.scrollTop = messagesEl.scrollHeight;
}
function applyProfile(nextProfile) {
    if (!nextProfile)
        return;
    avatarEl.style.background = nextProfile.color;
    avatarEl.textContent = initials(nextProfile.name);
    profileNameEl.textContent = nextProfile.name;
}
function loadProfile() {
    try {
        const value = sessionStorage.getItem(profileKey);
        return value ? JSON.parse(value) : null;
    }
    catch {
        return null;
    }
}
function saveProfile(nextProfile) {
    sessionStorage.setItem(profileKey, JSON.stringify(nextProfile));
}
function setStatus(text) {
    statusEl.textContent = text;
}
function resizeComposer() {
    inputEl.style.height = "auto";
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 160)}px`;
}
function isNearBottom() {
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 96;
}
function initials(name) {
    return String(name ?? "G").trim().slice(0, 2).toUpperCase();
}
function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "";
    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}
