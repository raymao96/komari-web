import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTrafficCalibrationCycleRange,
  formatTrafficResetRangeLabel,
  trafficResetCycleRange,
} from "../src/utils/trafficCycle.ts";

function beijing(isoDate: string, hour = 12): Date {
  return new Date(`${isoDate}T${String(hour).padStart(2, "0")}:00:00+08:00`);
}

test("reset day 1 on Aug 27 spans this month's 1st to next month's 1st", () => {
  const now = beijing("2026-08-27");
  assert.equal(formatTrafficResetRangeLabel(1, now), "8月1日 - 9月1日");
});

test("before this month's reset day uses last month as the cycle start", () => {
  const now = beijing("2026-08-20");
  assert.equal(formatTrafficResetRangeLabel(26, now), "7月26日 - 8月26日");
});

test("on the reset day the cycle starts today", () => {
  const now = beijing("2026-08-26", 0);
  assert.equal(formatTrafficResetRangeLabel(26, now), "8月26日 - 9月26日");
});

test("reset day 31 clamps to the last day of February", () => {
  const now = beijing("2026-03-15");
  assert.deepEqual(trafficResetCycleRange(31, now), {
    start: { year: 2026, month: 2, day: 28 },
    next: { year: 2026, month: 3, day: 31 },
  });
  assert.equal(formatTrafficResetRangeLabel(31, now), "2月28日 - 3月31日");
});

test("reset day 31 in a leap year uses February 29", () => {
  const now = beijing("2024-03-15");
  assert.equal(formatTrafficResetRangeLabel(31, now), "2月29日 - 3月31日");
});

test("disabled or missing reset day has no cycle range", () => {
  const now = beijing("2026-08-27");
  assert.equal(formatTrafficResetRangeLabel(0, now), null);
  assert.equal(formatTrafficResetRangeLabel(null, now), null);
  assert.equal(formatTrafficResetRangeLabel(undefined, now), null);
  assert.equal(formatTrafficResetRangeLabel(32, now), null);
});

test("UTC 12:38:12 does not flip the cycle until that instant", () => {
  const before = new Date("2026-09-15T12:38:11Z");
  assert.equal(
    formatTrafficResetRangeLabel(15, before, { time: "12:38:12", timezone: "UTC" }),
    "8月15日 12:38:12 - 9月15日 12:38:12",
  );
  const at = new Date("2026-09-15T12:38:12Z");
  assert.equal(
    formatTrafficResetRangeLabel(15, at, { time: "12:38:12", timezone: "UTC" }),
    "9月15日 12:38:12 - 10月15日 12:38:12",
  );
});

test("calibration cycle range includes timezone date and clock", () => {
  assert.deepEqual(
    formatTrafficCalibrationCycleRange("2026-08-31T16:00:00.000Z", {
      day: 1,
      time: "00:00:00",
      timezone: "Asia/Shanghai",
      language: "zh-CN",
    }),
    {
      timezone: "Asia/Shanghai (UTC+8)",
      start: "2026年9月1日 00:00:00",
      next: "2026年10月1日 00:00:00",
    },
  );
  assert.deepEqual(
    formatTrafficCalibrationCycleRange("2026-09-15T12:38:12.000Z", {
      day: 15,
      time: "12:38:12",
      timezone: "UTC",
      language: "zh-CN",
    }),
    {
      timezone: "UTC (UTC)",
      start: "2026年9月15日 12:38:12",
      next: "2026年10月15日 12:38:12",
    },
  );
});
