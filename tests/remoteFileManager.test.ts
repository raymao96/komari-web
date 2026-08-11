import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(
  path.resolve("src/pages/terminal/FileManager.tsx"),
  "utf8",
);

test("file-manager checkboxes use the shared system control", () => {
  assert.match(source, /import \{ Checkbox \} from "@\/components\/ui\/checkbox"/);
  assert.doesNotMatch(source, /<input type="checkbox"/);
  assert.match(source, /<Checkbox checked=\{showHidden\}/);
  assert.match(source, /<Checkbox checked=\{selected\.has\(entry\.path\)\}/);
});

test("the existing multi-selection context menu can download selected files", () => {
  assert.match(source, /<Download size=\{15\} \/>下载所选文件/);
  assert.match(
    source,
    /disabled=\{!actionableEntries\.some\(\(entry\) => !entry\.directory && !entry\.symlink\)\}/,
  );
  assert.match(source, /onClick=\{downloadSelected\}/);
});
