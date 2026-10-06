import assert from "node:assert/strict";
import test from "node:test";
import { terminalControlByte } from "../src/utils/terminalCtrl.ts";

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

test("Ctrl+X is the nano exit byte even when the IME hides the letter", () => {
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "x", code: "KeyX" })), 0x18);
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "Process", code: "KeyX" })), 0x18);
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "Unidentified", code: "KeyX" })), 0x18);
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "c", code: "KeyC" })), 0x03);
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "a", code: "KeyA" })), 0x01);
});

test("paste, copy chords, and unmodified keys are left alone", () => {
  assert.equal(terminalControlByte(key({ ctrlKey: true, key: "v", code: "KeyV" })), null);
  assert.equal(terminalControlByte(key({ ctrlKey: true, shiftKey: true, key: "c", code: "KeyC" })), null);
  assert.equal(terminalControlByte(key({ metaKey: true, key: "x", code: "KeyX" })), null);
  assert.equal(terminalControlByte(key({ ctrlKey: true, altKey: true, key: "x", code: "KeyX" })), null);
  assert.equal(terminalControlByte(key({ key: "x", code: "KeyX" })), null);
});
