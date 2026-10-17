type CtrlKeyEvent = Pick<KeyboardEvent, "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "shiftKey"> & {
  keyCode?: number;
};

function controlLetter(event: CtrlKeyEvent) {
  if (event.key.length === 1) {
    const letter = event.key.toLowerCase();
    if (letter >= "a" && letter <= "z") return letter;
  }
  // IME reports key "Process" and keyCode 229. The physical key is still KeyX.
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  if (typeof event.keyCode === "number" && event.keyCode >= 65 && event.keyCode <= 90) {
    return String.fromCharCode(event.keyCode + 32);
  }
  return "";
}

// Ctrl+A..Z as one C0 byte. Ctrl+V stays null so the browser can paste.
// Ctrl+\ is nano replace, Ctrl+6 is mark, Ctrl+Shift+- is goto line.
export function terminalControlByte(event: CtrlKeyEvent) {
  if (!event.ctrlKey || event.altKey || event.metaKey) return null;
  if (event.shiftKey) {
    if (event.key === "_" || event.code === "Minus") return 0x1f;
    return null;
  }
  const letter = controlLetter(event);
  if (letter === "v") return null;
  if (letter) return letter.charCodeAt(0) - 96;
  if (event.code === "Backslash" || event.key === "\\" || event.keyCode === 220) return 0x1c;
  if (event.code === "BracketLeft" || event.key === "[" || event.keyCode === 219) return 0x1b;
  if (event.code === "BracketRight" || event.key === "]" || event.keyCode === 221) return 0x1d;
  if (event.code === "Digit6" || event.key === "6" || event.keyCode === 54) return 0x1e;
  return null;
}

export type TerminalKeyAction =
  | { action: "copy" }
  | { action: "paste" }
  | { action: "send"; byte: number; keepBrowserCopy?: boolean }
  | { action: "pass" };

// Copy stays on Ctrl+C only when the terminal has a selection. With no
// selection the C0 byte is still sent, and the browser's own copy is not cancelled.
export function terminalKeyAction(event: CtrlKeyEvent, hasSelection: boolean): TerminalKeyAction {
  const letter = controlLetter(event);
  const copyWithSelection = event.ctrlKey && !event.shiftKey && letter === "c" && hasSelection;
  const copyShortcut = copyWithSelection
    || (((event.ctrlKey && event.shiftKey) || event.metaKey) && letter === "c")
    || (event.ctrlKey && event.key === "Insert");
  if (copyShortcut) return { action: "copy" };
  if ((event.ctrlKey || event.metaKey) && !event.altKey && letter === "v") {
    return { action: "paste" };
  }
  const control = terminalControlByte(event);
  if (control === null) return { action: "pass" };
  return {
    action: "send",
    byte: control,
    keepBrowserCopy: control === 0x03,
  };
}

// Chrome turns Ctrl+X into a cut on the terminal textarea and may hide the letter.
export function terminalCutControlByte(inputType: string) {
  return inputType === "deleteByCut" ? 0x18 : null;
}
