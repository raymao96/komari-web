import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(
  path.resolve("src/pages/terminal/FileManager.tsx"),
  "utf8",
);

test("file manager reuses the shared table header and keeps multi-select rows", () => {
  assert.match(source, /Table container=\{false\} className="remote-file-table"/);
  assert.match(source, /<TableHeader>/);
  assert.match(source, /<TableHead>名称<\/TableHead>/);
  assert.match(source, /data-file-path=\{entry\.path\}/);
  assert.match(source, /import \{ Checkbox \} from "@\/components\/ui\/checkbox"/);
  assert.doesNotMatch(source, /<input type="checkbox"/);
  assert.match(source, /<Checkbox checked=\{showHidden\}/);
  assert.match(source, /<Checkbox\s+checked=\{selected\.has\(entry\.path\)\}/);
});

test("the existing multi-selection context menu can download selected files", () => {
  assert.match(source, /<Download size=\{15\} \/>下载所选文件/);
  assert.match(
    source,
    /disabled=\{!actionableEntries\.some\(\(entry\) => !entry\.directory && !entry\.symlink\)\}/,
  );
  assert.match(source, /onClick=\{downloadSelected\}/);
});
