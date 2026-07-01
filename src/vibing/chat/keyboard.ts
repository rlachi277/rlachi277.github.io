export type MessageEnterAction = "default" | "compose" | "send";

export function getMessageEnterAction(event: KeyboardEvent, composing: boolean): MessageEnterAction {
	if (event.key !== "Enter" || event.shiftKey) return "default";
	if (composing || event.isComposing || event.keyCode === 229) return "compose";
	return "send";
}
