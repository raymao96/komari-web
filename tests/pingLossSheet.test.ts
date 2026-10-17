import assert from "node:assert/strict";
import test from "node:test";
import {
  alertEnableAfterSectionChange,
  applyPingLossSheet,
  settlePingLossForm,
  type PingLossSheetForm,
} from "../src/pages/admin/notification/pingLossSheet.ts";

const lossForm: PingLossSheetForm = {
  enable: true,
  lossEnabled: true,
  windowMinutes: 1,
  lossThreshold: 30,
  minimumSamples: 6,
  cooldownMinutes: 5,
  latencyEnabled: false,
  adaptiveBaselineEnabled: false,
  latencyWindowMinutes: 5,
  latencyMinimumSamples: 30,
  latencyCooldownMinutes: 30,
  fixedBaselineMs: 100,
  lowLatencyThresholdMs: 50,
  highLatencyThresholdMs: 200,
  lowerDeviationPercent: 25,
  upperDeviationPercent: 25,
  baselineWindowHours: 24,
  baselineMinimumSamples: 30,
};

const savedLatency: PingLossSheetForm = {
  ...lossForm,
  lossEnabled: false,
  windowMinutes: 2,
  lossThreshold: 8,
  minimumSamples: 4,
  cooldownMinutes: 10,
  latencyEnabled: true,
  adaptiveBaselineEnabled: true,
  latencyWindowMinutes: 15,
  latencyMinimumSamples: 40,
  latencyCooldownMinutes: 20,
  lowerDeviationPercent: 12,
  upperDeviationPercent: 35,
  baselineWindowHours: 48,
  baselineMinimumSamples: 80,
};

test("turning off the last anomaly disables the rule instead of rejecting the form", () => {
  const bothOn: PingLossSheetForm = { ...lossForm, lossEnabled: true, latencyEnabled: true, enable: true };
  assert.equal(alertEnableAfterSectionChange(false, true, false, true), true);
  assert.equal(alertEnableAfterSectionChange(false, false, false, true), false);
  assert.equal(alertEnableAfterSectionChange(true, false, true, false), true);

  const saved = { ...bothOn, latencyEnabled: false };
  const closingLoss: PingLossSheetForm = { ...saved, lossEnabled: false, enable: true };
  const settled = settlePingLossForm(applyPingLossSheet(saved, closingLoss, "loss"));
  assert.equal(settled.lossEnabled, false);
  assert.equal(settled.latencyEnabled, false);
  assert.equal(settled.enable, false);

  const closingLatency = settlePingLossForm(
    applyPingLossSheet({ ...bothOn, lossEnabled: false }, { ...bothOn, latencyEnabled: false, enable: true }, "latency"),
  );
  assert.equal(closingLatency.lossEnabled, false);
  assert.equal(closingLatency.latencyEnabled, false);
  assert.equal(closingLatency.enable, false);
});

test("saving packet loss keeps each server's existing latency configuration", () => {
  const merged = applyPingLossSheet(savedLatency, lossForm, "loss");
  assert.equal(merged.lossEnabled, true);
  assert.equal(merged.lossThreshold, 30);
  assert.equal(merged.minimumSamples, 6);
  assert.equal(merged.latencyEnabled, true);
  assert.equal(merged.adaptiveBaselineEnabled, true);
  assert.equal(merged.latencyWindowMinutes, 15);
  assert.equal(merged.upperDeviationPercent, 35);
  assert.equal(merged.baselineWindowHours, 48);
});

test("saving latency keeps each server's existing packet-loss configuration", () => {
  const latencyEdit: PingLossSheetForm = {
    ...lossForm,
    latencyEnabled: true,
    latencyWindowMinutes: 8,
    highLatencyThresholdMs: 400,
  };
  const savedLoss: PingLossSheetForm = {
    ...lossForm,
    windowMinutes: 3,
    lossThreshold: 12,
    minimumSamples: 9,
    cooldownMinutes: 7,
  };
  const merged = applyPingLossSheet(savedLoss, latencyEdit, "latency");
  assert.equal(merged.latencyEnabled, true);
  assert.equal(merged.latencyWindowMinutes, 8);
  assert.equal(merged.highLatencyThresholdMs, 400);
  assert.equal(merged.lossThreshold, 12);
  assert.equal(merged.minimumSamples, 9);
  assert.equal(merged.windowMinutes, 3);
  assert.equal(merged.cooldownMinutes, 7);
});
