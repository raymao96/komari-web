import assert from "node:assert/strict";
import test from "node:test";

import {
  expiriesByDate,
  monthCells,
  monthExpiryGroups,
  renewalDayKey,
} from "../src/utils/renewalCalendar.ts";

test("October 2026 starts on Thursday, so the Monday grid has three blanks", () => {
  const cells = monthCells(2026, 10);
  assert.equal(cells[0].date, null);
  assert.equal(cells[3].date, "2026-10-01");
  assert.equal(cells[3].day, 1);
  assert.equal(cells.find((cell) => cell.date === "2026-10-31")?.day, 31);
  assert.equal(cells.length % 7, 0);
});

test("expiry dates follow each server timezone and skip open-ended servers", () => {
  assert.equal(renewalDayKey("2026-10-04T16:30:00Z", "Asia/Shanghai"), "2026-10-05");
  assert.equal(renewalDayKey("2026-10-04T16:30:00Z", "UTC"), "2026-10-04");
  assert.equal(renewalDayKey("0001-01-01T00:00:00Z", "Asia/Shanghai"), null);
  assert.equal(renewalDayKey("", "Asia/Shanghai"), null);
});

test("a month lists only that month, with names sorted", () => {
  const grouped = expiriesByDate([
    { uuid: "b", name: "beta", expiredAt: "2026-10-05T02:00:00Z", expiryTimezone: "Asia/Shanghai" },
    { uuid: "a", name: "alpha", expiredAt: "2026-10-05T01:00:00Z", expiryTimezone: "Asia/Shanghai" },
    { uuid: "c", name: "later", expiredAt: "2026-11-01T00:00:00Z", expiryTimezone: "Asia/Shanghai" },
    { uuid: "d", name: "forever", expiredAt: "9999-12-31T00:00:00Z", expiryTimezone: "Asia/Shanghai" },
  ]);
  const october = monthExpiryGroups(grouped, 2026, 10);
  assert.deepEqual(october.map((group) => group.date), ["2026-10-05"]);
  assert.deepEqual(october[0].servers.map((server) => server.name), ["alpha", "beta"]);
});
