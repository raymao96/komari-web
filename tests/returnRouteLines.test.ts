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
    /const handleOpenChange = \(nextOpen: boolean\) => \{\s*if \(nextOpen\) \{\s*setForm\(toTaskForm\(task\)\);\s*setSelectedClients\(task\?\.client \? \[task\.client\] : \[\]\);\s*\}\s*setOpen\(nextOpen\);\s*\};/,
  );
  assert.doesNotMatch(
    source,
    /useEffect\(\(\) => setForm\(toTaskForm\(task\)\), \[task, open\]\)/,
  );
});

test("新建任务使用原选择框外观进行节点多选", () => {
  assert.match(source, /const \[selectedClients, setSelectedClients\] = useState<string\[]>/);
  assert.match(source, /function MultiNodeSelect/);
  assert.match(source, /<AdminMultiSelect/);
  assert.match(source, /placeholder="选择服务器（支持多选）"/);
  assert.match(source, /<MultiNodeSelect[\s\S]*value=\{selectedClients\}[\s\S]*onChange=\{setSelectedClients\}/);
  assert.doesNotMatch(source, /<NodeSelectorDialog/);
  assert.match(source, /for \(const client of clients\) \{[\s\S]*request\([\s\S]*"\/add"/);
  assert.match(source, /if \(task\?\.id\) \{\s*await request\("\/edit", toTaskPayload\(form\)\)/);
  assert.doesNotMatch(source, /find\([^\n]*carrier[^\n]*target/);
});

test("任务列表提供明确勾选和后端批量修改入口", () => {
  assert.match(source, /const \[selectedTaskIDs, setSelectedTaskIDs\] = useState<Set<number>>/);
  assert.match(source, /allVisibleTasksSelected \? "取消全选" : "全选"/);
  assert.match(source, /<span className="sr-only">选择<\/span>/);
  assert.doesNotMatch(source, /选择当前页全部任务/);
  assert.match(source, /<RouteTaskBatchDialog/);
  assert.match(source, />批量修改/);
  assert.match(source, /request\("\/edit\/batch", \{ ids, \.\.\.toTaskBatchPayload\(form\) \}\)/);
  assert.match(source, /任务名称和各自的探测节点保持不变/);
});

test("刷新后仍停留在当前监测页签，告警深链未指定页签时才回到任务", () => {
  assert.match(source, /useAdminTabParam\(\s*RETURN_ROUTE_TABS,\s*"tasks"/);
  assert.match(source, /if \(searchParams.get\("tab"\)\) return;/);
  assert.match(source, /if \(activeTab !== "tasks"\) setActiveTab\("tasks"\)/);
  assert.match(source, /setTaskQuery\(\(current\) => \(current\.page === 1 \? current : \{ \.\.\.current, page: 1 \}\)\)/);
  assert.match(source, /useHeldTab\(activeTab, tabReady\)/);
  assert.match(source, /value=\{displayTab\}/);
});

test("回程任务、记录和规则复用服务器列表的筛选条和表格卡片", () => {
  assert.match(source, /<AdminListShell>/);
  assert.match(source, /<AdminListSearch/);
  assert.match(source, /AdminListSearch[\s\S]*取消全选[\s\S]*批量修改[\s\S]*新建任务/);
  assert.match(source, /<AdminMobileListCard/);
  assert.match(source, /className="admin-responsive-table admin-selection-table return-route-task-table w-full min-w-\[1120px\]/);
  assert.match(source, /data-label="任务 \/ 节点"/);
  assert.match(source, /data-label="线路变化"/);
  assert.match(source, /data-label="操作" className="p-3 text-left align-middle">\{actionButtons\}/);
  assert.match(source, /className="admin-card-actions return-route-actions"/);
  assert.match(source, /<TableHead className="text-left">操作<\/TableHead>/);
  assert.doesNotMatch(source, /overflow-hidden rounded-md border border-\[var\(--gray-a5\)\]/);
});

test("手机端回程任务把同一字段的主次信息保持在同一内容列", () => {
  assert.match(source, /data-label="任务 \/ 节点"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="运营商 \/ 地区"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="线路"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="最后探测"[\s\S]*return-route-cell-pair/);
  assert.match(source, /data-label="状态"[\s\S]*return-route-cell-content/);
});

test("CN2 和 CUG 待确认不显示切线确认次数", () => {
  assert.match(source, /new Set\(\["CN2 待确认", "CUG 待确认"\]\)/);
  assert.match(source, /pendingLineOptions\.has\(status\.candidate_line\) \? null/);
  assert.match(source, /status\.candidate_count\}\/\{needed\}/);
});

test("状态标签只保留文字，不带图标", () => {
  assert.match(source, /healthy: \{ color: "green" as const, text: "线路正常" \}/);
  assert.doesNotMatch(source, /text: "线路正常", icon:/);
  assert.doesNotMatch(source, /<Badge color="blue"><RefreshCw/);
  assert.match(source, /<Badge color="blue">探测中<\/Badge>/);
});

test("桌面回程任务行把线路状态和操作左对齐", async () => {
  const css = await readFile(
    new URL("../src/global.css", import.meta.url),
    "utf8",
  );
  assert.match(source, /return-route-task-table/);
  assert.match(source, /data-label="线路" className="p-3 text-left align-middle"/);
  assert.match(source, /data-label="状态" className="p-3 text-left align-middle"/);
  assert.match(source, /data-label="操作" className="p-3 text-left align-middle"/);
  assert.match(css, /justify-content: flex-start !important;/);
});

test("回程表单和批量修改支持疑似被墙判定开关", () => {
  assert.match(source, /mainland_reachability_enabled: false/);
  assert.match(source, /参与疑似被墙判定（实验室功能）/);
  assert.match(source, /function SwitchField\(/);
  assert.match(source, /<Text size="2" weight="medium">\{label\}<\/Text>/);
  assert.match(source, /发送疑似被墙通知/);
  assert.match(source, /发送可达性恢复通知/);
  assert.match(source, /至少两个不同运营商任务同时开启/);
  assert.match(source, /mainland_reachability_enabled: form.mainland_reachability_enabled/);
  assert.match(source, /request\("\/edit\/batch", \{ ids, \.\.\.toTaskBatchPayload\(form\) \}\)/);
});

test("状态筛选和徽标优先显示切线再显示疑似被墙", () => {
  assert.match(source, /suspected_blocked: "疑似被墙"/);
  assert.match(source, /single_carrier: "单线路异常"/);
  assert.match(source, /insufficient: "判定条件不足"/);
  assert.match(source, /function stateBadge\(task: Task, status\?: Status, reachability\?: Reachability\)/);
  assert.match(source, /const overlay = task.mainland_reachability_enabled \? reachability : undefined;/);
  assert.match(source, /status\?\.state === "observing" \|\| status\?\.state === "switched"/);
  assert.match(source, /切线确认中/);
  assert.match(source, /switched: "已切线"/);
  assert.match(source, /切线 \/ 重新采集基线/);
  assert.match(source, /overlay\?\.display === "suspected_blocked"/);
  assert.match(source, /task.mainland_reachability_enabled && status && !status.baseline_ready/);
  assert.doesNotMatch(source, /overlay\?\.display === "collecting"/);
  assert.match(source, /疑似被墙 \$\{summary.suspected_blocked\}/);
});

test("监测记录支持可达性事件类型", () => {
  assert.match(source, /mainland_blocked: "疑似被墙"/);
  assert.match(source, /mainland_repeat: "持续异常"/);
  assert.match(source, /mainland_recovery: "可达性恢复"/);
  assert.match(source, /event.kind.startsWith\("mainland_"\)/);
});
