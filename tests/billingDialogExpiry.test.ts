import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  billingSaveFollowUp,
  earlyRenewPayload,
  expiryFieldsIfChanged,
  toExpiryLocalDateTime,
} from "../src/lib/expiryDateTime.ts";

const indexSource = readFileSync(
  new URL("../src/pages/admin/index.tsx", import.meta.url),
  "utf8",
);
const detailSource = readFileSync(
  new URL("../src/pages/admin/NodeDetailPage.tsx", import.meta.url),
  "utf8",
);
const expiryLibSource = readFileSync(
  new URL("../src/lib/expiryDateTime.ts", import.meta.url),
  "utf8",
);
const billingButtonSource = indexSource.slice(
  indexSource.indexOf("function BillingButton"),
);

test("billing dialog hydrates from the latest node when opened", () => {
  assert.match(billingButtonSource, /hydrateBillingForm/);
  assert.match(billingButtonSource, /if \(next && !open\) hydrateBillingForm\(node\)/);
  assert.match(billingButtonSource, /if \(open\) hydrateBillingForm\(node\)/);
  assert.match(billingButtonSource, /openedExpiryRef/);
  assert.match(billingButtonSource, /key=\{formEpoch\}/);
  assert.match(billingButtonSource, /defaultChecked=\{autoRenewal\}/);
  assert.doesNotMatch(
    billingButtonSource,
    /defaultChecked=\{node\.auto_renewal/,
  );
  const firstPane = billingButtonSource.slice(
    billingButtonSource.indexOf("km-node-dialog-pane"),
    billingButtonSource.indexOf("admin.nodeTable.expiredAt"),
  );
  assert.match(firstPane, /admin\.nodeTable\.price/);
  assert.match(firstPane, /admin\.nodeTable\.currency/);
  assert.match(firstPane, /admin\.nodeTable\.billingCycle/);
});

test("billing expiry picker icons sit on the trailing edge", () => {
  const css = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");
  assert.match(css, /km-expiry-date input\[type="date"\]::-webkit-calendar-picker-indicator/);
  assert.match(css, /km-traffic-reset-time input\[type="time"\]::-webkit-calendar-picker-indicator/);
  assert.match(css, /display:\s*none/);
  const source = readFileSync(new URL("../src/pages/admin/index.tsx", import.meta.url), "utf8");
  assert.match(source, /km-datetime-picker-icon/);
  assert.match(source, /TextField\.Slot side="right"/);
  assert.match(
    css,
    /km-node-billing-dialog \.km-node-dialog-pane:first-child \{[\s\S]*padding-bottom:\s*0/,
  );
  assert.match(
    css,
    /km-node-billing-dialog \.km-node-dialog-pane \+ \.km-node-dialog-pane \{[\s\S]*border-top:\s*0[\s\S]*padding-top:\s*14px/,
  );
});

test("unmodified expiry drafts omit both expiry fields", () => {
  assert.equal(
    expiryFieldsIfChanged({
      timezone: "America/New_York",
      localDateTime: "2026-10-01T09:30:45",
      openedTimezone: "America/New_York",
      openedLocal: "2026-10-01T09:30:45",
    }),
    null,
  );
  assert.equal(
    expiryFieldsIfChanged({
      timezone: "Asia/Shanghai",
      localDateTime: "0001-01-01T08:00:00",
      openedTimezone: "Asia/Shanghai",
      openedLocal: "0001-01-01T08:00:00",
    }),
    null,
  );
});

test("changing timezone, date, or time submits both expiry fields", () => {
  assert.deepEqual(
    expiryFieldsIfChanged({
      timezone: "Asia/Shanghai",
      localDateTime: "2026-10-01T09:30:45",
      openedTimezone: "America/New_York",
      openedLocal: "2026-10-01T09:30:45",
    }),
    {
      expiry_timezone: "Asia/Shanghai",
      expiry_local_datetime: "2026-10-01T09:30:45",
    },
  );
  assert.deepEqual(
    expiryFieldsIfChanged({
      timezone: "America/New_York",
      localDateTime: "2026-11-01T09:30:45",
      openedTimezone: "America/New_York",
      openedLocal: "2026-10-01T09:30:45",
    }),
    {
      expiry_timezone: "America/New_York",
      expiry_local_datetime: "2026-11-01T09:30:45",
    },
  );
  assert.equal(
    expiryFieldsIfChanged({
      timezone: "America/New_York",
      localDateTime: null,
      openedTimezone: "America/New_York",
      openedLocal: "2026-10-01T09:30:45",
    }),
    "invalid",
  );
  assert.equal(toExpiryLocalDateTime("2026-10-01", "9:30"), null);
  assert.equal(
    expiryFieldsIfChanged({
      timezone: "Asia/Shanghai",
      localDateTime: toExpiryLocalDateTime("2026-10-01", "9:30"),
      openedTimezone: "Asia/Shanghai",
      openedLocal: "2026-10-01T00:00:00",
    }),
    "invalid",
  );
  assert.match(billingButtonSource, /expiryFieldsIfChanged/);
  assert.match(billingButtonSource, /Object\.assign\(payload, expiryFields\)/);
  assert.doesNotMatch(
    billingButtonSource,
    /body: JSON\.stringify\(\{[\s\S]*expiry_local_datetime: localDateTime/,
  );
});

test("HTTP failure does not close, refresh, or toast success", () => {
  assert.deepEqual(billingSaveFollowUp(false), {
    ok: false,
    close: false,
    refresh: false,
    toastSuccess: false,
  });
  assert.deepEqual(billingSaveFollowUp(true), {
    ok: true,
    close: true,
    refresh: true,
    toastSuccess: true,
  });
  assert.match(billingButtonSource, /billingSaveFollowUp\(response\.ok\)/);
  assert.match(detailSource, /billingSaveFollowUp\(response\.ok\)/);
  assert.ok(
    billingButtonSource.indexOf("if (!followUp.ok)") <
      billingButtonSource.indexOf("if (followUp.close)"),
  );
  const detailSave = detailSource.slice(
    detailSource.indexOf("const save = async"),
    detailSource.indexOf("const actionSx"),
  );
  assert.ok(
    detailSave.indexOf("if (!followUp.ok)") <
      detailSave.indexOf("admin.nodeEdit.saveSuccess"),
  );
});

test("early renew asks the server instead of inventing a local datetime", () => {
  const expiredAt = "2026-10-21T11:00:00.000Z";
  const payload = earlyRenewPayload(expiredAt);
  assert.deepEqual(payload, {
    renew_expiry: true,
    _match_expired_at: expiredAt,
  });
  assert.equal("expired_at" in payload, false);
  assert.equal("expiry_local_datetime" in payload, false);
  assert.equal("expiry_timezone" in payload, false);

  assert.match(detailSource, /earlyRenewPayload\(node\.expired_at\)/);
  assert.doesNotMatch(detailSource, /earlyRenewPayload\(\)/);
  const detailSave = detailSource.slice(
    detailSource.indexOf("const save = async"),
    detailSource.indexOf("const actionSx"),
  );
  assert.match(detailSave, /renew_expiry: true/);
  assert.match(detailSave, /_match_expired_at: next\._match_expired_at/);
  assert.doesNotMatch(detailSave, /earlyRenewPayload\(/);
  assert.doesNotMatch(expiryLibSource, /advanceExpiryLocalDateTime/);
  assert.match(detailSource, /isLongTermExpiry\(node\.expired_at\)/);
  assert.doesNotMatch(detailSource, /advanceExpiryLocalDateTime/);
  assert.doesNotMatch(detailSource, /expiry_local_datetime: next/);
});
