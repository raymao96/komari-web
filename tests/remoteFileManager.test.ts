import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  fileRootChoices,
  selectedRootValue,
} from "../src/pages/terminal/fileManagerPath.ts";

const source = readFileSync(
  path.resolve("src/pages/terminal/FileManager.tsx"),
  "utf8",
);

test("file chrome keeps parent, upload, and new as icon buttons on one left edge", () => {
  assert.match(source, /className="remote-file-up"/);
  assert.match(source, /<Upload size=\{14\} \/>/);
  assert.match(source, /<Plus size=\{14\} \/>/);
  assert.match(source, /\{t\("terminal\.files\.upload"\)\}/);
  assert.match(source, /\{t\("terminal\.files\.new"\)\}/);
  assert.doesNotMatch(source, /startIcon=\{<Upload/);
});

test("empty file directory has no decorative badge", () => {
  assert.match(source, /className="remote-file-empty"/);
  assert.match(source, /\{t\("terminal\.files\.empty"\)\}/);
  assert.doesNotMatch(source, /HardDrive/);
});

test("file manager reuses the shared table header and keeps multi-select rows", () => {
  assert.match(source, /Table container=\{false\} className="remote-file-table"/);
  assert.match(source, /<TableHeader>/);
  assert.match(source, /<TableHead>\{t\("common\.name"\)\}<\/TableHead>/);
  assert.match(source, /data-file-path=\{entry\.path\}/);
  assert.match(source, /import \{ Checkbox \} from "@\/components\/ui\/checkbox"/);
  assert.doesNotMatch(source, /<input type="checkbox"/);
  assert.match(source, /<Checkbox checked=\{showHidden\}/);
  assert.match(source, /className="remote-file-select"/);
  assert.match(source, /className="remote-file-name"/);
  assert.match(source, /<Checkbox\s+checked=\{selected\.has\(entry\.path\)\}/);
  assert.match(source, /toggleSelectAll/);
  assert.match(source, /checked=\{selectAllState\}/);
  assert.match(source, /common\.select_all/);
  assert.match(source, /hour12: false/);
  assert.match(source, /file\.upload\.cancel/);
  assert.match(source, /offset: sent/);
  assert.match(source, /className="remote-transfer-cancel"/);
  assert.match(source, /\{uploading && \(/);
  assert.match(source, /terminal\.files\.upload_cancelled/);
});

test("the existing multi-selection context menu can download selected files", () => {
  assert.match(source, /<Download size=\{15\} \/>\{t\("terminal\.files\.download_selected"\)\}/);
  assert.match(
    source,
    /disabled=\{!actionableEntries\.some\(\(entry\) => !entry\.directory && !entry\.symlink\)\}/,
  );
  assert.match(source, /onClick=\{downloadSelected\}/);
});

test("root dropdown uses home as a real path instead of an empty placeholder", () => {
  assert.match(source, /fileRootChoices\(roots, homePath, separator/);
  assert.match(source, /selectedRootValue\(currentPath, rootChoices, separator\)/);
  assert.doesNotMatch(source, /<option value="">\{t\("terminal\.files\.root"\)\}<\/option>/);
  assert.doesNotMatch(
    source,
    /onChange=\{\(event\) => event\.target\.value && void load\(event\.target\.value\)\}/,
  );
});

test("unix home matching filesystem root is a single selectable path", () => {
  const choices = fileRootChoices(["/"], "/", "/", "根目录");
  assert.deepEqual(choices, [{ value: "/", label: "根目录" }]);
  assert.equal(selectedRootValue("/", choices, "/"), "/");
});

test("home remains reachable after switching to a filesystem root", () => {
  const choices = fileRootChoices(["/"], "/root", "/", "根目录");
  assert.deepEqual(choices, [
    { value: "/root", label: "根目录" },
    { value: "/", label: "/" },
  ]);
  assert.equal(selectedRootValue("/", choices, "/"), "/");
  assert.equal(selectedRootValue("/root", choices, "/"), "/root");
  assert.equal(selectedRootValue("/var/log", choices, "/"), "");
});

test("windows drive roots stay distinct from the user home shortcut", () => {
  const choices = fileRootChoices(["C:\\", "D:\\"], "C:\\Users\\lite", "\\", "根目录");
  assert.deepEqual(choices, [
    { value: "C:\\Users\\lite", label: "根目录" },
    { value: "C:\\", label: "C:\\" },
    { value: "D:\\", label: "D:\\" },
  ]);
  assert.equal(selectedRootValue("C:\\", choices, "\\"), "C:\\");
  assert.equal(selectedRootValue("C:\\Users\\lite", choices, "\\"), "C:\\Users\\lite");
});
