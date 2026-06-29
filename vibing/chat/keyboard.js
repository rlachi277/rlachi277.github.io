export function getMessageEnterAction(event, composing) {
    if (event.key !== "Enter" || event.shiftKey)
        return "default";
    if (composing || event.isComposing || event.keyCode === 229)
        return "compose";
    return "send";
}
