import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/admin/AdminPanelBar.tsx",
  "utf8",
);

test("desktop update dialog gives release notes enough space", () => {
  assert.match(source, /min\(920px, calc\(100vw - 3rem\)\)/);
  assert.match(source, /max-h-\[min\(62dvh,620px\)\] overflow-y-auto/);
});

test("update dialog keeps its title, release body, and actions separated", () => {
  assert.match(source, /<header className="border-b/);
  assert.match(source, /<div className="divide-y text-sm">/);
  assert.match(source, /<footer className="flex items-center justify-end gap-2 border-t/);
});
