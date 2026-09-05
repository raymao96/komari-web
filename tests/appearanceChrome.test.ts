import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APPEARANCE_CHROME_DARK,
  APPEARANCE_CHROME_LIGHT,
  appearanceChromeColor,
} from "../src/theme/appearanceChrome.ts";

test("admin appearance chrome matches the header, not the brand accent", () => {
  assert.equal(APPEARANCE_CHROME_LIGHT, "#FFFFFF");
  assert.equal(APPEARANCE_CHROME_DARK, "#161C24");
  assert.equal(appearanceChromeColor(false), APPEARANCE_CHROME_LIGHT);
  assert.equal(appearanceChromeColor(true), APPEARANCE_CHROME_DARK);

  const html = readFileSync("index.html", "utf8");
  const main = readFileSync("src/main.tsx", "utf8");
  const css = readFileSync("src/global.css", "utf8");
  const chrome = readFileSync("src/components/admin/shell/ChromeActions.tsx", "utf8");
  const cards = readFileSync("src/components/admin/DashboardPanels.tsx", "utf8");
  const theme = readFileSync("src/theme/createAppTheme.ts", "utf8");

  assert.match(html, /theme-color" content="#FFFFFF"/);
  assert.match(html, /isDark \? "#161C24" : "#FFFFFF"/);
  assert.doesNotMatch(html, /theme-color" content="#0E86DD"/);
  assert.match(main, /flushSync/);
  assert.match(main, /applyAppearanceChrome/);
  assert.doesNotMatch(css, /lite-appearance-instant/);
  assert.match(
    chrome,
    /Sun className="size-\[18px\] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/,
  );
  assert.match(
    chrome,
    /Moon className="absolute size-\[18px\] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/,
  );
  assert.match(cards, /transition-\[border-color\]/);
  assert.doesNotMatch(cards, /km-admin-surface p-3 transition-colors/);
  assert.match(
    theme,
    /MuiOutlinedInput:[\s\S]*transition:\s*"border-color 180ms ease, box-shadow 180ms ease"/,
  );
  assert.match(theme, /&:-webkit-autofill, &:-webkit-autofill:hover/);
  assert.match(theme, /WebkitBoxShadow: `0 0 0 100px \$\{isLight \? INPUT_FILL : INPUT_FILL_DARK\} inset`/);
});
