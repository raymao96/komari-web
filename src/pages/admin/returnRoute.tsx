import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { AdminSheetTabs, AdminTabLabel } from "@/components/admin/AdminSheetTabs";
import {
  AdminListFiltersBar,
  AdminListSearch,
  AdminListSelect,
  AdminListShell,
} from "@/components/admin/AdminListShell";
import {
  ADMIN_LIST_ACTION_SX,
  ADMIN_LIST_OUTLINE_SX,
} from "@/components/admin/adminListLayout";
import AdminMultiSelect from "@/components/admin/AdminMultiSelect";
import { AdminMobileCardStack, AdminMobileListCard } from "@/components/admin/AdminMobileListCard";
import {
  AdminPagination,
} from "@/components/admin/AdminPagination";
import { useAdminDefaultPageSize } from "@/hooks/useAdminDefaultPageSize";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AppDialogContent,
  Badge,
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  IconButton,
  Select,
  Switch,
  Tabs,
  Text,
  TextField,
  Tooltip,
} from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FilterOff,
  History,
  ListChecks,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Route,
  Trash2,
  Upload,
  X,
} from "@/components/admin/muiIcons";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";
import { useSearchParams } from "react-router-dom";
import { useAdminTabParam } from "@/hooks/useAdminTabParam";
import { useHeldTab } from "@/hooks/useHeldTab";
import Loading from "@/components/loading";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";
import { useAccount } from "@/contexts/AccountContext";
import { usePingTask, type PingTask as LatencyPingTask } from "@/contexts/PingTaskContext";

const RETURN_ROUTE_TABS = ["tasks", "records", "rules"] as const;

type Task = {
  id?: number;
  name: string;
  client: string;
  client_info?: { name?: string };
  carrier: "mobile" | "telecom" | "unicom";
  region: string;
  target: string;
  ip_version: number;
  expected_line: string;
  protocol: string;
  interval: number;
  switch_confirm: number;
  recovery_confirm: number;
  cooldown: number;
  notify: boolean;
  notify_recovery: boolean;
  mainland_reachability_enabled: boolean;
  mainland_reachability_notify: boolean;
  mainland_reachability_recovery_notify: boolean;
  mainland_reachability_ping_task_id?: number | null;
  enabled: boolean;
};

type TaskForm = Omit<Task, "interval" | "switch_confirm" | "recovery_confirm" | "cooldown"> & {
  interval: string;
  switch_confirm: string;
  recovery_confirm: string;
  cooldown: string;
};

type TaskBatchForm = Pick<
  TaskForm,
  | "carrier"
  | "region"
  | "target"
  | "ip_version"
  | "expected_line"
  | "protocol"
  | "interval"
  | "switch_confirm"
  | "recovery_confirm"
  | "cooldown"
  | "notify"
  | "notify_recovery"
  | "mainland_reachability_enabled"
  | "mainland_reachability_notify"
  | "mainland_reachability_recovery_notify"
  | "mainland_reachability_ping_task_id"
  | "enabled"
>;

type Status = {
  task_id: number;
  current_line?: string;
  state: "pending" | "observing" | "healthy" | "switched" | "unknown";
  confidence: number;
  asn_path?: string[];
  route_path?: string[];
  candidate_line?: string;
  candidate_count?: number;
  last_error?: string;
  last_checked_at?: string;
  baseline_ready?: boolean;
  baseline_line?: string;
};

type Reachability = {
  client: string;
  ip_version: number;
  state: string;
  display: string;
  failed_carriers?: string[];
  high_confidence?: boolean;
  abnormal_started_at?: string;
  last_lines?: Record<string, string>;
	evidence?: Array<{
    carrier: string;
    valid: number;
    failures: number;
    fail_rate: number;
    last_line?: string;
    path_candidate?: boolean;
    ping_ready?: boolean;
    ping_task_name?: string;
    ping_type?: string;
    ping_target?: string;
    ping_total?: number;
    ping_lost?: number;
    ping_loss_rate?: number;
    ping_window_seconds?: number;
  }>;
};

type RouteEvent = {
  id: number;
  task_id: number;
  client: string;
  kind: "switch" | "recovery" | "mainland_blocked" | "mainland_repeat" | "mainland_recovery";
  from_line: string;
  to_line: string;
  confidence: number;
  asn_path?: string[];
  route_path?: string[];
  detail?: string;
  occurred_at: string;
  task_name?: string;
  node_name?: string;
  carrier?: Task["carrier"];
  region?: string;
  target?: string;
  ip_version?: number;
  expected_line?: string;
};

type TaskPage = { tasks: Task[]; statuses: Status[]; reachability: Reachability[]; probing_task_ids: number[]; total: number; page: number; page_size: number };
type RecordPage = { events: RouteEvent[]; total: number; page: number; page_size: number };
type SummaryData = { tasks: number; healthy: number; switched: number; recent_events: number; suspected_blocked?: number };
type TaskFilterQuery = {
  page: number;
  page_size: number;
  keyword: string;
  carriers: string[];
  states: string[];
};
type RecordFilterQuery = {
  page: number;
  page_size: number;
  keyword: string;
  range: string;
  kinds: string[];
  carriers: string[];
  regions: string[];
  expectedLines: string[];
  actualLines: string[];
};
type RuleDocument = {
  schema_version: number;
  rule_version: string;
  asn_groups: Record<string, number[]>;
  prefix_groups: Record<string, string[]>;
  confidence: Record<string, number>;
};
type RuleStatus = {
  source: "builtin" | "external";
  rule_version: string;
  schema_version: number;
  loaded_at?: string;
  external_path: string;
  asn_rule_count: number;
  manual_cidr_count: number;
  bgp_cidr_count: number;
  cidr_rule_count: number;
  last_error?: string;
  watching: boolean;
  bgp_source_url: string;
  bgp_generated_at?: string;
  bgp_loaded_at?: string;
  bgp_next_refresh_at?: string;
  bgp_last_error?: string;
};
type RuleView = { status: RuleStatus; rules: RuleDocument };

const returnRouteTaskSnapshots = new Map<string, TaskPage>();
const returnRouteSummarySnapshots = new Map<string, SummaryData>();

function returnRouteTaskSnapshotKey(
  accountKey: string,
  query: TaskFilterQuery,
  _routeState: string,
  routeTask: number,
) {
  return JSON.stringify([
    accountKey,
    query.page,
    query.page_size,
    query.keyword,
    query.carriers,
    query.states,
    routeTask || 0,
  ]);
}

const defaults: Task = {
  name: "",
  client: "",
  carrier: "mobile",
  region: "华东",
  target: "",
  ip_version: 4,
  expected_line: "CMIN2",
  protocol: "icmp",
  interval: 180,
  switch_confirm: 2,
  recovery_confirm: 3,
  cooldown: 1800,
  notify: true,
  notify_recovery: true,
  mainland_reachability_enabled: false,
  mainland_reachability_notify: true,
  mainland_reachability_recovery_notify: true,
  mainland_reachability_ping_task_id: null,
  enabled: true,
};

function tr(key: string, fallback: string, options?: Record<string, unknown>) {
  return String(i18n.t(`return_route.${key}`, { defaultValue: fallback, ...(options || {}) }));
}

function pingTaskID(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toTaskForm(task?: Task): TaskForm {
  const value = { ...defaults, ...task };
  return {
    ...value,
    interval: String(value.interval),
    switch_confirm: String(value.switch_confirm),
    recovery_confirm: String(value.recovery_confirm),
    cooldown: String(value.cooldown),
    mainland_reachability_enabled: Boolean(value.mainland_reachability_enabled),
    mainland_reachability_notify: value.mainland_reachability_notify !== false,
    mainland_reachability_recovery_notify: value.mainland_reachability_recovery_notify !== false,
    mainland_reachability_ping_task_id: pingTaskID(value.mainland_reachability_ping_task_id),
  };
}

function toTaskPayload(form: TaskForm): Task {
  return {
    ...form,
    interval: Number(form.interval),
    switch_confirm: Number(form.switch_confirm),
    recovery_confirm: Number(form.recovery_confirm),
    cooldown: Number(form.cooldown),
    mainland_reachability_enabled: Boolean(form.mainland_reachability_enabled),
    mainland_reachability_notify: Boolean(form.mainland_reachability_notify),
    mainland_reachability_recovery_notify: Boolean(form.mainland_reachability_recovery_notify),
    mainland_reachability_ping_task_id: pingTaskID(form.mainland_reachability_ping_task_id),
  };
}

function toTaskBatchForm(task: Task): TaskBatchForm {
  const form = toTaskForm(task);
  return {
    carrier: form.carrier,
    region: form.region,
    target: form.target,
    ip_version: form.ip_version,
    expected_line: form.expected_line,
    protocol: form.protocol,
    interval: form.interval,
    switch_confirm: form.switch_confirm,
    recovery_confirm: form.recovery_confirm,
    cooldown: form.cooldown,
    notify: form.notify,
    notify_recovery: form.notify_recovery,
    mainland_reachability_enabled: form.mainland_reachability_enabled,
    mainland_reachability_notify: form.mainland_reachability_notify,
    mainland_reachability_recovery_notify: form.mainland_reachability_recovery_notify,
    mainland_reachability_ping_task_id: pingTaskID(form.mainland_reachability_ping_task_id),
    enabled: form.enabled,
  };
}

function toTaskBatchPayload(form: TaskBatchForm) {
  return {
    ...form,
    interval: Number(form.interval),
    switch_confirm: Number(form.switch_confirm),
    recovery_confirm: Number(form.recovery_confirm),
    cooldown: Number(form.cooldown),
    mainland_reachability_ping_task_id: pingTaskID(form.mainland_reachability_ping_task_id),
  };
}

const lineOptions: Record<Task["carrier"], string[]> = {
  mobile: ["CMIN2", "CMI", "CMNET"],
  telecom: ["CN2 GIA", "CN2 GT", "163"],
  unicom: ["CUG VIP", "CUG 优化", "9929", "4837"],
};

function ruleGroupNames(): Record<string, string> {
  return {
    cmin2: "CMIN2",
    cmi: "CMI",
    cmnet: "CMNET",
    cn2_global: tr("rule_group.cn2_global", "CN2 GIA 入口"),
    cn2_backbone: tr("rule_group.cn2_backbone", "CN2 骨干"),
    telecom_163: "163",
    unicom_10099: tr("rule_group.unicom_10099", "CUG 接入（AS10099）"),
    unicom_9929: "9929",
    unicom_4837: "4837",
  };
}

const ruleGroupOrder = ["cmin2", "cmi", "cmnet", "cn2_global", "cn2_backbone", "telecom_163", "unicom_10099", "unicom_9929", "unicom_4837"];

const allLineOptions = Object.values(lineOptions).flat();
const pendingLineOptions = new Set(["CN2 待确认", "CUG 待确认"]);

const regionValues = ["华北", "东北", "华东", "华中", "华南", "西南", "西北", "港澳台", "其他"];

const regionKeys: Record<string, string> = {
  华北: "region.north",
  东北: "region.northeast",
  华东: "region.east",
  华中: "region.central",
  华南: "region.south",
  西南: "region.southwest",
  西北: "region.northwest",
  港澳台: "region.hmt",
  其他: "region.other",
};

function regionLabel(region?: string) {
  if (!region) return tr("unmarked", "未标记");
  const key = regionKeys[region];
  return key ? tr(key, region) : region;
}

function regionOptions() {
  return regionValues.map((value) => ({ value, label: regionLabel(value) }));
}

const pingTypeNames: Record<string, string> = {
  icmp: "ICMP",
  tcp: "TCP",
  http: "HTTP",
};

function pingTaskLabel(task: { name?: string; type?: string; target?: string }) {
  const name = task.name || tr("unnamed_task", "未命名任务");
  const type = pingTypeNames[task.type || ""] || (task.type || "").toUpperCase() || "ICMP";
  const target = task.target || "-";
  return `${name} · ${type} · ${target}`;
}

function pingTasksForClients(tasks: LatencyPingTask[] | null, clientUUIDs: string[]) {
  if (clientUUIDs.length === 0) return [];
  return (tasks || []).filter((task) => {
    const assigned = task.clients || [];
    return clientUUIDs.every((uuid) => assigned.includes(uuid));
  });
}

function carrierNames(): Record<Task["carrier"], string> {
  return {
    mobile: tr("carrier.mobile", "中国移动"),
    telecom: tr("carrier.telecom", "中国电信"),
    unicom: tr("carrier.unicom", "中国联通"),
  };
}

function carrierShortName(carrier?: string) {
  const shorts: Record<string, string> = {
    mobile: tr("carrier.short_mobile", "移动"),
    telecom: tr("carrier.short_telecom", "电信"),
    unicom: tr("carrier.short_unicom", "联通"),
  };
  return shorts[carrier || ""] || carrierLabel(carrier).replace(/^中国/, "");
}

function taskStateLabels(): Record<string, string> {
  return {
    suspected_blocked: tr("state.suspected_blocked", "疑似被墙"),
    single_carrier: tr("state.single_carrier", "单线路异常"),
    insufficient: tr("state.insufficient", "判定条件不足"),
    healthy: tr("state.healthy", "线路正常"),
    probing: tr("state.probing", "探测中"),
    observing: tr("state.observing", "切线确认中"),
    switched: tr("state.switched", "已切线"),
    unknown: tr("state.unknown", "无法识别"),
    pending: tr("state.pending", "等待探测"),
    disabled: tr("state.disabled", "已暂停"),
  };
}

function recordKindLabels(): Record<string, string> {
  return {
    switch: tr("kind.switch", "切线"),
    recovery: tr("kind.recovery", "恢复"),
    mainland_blocked: tr("kind.mainland_blocked", "疑似被墙"),
    mainland_repeat: tr("kind.mainland_repeat", "持续异常"),
    mainland_recovery: tr("kind.mainland_recovery", "可达性恢复"),
  };
}

async function request(path: string, body?: unknown) {
  const response = await fetch(`/api/admin/return-route${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === "error") {
    throw new Error(payload?.message || payload?.error?.message || tr("request_failed", "请求失败"));
  }
  return payload?.data ?? payload;
}

function carrierLabel(carrier?: string) {
  return carrierNames()[(carrier || "") as Task["carrier"]] || carrier || "";
}

function reachabilityEvidenceText(item?: Reachability) {
  if (!item) return "";
  const carriers = (item.failed_carriers || []).map((carrier) => carrierLabel(carrier)).filter(Boolean);
  const rates = (item.evidence || [])
    .filter((row) => (item.failed_carriers || []).includes(row.carrier))
    .map((row) => `${carrierLabel(row.carrier)} ${Math.round((row.fail_rate || 0) * 100)}%`);
  const pingRows = (item.evidence || [])
    .filter((row) => (item.failed_carriers || []).includes(row.carrier) && row.ping_ready)
    .map((row) => {
      const lost = row.ping_lost || 0;
      const total = row.ping_total || 0;
      const rate = Math.round((row.ping_loss_rate || 0) * 100);
      return tr("evidence.packet_loss", "{{carrier}} {{task}} 丢包 {{lost}}/{{total}}（{{rate}}%）", {
        carrier: carrierLabel(row.carrier),
        task: pingTaskLabel({ name: row.ping_task_name, type: row.ping_type, target: row.ping_target }),
        lost,
        total,
        rate,
      });
    });
  const lastLines = Object.entries(item.last_lines || {})
    .map(([carrier, line]) => `${carrierShortName(carrier)} ${line}`)
    .filter((value) => value.trim());
  const lines = [
    carriers.length ? tr("evidence.failed_carriers", "异常运营商：{{value}}", { value: carriers.join(" / ") }) : "",
    rates.length ? tr("evidence.path_fail_rate", "路径异常率：{{value}}", { value: rates.join("；") }) : "",
    pingRows.length ? tr("evidence.assist_latency", "辅助延迟：{{value}}", { value: pingRows.join("；") }) : "",
    lastLines.length ? tr("evidence.last_lines", "最后正常线路：{{value}}", { value: lastLines.join("；") }) : "",
    item.high_confidence ? tr("evidence.high_confidence", "置信度：高置信度（三网同时异常）") : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function mainlandAssistReady(task: Task) {
  return Boolean(task.mainland_reachability_enabled && pingTaskID(task.mainland_reachability_ping_task_id));
}

function stateBadge(task: Task, status?: Status, reachability?: Reachability) {
  const overlay = mainlandAssistReady(task) ? reachability : undefined;
  if (status?.state === "observing" || status?.state === "switched") {
    const rebasing = status.state === "switched" && task.mainland_reachability_enabled && !status.baseline_ready;
    return (
      <div className="min-w-0">
        <Badge color={status.state === "observing" ? "amber" : "red"}>{status.state === "observing" ? tr("state.observing", "切线确认中") : tr("state.switched", "已切线")}</Badge>
        {rebasing ? <div className="mt-1 max-w-[14rem] text-xs leading-5 text-amber-700">{tr("state.rebasing", "切线 / 重新采集基线")}</div> : null}
      </div>
    );
  }
  if (task.mainland_reachability_enabled && !pingTaskID(task.mainland_reachability_ping_task_id)) {
    return <Badge color="gray">{tr("state.no_assist", "未选择辅助任务")}</Badge>;
  }
  if (overlay?.display === "suspected_blocked") {
    const carriers = (overlay.failed_carriers || []).map((carrier) => carrierLabel(carrier)).filter(Boolean);
    const evidence = reachabilityEvidenceText(overlay);
    return (
      <div className="min-w-0">
        <Tooltip content={<span className="whitespace-pre-line">{evidence || tr("state.blocked_tooltip", "同一节点至少两个运营商持续异常，且 Agent 在线。")}</span>}>
          <Badge color="red">{overlay.high_confidence ? tr("state.suspected_blocked_high", "高置信度疑似被墙") : tr("state.suspected_blocked", "疑似被墙")}</Badge>
        </Tooltip>
        {carriers.length ? <div className="mt-1 max-w-[14rem] text-xs leading-5 text-red-600">{carriers.join(" / ")}</div> : null}
      </div>
    );
  }
  if (overlay?.display === "single_carrier") {
    const carrier = overlay.failed_carriers?.[0];
    const evidence = overlay.evidence?.find((row) => row.carrier === carrier);
    const rate = evidence ? Math.round((evidence.fail_rate || 0) * 100) : 0;
    return (
      <div className="min-w-0">
        <Badge color="orange">{tr("state.single_carrier", "单线路异常")}</Badge>
        <div className="mt-1 max-w-[14rem] text-xs leading-5 text-amber-700">
          {carrierLabel(carrier)}{evidence ? tr("state.fail_rate", " · 异常率 {{rate}}%", { rate }) : ""}
        </div>
      </div>
    );
  }
  if (overlay?.display === "insufficient") {
    return (
      <div className="min-w-0">
        <Badge color="gray">{tr("state.insufficient", "判定条件不足")}</Badge>
        <div className="mt-1 max-w-[14rem] text-xs leading-5 text-gray-500">{tr("state.need_two_carriers", "至少需要两个运营商")}</div>
      </div>
    );
  }
  if (mainlandAssistReady(task) && status && !status.baseline_ready && (status.state === "healthy" || status.state === "pending")) {
    return <Badge color="gray">{tr("state.collecting_baseline", "采集判定基线")}</Badge>;
  }
  if (overlay?.display === "undetermined") {
    return <Badge color="gray">{tr("state.undetermined", "无法判定")}</Badge>;
  }
  if (!status) return <Badge color="gray">{tr("state.pending_first", "等待首次探测")}</Badge>;
  if (status.last_error || status.state === "unknown") {
    return <Badge color="gray">{status.last_error ? tr("state.probe_error", "探测异常") : tr("state.unknown_temp", "暂时无法识别")}</Badge>;
  }
  const states = {
    pending: { color: "gray" as const, text: tr("state.pending_first", "等待首次探测") },
    observing: { color: "amber" as const, text: tr("state.observing", "切线确认中") },
    healthy: { color: "green" as const, text: tr("state.healthy", "线路正常") },
    switched: { color: "red" as const, text: tr("state.switched", "已切线") },
    unknown: { color: "gray" as const, text: tr("state.unknown_temp", "暂时无法识别") },
  };
  const item = states[status.state] || states.unknown;
  return <Badge color={item.color}>{item.text}</Badge>;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN", { hour12: false });
}

function MultiNodeSelect({
  nodes,
  value,
  onChange,
}: {
  nodes: Array<{ uuid: string; name: string }>;
  value: string[];
  onChange: (clients: string[]) => void;
}) {
  return (
    <AdminMultiSelect
      fullWidth
      ariaLabel={tr("form.select_probe_nodes", "选择探测节点")}
      placeholder={tr("form.select_servers_multi", "选择服务器（支持多选）")}
      value={value}
      onChange={onChange}
      menuMinWidth={260}
      options={nodes.map((node) => ({
        value: node.uuid,
        label: node.name || node.uuid,
      }))}
      sx={{
        flex: { xs: "0 0 auto", md: "0 0 auto" },
        width: "100%",
        maxWidth: { xs: "100%", md: "100%" },
        minWidth: { xs: 0, md: 0 },
        "& .MuiOutlinedInput-root": { minHeight: 40, height: 40, maxWidth: "100%" },
        "& .MuiSelect-select": {
          display: "flex",
          height: 40,
          boxSizing: "border-box",
          alignItems: "center",
          py: 0,
        },
      }}
    />
  );
}

function RouteTaskDialog({
  task,
  nodes,
  onSaved,
  children,
}: {
  task?: Task;
  nodes: Array<{ uuid: string; name: string }>;
  onSaved: () => void;
  children: React.ReactNode;
}) {
  useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TaskForm>(() => toTaskForm(task));
  const [selectedClients, setSelectedClients] = useState<string[]>(() =>
    task?.client ? [task.client] : [],
  );
  const { pingTasks } = usePingTask();
  const pingClientIDs = task?.id ? (form.client ? [form.client] : []) : selectedClients;
  const availablePingTasks = useMemo(
    () => pingTasksForClients(pingTasks, pingClientIDs),
    [pingTasks, pingClientIDs.join(",")],
  );

  useEffect(() => {
    if (!open || pingTasks === null || !form.mainland_reachability_ping_task_id) return;
    if (availablePingTasks.some((item) => pingTaskID(item.id) === form.mainland_reachability_ping_task_id)) return;
    setForm((current) => ({ ...current, mainland_reachability_ping_task_id: null }));
  }, [availablePingTasks, form.mainland_reachability_ping_task_id, open, pingTasks]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setForm(toTaskForm(task));
      setSelectedClients(task?.client ? [task.client] : []);
    }
    setOpen(nextOpen);
  };

  const setCarrier = (carrier: Task["carrier"]) => {
    setForm((current) => ({
      ...current,
      carrier,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clients = task?.id ? [form.client] : selectedClients;
    if (!form.name.trim() || clients.length === 0 || !form.target.trim() || !form.expected_line.trim()) {
      toast.error(tr("form.required", "任务名称、客户端、探测目标和预期线路为必填项"));
      return;
    }
    if (form.mainland_reachability_enabled && !form.mainland_reachability_ping_task_id) {
      toast.error(tr("form.assist_required", "开启疑似被墙判定时需选择辅助延迟监测任务"));
      return;
    }
    setSaving(true);
    try {
      if (task?.id) {
        await request("/edit", toTaskPayload(form));
        toast.success(tr("form.updated", "任务已更新"));
      } else {
        let dispatched = 0;
        for (const client of clients) {
          const result = await request(
            "/add",
            toTaskPayload({ ...form, client }),
          );
          if (result?.dispatched) dispatched += 1;
        }
        if (dispatched === clients.length) {
          toast.success(
            tr("form.created_dispatched", "已为 {{count}} 台节点创建任务，首次探测已下发", { count: clients.length }),
          );
        } else if (dispatched > 0) {
          toast.success(
            tr("form.created_partial", "已创建 {{count}} 个任务，其中 {{dispatched}} 个已下发首次探测", {
              count: clients.length,
              dispatched,
            }),
          );
        } else {
          toast.success(
            tr("form.created_pending", "已为 {{count}} 台节点创建任务，将在节点连接后按周期探测", { count: clients.length }),
          );
        }
      }
      setOpen(false);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message.includes("name, client, target and expected_line are required")
          ? tr("form.required", "任务名称、客户端、探测目标和预期线路为必填项")
          : message || tr("form.save_failed", "保存失败"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <AppDialogContent maxWidth="760px">
        <Dialog.Title>{task?.id ? tr("form.edit_title", "编辑回程监测") : tr("form.create_title", "新建回程监测")}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          {tr("form.dialog_desc", "从所选服务器探测到国内目标的逐跳路径，并在线路变化稳定后通知。")}
        </Dialog.Description>
        <form onSubmit={submit} className="mt-5 space-y-6">
          <FormSection title={tr("form.section_basic", "基本信息")}>
            <Field label={tr("form.task_name", "任务名称")}>
              <TextField.Root required value={form.name} placeholder={tr("form.task_name_placeholder", "例如：东京到上海移动")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={tr("form.probe_node", "探测节点")}>
              {task?.id ? (
                <Select.Root value={form.client || undefined} onValueChange={(client) => setForm({ ...form, client })}>
                  <Select.Trigger placeholder={tr("form.select_server", "选择服务器")} className="w-full" />
                  <Select.Content>{nodes.map((node) => <Select.Item key={node.uuid} value={node.uuid}>{node.name || node.uuid}</Select.Item>)}</Select.Content>
                </Select.Root>
              ) : (
                <MultiNodeSelect
                  nodes={nodes}
                  value={selectedClients}
                  onChange={setSelectedClients}
                />
              )}
            </Field>
            <Field label={tr("form.carrier", "运营商")}>
              <Select.Root value={form.carrier} onValueChange={(value) => setCarrier(value as Task["carrier"])}>
                <Select.Trigger className="w-full" />
                <Select.Content>{Object.entries(carrierNames()).map(([value, label]) => <Select.Item key={value} value={value}>{label}</Select.Item>)}</Select.Content>
              </Select.Root>
            </Field>
            <Field label={tr("form.region", "地区（仅用于标记）")}>
              <Select.Root value={form.region || undefined} onValueChange={(region) => setForm({ ...form, region })}>
                <Select.Trigger placeholder={tr("form.select_region", "选择地区")} className="w-full" />
                <Select.Content>{regionOptions().map((region) => <Select.Item key={region.value} value={region.value}>{region.label}</Select.Item>)}</Select.Content>
              </Select.Root>
            </Field>
            <Field label={tr("form.target", "目标 IP 或域名")}>
              <TextField.Root required value={form.target} placeholder={tr("form.target_placeholder", "运营商测试目标")} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </Field>
            <Field label={tr("form.ip_version", "地址类型")}>
              <Select.Root value={String(form.ip_version)} onValueChange={(value) => setForm({ ...form, ip_version: Number(value) })}>
                <Select.Trigger className="w-full" />
                <Select.Content><Select.Item value="4">IPv4</Select.Item><Select.Item value="6">IPv6</Select.Item></Select.Content>
              </Select.Root>
            </Field>
          </FormSection>

          <FormSection title={tr("form.section_rules", "判定规则")}>
            <Field label={tr("form.expected_line", "预期线路")}>
              <Select.Root value={form.expected_line} onValueChange={(expected_line) => setForm({ ...form, expected_line })}>
                <Select.Trigger className="w-full" />
                <Select.Content>{allLineOptions.map((line) => <Select.Item key={line} value={line}>{line}</Select.Item>)}</Select.Content>
              </Select.Root>
            </Field>
            <Field label={tr("form.protocol", "探测协议")}>
              <Select.Root value="icmp" disabled><Select.Trigger className="w-full" /><Select.Content><Select.Item value="icmp">{tr("form.protocol_icmp", "内置 ICMP（推荐）")}</Select.Item></Select.Content></Select.Root>
            </Field>
            <Field label={tr("form.interval", "探测间隔（秒）")}>
              <TextField.Root required type="number" min="60" max="86400" step="1" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })} />
            </Field>
            <Field label={tr("form.switch_confirm", "切线确认次数")}>
              <TextField.Root required type="number" min="1" max="20" step="1" value={form.switch_confirm} onChange={(e) => setForm({ ...form, switch_confirm: e.target.value })} />
            </Field>
            <Field label={tr("form.recovery_confirm", "恢复确认次数")}>
              <TextField.Root required type="number" min="1" max="20" step="1" value={form.recovery_confirm} onChange={(e) => setForm({ ...form, recovery_confirm: e.target.value })} />
            </Field>
            <SwitchField
              className="sm:col-span-2"
              label={tr("form.mainland_enable", "参与疑似被墙判定（实验室功能）")}
              hint={tr("form.mainland_hint", "需要同一节点、同一地址类型下至少两个不同运营商任务同时开启，并各自关联一条延迟监测任务。")}
              checked={form.mainland_reachability_enabled}
              onCheckedChange={(mainland_reachability_enabled) => setForm((current) => ({ ...current, mainland_reachability_enabled }))}
            />
            {form.mainland_reachability_enabled ? (
              <Field label={tr("form.assist_task", "辅助延迟监测任务")}>
                {availablePingTasks.length ? (
                  <PingTaskSelect
                    tasks={availablePingTasks}
                    value={form.mainland_reachability_ping_task_id}
                    onChange={(mainland_reachability_ping_task_id) => setForm((current) => ({ ...current, mainland_reachability_ping_task_id }))}
                  />
                ) : (
                  <Text size="2" color="gray">{tr("form.no_assist_tasks", "当前服务器还没有可关联的延迟监测任务。")}</Text>
                )}
              </Field>
            ) : null}
          </FormSection>

          <FormSection title={tr("form.section_notify", "通知与状态")}>
            <Field label={tr("form.cooldown", "切线通知冷却时间（秒）")}>
              <TextField.Root required type="number" min="0" max="604800" step="1" value={form.cooldown} onChange={(e) => setForm({ ...form, cooldown: e.target.value })} />
            </Field>
            <div className="flex flex-col justify-end gap-3 pb-1">
              <SwitchField label={tr("form.notify_switch", "发送切线通知")} checked={form.notify} onCheckedChange={(notify) => setForm({ ...form, notify })} />
              <SwitchField label={tr("form.notify_recovery", "发送恢复通知")} checked={form.notify_recovery} onCheckedChange={(notify_recovery) => setForm({ ...form, notify_recovery })} />
              {form.mainland_reachability_enabled ? (
                <>
                  <SwitchField label={tr("form.notify_blocked", "发送疑似被墙通知")} checked={form.mainland_reachability_notify} onCheckedChange={(mainland_reachability_notify) => setForm({ ...form, mainland_reachability_notify })} />
                  <SwitchField label={tr("form.notify_reachability", "发送可达性恢复通知")} checked={form.mainland_reachability_recovery_notify} onCheckedChange={(mainland_reachability_recovery_notify) => setForm({ ...form, mainland_reachability_recovery_notify })} />
                </>
              ) : null}
              <SwitchField label={tr("form.enable_task", "启用任务")} checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />
            </div>
          </FormSection>
          <Flex justify="end" gap="3" mt="6">
            <Dialog.Close><Button type="button" variant="soft" color="gray">{tr("form.cancel", "取消")}</Button></Dialog.Close>
            <Button type="submit" loading={saving}>{tr("form.save", "保存")}</Button>
          </Flex>
        </form>
      </AppDialogContent>
    </Dialog.Root>
  );
}

function RouteTaskBatchDialog({
  tasks,
  onSaved,
  onClear,
  children,
}: {
  tasks: Task[];
  onSaved: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TaskBatchForm>(() =>
    toTaskBatchForm(tasks[0] || defaults),
  );
  const { pingTasks } = usePingTask();
  const batchClientIDs = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.client).filter(Boolean))),
    [tasks],
  );
  const availablePingTasks = useMemo(
    () => pingTasksForClients(pingTasks, batchClientIDs),
    [pingTasks, batchClientIDs.join(",")],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && tasks.length > 0) {
      setForm(toTaskBatchForm(tasks[0]));
    }
    setOpen(nextOpen);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ids = tasks.flatMap((task) => task.id ? [task.id] : []);
    if (ids.length === 0 || !form.target.trim() || !form.expected_line.trim()) {
      toast.error(tr("form.batch_required", "请选择任务并填写探测目标和预期线路"));
      return;
    }
    if (form.mainland_reachability_enabled && !form.mainland_reachability_ping_task_id) {
      toast.error(tr("form.assist_required", "开启疑似被墙判定时需选择辅助延迟监测任务"));
      return;
    }
    setSaving(true);
    try {
      await request("/edit/batch", { ids, ...toTaskBatchPayload(form) });
      toast.success(tr("form.batch_updated", "已批量更新 {{count}} 个任务", { count: ids.length }));
      setOpen(false);
      onClear();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("form.batch_failed", "批量修改失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <AppDialogContent maxWidth="760px">
        <Dialog.Title>{tr("form.batch_title", "批量修改回程监测")}</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          {tr("form.batch_desc", "已选择 {{count}} 个任务。下列配置会同步更新，任务名称和各自的探测节点保持不变。", { count: tasks.length })}
        </Dialog.Description>
        <div className="mt-3 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto rounded-md bg-[var(--gray-a2)] p-2">
          {tasks.map((task) => (
            <Badge key={task.id} color="gray" variant="soft">
              {task.name} · {task.client_info?.name || task.client}
            </Badge>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-6">
          <FormSection title={tr("form.section_probe", "探测配置")}>
            <Field label={tr("form.carrier", "运营商")}>
              <Select.Root value={form.carrier} onValueChange={(carrier) => setForm({ ...form, carrier: carrier as Task["carrier"] })}>
                <Select.Trigger className="w-full" />
                <Select.Content>{Object.entries(carrierNames()).map(([value, label]) => <Select.Item key={value} value={value}>{label}</Select.Item>)}</Select.Content>
              </Select.Root>
            </Field>
            <Field label={tr("form.region", "地区（仅用于标记）")}>
              <Select.Root value={form.region || undefined} onValueChange={(region) => setForm({ ...form, region })}>
                <Select.Trigger placeholder={tr("form.select_region", "选择地区")} className="w-full" />
                <Select.Content>{regionOptions().map((region) => <Select.Item key={region.value} value={region.value}>{region.label}</Select.Item>)}</Select.Content>
              </Select.Root>
            </Field>
            <Field label={tr("form.target", "目标 IP 或域名")}>
              <TextField.Root required value={form.target} placeholder={tr("form.target_placeholder", "运营商测试目标")} onChange={(event) => setForm({ ...form, target: event.target.value })} />
            </Field>
            <Field label={tr("form.ip_version", "地址类型")}>
              <Select.Root value={String(form.ip_version)} onValueChange={(value) => setForm({ ...form, ip_version: Number(value) })}>
                <Select.Trigger className="w-full" />
                <Select.Content><Select.Item value="4">IPv4</Select.Item><Select.Item value="6">IPv6</Select.Item></Select.Content>
              </Select.Root>
            </Field>
          </FormSection>

          <FormSection title={tr("form.section_rules", "判定规则")}>
            <Field label={tr("form.expected_line", "预期线路")}>
              <Select.Root value={form.expected_line} onValueChange={(expected_line) => setForm({ ...form, expected_line })}>
                <Select.Trigger className="w-full" />
                <Select.Content>{allLineOptions.map((line) => <Select.Item key={line} value={line}>{line}</Select.Item>)}</Select.Content>
              </Select.Root>
            </Field>
            <Field label={tr("form.protocol", "探测协议")}>
              <Select.Root value="icmp" disabled><Select.Trigger className="w-full" /><Select.Content><Select.Item value="icmp">{tr("form.protocol_icmp", "内置 ICMP（推荐）")}</Select.Item></Select.Content></Select.Root>
            </Field>
            <Field label={tr("form.interval", "探测间隔（秒）")}>
              <TextField.Root required type="number" min="60" max="86400" step="1" value={form.interval} onChange={(event) => setForm({ ...form, interval: event.target.value })} />
            </Field>
            <Field label={tr("form.switch_confirm", "切线确认次数")}>
              <TextField.Root required type="number" min="1" max="20" step="1" value={form.switch_confirm} onChange={(event) => setForm({ ...form, switch_confirm: event.target.value })} />
            </Field>
            <Field label={tr("form.recovery_confirm", "恢复确认次数")}>
              <TextField.Root required type="number" min="1" max="20" step="1" value={form.recovery_confirm} onChange={(event) => setForm({ ...form, recovery_confirm: event.target.value })} />
            </Field>
            <SwitchField
              className="sm:col-span-2"
              label={tr("form.mainland_enable", "参与疑似被墙判定（实验室功能）")}
              hint={tr("form.mainland_hint", "需要同一节点、同一地址类型下至少两个不同运营商任务同时开启，并各自关联一条延迟监测任务。")}
              checked={form.mainland_reachability_enabled}
              onCheckedChange={(mainland_reachability_enabled) => setForm((current) => ({ ...current, mainland_reachability_enabled }))}
            />
            {form.mainland_reachability_enabled ? (
              <Field label={tr("form.assist_task", "辅助延迟监测任务")}>
                {availablePingTasks.length ? (
                  <PingTaskSelect
                    tasks={availablePingTasks}
                    value={form.mainland_reachability_ping_task_id}
                    onChange={(mainland_reachability_ping_task_id) => setForm((current) => ({ ...current, mainland_reachability_ping_task_id }))}
                  />
                ) : (
                  <Text size="2" color="gray">{tr("form.batch_no_common_ping", "所选服务器没有共同的延迟监测任务，无法批量关联。")}</Text>
                )}
              </Field>
            ) : null}
          </FormSection>

          <FormSection title={tr("form.section_notify", "通知与状态")}>
            <Field label={tr("form.cooldown", "切线通知冷却时间（秒）")}>
              <TextField.Root required type="number" min="0" max="604800" step="1" value={form.cooldown} onChange={(event) => setForm({ ...form, cooldown: event.target.value })} />
            </Field>
            <div className="flex flex-col justify-end gap-3 pb-1">
              <SwitchField label={tr("form.notify_switch", "发送切线通知")} checked={form.notify} onCheckedChange={(notify) => setForm({ ...form, notify })} />
              <SwitchField label={tr("form.notify_recovery", "发送恢复通知")} checked={form.notify_recovery} onCheckedChange={(notify_recovery) => setForm({ ...form, notify_recovery })} />
              {form.mainland_reachability_enabled ? (
                <>
                  <SwitchField label={tr("form.notify_blocked", "发送疑似被墙通知")} checked={form.mainland_reachability_notify} onCheckedChange={(mainland_reachability_notify) => setForm({ ...form, mainland_reachability_notify })} />
                  <SwitchField label={tr("form.notify_reachability", "发送可达性恢复通知")} checked={form.mainland_reachability_recovery_notify} onCheckedChange={(mainland_reachability_recovery_notify) => setForm({ ...form, mainland_reachability_recovery_notify })} />
                </>
              ) : null}
              <SwitchField label={tr("form.enable_task", "启用任务")} checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />
            </div>
          </FormSection>
          <Flex justify="end" gap="3" mt="6">
            <Dialog.Close><Button type="button" variant="soft" color="gray">{tr("form.cancel", "取消")}</Button></Dialog.Close>
            <Button type="submit" loading={saving}>{tr("form.save_to_tasks", "保存到 {{count}} 个任务", { count: tasks.length })}</Button>
          </Flex>
        </form>
      </AppDialogContent>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5"><Text size="2" weight="medium">{label}</Text>{children}</label>;
}

function PingTaskSelect({
  tasks,
  value,
  onChange,
}: {
  tasks: LatencyPingTask[];
  value: number | null | undefined;
  onChange: (id: number | null) => void;
}) {
  const selected = pingTaskID(value) ? String(pingTaskID(value)) : "";
  return (
    <Select.Root
      value={selected}
      onValueChange={(next) => onChange(pingTaskID(next))}
    >
      <Select.Trigger placeholder={tr("form.select_assist_task", "选择同运营商的延迟监测任务")} className="w-full" />
      <Select.Content>
        {tasks.map((task) => (
          <Select.Item key={task.id} value={String(task.id)}>
            {pingTaskLabel(task)}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function SwitchField({
  label,
  hint,
  checked,
  onCheckedChange,
  className,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className || ""}`}>
      <label className="flex items-center justify-between gap-3">
        <Text size="2" weight="medium">{label}</Text>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </label>
      {hint ? <Text size="1" color="gray">{hint}</Text> : null}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="mb-3 text-sm font-medium">{title}</legend><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}

function ReturnRouteContent() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { account } = useAccount();
  const accountKey = account?.uuid || account?.username || "authenticated";
  const [searchParams] = useSearchParams();
  const routeState = searchParams.get("state")?.trim() || "";
  const routeTask = Number(searchParams.get("task") || 0);
  const defaultPageSize = useAdminDefaultPageSize();
  const { nodeDetail, isLoading: nodesLoading } = useNodeDetails();
  const nodes = Array.isArray(nodeDetail) ? nodeDetail.map((node) => ({ uuid: node.uuid, name: node.name })) : [];
  const [activeTab, setActiveTab] = useAdminTabParam(
    RETURN_ROUTE_TABS,
    "tasks",
  );
  const [taskQuery, setTaskQuery] = useState<TaskFilterQuery>({
    page: 1,
    page_size: defaultPageSize,
    keyword: "",
    carriers: [],
    states: routeState ? [routeState] : [],
  });
  const taskSnapshotKey = useMemo(
    () => returnRouteTaskSnapshotKey(accountKey, taskQuery, routeState, routeTask),
    [accountKey, routeState, routeTask, taskQuery],
  );
  const initialTaskSnapshot = returnRouteTaskSnapshots.get(taskSnapshotKey);
  const [recordQuery, setRecordQuery] = useState<RecordFilterQuery>({
    page: 1,
    page_size: defaultPageSize,
    keyword: "",
    range: "24h",
    kinds: [],
    carriers: [],
    regions: [],
    expectedLines: [],
    actualLines: [],
  });
  const [taskData, setTaskData] = useState<TaskPage>(() => initialTaskSnapshot || { tasks: [], statuses: [], reachability: [], probing_task_ids: [], total: 0, page: 1, page_size: defaultPageSize });
  const [recordData, setRecordData] = useState<RecordPage>({ events: [], total: 0, page: 1, page_size: defaultPageSize });
  const initialSummarySnapshot = returnRouteSummarySnapshots.get(accountKey);
  const [summary, setSummary] = useState<SummaryData>(() => initialSummarySnapshot || { tasks: 0, healthy: 0, switched: 0, recent_events: 0, suspected_blocked: 0 });
  const [summaryLoading, setSummaryLoading] = useState(() => !initialSummarySnapshot);
  const [taskLoading, setTaskLoading] = useState(() => !initialTaskSnapshot);
  const hasRenderedTaskData = useRef(Boolean(initialTaskSnapshot));
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordsReady, setRecordsReady] = useState(false);
  const [rulesReady, setRulesReady] = useState(false);
  const [probingTasks, setProbingTasks] = useState<Set<number>>(new Set());
  const [selectedTaskIDs, setSelectedTaskIDs] = useState<Set<number>>(new Set());
  const [ruleView, setRuleView] = useState<RuleView | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesBusy, setRulesBusy] = useState<"reload" | "refresh" | "upload" | "">("");
  const ruleFileInput = useRef<HTMLInputElement>(null);

  const loadSummary = useCallback(async (quiet = false) => {
    if (!quiet && !returnRouteSummarySnapshots.has(accountKey)) setSummaryLoading(true);
    try {
      const data = await request("/summary");
      const next = { tasks: data?.tasks || 0, healthy: data?.healthy || 0, switched: data?.switched || 0, recent_events: data?.recent_events || 0 };
      returnRouteSummarySnapshots.set(accountKey, next);
      setSummary(next);
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : tr("toast.summary_failed", "概览加载失败"));
    } finally {
      if (!quiet) setSummaryLoading(false);
    }
  }, [accountKey]);

  const loadTasks = useCallback(async (quiet = false) => {
    if (!quiet && !hasRenderedTaskData.current && !returnRouteTaskSnapshots.has(taskSnapshotKey)) setTaskLoading(true);
    try {
      const data = await request("/tasks/query", {
        page: taskQuery.page,
        page_size: taskQuery.page_size,
        keyword: taskQuery.keyword,
        carriers: taskQuery.carriers,
        states: taskQuery.states,
        task_id: routeTask || undefined,
      });
      const probingTaskIDs = data?.probing_task_ids || [];
      const next = { tasks: data?.tasks || [], statuses: data?.statuses || [], reachability: data?.reachability || [], probing_task_ids: probingTaskIDs, total: data?.total || 0, page: data?.page || 1, page_size: data?.page_size || taskQuery.page_size };
      returnRouteTaskSnapshots.set(taskSnapshotKey, next);
      hasRenderedTaskData.current = true;
      setTaskData(next);
      setProbingTasks(new Set(probingTaskIDs));
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : tr("toast.tasks_failed", "任务加载失败"));
    } finally {
      if (!quiet) setTaskLoading(false);
    }
  }, [routeState, routeTask, taskQuery, taskSnapshotKey]);

  const loadRecords = useCallback(async (quiet = false) => {
    if (!quiet) setRecordLoading(true);
    try {
      const start = recordRangeStart(recordQuery.range);
      const data = await request("/events/query", {
        page: recordQuery.page,
        page_size: recordQuery.page_size,
        keyword: recordQuery.keyword,
        kinds: recordQuery.kinds,
        carriers: recordQuery.carriers,
        regions: recordQuery.regions,
        expected_lines: recordQuery.expectedLines,
        actual_lines: recordQuery.actualLines,
        start,
      });
      setRecordData({ events: data?.events || [], total: data?.total || 0, page: data?.page || 1, page_size: data?.page_size || recordQuery.page_size });
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : tr("toast.records_failed", "监测记录加载失败"));
    } finally {
      setRecordsReady(true);
      if (!quiet) setRecordLoading(false);
    }
  }, [recordQuery]);

  const loadRules = useCallback(async (quiet = false) => {
    if (!quiet) setRulesLoading(true);
    try {
      setRuleView(await request("/rules"));
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : tr("toast.rules_failed", "规则库加载失败"));
    } finally {
      setRulesReady(true);
      if (!quiet) setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    setTaskQuery((current) => ({ ...current, page: 1, page_size: defaultPageSize }));
    setRecordQuery((current) => ({ ...current, page: 1, page_size: defaultPageSize }));
  }, [defaultPageSize]);

  useEffect(() => {
    if (!routeState && !routeTask) return;
    if (searchParams.get("tab")) return;
    if (activeTab !== "tasks") setActiveTab("tasks");
    setTaskQuery((current) => (current.page === 1 ? current : { ...current, page: 1 }));
  }, [activeTab, routeState, routeTask, searchParams, setActiveTab]);

  useEffect(() => {
    if (activeTab !== "tasks") return;
    const timer = window.setTimeout(() => loadTasks(), taskQuery.keyword ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, loadTasks, taskQuery.keyword]);

  useEffect(() => {
    if (activeTab !== "records") return;
    const timer = window.setTimeout(() => loadRecords(), recordQuery.keyword ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, loadRecords, recordQuery.keyword]);

  useEffect(() => {
    if (activeTab === "rules") loadRules();
  }, [activeTab, loadRules]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadSummary(true);
      if (activeTab === "tasks") loadTasks(true);
      else if (activeTab === "records") loadRecords(true);
      else loadRules(true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [activeTab, loadRecords, loadRules, loadSummary, loadTasks]);

  const statuses = useMemo(() => new Map(taskData.statuses.map((item) => [item.task_id, item])), [taskData.statuses]);
  const reachabilityByNode = useMemo(() => {
    const map = new Map<string, Reachability>();
    for (const item of taskData.reachability || []) {
      map.set(`${item.client}:${item.ip_version}`, item);
    }
    return map;
  }, [taskData.reachability]);
  const selectedTasks = useMemo(
    () => taskData.tasks.filter((task) => task.id && selectedTaskIDs.has(task.id)),
    [selectedTaskIDs, taskData.tasks],
  );
  const visibleTaskIDs = useMemo(
    () => taskData.tasks.flatMap((task) => task.id ? [task.id] : []),
    [taskData.tasks],
  );
  const allVisibleTasksSelected = visibleTaskIDs.length > 0 && visibleTaskIDs.every((id) => selectedTaskIDs.has(id));

  useEffect(() => {
    const visible = new Set(visibleTaskIDs);
    setSelectedTaskIDs((current) => {
      const next = new Set([...current].filter((id) => visible.has(id)));
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current;
      return next;
    });
  }, [visibleTaskIDs]);

  const toggleTaskSelection = (id: number) => {
    setSelectedTaskIDs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisibleTaskSelection = () => {
    setSelectedTaskIDs((current) => {
      const next = new Set(current);
      if (allVisibleTasksSelected) visibleTaskIDs.forEach((id) => next.delete(id));
      else visibleTaskIDs.forEach((id) => next.add(id));
      return next;
    });
  };
  const updateTaskQuery = (updates: Partial<typeof taskQuery>) => setTaskQuery((current) => ({ ...current, ...updates, page: updates.page ?? 1 }));
  const updateRecordQuery = (updates: Partial<typeof recordQuery>) => setRecordQuery((current) => ({ ...current, ...updates, page: updates.page ?? 1 }));
  const refreshTasksAfterChange = () => {
    loadSummary(true);
    if (taskQuery.page === 1) loadTasks();
    else updateTaskQuery({ page: 1 });
  };

  const runNow = async (id?: number) => {
    if (!id) return;
    try {
      await request("/probe", { id });
      setProbingTasks((current) => new Set(current).add(id));
      toast.success(tr("toast.probe_dispatched", "探测任务已下发，逐跳探测通常需要 10-30 秒"));
      window.setTimeout(() => loadTasks(true), 1500);
      window.setTimeout(() => {
        setProbingTasks((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, 45000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("toast.probe_failed", "下发失败"));
    }
  };

  const remove = async (task: Task) => {
    if (!task.id || !window.confirm(tr("toast.confirm_delete", "确定删除“{{name}}”及其切换历史吗？", { name: task.name }))) return;
    try {
      await request("/delete", { ids: [task.id] });
      toast.success(tr("toast.deleted", "任务已删除"));
      refreshTasksAfterChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("toast.delete_failed", "删除失败"));
    }
  };

  const reloadRules = async () => {
    setRulesBusy("reload");
    try {
      setRuleView(await request("/rules/reload", {}));
      toast.success(tr("toast.rules_reloaded", "本地规则已重新加载"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("toast.rules_reload_failed", "重新加载失败"));
      loadRules(true);
    } finally {
      setRulesBusy("");
    }
  };

  const refreshBGPRules = async () => {
    setRulesBusy("refresh");
    try {
      setRuleView(await request("/rules/refresh", {}));
      toast.success(tr("toast.bgp_updated", "BGP 网段规则已更新"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("toast.bgp_failed", "BGP 网段更新失败"));
      loadRules(true);
    } finally {
      setRulesBusy("");
    }
  };

  const importRules = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setRulesBusy("upload");
    try {
      const rules = JSON.parse(await file.text());
      setRuleView(await request("/rules/update", { rules }));
      toast.success(tr("toast.rules_imported", "规则文件已校验并生效"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr("toast.rules_import_failed", "规则文件导入失败"));
      loadRules(true);
    } finally {
      setRulesBusy("");
    }
  };

  const exportRules = () => {
    if (!ruleView?.rules) return;
    const blob = new Blob([`${JSON.stringify(ruleView.rules, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "return-route-signatures.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabReady =
    activeTab === "tasks"
      ? !taskLoading
      : activeTab === "records"
        ? recordsReady
        : rulesReady;
  const displayTab = useHeldTab(activeTab, tabReady);

  if (nodesLoading) return <Loading text="" />;

  return (
    <div
      data-admin-route-pending={taskLoading || summaryLoading ? "true" : undefined}
      className="flex w-full min-w-0 flex-col gap-4 p-0 md:p-4"
    >
      <AdminPageTitle
        description={t(
          "return_route.description",
          "识别移动、电信、联通回程线路，确认切线后告警，恢复后自动通知。",
        )}
      >
        {t("return_route.title", "回程线路监测")}
      </AdminPageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label={tr("summary.tasks", "监测任务")} value={summary.tasks} icon={<Route size={20} />} />
        <Summary label={tr("summary.healthy", "线路正常")} value={summary.healthy} tone="green" icon={<CheckCircle2 size={20} />} extra={summary.suspected_blocked ? tr("summary.blocked_count", "疑似被墙 {{count}}", { count: summary.suspected_blocked }) : undefined} />
        <Summary label={tr("summary.switched", "已切线")} value={summary.switched} tone="red" icon={<AlertTriangle size={20} />} />
        <Summary label={tr("summary.recent_events", "最近事件")} value={summary.recent_events} icon={<History size={20} />} />
      </div>

      <Tabs.Root value={displayTab} onValueChange={setActiveTab}>
        <AdminSheetTabs>
          <Tabs.List>
            <Tabs.Trigger value="tasks">
              <AdminTabLabel icon={<Route size={18} />}>{tr("tab.tasks", "监测任务")}</AdminTabLabel>
            </Tabs.Trigger>
            <Tabs.Trigger value="records">
              <AdminTabLabel icon={<History size={18} />}>{tr("tab.records", "监测记录")}</AdminTabLabel>
            </Tabs.Trigger>
            <Tabs.Trigger value="rules">
              <AdminTabLabel icon={<ListChecks size={18} />}>{tr("tab.rules", "规则库")}</AdminTabLabel>
            </Tabs.Trigger>
          </Tabs.List>
        </AdminSheetTabs>

        <Box pt="3">
          <Tabs.Content value="tasks" className="admin-tab-panel">
            <AdminListShell>
              <AdminListFiltersBar>
                <Stack
                  direction="row"
                  spacing={1.5}
                  useFlexGap
                  sx={{ flexWrap: { xs: "wrap", md: "nowrap" }, alignItems: "center" }}
                >
                  <AdminMultiSelect
                    label={tr("filter.carrier", "运营商")}
                    ariaLabel={tr("filter.carrier", "运营商")}
                    value={taskQuery.carriers}
                    onChange={(carriers) => updateTaskQuery({ carriers })}
                    options={Object.entries(carrierNames()).map(([value, label]) => ({ value, label }))}
                  />
                  <AdminMultiSelect
                    label={tr("filter.status", "状态")}
                    ariaLabel={tr("filter.status", "状态")}
                    value={taskQuery.states}
                    onChange={(states) => updateTaskQuery({ states })}
                    options={Object.entries(taskStateLabels()).map(([value, label]) => ({ value, label }))}
                  />
                  <AdminListSearch
                    value={taskQuery.keyword}
                    onChange={(keyword) => updateTaskQuery({ keyword })}
                    placeholder={tr("filter.search_tasks", "搜索任务、节点或目标")}
                  />
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: "center" }}>
                    <MuiButton
                      type="button"
                      variant="outlined"
                      disabled={visibleTaskIDs.length === 0}
                      onClick={toggleVisibleTaskSelection}
                      sx={ADMIN_LIST_OUTLINE_SX}
                    >
                      {allVisibleTasksSelected ? tr("filter.deselect_all", "取消全选") : tr("filter.select_all", "全选")}
                    </MuiButton>
                    <RouteTaskBatchDialog
                      tasks={selectedTasks}
                      onClear={() => setSelectedTaskIDs(new Set())}
                      onSaved={refreshTasksAfterChange}
                    >
                      <MuiButton
                        type="button"
                        variant="outlined"
                        disabled={selectedTasks.length === 0}
                        startIcon={<Pencil size={16} />}
                        sx={ADMIN_LIST_OUTLINE_SX}
                      >
                        {tr("filter.batch_edit", "批量修改")}{selectedTasks.length > 0 ? ` (${selectedTasks.length})` : ""}
                      </MuiButton>
                    </RouteTaskBatchDialog>
                    <RouteTaskDialog nodes={nodes} onSaved={refreshTasksAfterChange}>
                      <MuiButton variant="contained" startIcon={<Plus size={16} />} sx={ADMIN_LIST_ACTION_SX}>
                        {tr("filter.new_task", "新建任务")}
                      </MuiButton>
                    </RouteTaskDialog>
                  </Stack>
                </Stack>
                <Collapse
                  in={Boolean(taskQuery.keyword || taskQuery.carriers.length || taskQuery.states.length)}
                  timeout={{ enter: 260, exit: 180 }}
                  easing={{
                    enter: "cubic-bezier(0.22, 1, 0.36, 1)",
                    exit: "cubic-bezier(0.4, 0, 1, 1)",
                  }}
                  unmountOnExit
                >
                  <Stack className="km-admin-active-filters" direction="row" spacing={1} useFlexGap sx={{ mt: 2, flexWrap: "wrap", alignItems: "center" }}>
                    {taskQuery.carriers.map((carrier) => (
                      <Chip
                        key={`carrier-${carrier}`}
                        className="km-admin-filter-chip"
                        size="small"
                        onDelete={() => updateTaskQuery({ carriers: taskQuery.carriers.filter((item) => item !== carrier) })}
                        deleteIcon={<X size={14} />}
                        label={tr("filter.chip_carrier", "运营商: {{value}}", { value: carrierNames()[carrier as Task["carrier"]] || carrier })}
                      />
                    ))}
                    {taskQuery.states.map((state) => (
                      <Chip
                        key={`state-${state}`}
                        className="km-admin-filter-chip"
                        size="small"
                        onDelete={() => updateTaskQuery({ states: taskQuery.states.filter((item) => item !== state) })}
                        deleteIcon={<X size={14} />}
                        label={tr("filter.chip_status", "状态: {{value}}", { value: taskStateLabels()[state] || state })}
                      />
                    ))}
                    {taskQuery.keyword.trim() ? (
                      <Chip className="km-admin-filter-chip" size="small" onDelete={() => updateTaskQuery({ keyword: "" })} deleteIcon={<X size={14} />} label={tr("filter.chip_search", "搜索: {{value}}", { value: taskQuery.keyword.trim() })} />
                    ) : null}
                    <MuiButton
                      color="error"
                      size="small"
                      startIcon={<FilterOff size={16} />}
                      onClick={() => setTaskQuery((current) => ({ ...current, page: 1, keyword: "", carriers: [], states: [] }))}
                    >
                      {tr("filter.clear_all", "清除全部")}
                    </MuiButton>
                  </Stack>
                </Collapse>
              </AdminListFiltersBar>
              {taskLoading ? (
                <div className="km-admin-list-empty"><Loading text="" /></div>
              ) : taskData.tasks.length === 0 ? (
                <div className="km-admin-list-empty">
                  {taskData.total === 0 && !taskQuery.keyword && taskQuery.carriers.length === 0 && taskQuery.states.length === 0 ? tr("empty.no_tasks", "暂无任务") : tr("empty.no_matching_tasks", "没有符合条件的任务")}
                </div>
              ) : (
                <>
                  {isMobile ? (
                    <AdminMobileCardStack>
                      {taskData.tasks.map((task) => {
                        const status = statuses.get(task.id || 0);
                        const reachability = reachabilityByNode.get(`${task.client}:${task.ip_version}`);
                        const probing = probingTasks.has(task.id || 0);
                        const selected = Boolean(task.id && selectedTaskIDs.has(task.id));
                        return (
                          <ReturnRouteTaskRow
                            key={task.id}
                            task={task}
                            status={status}
                            reachability={reachability}
                            probing={probing}
                            selected={selected}
                            asCard
                            nodes={nodes}
                            onToggle={() => task.id && toggleTaskSelection(task.id)}
                            onRunNow={() => runNow(task.id)}
                            onRemove={() => remove(task)}
                            onSaved={refreshTasksAfterChange}
                          />
                        );
                      })}
                    </AdminMobileCardStack>
                  ) : (
                  <div className="admin-responsive-table-wrap overflow-x-auto">
                    <Table container={false} className="admin-responsive-table admin-selection-table return-route-task-table w-full min-w-[1120px] text-left text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-11"><span className="sr-only">{tr("col.select", "选择")}</span></TableHead>
                          <TableHead className="text-left">{tr("col.task_node", "任务 / 节点")}</TableHead>
                          <TableHead className="text-left">{tr("col.carrier_region", "运营商 / 地区")}</TableHead>
                          <TableHead className="text-left">{tr("col.line", "线路")}</TableHead>
                          <TableHead className="text-left">{tr("col.status", "状态")}</TableHead>
                          <TableHead className="text-left">{tr("col.asn", "关键 ASN")}</TableHead>
                          <TableHead className="text-left">{tr("col.last_probe", "最后探测")}</TableHead>
                          <TableHead className="text-left">{tr("col.actions", "操作")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {taskData.tasks.map((task) => {
                          const status = statuses.get(task.id || 0);
                          const reachability = reachabilityByNode.get(`${task.client}:${task.ip_version}`);
                          const probing = probingTasks.has(task.id || 0);
                          const selected = Boolean(task.id && selectedTaskIDs.has(task.id));
                          return (
                            <ReturnRouteTaskRow
                              key={task.id}
                              task={task}
                              status={status}
                              reachability={reachability}
                              probing={probing}
                              selected={selected}
                              nodes={nodes}
                              onToggle={() => task.id && toggleTaskSelection(task.id)}
                              onRunNow={() => runNow(task.id)}
                              onRemove={() => remove(task)}
                              onSaved={refreshTasksAfterChange}
                            />
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                  )}
                  <AdminPagination
                    page={taskQuery.page}
                    pageSize={taskQuery.page_size}
                    total={taskData.total}
                    onPageChange={(page) => updateTaskQuery({ page })}
                    onPageSizeChange={(page_size) => updateTaskQuery({ page_size })}
                    showSummary={false}
                  />
                </>
              )}
            </AdminListShell>
          </Tabs.Content>

          <Tabs.Content value="records" className="admin-tab-panel">
            <AdminListShell>
              <AdminListFiltersBar>
                <Stack
                  direction="row"
                  spacing={1.5}
                  useFlexGap
                  sx={{ flexWrap: "wrap", alignItems: "center" }}
                >
                  <AdminListSelect label={tr("filter.range", "时间范围")} value={recordQuery.range} onChange={(range) => updateRecordQuery({ range })}>
                    <MenuItem value="24h">{tr("filter.range_24h", "最近 24 小时")}</MenuItem>
                    <MenuItem value="7d">{tr("filter.range_7d", "最近 7 天")}</MenuItem>
                    <MenuItem value="30d">{tr("filter.range_30d", "最近 30 天")}</MenuItem>
                    <MenuItem value="all">{tr("filter.range_all", "全部时间")}</MenuItem>
                  </AdminListSelect>
                  <AdminMultiSelect
                    label={tr("filter.kind", "记录类型")}
                    ariaLabel={tr("filter.kind", "记录类型")}
                    value={recordQuery.kinds}
                    onChange={(kinds) => updateRecordQuery({ kinds })}
                    options={Object.entries(recordKindLabels()).map(([value, label]) => ({ value, label }))}
                  />
                  <AdminMultiSelect
                    label={tr("filter.carrier", "运营商")}
                    ariaLabel={tr("filter.carrier", "运营商")}
                    value={recordQuery.carriers}
                    onChange={(carriers) => updateRecordQuery({ carriers })}
                    options={Object.entries(carrierNames()).map(([value, label]) => ({ value, label }))}
                  />
                  <AdminMultiSelect
                    label={tr("filter.region", "地区")}
                    ariaLabel={tr("filter.region", "地区")}
                    value={recordQuery.regions}
                    onChange={(regions) => updateRecordQuery({ regions })}
                    options={regionOptions()}
                  />
                  <AdminMultiSelect
                    label={tr("filter.expected_line", "预期线路")}
                    ariaLabel={tr("filter.expected_line", "预期线路")}
                    value={recordQuery.expectedLines}
                    onChange={(expectedLines) => updateRecordQuery({ expectedLines })}
                    options={allLineOptions.map((line) => ({ value: line, label: line }))}
                  />
                  <AdminMultiSelect
                    label={tr("filter.actual_line", "实际线路")}
                    ariaLabel={tr("filter.actual_line", "实际线路")}
                    value={recordQuery.actualLines}
                    onChange={(actualLines) => updateRecordQuery({ actualLines })}
                    options={allLineOptions.map((line) => ({ value: line, label: line }))}
                  />
                  <AdminListSearch
                    value={recordQuery.keyword}
                    onChange={(keyword) => updateRecordQuery({ keyword })}
                    placeholder={tr("filter.search_records", "搜索任务、节点、目标、ASN 或 IP")}
                  />
                </Stack>
                <Collapse
                  in={Boolean(
                    recordQuery.keyword ||
                    recordQuery.range !== "24h" ||
                    recordQuery.kinds.length ||
                    recordQuery.carriers.length ||
                    recordQuery.regions.length ||
                    recordQuery.expectedLines.length ||
                    recordQuery.actualLines.length
                  )}
                  timeout={{ enter: 260, exit: 180 }}
                  easing={{
                    enter: "cubic-bezier(0.22, 1, 0.36, 1)",
                    exit: "cubic-bezier(0.4, 0, 1, 1)",
                  }}
                  unmountOnExit
                >
                  <Stack className="km-admin-active-filters" direction="row" spacing={1} useFlexGap sx={{ mt: 2, flexWrap: "wrap", alignItems: "center" }}>
                    {recordQuery.range !== "24h" ? (
                      <Chip className="km-admin-filter-chip" size="small" onDelete={() => updateRecordQuery({ range: "24h" })} deleteIcon={<X size={14} />} label={tr("filter.chip_range", "时间范围: {{value}}", { value: recordQuery.range === "7d" ? tr("filter.range_7d", "最近 7 天") : recordQuery.range === "30d" ? tr("filter.range_30d", "最近 30 天") : tr("filter.range_all", "全部时间") })} />
                    ) : null}
                    {recordQuery.kinds.map((kind) => (
                      <Chip key={`kind-${kind}`} className="km-admin-filter-chip" size="small" onDelete={() => updateRecordQuery({ kinds: recordQuery.kinds.filter((item) => item !== kind) })} deleteIcon={<X size={14} />} label={tr("filter.chip_kind", "记录类型: {{value}}", { value: recordKindLabels()[kind] || kind })} />
                    ))}
                    {recordQuery.carriers.map((carrier) => (
                      <Chip key={`record-carrier-${carrier}`} className="km-admin-filter-chip" size="small" onDelete={() => updateRecordQuery({ carriers: recordQuery.carriers.filter((item) => item !== carrier) })} deleteIcon={<X size={14} />} label={tr("filter.chip_carrier", "运营商: {{value}}", { value: carrierNames()[carrier as Task["carrier"]] || carrier })} />
                    ))}
                    {recordQuery.regions.map((region) => (
                      <Chip key={`region-${region}`} className="km-admin-filter-chip" size="small" onDelete={() => updateRecordQuery({ regions: recordQuery.regions.filter((item) => item !== region) })} deleteIcon={<X size={14} />} label={tr("filter.chip_region", "地区: {{value}}", { value: regionLabel(region) })} />
                    ))}
                    {recordQuery.expectedLines.map((line) => (
                      <Chip key={`expected-${line}`} className="km-admin-filter-chip" size="small" onDelete={() => updateRecordQuery({ expectedLines: recordQuery.expectedLines.filter((item) => item !== line) })} deleteIcon={<X size={14} />} label={tr("filter.chip_expected", "预期线路: {{value}}", { value: line })} />
                    ))}
                    {recordQuery.actualLines.map((line) => (
                      <Chip key={`actual-${line}`} className="km-admin-filter-chip" size="small" onDelete={() => updateRecordQuery({ actualLines: recordQuery.actualLines.filter((item) => item !== line) })} deleteIcon={<X size={14} />} label={tr("filter.chip_actual", "实际线路: {{value}}", { value: line })} />
                    ))}
                    {recordQuery.keyword.trim() ? (
                      <Chip className="km-admin-filter-chip" size="small" onDelete={() => updateRecordQuery({ keyword: "" })} deleteIcon={<X size={14} />} label={tr("filter.chip_search", "搜索: {{value}}", { value: recordQuery.keyword.trim() })} />
                    ) : null}
                    <MuiButton
                      color="error"
                      size="small"
                      startIcon={<FilterOff size={16} />}
                      onClick={() => setRecordQuery((current) => ({ ...current, page: 1, keyword: "", range: "24h", kinds: [], carriers: [], regions: [], expectedLines: [], actualLines: [] }))}
                    >
                      {tr("filter.clear_all", "清除全部")}
                    </MuiButton>
                  </Stack>
                </Collapse>
              </AdminListFiltersBar>
              {recordLoading && !recordsReady ? (
                <div className="km-admin-list-empty"><Loading inline text="" /></div>
              ) : recordData.events.length === 0 ? (
                <div className="km-admin-list-empty">{tr("empty.no_records", "暂无符合条件的监测记录")}</div>
              ) : (
                <>
                  {isMobile ? (
                    <AdminMobileCardStack>
                      {recordData.events.map((event) => (
                        <ReturnRouteRecordRow key={event.id} event={event} asCard />
                      ))}
                    </AdminMobileCardStack>
                  ) : (
                  <div className="admin-responsive-table-wrap overflow-x-auto">
                    <Table container={false} className="admin-responsive-table admin-primary-first-table w-full min-w-[1120px] text-left text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tr("col.occurred_at", "发生时间")}</TableHead>
                          <TableHead>{tr("col.kind", "类型")}</TableHead>
                          <TableHead>{tr("col.task_node", "任务 / 节点")}</TableHead>
                          <TableHead>{tr("col.target", "目标")}</TableHead>
                          <TableHead>{tr("col.expected_line", "预期线路")}</TableHead>
                          <TableHead>{tr("col.line_change", "线路变化")}</TableHead>
                          <TableHead>{tr("col.asn", "关键 ASN")}</TableHead>
                          <TableHead>{tr("col.path", "路径")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {recordData.events.map((event) => (
                          <ReturnRouteRecordRow key={event.id} event={event} />
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  )}
                  <AdminPagination
                    page={recordQuery.page}
                    pageSize={recordQuery.page_size}
                    total={recordData.total}
                    onPageChange={(page) => updateRecordQuery({ page })}
                    onPageSizeChange={(page_size) => updateRecordQuery({ page_size })}
                    showSummary={false}
                  />
                </>
              )}
            </AdminListShell>
          </Tabs.Content>

          <Tabs.Content value="rules" className="admin-tab-panel">
            {rulesLoading && !ruleView ? (
              <AdminListShell className="km-return-route-rules">
                <div className="km-admin-list-empty"><Loading inline text="" /></div>
              </AdminListShell>
            ) : ruleView ? (
              <AdminListShell className="km-return-route-rules">
                <AdminListFiltersBar>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    useFlexGap
                    sx={{ flexWrap: "wrap", alignItems: "center" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#1C252E]">{tr("rules.method", "识别方式")}</div>
                      <div className="mt-0.5 text-xs text-[#637381]">{tr("rules.method_hint", "本地骨干特征库（BGPtools 定时更新） + 有序路径判断 + Cymru/RIPEstat/BGPView 按需回退")}</div>
                    </div>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
                      <MuiButton variant="outlined" startIcon={<Download size={16} />} onClick={exportRules} sx={ADMIN_LIST_OUTLINE_SX}>{tr("rules.export", "导出规则")}</MuiButton>
                      <input ref={ruleFileInput} type="file" accept="application/json,.json" className="hidden" onChange={importRules} />
                      <MuiButton variant="outlined" disabled={Boolean(rulesBusy)} startIcon={<Upload size={16} />} onClick={() => ruleFileInput.current?.click()} sx={ADMIN_LIST_OUTLINE_SX}>
                        {rulesBusy === "upload" ? tr("rules.importing", "导入中...") : tr("rules.import", "导入规则")}
                      </MuiButton>
                      <MuiButton variant="outlined" disabled={Boolean(rulesBusy)} startIcon={<RefreshCw size={16} />} onClick={reloadRules} sx={ADMIN_LIST_OUTLINE_SX}>
                        {rulesBusy === "reload" ? tr("rules.loading", "加载中...") : tr("rules.reload", "重新加载")}
                      </MuiButton>
                      <MuiButton variant="contained" disabled={Boolean(rulesBusy)} startIcon={<RefreshCw size={16} />} onClick={refreshBGPRules} sx={ADMIN_LIST_ACTION_SX}>
                        {rulesBusy === "refresh" ? tr("rules.refreshing", "更新中...") : tr("rules.refresh_bgp", "更新 BGP")}
                      </MuiButton>
                    </Stack>
                  </Stack>
                </AdminListFiltersBar>
                <div className="km-admin-list-empty">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <RuleStat label={tr("rules.version", "当前版本")} value={ruleView.status.rule_version || "-"} />
                    <RuleStat label={tr("rules.source", "规则来源")} value={ruleView.status.source === "external" ? tr("rules.source_external", "外部规则") : tr("rules.source_builtin", "内置规则")} />
                    <RuleStat label={tr("rules.watching", "热加载")} value={ruleView.status.watching ? tr("rules.watching_on", "运行中") : tr("rules.watching_off", "未运行")} />
                    <RuleStat label={tr("rules.loaded_at", "最近加载")} value={formatTime(ruleView.status.loaded_at)} />
                    <RuleStat label={tr("rules.asn_rules", "ASN 规则")} value={String(ruleView.status.asn_rule_count)} />
                    <RuleStat label={tr("rules.manual_cidr", "人工网段")} value={String(ruleView.status.manual_cidr_count)} />
                    <RuleStat label={tr("rules.bgp_cidr", "BGP 网段")} value={String(ruleView.status.bgp_cidr_count)} />
                    <RuleStat label={tr("rules.cidr_total", "网段合计")} value={String(ruleView.status.cidr_rule_count)} />
                    <RuleStat label={tr("rules.bgp_generated", "BGP 生成时间")} value={formatTime(ruleView.status.bgp_generated_at)} />
                    <RuleStat label={tr("rules.bgp_loaded", "BGP 加载时间")} value={formatTime(ruleView.status.bgp_loaded_at)} />
                    <RuleStat label={tr("rules.bgp_next", "下次自动更新")} value={formatTime(ruleView.status.bgp_next_refresh_at)} />
                    <RuleStat label={tr("rules.local_file", "本地规则文件")} value={ruleView.status.external_path || "-"} mono />
                  </div>
                </div>
                {ruleView.status.last_error ? <Callout.Root color="red"><Callout.Icon><AlertTriangle size={16} /></Callout.Icon><Callout.Text>{tr("rules.local_error", "本地规则：{{error}}", { error: ruleView.status.last_error })}</Callout.Text></Callout.Root> : null}
                {ruleView.status.bgp_last_error ? <Callout.Root color="amber"><Callout.Icon><AlertTriangle size={16} /></Callout.Icon><Callout.Text>{tr("rules.bgp_error", "BGP 更新：{{error}}", { error: ruleView.status.bgp_last_error })}</Callout.Text></Callout.Root> : null}
                {isMobile ? (
                  <AdminMobileCardStack>
                    {ruleGroupOrder.map((group) => (
                      <ReturnRouteRuleRow
                        key={group}
                        group={group}
                        asns={ruleView.rules.asn_groups[group]}
                        prefixes={ruleView.rules.prefix_groups[group]}
                        asCard
                      />
                    ))}
                  </AdminMobileCardStack>
                ) : (
                <div className="admin-responsive-table-wrap overflow-x-auto">
                  <Table container={false} className="admin-responsive-table admin-primary-first-table w-full min-w-[760px] text-left text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tr("col.line", "线路")}</TableHead>
                        <TableHead>ASN</TableHead>
                        <TableHead>{tr("col.manual_prefixes", "人工网段特征")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {ruleGroupOrder.map((group) => (
                        <ReturnRouteRuleRow
                          key={group}
                          group={group}
                          asns={ruleView.rules.asn_groups[group]}
                          prefixes={ruleView.rules.prefix_groups[group]}
                        />
                      ))}
                    </tbody>
                  </Table>
                </div>
                )}
              </AdminListShell>
            ) : <Callout.Root color="gray"><Callout.Text>{tr("empty.rules_unavailable", "规则库暂不可用")}</Callout.Text></Callout.Root>}
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </div>
  );
}

function recordRangeStart(range: string) {
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : range === "30d" ? 24 * 30 : 0;
  return hours ? new Date(Date.now() - hours * 60 * 60 * 1000).toISOString() : undefined;
}

function Summary({ label, value, icon, tone = "gray", extra }: { label: string; value: number; icon: React.ReactNode; tone?: "gray" | "green" | "red"; extra?: string }) {
  const color = tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : "text-gray-500";
  return (
    <div className="flex min-h-24 items-center justify-between rounded-md border border-[var(--gray-a5)] bg-[var(--color-panel-solid)] px-5 py-4">
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {extra ? <div className="mt-1 text-xs font-medium text-red-600">{extra}</div> : null}
      </div>
      <span className={color}>{icon}</span>
    </div>
  );
}

function RuleStat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><div className="text-xs text-gray-500">{label}</div><div className={`mt-1 break-words text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</div></div>;
}

function ReturnRouteTaskRow({
  task,
  status,
  reachability,
  probing,
  selected,
  asCard = false,
  nodes,
  onToggle,
  onRunNow,
  onRemove,
  onSaved,
}: {
  task: Task;
  status?: Status;
  reachability?: Reachability;
  probing: boolean;
  selected: boolean;
  asCard?: boolean;
  nodes: Array<{ uuid: string; name: string }>;
  onToggle: () => void;
  onRunNow: () => void;
  onRemove: () => void;
  onSaved: () => void;
}) {
  const needed = status?.candidate_line === task.expected_line ? task.recovery_confirm : task.switch_confirm;
  const checkbox = (
    <Checkbox
      aria-label={tr("row.select_task", "选择任务 {{name}}", { name: task.name })}
      checked={selected}
      onCheckedChange={onToggle}
    />
  );
  const carrierValue = (
    <div className="return-route-cell-pair">
      <div>{carrierNames()[task.carrier]}</div>
      <div className="mt-1 text-xs text-gray-500">{regionLabel(task.region)} · IPv{task.ip_version}</div>
    </div>
  );
  const lineValue = (
    <div className="return-route-cell-pair">
      <div><span className="text-gray-500">{tr("row.current", "当前 ")}</span><strong>{status?.current_line || "-"}</strong></div>
      <div className="mt-1 text-xs text-gray-500">{tr("row.expected", "预期 {{line}}", { line: task.expected_line })}</div>
    </div>
  );
  const statusValue = (
    <div className="return-route-cell-content">
      {!task.enabled ? <Badge color="gray">{tr("state.disabled", "已暂停")}</Badge> : probing ? <Badge color="blue">{tr("state.probing", "探测中")}</Badge> : stateBadge(task, status, reachability)}
      {status?.candidate_line && (
        <div className="mt-1 text-xs text-amber-600">
          {status.candidate_line}
          {pendingLineOptions.has(status.candidate_line) ? null : <> {status.candidate_count}/{needed}</>}
        </div>
      )}
      {(status?.confidence ?? 0) > 0 && (
        <div className="mt-1 text-xs text-gray-500">{tr("state.confidence", "置信度 {{value}}%", { value: ((status?.confidence ?? 0) * 100).toFixed(0) })}</div>
      )}
    </div>
  );
  const asnValue = (
    <div className="return-route-cell-content">
      <div className="flex flex-wrap gap-1">
        {status?.asn_path?.length ? status.asn_path.map((asn) => (
          <Badge key={asn} color="gray" variant="soft">{asn}</Badge>
        )) : <span className="text-gray-400">-</span>}
      </div>
      {status?.route_path?.length ? (
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer">{tr("row.view_path", "查看完整路径")}</summary>
          <div className="mt-2 max-h-48 overflow-auto whitespace-pre font-mono leading-5">{status.route_path.join("\n")}</div>
        </details>
      ) : null}
      {status?.last_error && <div className="mt-2 max-w-xs text-xs text-red-600">{status.last_error}</div>}
    </div>
  );
  const lastProbeValue = (
    <div className="return-route-cell-pair">
      <span>{formatTime(status?.last_checked_at)}</span>
      <div className="mt-1 text-xs text-gray-400">{tr("row.every_minutes", "每 {{count}} 分钟", { count: Math.round(task.interval / 60) })}</div>
    </div>
  );
  const actionButtons = (
    <div className="admin-card-actions return-route-actions">
      <IconButton variant="ghost" title={probing ? tr("state.probing", "探测中") : tr("row.probe_now", "立即探测")} disabled={probing || !task.enabled} onClick={onRunNow}>
        {probing ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
      </IconButton>
      <RouteTaskDialog task={task} nodes={nodes} onSaved={onSaved}>
        <IconButton variant="ghost" title={tr("row.edit", "编辑")}><Pencil size={16} /></IconButton>
      </RouteTaskDialog>
      <IconButton variant="ghost" color="red" title={tr("row.delete", "删除")} onClick={onRemove}><Trash2 size={16} /></IconButton>
    </div>
  );

  if (asCard) {
    return (
      <AdminMobileListCard
        title={
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-6">{task.name}</div>
            <div className="truncate text-[13.5px] text-muted-foreground">{task.client_info?.name || task.client}</div>
          </div>
        }
        headerExtra={checkbox}
        cells={[
          [tr("col.carrier_region", "运营商 / 地区"), carrierValue],
          [tr("col.line", "线路"), lineValue],
          [tr("col.status", "状态"), statusValue],
          [tr("col.asn", "关键 ASN"), asnValue],
          [tr("col.last_probe", "最后探测"), lastProbeValue],
        ]}
        actions={actionButtons}
      />
    );
  }

  return (
    <tr className={`align-middle hover:bg-gray-50/60 dark:hover:bg-gray-900/50 ${selected ? "bg-[var(--accent-a2)]" : ""}`}>
      <td data-label={tr("col.select", "选择")} className="p-3 align-middle">{checkbox}</td>
      <td data-label={tr("col.task_node", "任务 / 节点")} className="p-3 align-middle"><div className="return-route-cell-pair"><div className="font-medium">{task.name}</div><div className="mt-1 text-xs text-gray-500">{task.client_info?.name || task.client}</div></div></td>
      <td data-label={tr("col.carrier_region", "运营商 / 地区")} className="p-3 align-middle"><div className="return-route-cell-pair"><div>{carrierNames()[task.carrier]}</div><div className="mt-1 text-xs text-gray-500">{regionLabel(task.region)} · IPv{task.ip_version}</div></div></td>
      <td data-label={tr("col.line", "线路")} className="p-3 text-left align-middle"><div className="return-route-cell-pair"><div><span className="text-gray-500">{tr("row.current", "当前 ")}</span><strong>{status?.current_line || "-"}</strong></div><div className="mt-1 text-xs text-gray-500">{tr("row.expected", "预期 {{line}}", { line: task.expected_line })}</div></div></td>
      <td data-label={tr("col.status", "状态")} className="p-3 text-left align-middle"><div className="return-route-cell-content">{!task.enabled ? <Badge color="gray">{tr("state.disabled", "已暂停")}</Badge> : probing ? <Badge color="blue">{tr("state.probing", "探测中")}</Badge> : stateBadge(task, status, reachability)}{status?.candidate_line && <div className="mt-1 text-xs text-amber-600">{status.candidate_line}{pendingLineOptions.has(status.candidate_line) ? null : <> {status.candidate_count}/{needed}</>}</div>}{(status?.confidence ?? 0) > 0 && <div className="mt-1 text-xs text-gray-500">{tr("state.confidence", "置信度 {{value}}%", { value: ((status?.confidence ?? 0) * 100).toFixed(0) })}</div>}</div></td>
      <td data-label={tr("col.asn", "关键 ASN")} className="max-w-[320px] p-3 text-left align-middle">{asnValue}</td>
      <td data-label={tr("col.last_probe", "最后探测")} className="p-3 text-left align-middle text-gray-600"><div className="return-route-cell-pair"><span>{formatTime(status?.last_checked_at)}</span><div className="mt-1 text-xs text-gray-400">{tr("row.every_minutes", "每 {{count}} 分钟", { count: Math.round(task.interval / 60) })}</div></div></td>
      <td data-label={tr("col.actions", "操作")} className="p-3 text-left align-middle">{actionButtons}</td>
    </tr>
  );
}

function ReturnRouteRecordRow({
  event,
  asCard = false,
}: {
  event: RouteEvent;
  asCard?: boolean;
}) {
  const mainland = event.kind.startsWith("mainland_");
  const kindBadge = (
    <Badge color={event.kind === "mainland_recovery" || event.kind === "recovery" ? "green" : "red"}>
      {recordKindLabels()[event.kind] || event.kind}
    </Badge>
  );
  const taskValue = (
    <>
      <div className="font-medium">{event.task_name || `#${event.task_id}`}</div>
      <div className="mt-1 text-xs text-gray-500">{event.node_name || event.client}</div>
    </>
  );
  const targetValue = (
    <>
      <div>{event.target || "-"}</div>
      <div className="mt-1 text-xs text-gray-500">
        {event.carrier ? carrierNames()[event.carrier] : "-"} · {regionLabel(event.region)} · IPv{event.ip_version || 4}
      </div>
    </>
  );
  const changeValue = mainland ? (
    <div className="max-w-[18rem] text-sm leading-5">
      {event.kind === "mainland_recovery" ? tr("row.mainland_recovered", "大陆方向可达性已恢复") : event.kind === "mainland_repeat" ? tr("row.still_blocked", "仍疑似被墙") : tr("row.blocked", "疑似被墙")}
    </div>
  ) : (
    <>
      <span>{event.from_line || "-"}</span>
      <span className="px-2 text-gray-400">→</span>
      <strong>{event.to_line}</strong>
    </>
  );
  const asnValue = (
    <div className="flex flex-wrap gap-1">
      {event.asn_path?.length ? event.asn_path.map((asn) => (
        <Badge key={asn} color="gray" variant="soft">{asn}</Badge>
      )) : <span className="text-gray-400">-</span>}
    </div>
  );
  const pathValue = event.route_path?.length ? (
    <details className="text-xs text-gray-500">
      <summary className="cursor-pointer">{tr("row.view_path", "查看完整路径")}</summary>
      <div className="mt-2 max-h-48 overflow-auto whitespace-pre font-mono leading-5">{event.route_path.join("\n")}</div>
    </details>
  ) : (
    <span className="text-gray-400">-</span>
  );

  if (asCard) {
    return (
      <AdminMobileListCard
        title={
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-6">{formatTime(event.occurred_at)}</div>
            <div className="truncate text-[13.5px] text-muted-foreground">{event.task_name || `#${event.task_id}`}</div>
          </div>
        }
        cells={[
          [tr("col.kind", "类型"), kindBadge],
          [tr("col.task_node", "任务 / 节点"), taskValue],
          [tr("col.target", "目标"), targetValue],
          [tr("col.expected_line", "预期线路"), event.expected_line || "-"],
          [tr("col.line_change", "线路变化"), changeValue],
          [tr("col.asn", "关键 ASN"), asnValue],
          [tr("col.path", "路径"), pathValue],
        ]}
      />
    );
  }

  return (
    <tr className="align-middle hover:bg-gray-50/60 dark:hover:bg-gray-900/50">
      <td data-label={tr("col.occurred_at", "发生时间")} className="p-3 whitespace-nowrap">{formatTime(event.occurred_at)}</td>
      <td data-label={tr("col.kind", "类型")} className="p-3">{kindBadge}</td>
      <td data-label={tr("col.task_node", "任务 / 节点")} className="p-3">{taskValue}</td>
      <td data-label={tr("col.target", "目标")} className="p-3">{targetValue}</td>
      <td data-label={tr("col.expected_line", "预期线路")} className="p-3 font-medium">{event.expected_line || "-"}</td>
      <td data-label={tr("col.line_change", "线路变化")} className="p-3 whitespace-nowrap">{changeValue}</td>
      <td data-label={tr("col.asn", "关键 ASN")} className="max-w-[260px] p-3">{asnValue}</td>
      <td data-label={tr("col.path", "路径")} className="p-3">{pathValue}</td>
    </tr>
  );
}

function ReturnRouteRuleRow({
  group,
  asns,
  prefixes,
  asCard = false,
}: {
  group: string;
  asns?: number[];
  prefixes?: string[];
  asCard?: boolean;
}) {
  const lineName = ruleGroupNames()[group] || group;
  const asnValue = (
    <div className="flex flex-wrap gap-1">
      {asns?.length ? asns.map((asn) => (
        <Badge key={asn} color="gray" variant="soft">AS{asn}</Badge>
      )) : <span className="text-gray-400">-</span>}
    </div>
  );
  const prefixValue = (
    <div className="flex flex-wrap gap-1">
      {prefixes?.length ? prefixes.map((prefix) => (
        <Badge key={prefix} color="blue" variant="soft">{prefix}</Badge>
      )) : <span className="text-gray-400">-</span>}
    </div>
  );

  if (asCard) {
    return (
      <AdminMobileListCard
        title={lineName}
        cells={[
          ["ASN", asnValue],
          [tr("col.manual_prefixes", "人工网段特征"), prefixValue],
        ]}
      />
    );
  }

  return (
    <tr className="align-middle">
      <td data-label={tr("col.line", "线路")} className="p-3 font-medium">{lineName}</td>
      <td data-label="ASN" className="p-3">{asnValue}</td>
      <td data-label={tr("col.manual_prefixes", "人工网段特征")} className="p-3">{prefixValue}</td>
    </tr>
  );
}

export default function ReturnRoutePage() {
  return <ReturnRouteContent />;
}
