type CtrlKeyEvent = Pick<KeyboardEvent, "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

function controlLetter(event: CtrlKeyEvent) {
  if (event.key.length === 1) {
    const letter = event.key.toLowerCase();
    if (letter >= "a" && letter <= "z") return letter;
  }
  // IME reports key "Process" and keyCode 229. The physical key is still KeyX.
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  return "";
}

// Ctrl+A..Z as one C0 byte. Ctrl+V stays null so the browser can paste.
export function terminalControlByte(event: CtrlKeyEvent) {
  if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return null;
  const letter = controlLetter(event);
  if (!letter || letter === "v") return null;
  return letter.charCodeAt(0) - 96;
}
