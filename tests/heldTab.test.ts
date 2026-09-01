import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hookSource = readFileSync("src/hooks/useHeldTab.ts", "utf8");
const loadingSource = readFileSync("src/components/loading.tsx", "utf8");
const globalCss = readFileSync("src/global.css", "utf8");
const billingSource = readFileSync("src/pages/admin/billing.tsx", "utf8");
const loadSource = readFileSync("src/pages/admin/notification/load.tsx", "utf8");
const returnRouteSource = readFileSync("src/pages/admin/returnRoute.tsx", "utf8");
const reverseProxySource = readFileSync(
  "src/pages/admin/settings/reverse-proxy.tsx",
  "utf8",
);
const metricsSource = readFileSync("src/pages/admin/settings/metrics.tsx", "utf8");
const signOnSource = readFileSync("src/pages/admin/settings/sign-on.tsx", "utf8");

test("held tabs keep the previous sheet until the next one has data", () => {
  assert.match(hookSource, /return ready \? tab : held/);
  assert.match(billingSource, /useHeldTab\(tab, tabReady\)/);
  assert.match(billingSource, /displayTab === "monthly"/);
  assert.match(loadSource, /useHeldTab\(view, currentReady\)/);
  assert.match(returnRouteSource, /useHeldTab\(activeTab, tabReady\)/);
  assert.match(reverseProxySource, /useHeldTab\(activeTab, tabReady\)/);
  assert.match(metricsSource, /useHeldTab\(activeTab, tabReady\)/);
  assert.match(metricsSource, /hidden=\{displayTab !== "monitoring"\}/);
  assert.match(metricsSource, /prefetchMetricDefinitions/);
  assert.match(metricsSource, /prefetchDatabaseOverview/);
  assert.match(metricsSource, /activeTab !== "overview" \|\| overviewReady/);
  assert.match(metricsSource, /loading \|\| \(activeTab === displayTab && !tabReady\)/);
  assert.match(
    readFileSync("src/routes.ts", "utf8"),
    /prefetchDatabaseOverview/,
  );
});

test("full-page loading holds the previous admin route; in-page spinners do not", () => {
  assert.match(loadingSource, /inline = false/);
  assert.match(loadingSource, /data-admin-route-pending=\{inline \? undefined : "true"\}/);
  assert.match(signOnSource, /if \(loading\) \{\s*return <SettingsPageSkeleton \/>/);
  assert.match(
    signOnSource,
    /hydrated \? null : \(\s*<div data-admin-route-pending="true" hidden \/>/,
  );
  assert.doesNotMatch(signOnSource, /if \(loading \|\| !hydrated\)/);
  assert.doesNotMatch(signOnSource, /Loading inline/);
  const notificationSource = readFileSync(
    "src/pages/admin/settings/notification.tsx",
    "utf8",
  );
  assert.match(
    notificationSource,
    /if \(loading\) \{\s*return <SettingsPageSkeleton \/>/,
  );
  assert.match(
    notificationSource,
    /hydrated \? null : \(\s*<div data-admin-route-pending="true" hidden \/>/,
  );
  assert.doesNotMatch(notificationSource, /if \(loading \|\| !hydrated\)/);
  assert.doesNotMatch(notificationSource, /Loading inline/);
  assert.match(loadSource, /<Loading inline \/>/);
});

test("tab and route swaps do not fade through an empty frame", () => {
  const tabEnter = globalCss.match(
    /@keyframes admin-tab-panel-enter \{[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(tabEnter);
  assert.doesNotMatch(tabEnter, /opacity/);
  assert.match(
    globalCss,
    /\.admin-tab-panel\[data-state="active"\][\s\S]*?animation: none/,
  );
  assert.match(
    globalCss,
    /\.admin-route-view\[data-admin-route-active="false"\][\s\S]*?opacity: 0/,
  );
  assert.doesNotMatch(
    globalCss.match(
      /\.admin-route-view\[data-admin-route-active="false"\] \{[\s\S]*?\n\}/,
    )?.[0] || "",
    /visibility:\s*hidden/,
  );
});
