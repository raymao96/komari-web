import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  HOME_PROBE_TASK_LIMIT,
  normalizeHomeProbeTaskIds,
  orderHomeProbePickerTasks,
  parseHomeProbeTaskOverrides,
} from "../src/utils/homeProbeTasks.ts";

test("theme homepage probe overrides keep at most four unique task ids", () => {
  assert.equal(HOME_PROBE_TASK_LIMIT, 4);
  assert.deepEqual(normalizeHomeProbeTaskIds([2, "2", 0, 5, 1, 9, 8]), [2, 5, 1, 9]);
  assert.deepEqual(parseHomeProbeTaskOverrides({ a: [3, 1], b: [] }), { a: [3, 1] });
});

test("homepage probe picker lists selected tasks from 1 to n top to bottom", () => {
  const tasks = [{ id: 7 }, { id: 6 }, { id: 5 }, { id: 9 }];
  assert.deepEqual(
    orderHomeProbePickerTasks(tasks, ["5", "6", "7"]).map((task) => task.id),
    [5, 6, 7, 9],
  );
  assert.deepEqual(
    orderHomeProbePickerTasks(tasks, []).map((task) => task.id),
    [7, 6, 5, 9],
  );
});

test("homepage probe overrides stay in theme settings and do not edit ping tasks", () => {
  const field = readFileSync(
    new URL("../src/components/admin/ServerPingTaskOverridesField.tsx", import.meta.url),
    "utf8",
  );
  const managed = readFileSync(
    new URL("../src/pages/admin/theme_managed.tsx", import.meta.url),
    "utf8",
  );
  const zh = JSON.parse(
    readFileSync(new URL("../src/i18n/locales/zh_CN.json", import.meta.url), "utf8"),
  ) as { theme?: { home_probe_order_hint?: string } };
  assert.doesNotMatch(field, /\/api\/admin\/ping/);
  assert.match(managed, /\/api\/admin\/theme\/settings/);
  assert.doesNotMatch(managed, /\/api\/admin\/ping/);
  assert.match(field, /compareNodesByBackendOrder/);
  assert.match(field, /orderHomeProbePickerTasks/);
  assert.match(field, /truncate text-xs/);
  assert.match(field, /max-w-full overflow-hidden/);
  assert.match(field, /overflow-x-hidden overflow-y-auto/);
  assert.doesNotMatch(field, /localeCompare/);
  assert.match(String(zh.theme?.home_probe_order_hint || ""), /不会改延迟监测/);
  assert.equal(zh.theme?.home_probe_default, "跟随延迟任务顺序");
});

test("homepage probe picker strings exist in all four admin locales", () => {
  const keys = [
    "home_probe_default",
    "home_probe_empty",
    "home_probe_max",
    "home_probe_move_down",
    "home_probe_move_up",
    "home_probe_order_hint",
    "home_probe_reset",
    "home_probe_search",
    "home_probe_selected",
    "home_probe_set",
  ];
  for (const file of ["zh_CN", "zh_TW", "en", "ja_JP"]) {
    const json = JSON.parse(
      readFileSync(new URL(`../src/i18n/locales/${file}.json`, import.meta.url), "utf8"),
    ) as { theme?: Record<string, string> };
    for (const key of keys) {
      const value = json.theme?.[key];
      assert.equal(typeof value, "string", `${file} missing theme.${key}`);
      assert.doesNotMatch(String(value), /^theme\./);
    }
  }
});
