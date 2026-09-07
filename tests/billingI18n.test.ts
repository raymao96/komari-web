import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  billingErrorI18nKey,
  billingSaveFailedToast,
  localizeBillingError,
} from "../src/utils/billingI18n.ts";

const detailSource = readFileSync("src/pages/admin/NodeDetailPage.tsx", "utf8");
const locales = {
  zhCN: JSON.parse(readFileSync("src/i18n/locales/zh_CN.json", "utf8")),
  zhTW: JSON.parse(readFileSync("src/i18n/locales/zh_TW.json", "utf8")),
  en: JSON.parse(readFileSync("src/i18n/locales/en.json", "utf8")),
  ja: JSON.parse(readFileSync("src/i18n/locales/ja_JP.json", "utf8")),
};

test("fee dialogs allow zero without a greater-than-zero check", () => {
  assert.match(detailSource, /disabled=\{saving \|\| !amount\.trim\(\)\}/);
  assert.doesNotMatch(detailSource, /amount.*>\s*0|greater than zero|必须大于/);
  assert.match(detailSource, /billingSaveFailedToast/);
  assert.match(
    readFileSync("src/utils/billingI18n.ts", "utf8"),
    /defaultValue\?: string \| Record<string, unknown>/,
  );
});

test("billing API English strings map to locale keys in every language", () => {
  assert.equal(
    billingErrorI18nKey(
      "Invalid billing request: invalid billing input: amount must be greater than zero",
    ),
    "billing.errors.amountMustNotBeNegative",
  );
  assert.equal(
    billingErrorI18nKey("invalid billing input: amount must not be negative"),
    "billing.errors.amountMustNotBeNegative",
  );
  const keys = [
    "amountMustNotBeNegative",
    "amountOutOfRange",
    "clientRequired",
    "currencyInvalid",
    "currencyMustBeCnyUsd",
    "invalidAmount",
    "invalidMonth",
    "reasonRequired",
    "reversalCannotVoid",
    "tooManyDecimals",
  ];
  for (const [name, locale] of Object.entries(locales)) {
    for (const key of keys) {
      const value = locale.billing?.errors?.[key]?.trim() ?? "";
      assert.notEqual(value, "", `${name} billing.errors.${key} is missing`);
    }
  }
  assert.equal(locales.zhCN.billing.errors.amountMustNotBeNegative, "金额不能为负数");
  assert.equal(locales.zhTW.billing.errors.amountMustNotBeNegative, "金額不能為負數");
  assert.equal(locales.en.billing.errors.amountMustNotBeNegative, "Amount cannot be negative");
  assert.equal(
    localizeBillingError(
      "Invalid billing request: invalid billing input: amount must not be negative",
      (key) => key,
    ),
    "billing.errors.amountMustNotBeNegative",
  );
  assert.match(
    billingSaveFailedToast(
      "admin.nodeDetail.oneTimeFeeSaveFailed",
      new Error("Invalid billing request: invalid billing input: amount must not be negative"),
      (key) => (key === "billing.errors.amountMustNotBeNegative" ? "金额不能为负数" : "费用录入失败"),
    ),
    /金额不能为负数/,
  );
});
