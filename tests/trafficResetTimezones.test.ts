import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTimezoneLabel,
  listTrafficResetTimezones,
  normalizeTrafficResetTimezone,
} from "../src/utils/trafficResetTimezones.ts";

test("traffic reset timezone list includes IANA zones with UTC offsets", () => {
  const zones = listTrafficResetTimezones(new Date("2026-01-15T00:00:00Z"));
  const values = zones.map((zone) => zone.value);
  const labels = new Map(zones.map((zone) => [zone.value, zone.label]));

  assert.ok(zones.length > 100, `expected a full IANA list, got ${zones.length}`);
  assert.equal(values[0], "Asia/Shanghai");
  assert.equal(labels.get("Asia/Shanghai"), "Asia/Shanghai (UTC+8)");
  assert.equal(labels.get("UTC"), "UTC (UTC)");
  assert.ok(!values.includes("Etc/UTC"));
  assert.ok(!values.includes("Etc/GMT"));
  for (const zone of [
    "Asia/Kolkata",
    "Asia/Dubai",
    "Europe/Moscow",
    "Africa/Cairo",
    "Pacific/Auckland",
    "America/Anchorage",
  ]) {
    assert.ok(values.includes(zone), `missing ${zone}`);
    assert.match(String(labels.get(zone)), new RegExp(`^${zone} \\(UTC[+-]`));
  }
});

test("timezone labels keep the IANA name searchable", () => {
  assert.equal(
    formatTimezoneLabel("Europe/London", new Date("2026-01-15T00:00:00Z")),
    "Europe/London (UTC+0)",
  );
});

test("UTC aliases collapse to a single UTC option", () => {
  assert.equal(normalizeTrafficResetTimezone("Etc/UTC"), "UTC");
  assert.equal(normalizeTrafficResetTimezone("Etc/GMT"), "UTC");
  assert.equal(normalizeTrafficResetTimezone("UTC"), "UTC");
});

test("dropdown labels are stored as IANA timezone names", () => {
  assert.equal(normalizeTrafficResetTimezone("Asia/Shanghai (UTC+8)"), "Asia/Shanghai");
  assert.equal(normalizeTrafficResetTimezone("Europe/London (UTC+0)"), "Europe/London");
  assert.equal(normalizeTrafficResetTimezone("UTC (UTC)"), "UTC");
  assert.equal(normalizeTrafficResetTimezone("  Asia/Tokyo (UTC+9)  "), "Asia/Tokyo");
});
