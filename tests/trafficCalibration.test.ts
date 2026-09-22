import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(path.resolve("src/pages/admin/index.tsx"), "utf8");

test("traffic calibration action sits between billing and delete", () => {
  const billing = source.indexOf("<BillingButton node={node} />");
  const calibration = source.indexOf("<TrafficCalibrationButton node={node} />");
  const rotate = source.indexOf("<RotateTokenButton node={node} />");
  const deletion = source.indexOf("<DeleteButton node={node} />");
  assert.ok(billing >= 0);
  assert.ok(calibration > billing);
  assert.ok(rotate > calibration);
  assert.ok(deletion > rotate);
  assert.match(source, /<TrafficCalibrationButton node=\{node\} \/>/);
  assert.match(source, /<RotateTokenButton node=\{node\} \/>/);
});

test("calibration dialog keeps form state independent from node polling", () => {
  const calibrationSource = source.slice(
    source.indexOf("function TrafficCalibrationButton"),
    source.indexOf("function DeleteButton"),
  );
  assert.doesNotMatch(calibrationSource, /\[open, node\.uuid\]/);
  assert.match(calibrationSource, /const prepareCalibration = async \(\) =>/);
  assert.match(calibrationSource, /signal: controller\.signal/);
  assert.match(calibrationSource, /setOpen\(true\)/);
  assert.match(calibrationSource, /data\?\.snapshot/);
  assert.match(calibrationSource, /history_complete === false/);
  assert.match(calibrationSource, /disabled=\{!snapshot \|\| saving\}/);
  assert.doesNotMatch(calibrationSource, /disabled=\{!snapshot \|\| !available \|\| saving\}/);
  assert.match(calibrationSource, /\(reason \|\| !available\)/);
  assert.match(calibrationSource, /setAvailable\(true\)/);
  assert.match(calibrationSource, /historyIncomplete/);
  assert.match(source, /target_up: up/);
  assert.match(source, /target_down: down/);
  assert.match(source, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(source, /max-h-\[88vh\] overflow-y-auto/);
  assert.doesNotMatch(calibrationSource, /twoFactor|2fa_code/);
  assert.match(calibrationSource, /<strong className="font-semibold"/);
  assert.match(source, /snapshot\.cycle_start/);
  assert.match(source, /formatTrafficCalibrationCycleRange/);
  assert.match(calibrationSource, /node\.traffic_reset_day/);
  assert.match(calibrationSource, /node\.traffic_reset_time/);
  assert.match(calibrationSource, /node\.traffic_reset_timezone/);
  assert.match(calibrationSource, /cycleLabel\.timezone/);
  assert.match(calibrationSource, /cycleLabel\.start/);
  assert.match(calibrationSource, /cycleLabel\.next/);
  assert.match(calibrationSource, /md:justify-between/);
  assert.match(
    calibrationSource,
    /<Badge color="blue" variant="soft"[\s\S]{0,80}admin\.nodeTable\.trafficCalibration\.currentCycle/,
  );
  assert.doesNotMatch(
    calibrationSource.slice(
      calibrationSource.indexOf("currentCycle"),
      calibrationSource.indexOf("summaryItems.map"),
    ),
    /border-l-2/,
  );
});

test("all admin languages include the complete traffic calibration copy", () => {
  const required = [
    "title", "description", "currentCycle", "raw", "adjustment", "effective",
    "targetUp", "targetDown", "syncNotice", "history", "save", "saved",
    "invalidValue", "resetDayRequired", "historyIncomplete",
  ];
  for (const locale of ["en", "ja_JP", "zh_CN", "zh_TW"]) {
    const translations = JSON.parse(
      readFileSync(path.resolve(`src/i18n/locales/${locale}.json`), "utf8"),
    );
    const calibration = translations.admin.nodeTable.trafficCalibration;
    for (const key of required) assert.ok(calibration[key], `${locale}.${key}`);
  }
});

test("incomplete first-day history still loads snapshot and allows save", () => {
  const calibrationSource = source.slice(
    source.indexOf("function TrafficCalibrationButton"),
    source.indexOf("function DeleteButton"),
  );
  assert.match(calibrationSource, /history_complete === false/);
  assert.match(calibrationSource, /admin\.nodeTable\.trafficCalibration\.historyIncomplete/);
  assert.match(calibrationSource, /if \(data\?\.snapshot\)/);
  assert.match(calibrationSource, /setTargetUp\(formatBytes\(next\.effective\.up\)\)/);
  assert.match(calibrationSource, /disabled=\{!snapshot \|\| saving\}/);
  assert.doesNotMatch(calibrationSource, /nextAvailable && data\?\.snapshot/);
  assert.doesNotMatch(calibrationSource, /disabled=\{!snapshot \|\| !available/);
  assert.match(calibrationSource, /setReason\(""\)/);
  assert.match(calibrationSource, /toast\.success\(t\("admin\.nodeTable\.trafficCalibration\.saved"\)\)/);
});
