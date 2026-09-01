import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getRegionCode } from "../src/utils/regionHelper.ts";

const editSource = readFileSync(path.resolve("src/pages/admin/index.tsx"), "utf8");
const adminNodesSource = readFileSync(
  path.resolve("src/contexts/NodeDetailsContext.tsx"),
  "utf8",
);
const selectSource = readFileSync(
  path.resolve("src/components/ui/select-or-input.tsx"),
  "utf8",
);

test("reset traffic requires a billing reset day and shows the effective quota", () => {
  assert.match(editSource, /trafficResetAllowance > 0 && \(trafficResetDay < 1 \|\| trafficResetDay > 31\)/);
  assert.match(editSource, /trafficEffectiveFormula/);
  assert.match(editSource, /trafficResetReportNotice/);
  assert.match(editSource, /payload\.traffic_reset_day = trafficResetDay/);
  assert.doesNotMatch(
    editSource,
    /if \(trafficResetDay !== \(node\.traffic_reset_day \?\? 0\)\)/,
  );
  assert.match(editSource, /trafficResetAllowance !== \(node\.traffic_reset_allowance \?\? 0\)/);
  assert.match(editSource, /aria-label=\{t\("admin\.nodeEdit\.trafficResetDay"\)\}/);
  assert.match(editSource, /aria-label=\{t\("admin\.nodeEdit\.trafficResetAllowance"\)\}/);
  assert.match(editSource, /trafficResetDay[\s\S]*text-sm font-semibold leading-5/);
  assert.match(editSource, /space-y-2 pb-3 pt-2/);
  assert.doesNotMatch(editSource, /trafficResetType|traffic_reset_type/);
});

test("system node data keeps the effective cycle quota", () => {
  assert.match(adminNodesSource, /effective_traffic_limit: number;/);
  assert.match(adminNodesSource, /effective_traffic_type: "sum" \| "max" \| "min" \| "up" \| "down";/);
  assert.match(adminNodesSource, /fetch\("\/api\/admin\/client\/list"/);
  assert.doesNotMatch(adminNodesSource, /common:getNodes/);
});

test("new nodes default the edit form traffic accounting mode to sum", () => {
  assert.match(editSource, /defaultValue=\{node\.traffic_limit_type \|\| "sum"\}/);
  assert.doesNotMatch(editSource, /defaultValue=\{node\.traffic_limit_type \|\| "max"\}/);
});

test("every admin language explains reset quota behavior", () => {
  for (const locale of ["en", "ja_JP", "zh_CN", "zh_TW"]) {
    const translations = JSON.parse(
      readFileSync(path.resolve(`src/i18n/locales/${locale}.json`), "utf8"),
    );
    const nodeEdit = translations.admin.nodeEdit;
    assert.ok(nodeEdit.trafficResetDayRequired, locale);
    assert.ok(nodeEdit.trafficEffectiveFormula, locale);
    assert.ok(nodeEdit.trafficResetReportNotice, locale);
    assert.equal(nodeEdit.trafficResetType, undefined, locale);
  }
  const zhCN = JSON.parse(
    readFileSync(path.resolve("src/i18n/locales/zh_CN.json"), "utf8"),
  );
  assert.equal(zhCN.admin.nodeEdit.trafficResetAllowance, "重置流量额度");
});

test("country selector searches by ISO code and renders local flag assets", () => {
  assert.equal(getRegionCode("🇭🇰"), "HK");
  assert.equal(getRegionCode("hk"), "HK");
  assert.match(editSource, /icon: <Flag flag=\{code\} compact \/>/);
  assert.match(editSource, /value: code/);
  assert.match(selectSource, /selectedOption\?\.icon/);
  assert.match(selectSource, /\{option\.icon\}/);
});
