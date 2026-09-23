import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { normalizeAdminPathname } from "../src/utils/adminPreload.ts";
import { getAdminRouteViewKey } from "../src/utils/adminRouteViewport.ts";

const routesSource = readFileSync(new URL("../src/routes.ts", import.meta.url), "utf8");
const renderProvidersSource = readFileSync(
  new URL("../src/utils/renderProviders.tsx", import.meta.url),
  "utf8",
);
const settingCardSource = readFileSync(
  new URL("../src/components/admin/SettingCard.tsx", import.meta.url),
  "utf8",
);
const notificationSource = readFileSync(
  new URL("../src/pages/admin/settings/notification.tsx", import.meta.url),
  "utf8",
);

test("upstream /admin/dashboard redirects to the Lite admin home", () => {
  assert.match(
    routesSource,
    /path:\s*"dashboard",\s*element:\s*React\.createElement\(AdminDashboard\)/,
  );
  const dashboardSource = readFileSync(
    new URL("../src/pages/admin/dashboard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(dashboardSource, /path === "\/admin\/dashboard"/);
  assert.match(dashboardSource, /navigate\("\/admin", \{ replace: true \}\)/);
  assert.equal(normalizeAdminPathname("/admin/dashboard"), "/admin");
  assert.equal(
    getAdminRouteViewKey({
      pathname: "/admin/dashboard",
      search: "",
      hash: "",
    }),
    "/admin",
  );
  assert.equal(
    getAdminRouteViewKey({
      pathname: "/admin/settings/dashboard",
      search: "",
      hash: "",
    }),
    "/admin/settings/dashboard",
  );
});

test("webhook option fields keep the selected HTTP method when saving", () => {
  assert.match(renderProvidersSource, /value=\{String\(fieldValue\)\}/);
  assert.match(renderProvidersSource, /valuesRef/);
  assert.match(
    settingCardSource,
    /const result: unknown = OnSave\(next, buttonRef\.current\);/,
  );
  assert.match(notificationSource, /}, \[currentMessageSender\]\);/);
});
