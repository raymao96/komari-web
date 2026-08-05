import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/pages/admin/returnRoute.tsx", import.meta.url),
  "utf8",
);

test("联通线路选择使用 CUG 名称且不再暴露独立 10099", () => {
  assert.match(
    source,
    /unicom:\s*\["CUG VIP",\s*"CUG 优化",\s*"9929",\s*"4837"\]/,
  );
  assert.doesNotMatch(source, /unicom:\s*\[[^\]]*"10099"/);
});

test("编辑表单只在打开弹窗时读取任务数据", () => {
  assert.match(
    source,
    /const handleOpenChange = \(nextOpen: boolean\) => \{\s*if \(nextOpen\) setForm\(toTaskForm\(task\)\);\s*setOpen\(nextOpen\);\s*\};/,
  );
  assert.doesNotMatch(
    source,
    /useEffect\(\(\) => setForm\(toTaskForm\(task\)\), \[task, open\]\)/,
  );
});

test("回程任务、记录和规则表格使用圆角边框并适配手机卡片", () => {
  assert.match(source, /admin-responsive-table-wrap overflow-hidden rounded-md border border-\[var\(--gray-a5\)\]/);
  assert.match(source, /className="admin-responsive-table w-full min-w-\[1080px\]/);
  assert.match(source, /className="admin-responsive-table w-full min-w-\[1120px\]/);
  assert.match(source, /data-label="任务 \/ 节点"/);
  assert.match(source, /data-label="线路变化"/);
  assert.match(source, /data-label="操作" className="p-3"><Flex justify="start"/);
  assert.match(source, /<th className="py-3 pl-6 pr-3">操作<\/th>/);
  assert.doesNotMatch(source, /<th className="p-3 text-right">操作<\/th>/);
});

test("手机端回程任务把同一字段的主次信息保持在同一内容列", () => {
  assert.match(source, /data-label="任务 \/ 节点"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="运营商 \/ 地区"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="线路"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="最后探测"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="状态"[\s\S]*return-route-cell-content/);
});
