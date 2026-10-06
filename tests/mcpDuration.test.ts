import assert from "node:assert/strict";
import test from "node:test";

import {
  displayUnitForMinutes,
  parseDurationInput,
  MCP_HARD_MAX_MINUTES,
} from "../src/utils/mcpDuration.ts";

test("duration input accepts 1, 90, and 72 hours", () => {
  assert.deepEqual(parseDurationInput("1", "minutes"), { minutes: 1, error: null });
  assert.deepEqual(parseDurationInput("90", "minutes"), { minutes: 90, error: null });
  assert.deepEqual(parseDurationInput("4320", "minutes"), {
    minutes: MCP_HARD_MAX_MINUTES,
    error: null,
  });
  assert.deepEqual(parseDurationInput("72", "hours"), { minutes: 72 * 60, error: null });
  assert.deepEqual(parseDurationInput("24", "hours"), { minutes: 1440, error: null });
});

test("duration input rejects empty, decimal, zero, and over-max values", () => {
  assert.equal(parseDurationInput("", "minutes").error, "empty");
  assert.equal(parseDurationInput("0", "minutes").error, "invalid");
  assert.equal(parseDurationInput("1.5", "minutes").error, "invalid");
  assert.equal(parseDurationInput("4321", "minutes").error, "range");
  assert.equal(parseDurationInput("73", "hours").error, "range");
  assert.equal(parseDurationInput("90", "minutes", 60).error, "range");
});

test("switching display unit keeps 90 minutes as minutes", () => {
  assert.equal(displayUnitForMinutes(90), "minutes");
  assert.equal(displayUnitForMinutes(60), "hours");
  assert.equal(displayUnitForMinutes(1440), "hours");
});
