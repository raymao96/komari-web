import assert from "node:assert/strict";
import test from "node:test";

import {
  currencyForDisplay,
  currencyForStorage,
} from "../src/lib/currency.ts";

test("displays stored CAD as the Canadian dollar symbol", () => {
  assert.equal(currencyForDisplay("CAD"), "C$");
  assert.equal(currencyForDisplay("cad"), "C$");
  assert.equal(currencyForDisplay("CA$"), "C$");
});

test("displays stored HKD as HK$", () => {
  assert.equal(currencyForDisplay("HKD"), "HK$");
  assert.equal(currencyForDisplay("hkd"), "HK$");
  assert.equal(currencyForDisplay("HK$"), "HK$");
});

test("stores Canadian dollar display values as CAD", () => {
  assert.equal(currencyForStorage("C$"), "CAD");
  assert.equal(currencyForStorage("CA$"), "CAD");
  assert.equal(currencyForStorage(" cad "), "CAD");
});

test("stores Hong Kong dollar display values as HKD", () => {
  assert.equal(currencyForStorage("HK$"), "HKD");
  assert.equal(currencyForStorage("hk$"), "HKD");
  assert.equal(currencyForStorage(" hkd "), "HKD");
});

test("keeps other custom currencies unchanged", () => {
  assert.equal(currencyForDisplay("AUD"), "AUD");
  assert.equal(currencyForStorage(" kr "), "kr");
});
