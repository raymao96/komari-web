import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loginSource = readFileSync(
  new URL("../src/components/admin/shell/AdminLoginPage.tsx", import.meta.url),
  "utf8",
);
const loginIdentitySource = readFileSync(
  new URL("../src/components/LoginIdentityHeader.tsx", import.meta.url),
  "utf8",
);
const mainSource = readFileSync(
  new URL("../src/main.tsx", import.meta.url),
  "utf8",
);
const adminAuthSource = readFileSync(
  new URL("../src/utils/adminAuth.ts", import.meta.url),
  "utf8",
);
const rpc2Source = readFileSync(
  new URL("../src/lib/rpc2.ts", import.meta.url),
  "utf8",
);
const rpc2ContextSource = readFileSync(
  new URL("../src/contexts/RPC2Context.tsx", import.meta.url),
  "utf8",
);

test("admin login is a standalone MUI page, not a dialog overlay", () => {
  assert.match(loginSource, /data-testid="admin-login-page"/);
  assert.match(loginSource, /data-testid="admin-login-toolbar"/);
  assert.match(loginSource, /data-testid="admin-login-card"/);
  assert.match(loginSource, /login\.heading/);
  assert.match(loginSource, /from "@mui\/material\/Card"/);
  assert.doesNotMatch(loginSource, /Dialog\.Root/);
  assert.doesNotMatch(loginSource, /<AppDialogContent/);
  assert.doesNotMatch(loginSource, /@radix-ui\/themes/);
});

test("login card does not use the framed favicon as a hero icon", () => {
  assert.doesNotMatch(loginSource, /width: 64, height: 64/);
  assert.match(
    loginIdentitySource,
    /getAppAssetUrl\("assets\/logo\.png\?v=lite-icon-0e86dd"\)/,
  );
});

test("login fields use localized placeholders", () => {
  assert.match(loginSource, /placeholder=\{t\("login\.username_placeholder"\)\}/);
  assert.match(loginSource, /placeholder=\{t\("login\.password_placeholder"\)\}/);
});

test("login and RPC stay on the current origin and keep session cookies", () => {
  assert.match(adminAuthSource, /sameOriginApiPath\("\/api\/login"\)/);
  assert.match(adminAuthSource, /sameOriginFetchInit\(/);
  assert.doesNotMatch(adminAuthSource, /isSensitiveTransportAllowed/);
  assert.doesNotMatch(loginSource, /isSensitiveTransportAllowed/);
  assert.match(loginSource, /sameOriginApiPath\("\/api\/oauth"\)/);
});

test("RPC2 follows the current page protocol and does not force HTTPS", () => {
  assert.match(
    rpc2Source,
    /window\.location\.protocol === "https:" \? "wss:" : "ws:"/,
  );
  assert.doesNotMatch(rpc2Source, /isSensitiveTransportAllowed/);
});

test("RPC2 waits for login before opening a socket, then reconnects after login", () => {
  assert.match(
    rpc2ContextSource,
    /new RPC2Client\("\/api\/rpc2", \{ autoConnect: false \}\)/,
  );
  assert.match(rpc2ContextSource, /shouldOpenRpc2Socket\(loggedIn\)/);
  assert.match(rpc2ContextSource, /client\.connect\(\)/);
  assert.match(rpc2ContextSource, /client\.pause\(\)/);
  assert.match(rpc2Source, /pause\(\): void/);
  assert.match(rpc2Source, /enableSessionReconnect\(\): void/);
  assert.match(rpc2Source, /private enableSessionReconnect/);
});

test("login chrome uses shared circular icon buttons and menus", () => {
  const chromeSource = readFileSync(
    new URL("../src/components/admin/shell/ChromeActions.tsx", import.meta.url),
    "utf8",
  );
  assert.match(loginSource, /<LanguageMenu \/>/);
  assert.match(loginSource, /<ThemeMenu \/>/);
  assert.match(chromeSource, /borderRadius: "50%"/);
  assert.match(chromeSource, /width: 40,\s+height: 40,\s+minWidth: 40/);
  assert.match(chromeSource, /AutoThemeIcon/);
  assert.match(chromeSource, /value: "light"/);
  assert.match(chromeSource, /value: "dark"/);
  assert.match(chromeSource, /value: "system"/);
  assert.doesNotMatch(chromeSource, /DarkModeOutlined/);
  assert.doesNotMatch(chromeSource, /LightModeOutlined/);
  assert.doesNotMatch(chromeSource, /BrightnessAuto/);
  assert.doesNotMatch(chromeSource, /SunMoon/);
});

test("login and admin chrome adapt to compact viewports", () => {
  const shellSource = readFileSync(
    new URL("../src/components/admin/shell/AdminShell.tsx", import.meta.url),
    "utf8",
  );
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const globalStyles = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");
  assert.match(loginSource, /max-width:599\.95px/);
  assert.match(loginSource, /100dvh/);
  assert.match(loginSource, /var\(--safe-area-top\)/);
  assert.match(shellSource, /var\(--safe-area-top\)/);
  assert.match(shellSource, /var\(--safe-area-bottom\)/);
  assert.match(
    shellSource,
    /min\(280px, calc\(100vw - 48px\)\)/,
  );
  assert.match(html, /viewport-fit=cover/);
  assert.match(mainSource, /useLayoutEffect/);
  assert.match(mainSource, /setAppearanceSynced/);
  assert.match(mainSource, /flushSync/);
  assert.match(html, /lite-standalone/);
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png/);
  assert.match(globalStyles, /--safe-area-top: 0px/);
  assert.match(globalStyles, /display-mode: standalone/);
  assert.match(globalStyles, /html\.lite-standalone/);
  assert.match(globalStyles, /--safe-area-top: env\(safe-area-inset-top, 0px\)/);
});

test("restricted guide routes provide public site information to the login card", () => {
  assert.match(
    mainSource,
    /isRestrictedGuideRoute \? \(\s*<PublicInfoProvider>[\s\S]*?\{routing\}[\s\S]*?<\/PublicInfoProvider>/,
  );
});

test("admin shell can preview the self-update dialog from the URL", () => {
  const shellSource = readFileSync(
    new URL("../src/components/admin/shell/useAdminShell.ts", import.meta.url),
    "utf8",
  );
  assert.match(shellSource, /isSelfUpdatePreview/);
  assert.match(shellSource, /previewUpdate/);
  assert.match(shellSource, /setUpdateDialogOpen\(true\)/);
  assert.match(shellSource, /setUpdateAvailable\(true\)/);
});
