import assert from "node:assert/strict";
import test from "node:test";

import { getRegionCode, getRegionDisplayName, isRegionMatch } from "../src/utils/regionHelper.ts";

test("getRegionCode returns a stable fallback for missing or invalid regions", () => {
  assert.equal(getRegionCode(undefined), "UN");
  assert.equal(getRegionCode(null), "UN");
  assert.equal(getRegionCode(""), "UN");
  assert.equal(getRegionCode("unknown"), "UN");
});

test("getRegionCode normalizes ISO codes and flag emoji", () => {
  assert.equal(getRegionCode("us"), "US");
  assert.equal(getRegionCode("🇸🇬"), "SG");
  assert.equal(getRegionCode("🇲🇴"), "MO");
});

test("getRegionDisplayName localizes Macao from flag emoji and ISO code", () => {
  assert.equal(getRegionDisplayName("🇲🇴", "zh"), "澳门");
  assert.equal(getRegionDisplayName("MO", "zh"), "澳门");
  assert.equal(getRegionDisplayName("🇲🇴", "en"), "Macao");
  assert.equal(isRegionMatch("🇲🇴", "澳门"), true);
  assert.equal(isRegionMatch("MO", "澳门"), true);
});
