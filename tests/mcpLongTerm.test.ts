import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/pages/admin/remote-management/mcp.tsx", "utf8");
const authorizeSource = source.slice(source.indexOf("function MCPAuthorizeDialog("));

test("long-term MCP authorization stays unchecked until the administrator opts in", () => {
  assert.match(authorizeSource, /\[longTerm, setLongTerm\] = useState\(false\)/);
  assert.match(authorizeSource, /const useLongTerm = longTerm/);
  assert.match(authorizeSource, /setLongTerm\(false\)/);
  assert.match(authorizeSource, /checked=\{longTerm\}/);
  assert.match(authorizeSource, /"aria-describedby": "mcp-long-term-hint"/);
  assert.match(authorizeSource, /duration_minutes: durationMinutes,\s*long_term: useLongTerm,/);
  assert.match(source, /lease\.long_term \? <Badge color="blue">\{t\("mcp\.long_term_authorization"\)\}<\/Badge>/);
  assert.doesNotMatch(authorizeSource, /settings\.long_term_enabled === true \? \(/);
});

test("every UI locale explains that long-term authorization lasts until revoked", () => {
  for (const name of ["en", "zh_CN", "zh_TW", "ja_JP"]) {
    const pack = JSON.parse(readFileSync(`src/i18n/locales/${name}.json`, "utf8"));
    assert.equal(typeof pack.mcp.long_term_authorization, "string");
    assert.equal(pack.mcp.long_term_until_revoked, undefined);
    assert.equal(pack.mcp.long_term_authorization_hint.includes("2100"), false);
  }
});
