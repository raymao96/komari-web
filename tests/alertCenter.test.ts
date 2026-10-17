import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../src/pages/admin/notification/center.tsx", import.meta.url),
  "utf8",
);
const menuConfig = JSON.parse(
  readFileSync(new URL("../src/config/menuConfig.json", import.meta.url), "utf8"),
);
const routesSource = readFileSync(new URL("../src/routes.ts", import.meta.url), "utf8");
const returnRouteSource = readFileSync(
  new URL("../src/pages/admin/returnRoute.tsx", import.meta.url),
  "utf8",
);

test("alert center sits below the cost center in the admin menu", () => {
  const paths = menuConfig.menu.map((item: { path: string }) => item.path);
  assert.equal(
    paths.indexOf("/admin/notification/center"),
    paths.indexOf("/admin/billing") + 1,
  );
  const notifications = menuConfig.menu.find(
    (item: { path: string; children?: { path: string }[] }) =>
      item.path === "/admin/notifications",
  );
  assert.equal(
    notifications?.children?.some(
      (item: { path: string }) => item.path === "/admin/notification/center",
    ),
    false,
  );
  assert.match(routesSource, /path: "center"/);
  assert.match(routesSource, /\/admin\/notification\/center/);
});

test("alert center aggregates four alert kinds and silence actions", () => {
  assert.match(pageSource, /\/api\/admin\/notification\/center/);
  assert.match(pageSource, /\/api\/admin\/notification\/center\/silence/);
  assert.match(pageSource, /"off" \| "24h" \| "3d" \| "7d" \| "forever"/);
  assert.match(pageSource, /kind_\$\{item\.kind\}/);
  assert.match(pageSource, /"offline"/);
  assert.match(pageSource, /"load"/);
  assert.match(pageSource, /"latency"/);
  assert.match(pageSource, /"return_route"/);
  assert.match(pageSource, /"silenced"/);
  assert.match(pageSource, /notification\.center\.tips/);
  assert.match(pageSource, /<Link to=\{item\.href\}/);
  assert.doesNotMatch(pageSource, /ExternalLink/);
  assert.match(pageSource, /w-\[18%\]">\{t\("notification.center.summary"\)\}/);
  assert.match(pageSource, /min-w-\[1080px\]/);
});

for (const locale of ["en", "ja_JP", "zh_CN", "zh_TW"]) {
  test(`${locale} includes alert-center copy`, () => {
    const messages = JSON.parse(
      readFileSync(
        new URL(`../src/i18n/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.equal(typeof messages.navigation.alert_center, "string");
    for (const key of [
      "title",
      "description",
      "kind_all",
      "kind_offline",
      "kind_load",
      "kind_latency",
      "kind_return_route",
      "kind_silenced",
      "tips",
    ]) {
      assert.equal(typeof messages.notification.center[key], "string", key);
      assert.notEqual(messages.notification.center[key].trim(), "", key);
    }
    for (const key of ["ranking_asc", "ranking_desc", "ranking_order"]) {
      assert.equal(typeof messages.admin_dashboard[key], "string", key);
    }
  });
}

test("the return-route rule library stacks on narrow screens", () => {
  assert.match(returnRouteSource, /direction=\{\{ xs: "column", sm: "row" \}\}/);
  assert.match(returnRouteSource, /break-words whitespace-normal/);
});
