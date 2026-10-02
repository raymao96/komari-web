import assert from "node:assert/strict";
import test from "node:test";

import { remainingExpiryDays } from "../src/utils/billing.ts";
import {
  earlyRenewPayload,
  expiryFieldsIfChanged,
  formatInstantInTimezone,
  toExpiryLocalDateTime,
} from "../src/lib/expiryDateTime.ts";

test("remaining expiry days use ceil so sub-day remaining still counts as 1 day", () => {
  const day = 24 * 60 * 60 * 1000;
  const expire = Date.parse("2027-05-14T00:00:00.000Z");
  assert.equal(remainingExpiryDays(new Date(expire).toISOString(), expire - 23 * 60 * 60 * 1000), 1);
  assert.equal(remainingExpiryDays(new Date(expire).toISOString(), expire - 251.4 * day), 252);
  assert.equal(remainingExpiryDays(new Date(expire).toISOString(), expire), 0);
  assert.equal(remainingExpiryDays("2226-05-14T00:00:00.000Z", expire), null);
});

test("expiry local datetime keeps the named timezone clock", () => {
  const parts = formatInstantInTimezone("2026-10-01T13:30:45.000Z", "America/New_York");
  assert.deepEqual(parts, { date: "2026-10-01", time: "09:30:45" });
  assert.equal(toExpiryLocalDateTime("2026-10-01", "09:30:45"), "2026-10-01T09:30:45");
});

test("year 0001 placeholder formats as a four-digit local date", () => {
  const parts = formatInstantInTimezone("0001-01-01T00:00:00Z", "Asia/Shanghai");
  assert.ok(parts);
  assert.match(parts.date, /^0001-\d{2}-\d{2}$/);
  const local = toExpiryLocalDateTime(parts.date, parts.time);
  assert.ok(local);
  assert.match(local, /^0001-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.equal(
    expiryFieldsIfChanged({
      timezone: "Asia/Shanghai",
      localDateTime: local,
      openedTimezone: "Asia/Shanghai",
      openedLocal: local,
    }),
    null,
  );
});

test("early renew payload keeps the seen expiry and does not invent the next due", () => {
  const expiredAt = "2026-10-21T11:00:00.000Z";
  const payload = earlyRenewPayload(expiredAt);
  assert.deepEqual(payload, {
    renew_expiry: true,
    _match_expired_at: expiredAt,
  });
  assert.equal("expired_at" in payload, false);
  assert.equal("expiry_local_datetime" in payload, false);
  assert.equal("expiry_timezone" in payload, false);
});

