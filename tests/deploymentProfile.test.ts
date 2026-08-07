import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(root, "src/pages/admin/index.tsx"),
  "utf8",
);
const nodeContextSource = fs.readFileSync(
  path.join(root, "src/contexts/NodeDetailsContext.tsx"),
  "utf8",
);
const globalCssSource = fs.readFileSync(
  path.join(root, "src/global.css"),
  "utf8",
);

test("deployment settings are restored and saved per node", () => {
  assert.match(source, /client\/\$\{node\.uuid\}\/deployment-profile/);
  assert.match(source, /cache: "no-store"/);
  assert.match(source, /body: JSON\.stringify\(\{ profile: deploymentProfile\(\) \}\)/);
});

test("deployment UI separates live dispatch from reinstall-only settings", () => {
  assert.match(source, /saveAndDispatch/);
  assert.match(source, /reinstallRequired/);
  assert.match(source, /onlineCollectionSettings/);
  for (const persistedOnly of [
    "disable_web_ssh",
    "disable_auto_update",
    "ignore_unsafe_cert",
    "get_ip_addr_from_nic",
    "enable_ghproxy",
    "enable_custom_dir",
    "enable_custom_service_name",
  ]) {
    assert.match(source, new RegExp(`${persistedOnly}:`));
  }
});

test("deployment section headings and dispatch action use consistent styling", () => {
  assert.match(
    source,
    /<Text size="3" weight="bold">\s*\{t\("admin\.nodeTable\.installationSettings"/,
  );
  assert.match(
    source,
    /<Text size="3" weight="bold">\s*\{t\("admin\.nodeTable\.onlineCollectionSettings"/,
  );
  assert.match(
    source,
    /<Button\s+mt="2"\s+variant="solid"[\s\S]*?admin\.nodeTable\.saveAndDispatch/,
  );
});

test("deployment UI shows only the current delivery state", () => {
  assert.match(source, /admin-deployment-delivery/);
  assert.match(source, /deliveryStatusTitle/);
  assert.match(source, /deliveryNotStarted/);
  assert.match(source, /admin-deployment-delivery-current/);
  assert.match(source, /deliveryPresentation\.label/);
  assert.match(source, /deliveryPresentation\.hint/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /deliverySteps\.map/);
  assert.doesNotMatch(source, /deliveryRevision[\s\S]*revision: deliveryState\.revision/);
});

test("server Agent column shows the matching delivery state below the version", () => {
  assert.match(source, /node\.deployment_status/);
  assert.match(source, /admin-agent-config-status/);
  assert.match(source, /admin\.nodeTable\.deliverySaved/);
  assert.match(source, /admin\.nodeTable\.deliverySent/);
  assert.match(source, /admin\.nodeTable\.deliveryApplied/);
  assert.match(source, /admin\.nodeTable\.deliveryFailed/);
  assert.match(nodeContextSource, /hydrateLegacyDeploymentStatuses/);
  assert.match(nodeContextSource, /Object\.hasOwn\(node, "deployment_status"\)/);
});

test("mobile Agent version and delivery state align left without changing desktop alignment", () => {
  assert.match(source, /className="admin-node-agent-cell[^"]*items-center[^"]*text-center/);
  assert.match(
    globalCssSource,
    /@media \(max-width: 767px\)[\s\S]*\.admin-node-table \.admin-node-agent-cell \{[\s\S]*align-items: flex-start !important;[\s\S]*text-align: left !important;/,
  );
});

test("deployment actions keep stable button content while a request is pending", () => {
  assert.match(source, /profileAction, setProfileAction/);
  assert.match(source, /aria-busy=\{profileAction === "dispatch"\}/);
  assert.match(source, /aria-busy=\{profileAction === "copy"\}/);
  assert.doesNotMatch(source, /loading=\{profileAction === "(?:dispatch|copy)"\}/);
  assert.doesNotMatch(source, /profileAction === "(?:dispatch|copy)" \|\|/);
  assert.doesNotMatch(source, /aria-disabled=\{Boolean\(profileAction\)\}/);
  assert.doesNotMatch(source, /savingProfile/);
});
