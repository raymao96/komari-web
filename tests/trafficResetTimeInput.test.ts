import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyTrafficResetTimeDigit,
  applyTrafficResetTimeDigits,
  incomingClockDigits,
  moveTrafficResetTimeSegment,
  timeSegmentAtCursor,
  timeSegmentRange,
} from "../src/utils/trafficResetTimeInput.ts";

test("typing two hour digits selects minutes next", () => {
  const first = applyTrafficResetTimeDigit("00:00:00", 0, 0, 1);
  assert.deepEqual(first, { value: "01:00:00", segment: 0, typedCount: 1 });
  const second = applyTrafficResetTimeDigit(first.value, first.segment, first.typedCount, 2);
  assert.deepEqual(second, { value: "12:00:00", segment: 1, typedCount: 0 });
});

test("hour digits 3-9 complete immediately and jump to minutes", () => {
  assert.deepEqual(applyTrafficResetTimeDigit("00:00:00", 0, 0, 9), {
    value: "09:00:00",
    segment: 1,
    typedCount: 0,
  });
});

test("minutes and seconds jump after two digits", () => {
  const minute = applyTrafficResetTimeDigit("12:00:00", 1, 0, 3);
  assert.deepEqual(minute, { value: "12:03:00", segment: 1, typedCount: 1 });
  const minuteDone = applyTrafficResetTimeDigit(minute.value, minute.segment, minute.typedCount, 8);
  assert.deepEqual(minuteDone, { value: "12:38:00", segment: 2, typedCount: 0 });
  const second = applyTrafficResetTimeDigit(minuteDone.value, minuteDone.segment, minuteDone.typedCount, 1);
  const secondDone = applyTrafficResetTimeDigit(
    second.value,
    second.segment,
    second.typedCount,
    2,
  );
  assert.deepEqual(secondDone, { value: "12:38:12", segment: 2, typedCount: 0 });
});

test("clicking a clock field selects the two-digit segment", () => {
  assert.deepEqual(timeSegmentRange(0), { start: 0, end: 2 });
  assert.deepEqual(timeSegmentRange(1), { start: 3, end: 5 });
  assert.deepEqual(timeSegmentRange(2), { start: 6, end: 8 });
  assert.equal(timeSegmentAtCursor(0), 0);
  assert.equal(timeSegmentAtCursor(4), 1);
  assert.equal(timeSegmentAtCursor(7), 2);
  assert.equal(moveTrafficResetTimeSegment(0, 1), 1);
  assert.equal(moveTrafficResetTimeSegment(2, 1), 2);
  assert.equal(moveTrafficResetTimeSegment(0, -1), 0);
});

test("repeating a digit without a keydown guard jumps a whole segment", () => {
  const once = applyTrafficResetTimeDigit("00:00:00", 0, 0, 1);
  assert.deepEqual(once, { value: "01:00:00", segment: 0, typedCount: 1 });
  assert.deepEqual(applyTrafficResetTimeDigit(once.value, once.segment, once.typedCount, 1), {
    value: "11:00:00",
    segment: 1,
    typedCount: 0,
  });
});

test("digit stream fills later clock fields", () => {
  assert.deepEqual(applyTrafficResetTimeDigits("00:00:00", 0, 0, "123812"), {
    value: "12:38:12",
    segment: 2,
    typedCount: 0,
  });
});

test("mobile first key after 00 keeps only the typed digit", () => {
  assert.equal(incomingClockDigits("001", "00", true, 0), "1");
  assert.equal(incomingClockDigits("100", "00", true, 0), "1");
  assert.equal(incomingClockDigits("010", "00", true, 0), "1");
  assert.equal(incomingClockDigits("1", "00", true, 0), "1");
  assert.equal(incomingClockDigits("123812", "00", true, 0), "123812");
  assert.equal(incomingClockDigits("12", "1", false, 1), "2");
});

test("node edit and online collection use the segmented time field", () => {
  const source = readFileSync("src/pages/admin/index.tsx", "utf8");
  const fieldSource = readFileSync("src/components/admin/TrafficResetTimeField.tsx", "utf8");
  const partsSource = fieldSource.slice(
    fieldSource.indexOf("function TrafficResetTimeParts"),
    fieldSource.indexOf("function TrafficResetTimeSegments"),
  );
  assert.match(source, /<TrafficResetTimeField/);
  assert.match(fieldSource, /applyTrafficResetTimeDigit/);
  assert.match(fieldSource, /selectSegment/);
  assert.match(fieldSource, /pointer: coarse/);
  assert.match(fieldSource, /TrafficResetTimeParts/);
  assert.match(fieldSource, /keydownAppliedRef/);
  assert.match(fieldSource, /pointerSelectingRef/);
  assert.match(partsSource, /km-traffic-reset-time-parts/);
  assert.doesNotMatch(partsSource, /setSelectionRange/);
  assert.doesNotMatch(partsSource, /preventDefault/);
  assert.match(partsSource, /focusedSegmentRef/);
});
