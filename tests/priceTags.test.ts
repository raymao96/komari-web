import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/PriceTags.tsx", "utf8");

test("billing tags treat a missing expiry as long term", () => {
  assert.match(source, /remainingExpiryDays\(expired_at\)/);
  assert.match(source, /expirationDays === null/);
  assert.match(source, /t\("common\.long_term"\)/);
  assert.doesNotMatch(source, /Math\.ceil/);
  assert.doesNotMatch(source, /36500/);
});

test("free nodes keep expiry and omit the billing cycle", () => {
  assert.match(source, /const isFree = price == -1/);
  assert.match(source, /isFree\s*\n\s*\? t\("common\.free"\)/);
  assert.doesNotMatch(source, /t\("common\.free"\) : `\$\{currencyForDisplay/);
});

test("billing prices do not expose floating point noise", () => {
  assert.match(source, /price\.toFixed\(2\)/);
  assert.match(source, /\$\{displayPrice\}/);
});
