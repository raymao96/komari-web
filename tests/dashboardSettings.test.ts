import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DASHBOARD_MODULE_IDS,
  DASHBOARD_PRESETS,
  FORMAL_DASHBOARD_MODULES,
  dashboardChartSections,
  dashboardModuleSpans,
  enabledDashboardModules,
  packDashboardModules,
  dashboardSettingsForPreset,
  dashboardSummarySections,
  sanitizeDashboardSettings,
} from "../src/utils/dashboardSettings.ts";

const dashboardSettingsSource = readFileSync(
  new URL("../src/pages/admin/settings/dashboard.tsx", import.meta.url),
  "utf8",
);
const dashboardSettingsHookSource = readFileSync(
  new URL("../src/hooks/useDashboardSettings.ts", import.meta.url),
  "utf8",
);
const routesSource = readFileSync(
  new URL("../src/routes.ts", import.meta.url),
  "utf8",
);
const mainSource = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const adminDashboardSource = readFileSync(
  new URL("../src/pages/admin/dashboard.tsx", import.meta.url),
  "utf8",
);
const dashboardPanelsSource = readFileSync(
  new URL("../src/components/admin/DashboardPanels.tsx", import.meta.url),
  "utf8",
);
const globalCssSource = readFileSync(
  new URL("../src/global.css", import.meta.url),
  "utf8",
);

test("overview preset exactly matches the default dashboard modules", () => {
  const settings = dashboardSettingsForPreset("overview");
  assert.deepEqual(FORMAL_DASHBOARD_MODULES, [
    "server_status",
    "traffic_summary",
    "storage_summary",
    "cost_center",
    "latency_trend",
    "traffic_trend",
    "billing_trend",
    "return_route",
    "alerts",
  ]);
  assert.deepEqual(
    settings.modules.filter((module) => module.enabled).map((module) => module.id),
    FORMAL_DASHBOARD_MODULES,
  );
  assert.equal(settings.refresh_seconds, 30);
  assert.equal(settings.chart_refresh_seconds, 30);
  assert.equal(settings.modules.find((module) => module.id === "storage_detail")?.enabled, false);
});

test("dashboard preview stacks on phones and restores the desktop grid", () => {
  assert.match(dashboardSettingsSource, /grid-cols-1[^\n]+sm:grid-cols-12/);
  assert.match(dashboardSettingsSource, /col-span-1 sm:col-span-3/);
  assert.match(dashboardSettingsSource, /col-span-1 sm:col-span-12/);
  assert.match(dashboardSettingsSource, /Select\.Item value="3"/);
});

test("formal dashboard stretches paired cards to equal row height", () => {
  assert.match(
    adminDashboardSource,
    /\["return_route", "alerts"\][\s\S]+?className="min-w-0 \[&>\*\]:h-full"/,
  );
});

test("alert overview columns follow the configured card span", () => {
  assert.match(adminDashboardSource, /data-dashboard-span=\{span\}/);
  assert.match(adminDashboardSource, /data-dashboard-span="6"/);
  assert.match(globalCssSource, /\.dashboard-alert-grid\s*\{[\s\S]*?repeat\(2,/);
  assert.match(globalCssSource, /\[data-dashboard-span="6"\] \.dashboard-alert-grid\s*\{[\s\S]*?repeat\(3,/);
  assert.match(globalCssSource, /\[data-dashboard-span="12"\] \.dashboard-alert-grid\s*\{[\s\S]*?repeat\(6,/);
});

test("traffic charts fill tall narrow grid cards without shrinking text", () => {
  assert.equal(
    dashboardPanelsSource.match(/@container flex h-full min-w-0 flex-col km-admin-surface/g)?.length,
    2,
  );
  assert.equal(
    dashboardPanelsSource.match(/className="min-h-\[220px\] w-full flex-1 aspect-auto"/g)?.length,
    2,
  );
  assert.equal(dashboardPanelsSource.match(/<PanelHeader[\s\S]+?responsive/g)?.length >= 2, true);
  assert.match(dashboardPanelsSource, /@max-\[28rem\]:flex-col/);
});

test("clickable route card fills its dashboard grid row", () => {
  assert.match(
    dashboardPanelsSource,
    /to="\/admin\/return-route"[\s\S]+?className="group block h-full[\s\S]+?<section className="h-full min-h-\[286px\]/,
  );
});

test("summary cards link to their pages and cost-center keeps its card on first paint", () => {
  assert.match(adminDashboardSource, /to="\/admin\/servers"/);
  assert.match(adminDashboardSource, /to="\/admin\/settings\/metrics"/);
  assert.match(adminDashboardSource, /to="\/admin\/billing"/);
  assert.match(adminDashboardSource, /getBillingSnapshot<BillingOverview>\(billingURL\)/);
  assert.match(
    adminDashboardSource,
    /case "cost_center":[\s\S]*?value=\{billing \? formatBillingMoney/,
  );
  assert.doesNotMatch(
    adminDashboardSource,
    /case "cost_center":[\s\S]*?SummaryCardSkeleton/,
  );
  assert.match(
    adminDashboardSource,
    /case "cost_center":[\s\S]*?<SummaryFooter>/,
  );
  assert.doesNotMatch(
    adminDashboardSource,
    /case "cost_center":[\s\S]*?truncate whitespace-nowrap/,
  );
  const prefetchSource = readFileSync(
    new URL("../src/utils/dashboardPrefetch.ts", import.meta.url),
    "utf8",
  );
  assert.ok(
    prefetchSource.indexOf("requestBillingCached") < prefetchSource.indexOf("await fetchDashboardSettings"),
    "billing overview should start before dashboard settings return",
  );
});

test("every built-in preset packs complete twelve-column rows", () => {
  for (const preset of DASHBOARD_PRESETS) {
    const packed = packDashboardModules(enabledDashboardModules(dashboardSettingsForPreset(preset.id)));
    let row = 0;
    for (const module of packed) {
      assert.ok(module.span >= 1 && module.span <= 12, `${preset.id}:${module.id}`);
      row += module.span;
      assert.ok(row <= 12, `${preset.id} overflows a row`);
      if (row === 12) row = 0;
    }
    assert.equal(row, 0, `${preset.id} leaves an incomplete row`);
  }
});

test("summary cards default to quarter width so four fit on one row", () => {
  const settings = dashboardSettingsForPreset("overview");
  const spans = dashboardModuleSpans(settings);
  assert.equal(spans.server_status, 3);
  assert.equal(spans.traffic_summary, 3);
  assert.equal(spans.storage_summary, 3);
  assert.equal(spans.cost_center, 3);
  assert.deepEqual(
    packDashboardModules(
      ["server_status", "traffic_summary", "storage_summary", "cost_center"],
      spans,
      false,
    ),
    [
      { id: "server_status", span: 3 },
      { id: "traffic_summary", span: 3 },
      { id: "storage_summary", span: 3 },
      { id: "cost_center", span: 3 },
    ],
  );
});

test("dashboard settings keep the previous admin page until the form has real data", () => {
  assert.doesNotMatch(dashboardSettingsSource, /SettingsPageSkeleton/);
  assert.match(dashboardSettingsSource, /data-admin-route-pending/);
  assert.match(dashboardSettingsSource, /getDashboardSettingsSnapshot/);
  assert.match(dashboardSettingsHookSource, /prefetchDashboardSettings/);
  assert.match(dashboardSettingsHookSource, /dashboardSettingsEqual/);
  assert.match(
    dashboardSettingsHookSource,
    /if \(!getDashboardSettingsSnapshot\(accountKey\)\) setLoading\(true\)/,
  );
  assert.match(routesSource, /prefetchDashboardSettings/);
  assert.match(
    mainSource,
    /preloadAdminRoute\("\/admin\/settings\/dashboard"\)/,
  );
});

test("dashboard first paint does not wait for charts or settings", () => {
  assert.doesNotMatch(
    adminDashboardSource,
    /if \(settingsLoading\) return;/,
  );
  assert.match(
    adminDashboardSource,
    /const initialDataPending = summarySections\.length > 0 && loading && !data;/,
  );
  assert.doesNotMatch(
    adminDashboardSource,
    /chartSections\.length > 0 && !charts && !chartsError/,
  );
  assert.match(
    adminDashboardSource,
    /settings\.refresh_seconds \* 1000/,
  );
  assert.match(
    adminDashboardSource,
    /settings\.chart_refresh_seconds \* 1000/,
  );
});

test("low resource preset avoids historical chart requests", () => {
  const settings = dashboardSettingsForPreset("lite");
  assert.deepEqual(dashboardChartSections(settings), []);
  assert.deepEqual(dashboardSummarySections(settings), ["servers", "resources", "storage", "alerts"]);
  assert.equal(settings.refresh_seconds, 60);
  assert.equal(settings.chart_refresh_seconds, 120);
});

test("latency jitter ranking requests only its two-minute chart section", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [{ id: "latency_jitter_ranking", enabled: true }],
    refresh_seconds: 30,
    chart_refresh_seconds: 120,
    ranking_limit: 5,
  });
  assert.deepEqual(dashboardChartSections(settings), ["latency_jitter"]);
  assert.deepEqual(dashboardSummarySections(settings), []);
});

test("packet loss ranking requests only its fifteen-minute chart section", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [{ id: "packet_loss_ranking", enabled: true }],
    refresh_seconds: 30,
    chart_refresh_seconds: 120,
    ranking_limit: 20,
  });
  assert.deepEqual(dashboardChartSections(settings), ["packet_loss"]);
  assert.deepEqual(dashboardSummarySections(settings), []);
});

test("packet loss normal state keeps its green confirmation icon and label together", () => {
  assert.match(
    dashboardPanelsSource,
    /items\.length === 0[\s\S]+?gap-2[\s\S]+?<CheckCircle2[\s\S]+?packet_loss_all_normal/,
  );
});

test("ranking navigation uses one full-row link without nested row buttons", () => {
  assert.match(dashboardPanelsSource, /function DashboardRankingItemLink[\s\S]+?<a[\s\S]+?href=\{href\}/);
  assert.equal(
    dashboardPanelsSource.match(/href=\{item\.detail_url\}/g)?.length,
    5,
  );
  assert.doesNotMatch(dashboardPanelsSource, /DashboardNodeNameLink/);
  assert.doesNotMatch(dashboardPanelsSource, /onClick=\{\(\) => (?:navigate|window\.location)/);
});

test("all historical ranking cards share one bounded responsive list layout", () => {
  assert.match(
    dashboardPanelsSource,
    /function DashboardRankingGrid[\s\S]+?limit >= 15[\s\S]+?@min-\[34rem\]:grid-cols-2/,
  );
  assert.equal(
    dashboardPanelsSource.match(/<DashboardRankingGrid limit=\{limit\}>/g)?.length,
    4,
  );
  assert.doesNotMatch(dashboardPanelsSource, /repeat\(auto-fit, minmax\(min\(100%, 13rem\), 1fr\)\)/);
});

test("all historical ranking cards share one fixed three-row item layout", () => {
  assert.match(
    dashboardPanelsSource,
    /function DashboardRankingItem[\s\S]+?grid-rows-\[1rem_0\.375rem_1rem\]/,
  );
  assert.match(
    dashboardPanelsSource,
    /function DashboardRankingItemLink[\s\S]+?px-1\.5 py-0\.5/,
  );
  assert.equal(
    dashboardPanelsSource.match(/<DashboardRankingItem\b/g)?.length,
    4,
  );
});

test("custom layout preserves a half-width trailing module without stretching it", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [{ id: "latency_trend", enabled: true, span: 6 }],
    refresh_seconds: 30,
    chart_refresh_seconds: 120,
    ranking_limit: 5,
    layout_columns: 12,
  });
  assert.deepEqual(
    packDashboardModules(enabledDashboardModules(settings), dashboardModuleSpans(settings), false),
    [{ id: "latency_trend", span: 6 }],
  );
});

test("legacy layouts that already show three summaries also unlock the cost-center card", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [
      { id: "server_status", enabled: true, span: 2 },
      { id: "traffic_summary", enabled: true, span: 2 },
      { id: "storage_summary", enabled: true, span: 2 },
      { id: "alerts", enabled: true, span: 3 },
    ],
    refresh_seconds: 30,
    chart_refresh_seconds: 30,
    ranking_limit: 5,
  });
  const costCenter = settings.modules.find((module) => module.id === "cost_center");
  assert.equal(costCenter?.enabled, true);
  assert.equal(costCenter?.span, 3);
  assert.equal(settings.modules.find((module) => module.id === "server_status")?.span, 3);
  assert.equal(
    settings.modules.findIndex((module) => module.id === "cost_center"),
    settings.modules.findIndex((module) => module.id === "storage_summary") + 1,
  );
});

test("stored disabled cost-center still unlocks when summaries are legacy thirds", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [
      { id: "server_status", enabled: true, span: 4 },
      { id: "traffic_summary", enabled: true, span: 4 },
      { id: "storage_summary", enabled: true, span: 4 },
      { id: "cost_center", enabled: false, span: 3 },
    ],
    refresh_seconds: 30,
    chart_refresh_seconds: 30,
    ranking_limit: 5,
    layout_columns: 12,
  });
  assert.equal(settings.modules.find((module) => module.id === "cost_center")?.enabled, true);
  assert.equal(settings.modules.find((module) => module.id === "server_status")?.span, 3);
});

test("custom cost-center order is left where the user placed it", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [
      { id: "server_status", enabled: true, span: 3 },
      { id: "traffic_summary", enabled: true, span: 3 },
      { id: "cost_center", enabled: true, span: 3 },
      { id: "storage_summary", enabled: true, span: 3 },
    ],
    refresh_seconds: 30,
    chart_refresh_seconds: 30,
    ranking_limit: 5,
    layout_columns: 12,
  });
  const ids = settings.modules.filter((module) => module.enabled).map((module) => module.id);
  assert.deepEqual(ids.slice(0, 4), [
    "server_status",
    "traffic_summary",
    "cost_center",
    "storage_summary",
  ]);
});

test("legacy six-column spans migrate to the twelve-column grid", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [
      { id: "server_status", enabled: true, span: 2 },
      { id: "latency_trend", enabled: true, span: 3 },
    ],
    refresh_seconds: 30,
    chart_refresh_seconds: 120,
    ranking_limit: 5,
  });
  assert.equal(settings.modules.find((module) => module.id === "server_status")?.span, 4);
  assert.equal(settings.modules.find((module) => module.id === "latency_trend")?.span, 6);
  assert.equal(settings.layout_columns, 12);
});

test("sanitizer preserves module order and rejects unsafe refresh values", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [
      { id: "alerts", enabled: true },
      { id: "server_status", enabled: true },
      { id: "alerts", enabled: false },
      { id: "unknown", enabled: true },
    ],
    refresh_seconds: 5,
    chart_refresh_seconds: 10,
    ranking_limit: 100,
  });
  assert.equal(settings.modules[0].id, "alerts");
  assert.equal(settings.modules[1].id, "server_status");
  assert.equal(settings.modules.length, DASHBOARD_MODULE_IDS.length);
  assert.equal(settings.refresh_seconds, 30);
  assert.equal(settings.chart_refresh_seconds, 30);
  assert.equal(settings.ranking_limit, 5);
});

test("refresh controls expose 15 through 120 seconds without the removed 300 second option", () => {
  assert.equal(
    dashboardSettingsSource.match(/\{\[15, 30, 60, 120\]\.map\(\(seconds\) => \(/g)?.length,
    2,
  );
  assert.doesNotMatch(dashboardSettingsSource, /\[60, 120, 300\]/);

  for (const refresh of [15, 30, 60, 120] as const) {
    const settings = sanitizeDashboardSettings({
      preset: "custom",
      modules: [{ id: "server_status", enabled: true }],
      refresh_seconds: refresh,
      chart_refresh_seconds: refresh,
      ranking_limit: 5,
    });
    assert.equal(settings.refresh_seconds, refresh);
    assert.equal(settings.chart_refresh_seconds, refresh);
  }
});

test("legacy 300 second chart refresh is capped at 120 seconds", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: [{ id: "latency_trend", enabled: true }],
    refresh_seconds: 30,
    chart_refresh_seconds: 300,
    ranking_limit: 5,
  });
  assert.equal(settings.chart_refresh_seconds, 120);
});

test("every live and historical module follows its corresponding refresh group", () => {
  const settings = sanitizeDashboardSettings({
    preset: "custom",
    modules: DASHBOARD_MODULE_IDS.map((id) => ({ id, enabled: true })),
    refresh_seconds: 15,
    chart_refresh_seconds: 15,
    ranking_limit: 5,
  });
  assert.deepEqual(
    dashboardSummarySections(settings),
    ["servers", "resources", "storage", "return_route", "alerts"],
  );
  assert.deepEqual(
    dashboardChartSections(settings),
    ["traffic", "latency", "latency_jitter", "packet_loss"],
  );
});

test("sanitizer preserves every supported ranking limit", () => {
  for (const rankingLimit of [5, 10, 15, 20] as const) {
    const settings = sanitizeDashboardSettings({
      preset: "custom",
      modules: [{ id: "resource_ranking", enabled: true }],
      refresh_seconds: 30,
      chart_refresh_seconds: 120,
      ranking_limit: rankingLimit,
    });
    assert.equal(settings.ranking_limit, rankingLimit);
  }
});
