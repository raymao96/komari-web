import assert from "node:assert/strict";
import test from "node:test";
import { isNegativeByteInput, stringToBytes } from "../src/utils/unitHelper.ts";

test("reset traffic rejects a negative amount and still accepts zero", () => {
  assert.equal(isNegativeByteInput("-1"), true);
  assert.equal(isNegativeByteInput("-1 GB"), true);
  assert.equal(isNegativeByteInput(" -10GB"), true);
  assert.equal(isNegativeByteInput("5*-1gb"), true);
  assert.equal(stringToBytes("-1GB") < 0, true);
  assert.equal(isNegativeByteInput("0"), false);
  assert.equal(isNegativeByteInput("0 B"), false);
  assert.equal(isNegativeByteInput("100 GB"), false);
  assert.equal(isNegativeByteInput(""), false);
});
