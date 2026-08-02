import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(
  path.resolve("src/pages/terminal/FileManager.tsx"),
  "utf8",
);

test("the existing multi-selection context menu can download selected files", () => {
  assert.match(source, /<Download size=\{15\} \/>下载所选文件/);
  assert.match(
    source,
    /disabled=\{!actionableEntries\.some\(\(entry\) => !entry\.directory && !entry\.symlink\)\}/,
  );
  assert.match(source, /onClick=\{downloadSelected\}/);
});
