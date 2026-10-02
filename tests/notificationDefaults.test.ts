import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const offlineSource = readFileSync(
  "src/pages/admin/notification/offline.tsx",
  "utf8",
);
const pingLossSource = readFileSync(
  "src/pages/admin/notification/ping_loss.tsx",
  "utf8",
);
const trafficReportSource = readFileSync(
  "src/pages/admin/notification/traffic_report.tsx",
  "utf8",
);
const locales = ["en", "ja_JP", "zh_CN", "zh_TW"].map((locale) =>
  JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, "utf8")),
);

test("offline and traffic-report pages wait for their first fetch before replacing the current admin page", () => {
  const offlineContext = readFileSync(
    "src/contexts/NotificationContext.tsx",
    "utf8",
  );
  const trafficContext = readFileSync(
    "src/contexts/TrafficReportContext.tsx",
    "utf8",
  );
  assert.match(offlineContext, /useState<boolean>\(true\)/);
  assert.match(trafficContext, /useState<boolean>\(true\)/);
  assert.match(offlineSource, /if \(onLoading \|\| onNodeLoading\) \{\s*return <Loading/);
  assert.match(
    trafficReportSource,
    /if \(onLoading \|\| onNodeLoading \|\| settingsLoading\) \{\s*return <Loading/,
  );
});

test("notification pages expose future-server defaults through their edit fields", () => {
  assert.match(offlineSource, /Settings2/);
  assert.match(offlineSource, /\/api\/admin\/notification\/offline\/default/);
  assert.match(offlineSource, /default_config_description/);
  assert.match(pingLossSource, /Settings2/);
  assert.match(pingLossSource, /\/api\/admin\/notification\/ping-loss\/default/);
  assert.match(pingLossSource, /PingLossConfigurationFields/);
  assert.match(pingLossSource, /default_config_description/);
  assert.match(pingLossSource, /\/api\/admin\/notification\/ping-loss\/latency-default/);
  assert.match(pingLossSource, /default_latency_config_enabled/);
  assert.match(pingLossSource, /adaptiveBaselineEnabled \?/);
  assert.match(pingLossSource, /isRuleAlerting/);
  assert.match(trafficReportSource, /Settings2/);
  assert.match(
    trafficReportSource,
    /\/api\/admin\/notification\/traffic-report\/default/,
  );
  assert.match(trafficReportSource, /TrafficReportEditForm/);
  assert.match(trafficReportSource, /default_config_description/);
});

test("offline default dialog uses the same spacious field rhythm as latency defaults", () => {
  assert.match(offlineSource, /className="mt-4 flex flex-col gap-5"/);
  assert.match(offlineSource, /className="flex items-center justify-between gap-4"/);
  assert.match(offlineSource, /maxWidth="560px"/);
  assert.match(offlineSource, /const formId = React\.useId\(\)/);
});

test("traffic report dialogs share the spacious default configuration rhythm", () => {
  assert.match(trafficReportSource, /className="mt-4 flex flex-col gap-5"/);
  assert.match(
    trafficReportSource,
    /className="flex items-center justify-between gap-4"/,
  );
  assert.match(trafficReportSource, /<fieldset className="grid min-w-0 gap-3/);
  assert.match(trafficReportSource, /maxWidth="560px"/);
});

test("notification default controls are localized in every supported locale", () => {
  for (const locale of locales) {
    for (const section of [
      locale.notification.offline,
      locale.notification.ping_loss,
      locale.notification.traffic_report,
    ]) {
      assert.equal(typeof section.default_config, "string");
      assert.notEqual(section.default_config.trim(), "");
      assert.equal(typeof section.default_config_description, "string");
      assert.notEqual(section.default_config_description.trim(), "");
      assert.equal(typeof section.default_config_enabled, "string");
      assert.notEqual(section.default_config_enabled.trim(), "");
    }
    assert.equal(typeof locale.notification.ping_loss.default_latency_config_enabled, "string");
    assert.equal(typeof locale.notification.ping_loss.latency_anomaly, "string");
    assert.equal(typeof locale.notification.ping_loss.loss_anomaly, "string");
    assert.equal(typeof locale.notification.ping_loss.adaptive_baseline_enabled, "string");
    assert.equal(typeof locale.notification.ping_loss.fixed_baseline_ms, "string");
    assert.equal(typeof locale.notification.ping_loss.empty_active, "string");
    assert.notEqual(locale.notification.ping_loss.fixed_baseline_ms.trim(), "");
    assert.notEqual(locale.notification.ping_loss.empty_active.trim(), "");
  }
  const requiredPingLossKeys = Object.keys(locales[0].notification.ping_loss).sort();
  for (const locale of locales) {
    assert.deepEqual(Object.keys(locale.notification.ping_loss).sort(), requiredPingLossKeys);
    for (const key of requiredPingLossKeys) {
      assert.equal(typeof locale.notification.ping_loss[key], "string");
      assert.notEqual(locale.notification.ping_loss[key].trim(), "");
    }
  }
});

test("latency default dialog stays adaptive-only and the target editor hides the inactive mode", () => {
  assert.match(pingLossSource, /latency-default/);
  assert.match(pingLossSource, /adaptiveBaselineEnabled \?/);
  assert.match(pingLossSource, /low_latency_threshold_ms/);
  assert.match(pingLossSource, /fixed_baseline_ms/);
  assert.match(pingLossSource, /isRuleAlerting/);
  const defaultDialog = pingLossSource.slice(
    pingLossSource.indexOf("const PingLossDefaultDialog"),
    pingLossSource.indexOf("const ConfigurationDialog"),
  );
  assert.match(defaultDialog, /default_latency_config_enabled/);
  assert.doesNotMatch(defaultDialog, /low_latency_threshold_ms/);
  assert.doesNotMatch(defaultDialog, /fixed_baseline_ms/);
  assert.doesNotMatch(defaultDialog, /adaptive_baseline_enabled/);
  const editor = pingLossSource.slice(
    pingLossSource.indexOf("const PingLossConfigurationFields"),
    pingLossSource.indexOf("const PingLossDefaultDialog"),
  );
  assert.ok(
    editor.indexOf('t("notification.ping_loss.high_latency_threshold_ms")') <
      editor.indexOf('t("notification.ping_loss.low_latency_threshold_ms")'),
  );
  assert.ok(
    editor.indexOf('t("notification.ping_loss.upper_deviation_percent")') <
      editor.indexOf('t("notification.ping_loss.lower_deviation_percent")'),
  );
  assert.ok(
    defaultDialog.indexOf('t("notification.ping_loss.upper_deviation_percent")') <
      defaultDialog.indexOf('t("notification.ping_loss.lower_deviation_percent")'),
  );
});
