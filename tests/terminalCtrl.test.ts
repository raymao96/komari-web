import assert from "node:assert/strict";
import test from "node:test";
import { terminalControlByte, terminalCutControlByte, terminalKeyAction } from "../src/utils/terminalCtrl.ts";

function key(partial: Partial<KeyboardEvent>) {
  return {
    altKey: false,
    code: "",
    ctrlKey: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...partial,
  };
}

const nanoLetters: Array<[string, number]> = [
  ["a", 0x01],
  ["b", 0x02],
  ["c", 0x03],
  ["d", 0x04],
  ["e", 0x05],
  ["f", 0x06],
  ["g", 0x07],
  ["h", 0x08],
  ["j", 0x0a],
  ["k", 0x0b],
  ["n", 0x0e],
  ["o", 0x0f],
  ["p", 0x10],
  ["r", 0x12],
  ["t", 0x14],
  ["u", 0x15],
  ["w", 0x17],
  ["x", 0x18],
  ["y", 0x19],
];

test("nano Ctrl letters stay one C0 byte, including when the IME hides the letter", () => {
  for (const [letter, byte] of nanoLetters) {
    const code = `Key${letter.toUpperCase()}`;
    assert.equal(terminalControlByte(key({ ctrlKey: true, key: letter, code })), byte);
    assert.equal(terminalControlByte(key({ ctrlKey: true, key: "Process", code })), byte);
    assert.equal(terminalControlByte(key({ ctrlKey: true, key: "Unidentified", code })), byte);
    assert.equal(
      terminalControlByte(key({ ctrlKey: true, key: "Process", code: "", keyCode: letter.toUpperCase().charCodeAt(0) })),
      byte,
    );
  }
});

test("nano replace, mark, and goto line are C0 bytes", () => {
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "\\", code: "Backslash" })), 0x1c);
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "Process", code: "Backslash" })), 0x1c);
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "6", code: "Digit6" })), 0x1e);
  assert.equal(terminalControlByte(key({ ctrlKey: true, shiftKey: true, key: "_", code: "Minus" })), 0x1f);
  assert.equal(terminalControlByte(key({ ctrlKey: true, shiftKey: true, key: "Process", code: "Minus" })), 0x1f);
});

test("Ctrl+X cut fallback and Ctrl+C copy rules", () => {
  assert.equal(terminalCutControlByte("deleteByCut"), 0x18);
  assert.equal(terminalCutControlByte("insertText"), null);
  const ctrlC = key({ ctrlKey: true, key: "c", code: "KeyC" });
  assert.deepEqual(terminalKeyAction(ctrlC, true), { action: "copy" });
  assert.deepEqual(terminalKeyAction(ctrlC, false), { action: "send", byte: 0x03, keepBrowserCopy: true });
  assert.deepEqual(
    terminalKeyAction(key({ ctrlKey: true, key: "Process", code: "KeyC" }), true),
    { action: "copy" },
  );
  assert.deepEqual(terminalKeyAction(key({ ctrlKey: true, shiftKey: true, key: "c", code: "KeyC" }), false), { action: "copy" });
  assert.deepEqual(terminalKeyAction(key({ metaKey: true, key: "c", code: "KeyC" }), false), { action: "copy" });
  assert.deepEqual(terminalKeyAction(key({ ctrlKey: true, key: "Insert" }), false), { action: "copy" });
});

test("paste and unmodified keys are left alone", () => {
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "v", code: "KeyV" })), null);
  assert.deepEqual(terminalKeyAction(key({ ctrlKey: true, key: "v", code: "KeyV" }), false), { action: "paste" });
  assert.deepEqual(terminalKeyAction(key({ metaKey: true, key: "v", code: "KeyV" }), false), { action: "paste" });
  assert.equal(terminalControlByte(key({ metaKey: true, key: "x", code: "KeyX" })), null);
  assert.equal(terminalControlByte(key({ ctrlKey: true, altKey: true, key: "x", code: "KeyX" })), null);
  assert.equal(terminalControlByte(key({ key: "x", code: "KeyX" })), null);
  assert.deepEqual(terminalKeyAction(key({ ctrlKey: true, key: "x", code: "KeyX" }), false), {
    action: "send",
    byte: 0x18,
    keepBrowserCopy: false,
  });
});
