import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(
  new URL("../src/pages/admin/index.tsx", import.meta.url),
  "utf8",
);
const contextSource = readFileSync(
  new URL("../src/contexts/NodeDetailsContext.tsx", import.meta.url),
  "utf8",
);
const tokenSource = readFileSync(
  new URL("../src/lib/clientToken.ts", import.meta.url),
  "utf8",
);
const mainSource = readFileSync(
  new URL("../src/main.tsx", import.meta.url),
  "utf8",
);
const installDialogSource = indexSource.slice(
  indexSource.indexOf("function GenerateCommandButton"),
  indexSource.indexOf("function EditButton"),
);
const identityAuthSource = indexSource.slice(
  indexSource.indexOf("function NodeIdentityAuthDialog"),
  indexSource.indexOf("function RotateTokenButton"),
);

test("NodeDetail and node list context do not keep token", () => {
  assert.match(contextSource, /export type NodeDetail = \{/);
  assert.doesNotMatch(
    contextSource.slice(
      contextSource.indexOf("export type NodeDetail"),
      contextSource.indexOf("interface NodeDetailsContextType"),
    ),
    /^\s*token:/m,
  );
  assert.match(contextSource, /omitClientTokenFromNode/);
  assert.match(contextSource, /from "@\/lib\/clientToken"/);
  assert.match(contextSource, /fetch\("\/api\/admin\/client\/list"/);
  assert.doesNotMatch(contextSource, /localStorage|sessionStorage/);
});

test("install dialog fetches the stored token on demand", () => {
  assert.match(installDialogSource, /createInstallTokenSession/);
  assert.match(installDialogSource, /tokenAbortControllerRef/);
  assert.match(installDialogSource, /beginDeployTokenFetch\(node\.uuid\)/);
  assert.match(installDialogSource, /submitTwoFactor/);
  assert.match(installDialogSource, /closeDialog/);
  assert.doesNotMatch(installDialogSource, /openDialog\(node\.uuid\)/);
  assert.doesNotMatch(installDialogSource, /loadInstallToken\(/);
  assert.doesNotMatch(installDialogSource, /new AbortController\(\)\.signal/);
  assert.doesNotMatch(installDialogSource, /node\.token/);
  assert.doesNotMatch(installDialogSource, /useQuery|localStorage|sessionStorage/);
  assert.match(tokenSource, /cache: "no-store"/);
  assert.match(tokenSource, /X-2FA-Code/);
  assert.match(tokenSource, /isClientTokenTwoFactorInvalid/);
  assert.match(tokenSource, /omitClientTokenFromNode/);
  assert.doesNotMatch(tokenSource, /localStorage|sessionStorage|useQuery/);
});

test("install command cannot be copied without a loaded token", () => {
  assert.match(installDialogSource, /installCommandCopyAllowed/);
  assert.match(installDialogSource, /const copyBlocked = !installCommandCopyAllowed/);
  assert.match(installDialogSource, /copyCommand && copyBlocked/);
  assert.match(installDialogSource, /disabled=\{\s*copyBlocked/);
  assert.match(installDialogSource, /tokenLoadFailed/);
  assert.match(installDialogSource, /installTokenLoading/);
  assert.match(installDialogSource, /twoFactorInvalid/);
  assert.match(installDialogSource, /isClientTokenTwoFactorInvalid|submitTwoFactor/);
});

test("closing the dialog or switching nodes clears the token", () => {
  assert.match(installDialogSource, /tokenAbortControllerRef\.current\?\.abort\(\)/);
  assert.match(installDialogSource, /closeDialog\(\)/);
  assert.match(installDialogSource, /dispose\(\)/);
  assert.match(installDialogSource, /setOtpInput\(""\)/);
});

test("a newly created node can read its stored token from the dedicated endpoint", () => {
  assert.match(indexSource, /fetch\("\/api\/admin\/client\/add"/);
  assert.match(installDialogSource, /beginDeployTokenFetch\(node\.uuid\)/);
  assert.doesNotMatch(installDialogSource, /agent.*online|wait.*online/i);
  assert.match(tokenSource, /\/api\/admin\/client\/\$\{encodeURIComponent\(uuid\)\}\/token/);
});

test("node config dialog stays compact and uses the live-config hint", () => {
  assert.match(installDialogSource, /maxWidth="720px"/);
  assert.doesNotMatch(installDialogSource, /maxWidth=\{960\}/);
  assert.doesNotMatch(installDialogSource, /maxWidth=\{560\}/);
  assert.doesNotMatch(installDialogSource, /maxWidth=\{440\}/);
  assert.doesNotMatch(installDialogSource, /km-node-dialog-compact-field/);
  assert.match(
    installDialogSource,
    /部署完成后，保存后可直接下发/,
  );
  assert.doesNotMatch(
    installDialogSource,
    /<AdminTabLabel icon=\{<(Settings|Download)/,
  );
  const zhCN = JSON.parse(
    readFileSync(new URL("../src/i18n/locales/zh_CN.json", import.meta.url), "utf8"),
  );
  assert.equal(
    zhCN.admin.nodeTable.onlineApplicable,
    "部署完成后，保存后可直接下发",
  );
});

test("online config tab does not fetch the node token", () => {
  assert.match(installDialogSource, /useState<"online" \| "install">\("online"\)/);
  assert.match(installDialogSource, /admin\.nodeTable\.nodeConfig/);
  assert.match(installDialogSource, /nodeConfigIdentity/);
  assert.match(installDialogSource, /km-node-config-identity/);
  assert.match(installDialogSource, /km-node-config-identity-name/);
  assert.match(installDialogSource, /km-node-config-identity-ip/);
  assert.match(installDialogSource, /<Flag flag=\{node\.region\} compact/);
  assert.match(indexSource, /function nodePreferredAddress/);
  assert.match(indexSource, /const ipv4 = node\.ipv4\?\.trim\(\);\s*if \(ipv4\) return ipv4;/);
  assert.match(installDialogSource, /admin\.nodeTable\.onlineConfigTab/);
  assert.match(installDialogSource, /admin\.nodeTable\.deployCommandTab/);
  assert.match(installDialogSource, /dialogTab !== "install"/);
  assert.match(installDialogSource, /beginDeployTokenFetch\(node\.uuid\)/);
  assert.doesNotMatch(installDialogSource, /查看部署指令/);
  assert.doesNotMatch(installDialogSource, /twoFaEnabled/);
  assert.match(installDialogSource, /saveAndDispatch/);
});

test("deploy command 2FA uses dedicated identity keys and six digits", () => {
  assert.match(identityAuthSource, /identityAuthTitle/);
  assert.match(identityAuthSource, /identityAuthDescription/);
  assert.match(identityAuthSource, /identityAuthInput/);
  assert.match(identityAuthSource, /otpInput\.length !== 6/);
  assert.match(identityAuthSource, /login\.passkey/);
  assert.match(installDialogSource, /cancelDeployTwoFactor/);
  assert.match(installDialogSource, /setDialogTab\("online"\)/);
  assert.match(installDialogSource, /confirmAdminPasskey/);
  assert.match(installDialogSource, /submitPasskey/);
  assert.doesNotMatch(installDialogSource, /未开启 2FA 可留空/);
  assert.doesNotMatch(installDialogSource, /admin\.nodeTable\.twoFactorCode/);
});

test("deploy command 2FA only mounts while verifying and keeps password-manager attributes", () => {
  assert.match(installDialogSource, /disableEnforceFocus=\{needTwoFactor\}/);
  assert.match(identityAuthSource, /zIndex=\{1400\}/);
  assert.match(installDialogSource, /otpFieldId="admin-node-deploy-otp"/);
  assert.match(identityAuthSource, /name="one-time-code"/);
  assert.match(identityAuthSource, /autoComplete="one-time-code"/);
  assert.match(installDialogSource, /\{needTwoFactor \? \(/);
  assert.match(installDialogSource, /otpFieldRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(installDialogSource, /<>\s*<Dialog.Root\s+open=\{open\}/);
});

test("admin RPC2 mounts only after login", () => {
  assert.match(mainSource, /const AccountScopedRPC2/);
  assert.match(mainSource, /if \(!account\?\.logged_in\)/);
  assert.match(mainSource, /<RPC2Provider>\{children\}<\/RPC2Provider>/);
  assert.match(mainSource, /<AccountScopedRPC2>/);
});

const editDialogSource = indexSource.slice(
  indexSource.indexOf("function EditButton"),
  indexSource.indexOf("function BillingButton") !== -1
    ? indexSource.indexOf("function BillingButton")
    : indexSource.length,
);

test("unsaved traffic reset clock reverts before the dialog paints again", () => {
  assert.match(installDialogSource, /const revertTrafficResetClock = \(\) =>/);
  assert.match(installDialogSource, /revertTrafficResetClock\(\);\s*setOpen\(nextOpen\)/);
  assert.match(installDialogSource, /React\.useLayoutEffect\(\(\) => \{\s*if \(open\) return;\s*revertTrafficResetClock\(\);/);
  assert.match(editDialogSource, /const hydrateEditForm = \(\) =>/);
  assert.match(editDialogSource, /if \(next \|\| !pendingSavedEditRef\.current\) hydrateEditForm\(\)/);
  assert.match(editDialogSource, /React\.useLayoutEffect/);
  assert.match(editDialogSource, /pendingSavedEditRef/);
  assert.doesNotMatch(
    editDialogSource,
    /<Dialog\.Root open=\{open\} onOpenChange=\{setOpen\}>/,
  );
});
