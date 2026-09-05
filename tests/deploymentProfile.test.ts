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
    "enable_remote_control",
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
  assert.match(source, /color=\{deliveryPresentation\.color\}/);
  assert.match(source, /<span className="text-xs">\{deliveryPresentation\.label\}<\/span>/);
  assert.match(globalCssSource, /\.admin-deployment-delivery-body \{[\s\S]*?align-items: center/);
  assert.match(globalCssSource, /\.admin-deployment-delivery-hint \{[^}]*align-items: center/);
  assert.match(globalCssSource, /\.admin-deployment-delivery-hint svg \{[^}]*display: block/);
  assert.doesNotMatch(globalCssSource, /\.admin-deployment-delivery-hint svg \{[^}]*margin-top/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /deliverySteps\.map/);
  assert.doesNotMatch(source, /admin-deployment-delivery-dot/);
  assert.doesNotMatch(source, /deliveryRevision[\s\S]*revision: deliveryState\.revision/);
  assert.doesNotMatch(globalCssSource, /admin-deployment-delivery-current\[data-status/);
});

test("server Agent column shows the matching delivery state below the version", () => {
  assert.match(source, /node\.deployment_status/);
  assert.match(source, /deploymentStatusPresentation/);
  assert.match(source, /color=\{deploymentStatusPresentation\.color\}/);
  assert.match(source, /size="1"[\s\S]*?variant="soft"[\s\S]*?className="text-sm"/);
  assert.match(source, /<label className="text-xs"/);
  assert.match(source, /admin\.nodeTable\.deliverySaved/);
  assert.match(source, /admin\.nodeTable\.deliverySent/);
  assert.match(source, /admin\.nodeTable\.deliveryApplied/);
  assert.match(source, /admin\.nodeTable\.deliveryFailed/);
  assert.match(source, /color: "blue"/);
  assert.match(source, /color: "orange"/);
  assert.match(source, /color: "green"/);
  assert.match(source, /color: "red"/);
  assert.match(source, /color: "gray"/);
  assert.doesNotMatch(globalCssSource, /admin-agent-config-status/);
  assert.match(nodeContextSource, /hydrateLegacyDeploymentStatuses/);
  assert.match(nodeContextSource, /Object\.hasOwn\(node, "deployment_status"\)/);
});

test("mobile node cards show the delivery state under the Agent version", () => {
  assert.match(source, /function SortableMobileCard/);
  assert.match(
    source,
    /function SortableMobileCard[\s\S]*deploymentStatusPresentation \?/,
  );
  assert.match(
    source,
    /t\("admin.nodeTable.agent", "Agent"\)[\s\S]*deploymentStatusPresentation\.label/,
  );
});

test("mobile Agent version and delivery state align left without changing desktop alignment", () => {
  assert.match(source, /className="admin-node-agent-cell[^"]*items-center[^"]*text-center/);
  assert.match(
    globalCssSource,
    /@media \(max-width: 1023px\)[\s\S]*\.admin-node-table \.admin-node-agent-cell \{[\s\S]*align-items: flex-start !important;[\s\S]*text-align: left !important;/,
  );
});

test("deployment actions keep stable button content while a request is pending", () => {
  assert.match(source, /profileAction, setProfileAction/);
  assert.match(source, /aria-busy=\{profileAction === "dispatch"\}/);
  assert.match(source, /aria-busy=\{tokenLoading \|\| profileAction === "copy"\}/);
  assert.doesNotMatch(source, /loading=\{profileAction === "(?:dispatch|copy)"\}/);
  assert.doesNotMatch(source, /profileAction === "(?:dispatch|copy)" \|\|/);
  assert.doesNotMatch(source, /aria-disabled=\{Boolean\(profileAction\)\}/);
  assert.doesNotMatch(source, /savingProfile/);
});

test("install commands always emit an explicit remote-control flag", () => {
  assert.match(source, /args\.push\("--enable-remote-control"\)/);
  assert.match(source, /args\.push\("--enable-remote-control=false"\)/);
  const falseFlagCount = source.split('args.push("--enable-remote-control=false")').length - 1;
  const trueFlagCount = source.split('args.push("--enable-remote-control")').length - 1;
  assert.equal(falseFlagCount, 2);
  assert.equal(trueFlagCount, 2);
});

test("one-click Agent install uses Lite-agent latest paths", () => {
  assert.match(source, /from "@\/utils\/agentInstall"/);
  assert.match(source, /liteAgentInstallScriptUrl\(/);
  assert.match(source, /LITE_AGENT_DOCKER_IMAGE/);
  assert.doesNotMatch(source, /komari-agent/);
  assert.doesNotMatch(source, /--install-version/);
  assert.doesNotMatch(source, /Lite-agent:2\./);
  assert.doesNotMatch(
    source,
    /raw\.githubusercontent\.com\/nuomiiiii\/komari-agent/,
  );
});

test("Agent command copy uses the Edge-compatible clipboard fallback", () => {
  assert.match(source, /import \{ writeClipboardText \} from "@\/utils\/clipboard"/);
  const copyStart = source.indexOf("writeClipboardText(generateCommand())");
  const saveStart = source.indexOf("const response = await fetch(", copyStart);
  assert.ok(copyStart >= 0 && saveStart > copyStart);
  assert.match(source, /\(value\) => \(\{ ok: true as const, value \}\)/);
  assert.match(source, /copyResult\.value\.confirmed/);
  assert.match(source, /installCommandCopyDenied/);
  assert.match(source, /installCommandCopyUnconfirmed/);
  assert.doesNotMatch(source, /navigator\.clipboard\.writeText\(generateCommand\(\)\)/);
});

test("mobile deployment copy shows an inline confirmed or failed result", () => {
  assert.match(source, /const isMobile = useIsMobile\(\)/);
  assert.match(source, /copyFeedback, setCopyFeedback/);
  assert.match(source, /isMobile && copyFeedback/);
  assert.match(source, /copyFeedback\.kind === "success"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /commandTextAreaRef\.current\?\.select\(\)/);
});
