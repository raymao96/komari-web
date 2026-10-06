import assert from "node:assert/strict";
import test from "node:test";

import { encodeUploadFrame, isFileFrame, parseDownloadFrame } from "../src/utils/fileTransferFrame.ts";

test("upload frames match the agent byte layout", () => {
  const frame = encodeUploadFrame("ab", "cd", 1, Uint8Array.of(0x09));
  assert.deepEqual(Array.from(frame), [
    0x4c, 0x54, 0x46, 0x31, 1,
    0, 2, 0x61, 0x62,
    0, 2, 0x63, 0x64,
    0, 0, 0, 0, 0, 0, 0, 1,
    0x09,
  ]);
});

test("download frames carry the request id, sequence, and raw bytes", () => {
  const frame = Uint8Array.of(
    0x4c, 0x54, 0x46, 0x31, 2,
    0, 2, 0x61, 0x62,
    0, 0, 0, 0, 0, 0, 0, 7,
    0x09,
  );
  assert.equal(isFileFrame(frame), true);
  assert.deepEqual(parseDownloadFrame(frame), {
    id: "ab",
    sequence: 7,
    payload: Uint8Array.of(0x09),
  });
  assert.equal(isFileFrame(Uint8Array.of(0x6c, 0x73, 0x0d)), false);
  assert.equal(parseDownloadFrame(encodeUploadFrame("ab", "cd", 1, Uint8Array.of(0x09))), null);
});
