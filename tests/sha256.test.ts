import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSha256 } from "../src/utils/sha256.ts";

function digest(bytes: Uint8Array) {
  const hasher = createSha256();
  hasher.update(bytes);
  return hasher.hex();
}

test("sha256 matches the empty, abc, and split-block vectors", () => {
  assert.equal(
    digest(new Uint8Array()),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assert.equal(
    digest(new TextEncoder().encode("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );

  const payload = new Uint8Array(200);
  for (let index = 0; index < payload.length; index += 1) payload[index] = index;
  const split = createSha256();
  split.update(payload.subarray(0, 70));
  split.update(payload.subarray(70));
  assert.equal(split.hex(), createHash("sha256").update(payload).digest("hex"));
  assert.equal(digest(payload), split.hex());
});
