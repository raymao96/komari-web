export type AlertSheet = "loss" | "latency";

export type PingLossSheetForm = {
  enable: boolean;
  lossEnabled: boolean;
  windowMinutes: number;
  lossThreshold: number;
  minimumSamples: number;
  cooldownMinutes: number;
  latencyEnabled: boolean;
  adaptiveBaselineEnabled: boolean;
  latencyWindowMinutes: number;
  latencyMinimumSamples: number;
  latencyCooldownMinutes: number;
  fixedBaselineMs: number;
  lowLatencyThresholdMs: number;
  highLatencyThresholdMs: number;
  lowerDeviationPercent: number;
  upperDeviationPercent: number;
  baselineWindowHours: number;
  baselineMinimumSamples: number;
};

export const applyPingLossSheet = <T extends PingLossSheetForm>(
  base: T,
  form: PingLossSheetForm,
  sheet: AlertSheet,
): T => {
  if (sheet === "loss") {
    return {
      ...base,
      enable: form.enable,
      lossEnabled: form.lossEnabled,
      windowMinutes: form.windowMinutes,
      lossThreshold: form.lossThreshold,
      minimumSamples: form.minimumSamples,
      cooldownMinutes: form.cooldownMinutes,
    };
  }
  return {
    ...base,
    enable: form.enable,
    latencyEnabled: form.latencyEnabled,
    adaptiveBaselineEnabled: form.adaptiveBaselineEnabled,
    latencyWindowMinutes: form.latencyWindowMinutes,
    latencyMinimumSamples: form.latencyMinimumSamples,
    latencyCooldownMinutes: form.latencyCooldownMinutes,
    fixedBaselineMs: form.fixedBaselineMs,
    lowLatencyThresholdMs: form.lowLatencyThresholdMs,
    highLatencyThresholdMs: form.highLatencyThresholdMs,
    lowerDeviationPercent: form.lowerDeviationPercent,
    upperDeviationPercent: form.upperDeviationPercent,
    baselineWindowHours: form.baselineWindowHours,
    baselineMinimumSamples: form.baselineMinimumSamples,
  };
};
