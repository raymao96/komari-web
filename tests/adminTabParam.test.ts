import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  nextAdminTabSearchParams,
  readAdminTabRaw,
  resolveAdminTabParam,
  shouldWriteAdminTabParam,
} from "../src/utils/adminTabParam.ts";

const TABS = ["tasks", "records", "rules"] as const;

test("keeps a known tab and falls back for anything else", () => {
  assert.equal(resolveAdminTabParam("records", TABS, "tasks"), "records");
  assert.equal(resolveAdminTabParam("nope", TABS, "tasks"), "tasks");
  assert.equal(resolveAdminTabParam(null, TABS, "tasks"), "tasks");
});

test("reads the primary query key before aliases", () => {
  const params = new URLSearchParams("view=current&tab=records");
  assert.equal(readAdminTabRaw(params, "tab", ["view"]), "records");
  assert.equal(readAdminTabRaw(new URLSearchParams("view=current"), "tab", ["view"]), "current");
  assert.equal(readAdminTabRaw(new URLSearchParams(), "tab", ["view"]), null);
});

test("writes the tab into the query and drops aliases and the default value", () => {
  const withYears = nextAdminTabSearchParams(
    new URLSearchParams("years=2026"),
    "monthly",
    "overview",
  );
  assert.equal(withYears.get("tab"), "monthly");
  assert.equal(withYears.get("years"), "2026");

  const defaulted = nextAdminTabSearchParams(withYears, "overview", "overview");
  assert.equal(defaulted.get("tab"), null);
  assert.equal(defaulted.get("years"), "2026");

  const migrated = nextAdminTabSearchParams(
    new URLSearchParams("view=current"),
    "current",
    "configuration",
    "tab",
    ["view"],
  );
  assert.equal(migrated.get("tab"), "current");
  assert.equal(migrated.get("view"), null);
});

test("does not rewrite the URL when the resolved tab is already represented", () => {
  assert.equal(
    shouldWriteAdminTabParam(new URLSearchParams("state=switched"), "tasks", TABS, "tasks"),
    false,
  );
  assert.equal(
    shouldWriteAdminTabParam(new URLSearchParams("tab=records&state=switched"), "records", TABS, "tasks"),
    false,
  );
  assert.equal(
    shouldWriteAdminTabParam(new URLSearchParams("state=switched"), "records", TABS, "tasks"),
    true,
  );
  assert.equal(
    shouldWriteAdminTabParam(new URLSearchParams("view=current"), "current", ["current", "configuration"] as const, "configuration", "tab", ["view"]),
    true,
  );
});

test("tab hook skips history.replaceState when the query already matches", () => {
  const source = readFileSync(new URL("../src/hooks/useAdminTabParam.ts", import.meta.url), "utf8");
  assert.match(source, /if \(!shouldWriteAdminTabParam\(/);
  assert.match(source, /useCallback/);
});

