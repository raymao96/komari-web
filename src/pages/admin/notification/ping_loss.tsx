import Loading from "@/components/loading";
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
import { AdminSelectionCount } from "@/components/admin/AdminSelectionCount";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminMobileCardStack, AdminMobileListCard } from "@/components/admin/AdminMobileListCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import {
  PingTaskProvider,
  usePingTask,
  type PingTask,
} from "@/contexts/PingTaskContext";
import {
  AppDialogContent,
  Badge,
  Button,
  Dialog,
  Flex,
  IconButton,
  Select,
  Switch,
  Tabs,
  TextField,
} from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pencil,
  Plus,
  Radar,
  Server,
  Settings2,
  SlidersHorizontal,
  Timer,
  Trash2,
  WifiOff,
} from "@/components/admin/muiIcons";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAdminTabParam } from "@/hooks/useAdminTabParam";
import { toast } from "sonner";
import MenuItem from "@mui/material/MenuItem";
import MuiButton from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { applyPingLossSheet } from "@/pages/admin/notification/pingLossSheet";

type PingLossNotification = {
  id: number;
  client: string;
  task_id: number;
  enable: boolean;
  loss_enabled?: boolean;
  window_seconds: number;
  loss_threshold: number;
  minimum_samples: number;
  cooldown_seconds: number;
  last_notified?: string | null;
  alert_active?: boolean;
  latency_enabled?: boolean;
  adaptive_baseline_enabled?: boolean;
  latency_window_seconds?: number;
  latency_minimum_samples?: number;
  latency_cooldown_seconds?: number;
  fixed_baseline_ms?: number;
  low_latency_threshold_ms?: number;
  high_latency_threshold_ms?: number;
  adaptive_lower_deviation_percent?: number;
  adaptive_upper_deviation_percent?: number;
  baseline_window_seconds?: number;
  baseline_minimum_samples?: number;
  latency_alert_state?: string;
  latency_last_notified?: string | null;
  adaptive_baseline_ms?: number | null;
  adaptive_baseline_status?: string;
  adaptive_baseline_sample_count?: number;
  task?: PingTask;
};

type AlertTarget = {
  key: string;
  client: string;
  clientName: string;
  serverOrder: number;
  taskId: number;
  task: PingTask;
  rule?: PingLossNotification;
};

type FormState = {
  enable: boolean;
  lossEnabled: boolean;
  windowMinutes: number;
  lossThreshold: number;
  minimumSamples: number;
  cooldownMinutes: number;
  latencyEnabled: boolean;
  adaptiveBaselineEnabled: boolean;
  latencyWindowMinutes: number;
  latencyMinimumSamples: number;
  latencyCooldownMinutes: number;
  fixedBaselineMs: number;
  lowLatencyThresholdMs: number;
  highLatencyThresholdMs: number;
  lowerDeviationPercent: number;
  upperDeviationPercent: number;
  baselineWindowHours: number;
  baselineMinimumSamples: number;
};

type LatencyDefaultForm = {
  enable: boolean;
  windowMinutes: number;
  minimumSamples: number;
  cooldownMinutes: number;
  lowerDeviationPercent: number;
  upperDeviationPercent: number;
  baselineWindowHours: number;
  baselineMinimumSamples: number;
};

type ViewMode = "task" | "server";
type AlertSheet = "loss" | "latency";

const PING_LOSS_VIEWS = ["task", "server"] as const;
const PING_LOSS_SHEETS = ["latency", "loss"] as const;

const defaultForm: FormState = {
  enable: true,
  lossEnabled: true,
  windowMinutes: 1,
  lossThreshold: 5,
  minimumSamples: 1,
  cooldownMinutes: 5,
  latencyEnabled: false,
  adaptiveBaselineEnabled: false,
  latencyWindowMinutes: 5,
  latencyMinimumSamples: 30,
  latencyCooldownMinutes: 30,
  fixedBaselineMs: 100,
  lowLatencyThresholdMs: 50,
  highLatencyThresholdMs: 200,
  lowerDeviationPercent: 25,
  upperDeviationPercent: 25,
  baselineWindowHours: 24,
  baselineMinimumSamples: 30,
};

const defaultLatencyForm: LatencyDefaultForm = {
  enable: false,
  windowMinutes: 5,
  minimumSamples: 30,
  cooldownMinutes: 30,
  lowerDeviationPercent: 25,
  upperDeviationPercent: 25,
  baselineWindowHours: 24,
  baselineMinimumSamples: 30,
};

const isPingLossFormValid = (form: FormState) =>
  form.windowMinutes >= 1 &&
  form.windowMinutes <= 1440 &&
  form.lossThreshold > 0 &&
  form.lossThreshold <= 100 &&
  form.minimumSamples >= 1 &&
  form.minimumSamples <= 100000 &&
  form.cooldownMinutes >= 1 &&
  form.cooldownMinutes <= 10080 &&
  (!form.enable || form.lossEnabled || form.latencyEnabled) &&
  form.latencyWindowMinutes >= 1 &&
  form.latencyWindowMinutes <= 1440 &&
  form.latencyMinimumSamples >= 1 &&
  form.latencyMinimumSamples <= 100000 &&
  form.latencyCooldownMinutes >= 1 &&
  form.latencyCooldownMinutes <= 10080 &&
  (!form.latencyEnabled ||
    (form.adaptiveBaselineEnabled
      ? form.lowerDeviationPercent > 0 &&
        form.lowerDeviationPercent < 100 &&
        form.upperDeviationPercent > 0 &&
        form.upperDeviationPercent <= 1000 &&
        form.baselineWindowHours >= 1 &&
        form.baselineWindowHours <= 720 &&
        form.baselineWindowHours * 3600 >= form.latencyWindowMinutes * 60 &&
        form.baselineMinimumSamples >= 1 &&
        form.baselineMinimumSamples <= 1000000
      : form.fixedBaselineMs > 0 &&
        form.lowLatencyThresholdMs >= 0 &&
        form.highLatencyThresholdMs > form.lowLatencyThresholdMs &&
        form.lowLatencyThresholdMs < form.fixedBaselineMs &&
        form.fixedBaselineMs < form.highLatencyThresholdMs));

const isLatencyDefaultFormValid = (form: LatencyDefaultForm) =>
  form.windowMinutes >= 1 &&
  form.windowMinutes <= 1440 &&
  form.minimumSamples >= 1 &&
  form.minimumSamples <= 100000 &&
  form.cooldownMinutes >= 1 &&
  form.cooldownMinutes <= 10080 &&
  form.lowerDeviationPercent > 0 &&
  form.lowerDeviationPercent < 100 &&
  form.upperDeviationPercent > 0 &&
  form.upperDeviationPercent <= 1000 &&
  form.baselineWindowHours >= 1 &&
  form.baselineWindowHours <= 720 &&
  form.baselineWindowHours * 3600 >= form.windowMinutes * 60 &&
  form.baselineMinimumSamples >= 1 &&
  form.baselineMinimumSamples <= 1000000;

const ruleToForm = (rule?: PingLossNotification): FormState =>
  rule
    ? {
        enable: rule.enable,
        lossEnabled: rule.loss_enabled !== false,
        windowMinutes: rule.window_seconds / 60,
        lossThreshold: rule.loss_threshold,
        minimumSamples: rule.minimum_samples,
        cooldownMinutes: rule.cooldown_seconds / 60,
        latencyEnabled: rule.latency_enabled === true,
        adaptiveBaselineEnabled: rule.adaptive_baseline_enabled === true,
        latencyWindowMinutes: (rule.latency_window_seconds || 300) / 60,
        latencyMinimumSamples: rule.latency_minimum_samples || 30,
        latencyCooldownMinutes: (rule.latency_cooldown_seconds || 1800) / 60,
        fixedBaselineMs: rule.fixed_baseline_ms || 100,
        lowLatencyThresholdMs: rule.low_latency_threshold_ms ?? 50,
        highLatencyThresholdMs: rule.high_latency_threshold_ms ?? 200,
        lowerDeviationPercent: rule.adaptive_lower_deviation_percent || 25,
        upperDeviationPercent: rule.adaptive_upper_deviation_percent || 25,
        baselineWindowHours: (rule.baseline_window_seconds || 86400) / 3600,
        baselineMinimumSamples: rule.baseline_minimum_samples || 30,
      }
    : defaultForm;

const formForSheet = (rule: PingLossNotification | undefined, sheet: AlertSheet): FormState => {
  const form = ruleToForm(rule);
  if (rule) return form;
  if (sheet === "latency") return { ...form, lossEnabled: false, latencyEnabled: true };
  return { ...form, lossEnabled: true, latencyEnabled: false };
};

const formToPayload = (form: FormState, target: AlertTarget) => ({
  ...(target.rule ? { id: target.rule.id } : {}),
  client: target.client,
  task_id: target.taskId,
  enable: form.enable,
  loss_enabled: form.lossEnabled,
  window_seconds: Math.round(form.windowMinutes * 60),
  loss_threshold: form.lossThreshold,
  minimum_samples: Math.round(form.minimumSamples),
  cooldown_seconds: Math.round(form.cooldownMinutes * 60),
  latency_enabled: form.latencyEnabled,
  adaptive_baseline_enabled: form.adaptiveBaselineEnabled,
  latency_window_seconds: Math.round(form.latencyWindowMinutes * 60),
  latency_minimum_samples: Math.round(form.latencyMinimumSamples),
  latency_cooldown_seconds: Math.round(form.latencyCooldownMinutes * 60),
  fixed_baseline_ms: form.fixedBaselineMs,
  low_latency_threshold_ms: form.lowLatencyThresholdMs,
  high_latency_threshold_ms: form.highLatencyThresholdMs,
  adaptive_lower_deviation_percent: form.lowerDeviationPercent,
  adaptive_upper_deviation_percent: form.upperDeviationPercent,
  baseline_window_seconds: Math.round(form.baselineWindowHours * 3600),
  baseline_minimum_samples: Math.round(form.baselineMinimumSamples),
});

const isRuleAlerting = (rule: PingLossNotification | undefined, sheet: AlertSheet) => {
  if (!rule?.enable) return false;
  if (sheet === "loss") return rule.loss_enabled !== false && rule.alert_active === true;
  return rule.latency_enabled === true && (rule.latency_alert_state === "high" || rule.latency_alert_state === "low");
};

const formatMinutes = (seconds: number | undefined, t: (key: string, options?: { count: number }) => string) => {
  const minutes = (seconds || 0) / 60;
  const count = Number.isInteger(minutes) ? minutes : Number(minutes.toFixed(1));
  return t("notification.ping_loss.minutes", { count });
};

const targetKey = (client: string, taskId: number) => `${client}:${taskId}`;

const parseResponse = async (response: Response) => {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
};

const buildAlertTargets = (
  tasks: PingTask[],
  nodes: NodeDetail[],
  rules: PingLossNotification[],
) => {
  const nodesById = new Map(
    nodes.map((node, index) => [node.uuid, { node, order: index }])
  );
  const tasksById = new Map(
    tasks
      .filter((task) => typeof task.id === "number")
      .map((task) => [task.id as number, task]),
  );
  const rulesByTarget = new Map<string, PingLossNotification>();
  for (const rule of rules) {
    const key = targetKey(rule.client, rule.task_id);
    if (!rulesByTarget.has(key)) rulesByTarget.set(key, rule);
  }

  const targets: AlertTarget[] = [];
  const seen = new Set<string>();
  for (const task of tasks) {
    if (typeof task.id !== "number") continue;
    for (const client of new Set(task.clients || [])) {
      const nodeEntry = nodesById.get(client);
      if (!nodeEntry) continue;
      const key = targetKey(client, task.id);
      seen.add(key);
      targets.push({
        key,
        client,
        clientName: nodeEntry.node.name || client,
        serverOrder: nodeEntry.order,
        taskId: task.id,
        task,
        rule: rulesByTarget.get(key),
      });
    }
  }

  for (const rule of rules) {
    const key = targetKey(rule.client, rule.task_id);
    if (seen.has(key)) continue;
    const nodeEntry = nodesById.get(rule.client);
    const task = tasksById.get(rule.task_id) || rule.task || {
      id: rule.task_id,
      name: `#${rule.task_id}`,
    };
    targets.push({
      key,
      client: rule.client,
      clientName: nodeEntry?.node.name || rule.client,
      serverOrder: nodeEntry?.order ?? Number.MAX_SAFE_INTEGER,
      taskId: rule.task_id,
      task,
      rule,
    });
  }

  return targets;
};

const sortTargets = (targets: AlertTarget[], view: ViewMode) => {
  const compareText = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  return [...targets].sort((a, b) => {
    if (view === "task") {
      const taskWeight = (a.task.weight ?? 0) - (b.task.weight ?? 0);
      if (taskWeight !== 0) return taskWeight;
      const taskName = compareText(a.task.name || "", b.task.name || "");
      if (taskName !== 0) return taskName;
      if (a.serverOrder !== b.serverOrder) {
        return a.serverOrder - b.serverOrder;
      }
      return compareText(a.clientName, b.clientName);
    }
    if (a.serverOrder !== b.serverOrder) {
      return a.serverOrder - b.serverOrder;
    }
    const serverName = compareText(a.clientName, b.clientName);
    if (serverName !== 0) return serverName;
    const taskWeight = (a.task.weight ?? 0) - (b.task.weight ?? 0);
    if (taskWeight !== 0) return taskWeight;
    return compareText(a.task.name || "", b.task.name || "");
  });
};

const PingLossPage = () => (
  <PingTaskProvider>
    <NodeDetailsProvider>
      <PingLossContent />
    </NodeDetailsProvider>
  </PingTaskProvider>
);

const PingLossContent = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { nodeDetail, isLoading: nodesLoading, error: nodesError } =
    useNodeDetails();
  const { pingTasks, isLoading: tasksLoading, error: tasksError } =
    usePingTask();
  const [rules, setRules] = React.useState<PingLossNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [view, setView] = useAdminTabParam(PING_LOSS_VIEWS, "task");
  const [sheet, setSheet] = useAdminTabParam(PING_LOSS_SHEETS, "latency", { param: "sheet" });
  const [selected, setSelected] = React.useState<string[]>([]);
  const [alertState, setAlertState] = React.useState(
    () => searchParams.get("state")?.trim() === "active" ? "active" : "",
  );
  const routeNode = searchParams.get("node")?.trim() || "";
  const routeTask = Number(searchParams.get("task") || 0);

  const refresh = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/notification/ping-loss/");
      const data = await parseResponse(response);
      setRules(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const refreshQuietly = React.useCallback(() => refresh(true), [refresh]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const targets = React.useMemo(
    () => buildAlertTargets(pingTasks || [], nodeDetail, rules),
    [pingTasks, nodeDetail, rules],
  );
  const routeFilteredTargets = React.useMemo(
    () => targets.filter((target) => (
      (!alertState || alertState !== "active" || isRuleAlerting(target.rule, sheet))
      && (!routeNode || target.client === routeNode)
      && (!routeTask || target.taskId === routeTask)
    )),
    [alertState, routeNode, routeTask, sheet, targets],
  );

  React.useEffect(() => {
    const validKeys = new Set(targets.map((target) => target.key));
    setSelected((current) => current.filter((key) => validKeys.has(key)));
  }, [targets]);

  const filteredTargets = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
      ? routeFilteredTargets.filter((target) =>
          [
            target.clientName,
            target.client,
            target.task.name,
            target.task.target,
            target.task.type,
          ].some((value) => String(value || "").toLowerCase().includes(keyword)),
        )
      : routeFilteredTargets;
    return sortTargets(filtered, view);
  }, [routeFilteredTargets, search, view]);

  const selectedTargets = React.useMemo(() => {
    const selectedSet = new Set(selected);
    return filteredTargets.filter((target) => selectedSet.has(target.key));
  }, [filteredTargets, selected]);
  const selectedFilteredCount = React.useMemo(() => {
    const selectedSet = new Set(selected);
    return filteredTargets.filter((target) => selectedSet.has(target.key)).length;
  }, [filteredTargets, selected]);
  const allFilteredSelected =
    filteredTargets.length > 0 && selectedFilteredCount === filteredTargets.length;
  const availableTargets = React.useMemo(
    () => sortTargets(targets.filter((target) => !target.rule), "task"),
    [targets],
  );

  if (loading || nodesLoading || tasksLoading) {
    return <Loading />;
  }
  if (error || nodesError || tasksError) {
    return (
      <div>
        {t("common.error")}: {error || nodesError || tasksError}
      </div>
    );
  }

  const handleBatchSaved = async () => {
    setSelected([]);
    await refreshQuietly();
  };

  const toggleSelectAll = () => {
    const filteredKeys = new Set(filteredTargets.map((target) => target.key));
    setSelected((current) =>
      allFilteredSelected
        ? current.filter((key) => !filteredKeys.has(key))
        : Array.from(new Set([...current, ...filteredKeys])),
    );
  };

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-4 p-0 md:p-4">
      <Flex className="w-full" justify="between" align="center" gap="3" wrap="wrap">
        <AdminPageTitle
          description={t(
            "notification.ping_loss.description",
            "根据延迟监测任务设置丢包异常告警、延迟异常告警。",
          )}
        >
          {t("notification.ping_loss.full_title")}
        </AdminPageTitle>
      </Flex>

      <Tabs.Root value={sheet} onValueChange={setSheet}>
        <AdminSheetTabs
          className="admin-ping-loss-sheets"
          actions={
            <Tabs.Root value={view} onValueChange={setView}>
              <Tabs.List>
                <Tabs.Trigger value="task">
                  <AdminTabLabel icon={<Radar size={18} />}>{t("ping.task_view")}</AdminTabLabel>
                </Tabs.Trigger>
                <Tabs.Trigger value="server">
                  <AdminTabLabel icon={<Server size={18} />}>{t("ping.server_view")}</AdminTabLabel>
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          }
        >
          <Tabs.List>
            <Tabs.Trigger value="latency">
              <AdminTabLabel icon={<Timer size={18} />}>{t("notification.ping_loss.latency_anomaly")}</AdminTabLabel>
            </Tabs.Trigger>
            <Tabs.Trigger value="loss">
              <AdminTabLabel icon={<WifiOff size={18} />}>{t("notification.ping_loss.loss_anomaly")}</AdminTabLabel>
            </Tabs.Trigger>
          </Tabs.List>
        </AdminSheetTabs>
        <AdminListShell className="mt-3">
          <AdminListFiltersBar>
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              sx={{ flexWrap: "wrap", alignItems: "center" }}
            >
              <AdminListSelect
                label={t("common.status", "状态")}
                value={alertState}
                onChange={setAlertState}
              >
                <MenuItem value="">{t("common.all", "全部")}</MenuItem>
                <MenuItem value="active">{t("notification.load.current_alerts", "当前告警")}</MenuItem>
              </AdminListSelect>
              <AdminListSearch
                value={search}
                onChange={setSearch}
                placeholder={t("common.search")}
              />
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: "center" }}>
                <MuiButton
                  type="button"
                  variant="outlined"
                  disabled={filteredTargets.length === 0}
                  onClick={toggleSelectAll}
                  sx={ADMIN_LIST_OUTLINE_SX}
                >
                  {t(allFilteredSelected ? "common.deselect_all" : "common.select_all")}
                </MuiButton>
                <ConfigurationDialog
                  targets={selectedTargets}
                  onSaved={handleBatchSaved}
                  batch
                  section={sheet}
                >
                  <MuiButton
                    type="button"
                    variant="outlined"
                    disabled={selectedTargets.length === 0}
                    startIcon={<SlidersHorizontal size={16} />}
                    sx={ADMIN_LIST_OUTLINE_SX}
                  >
                    {t("notification.ping_loss.batch_edit")}
                  </MuiButton>
                </ConfigurationDialog>
                <PingLossDefaultDialog />
                <ConfigurationDialog
                  targets={[]}
                  availableTargets={availableTargets}
                  onSaved={refreshQuietly}
                  section={sheet}
                >
                  <MuiButton
                    type="button"
                    variant="contained"
                    startIcon={<Plus size={16} />}
                    sx={ADMIN_LIST_ACTION_SX}
                  >
                    {t("common.add")}
                  </MuiButton>
                </ConfigurationDialog>
              </Stack>
            </Stack>
            <AdminSelectionCount
              count={selectedFilteredCount}
              total={filteredTargets.length}
              className="mt-2 shrink-0 text-sm text-muted-foreground md:hidden"
            />
          </AdminListFiltersBar>
          <AlertTable
            view={view}
            sheet={sheet}
            targets={filteredTargets}
            selected={selected}
            onSelectionChange={setSelected}
            onSaved={refreshQuietly}
            emptyLabel={
              alertState === "active"
                ? t("notification.ping_loss.empty_active")
                : t("notification.ping_loss.empty")
            }
            paginationSummary={
              <AdminSelectionCount
                count={selectedFilteredCount}
                total={filteredTargets.length}
                className="hidden md:inline-flex"
              />
            }
          />
        </AdminListShell>
      </Tabs.Root>
    </div>
  );
};

const AlertTable = ({
  view,
  sheet,
  targets,
  selected,
  onSelectionChange,
  onSaved,
  paginationSummary,
  emptyLabel,
}: {
  view: ViewMode;
  sheet: AlertSheet;
  targets: AlertTarget[];
  selected: string[];
  onSelectionChange: (keys: string[]) => void;
  onSaved: () => Promise<void>;
  paginationSummary?: React.ReactNode;
  emptyLabel?: string;
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const emptyText = emptyLabel || t("notification.ping_loss.empty");
  const selectedSet = new Set(selected);
  const { page, setPage, pageItems, pageSize, setPageSize } =
    useAdminPagination(targets);
  const rows = pageItems.map((target) => (
    <AlertRow
      key={target.key}
      view={view}
      target={target}
      selected={selectedSet.has(target.key)}
      onSelectedChange={(checked) =>
        onSelectionChange(
          checked
            ? Array.from(new Set([...selected, target.key]))
            : selected.filter((key) => key !== target.key),
        )
      }
      onSaved={onSaved}
      asCard={isMobile}
      sheet={sheet}
    />
  ));
  const columnCount = sheet === "loss" ? 11 : 12;
  return (
    <>
      {isMobile ? (
        targets.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            {emptyText}
          </div>
        ) : (
          <AdminMobileCardStack>{rows}</AdminMobileCardStack>
        )
      ) : (
      <div className="admin-responsive-table-wrap overflow-x-auto">
      <Table container={false} className="admin-responsive-table admin-selection-table min-w-[1080px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 px-3 text-center">
              <span className="sr-only">{t("common.select")}</span>
            </TableHead>
            <TableHead>
              {view === "task" ? t("ping.task") : t("common.server")}
            </TableHead>
            <TableHead>
              {view === "task" ? t("common.server") : t("ping.task")}
            </TableHead>
            <TableHead>{t("ping.target")}</TableHead>
            <TableHead>{t("common.status")}</TableHead>
            {sheet === "latency" ? <TableHead>{t("notification.ping_loss.current_status")}</TableHead> : null}
            <TableHead>{t("notification.ping_loss.window")}</TableHead>
            {sheet === "loss" ? <TableHead>{t("notification.ping_loss.threshold")}</TableHead> : null}
            {sheet === "loss" ? <TableHead>{t("notification.ping_loss.minimum_samples")}</TableHead> : null}
            {sheet === "latency" ? <TableHead>{t("notification.ping_loss.current_baseline")}</TableHead> : null}
            {sheet === "latency" ? <TableHead>{t("notification.ping_loss.alert_range")}</TableHead> : null}
            <TableHead>{t("notification.ping_loss.cooldown")}</TableHead>
            <TableHead>{t("notification.ping_loss.recent_notice")}</TableHead>
            <TableHead className="text-center">{t("common.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-8 text-center text-gray-500">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows
          )}
        </TableBody>
      </Table>
      </div>
      )}
      <AdminPagination
        page={page}
        total={targets.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        summary={paginationSummary}
      />
    </>
  );
};

const AlertRow = ({
  view,
  target,
  selected,
  onSelectedChange,
  onSaved,
  asCard = false,
  sheet,
}: {
  view: ViewMode;
  target: AlertTarget;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onSaved: () => Promise<void>;
  asCard?: boolean;
  sheet: AlertSheet;
}) => {
  const { t } = useTranslation();
  const rule = target.rule;
  const taskName = target.task.name || `#${target.taskId}`;
  const primary = view === "task" ? taskName : target.clientName;
  const secondary = view === "task" ? target.clientName : taskName;
  const primaryLabel = view === "task" ? t("ping.task") : t("common.server");
  const secondaryLabel = view === "task" ? t("common.server") : t("ping.task");
  const checkbox = (
    <Checkbox
      checked={selected}
      aria-label={`${primary} - ${secondary}`}
      onCheckedChange={(checked) => onSelectedChange(checked === true)}
    />
  );
  const sideOn = sheet === "loss"
    ? rule?.loss_enabled !== false && Boolean(rule)
    : rule?.latency_enabled === true;
  const statusBadge = !rule || !sideOn ? (
    <Badge color="orange">{t("notification.ping_loss.not_configured")}</Badge>
  ) : (
    <Badge color={rule.enable ? "green" : "gray"}>
      {rule.enable ? t("common.enabled") : t("common.disabled")}
    </Badge>
  );
  const baselineModeBadge =
    sheet === "latency" && rule && sideOn && rule.enable ? (
      <Badge color="gray">
        {t(
          rule.adaptive_baseline_enabled
            ? "notification.ping_loss.mode_adaptive"
            : "notification.ping_loss.mode_fixed",
        )}
      </Badge>
    ) : null;
  const statusContent = baselineModeBadge ? (
    <Flex
      align={asCard ? "center" : "start"}
      direction={asCard ? "row" : "column"}
      gap="1"
      wrap="wrap"
    >
      {statusBadge}
      {baselineModeBadge}
    </Flex>
  ) : (
    statusBadge
  );
  const blank = "-";
  const currentStatusItems = (() => {
    if (!rule || !sideOn || sheet !== "latency") return [];
    const items: { label: string; color: string }[] = [];
    if (rule.latency_alert_state === "high") items.push({ label: t("notification.ping_loss.status_high"), color: "red" });
    if (rule.latency_alert_state === "low") items.push({ label: t("notification.ping_loss.status_low"), color: "orange" });
    if (
      rule.adaptive_baseline_enabled &&
      rule.adaptive_baseline_status === "warming" &&
      !rule.adaptive_baseline_ms
    ) {
      items.push({ label: t("notification.ping_loss.adaptive_status_warming"), color: "blue" });
    }
    if (items.length === 0) items.push({ label: t("notification.ping_loss.status_normal"), color: "green" });
    return items;
  })();
  const currentStatus = currentStatusItems.length === 0 ? blank : (
    <Flex gap="1" wrap="wrap" align="center">
      {currentStatusItems.map((item) => (
        <Badge key={item.label} color={item.color}>{item.label}</Badge>
      ))}
    </Flex>
  );
  const windowText = !sideOn ? blank : formatMinutes(
    sheet === "loss" ? rule?.window_seconds : rule?.latency_window_seconds,
    t,
  );
  const thresholdText = !sideOn || !rule ? blank : `${Number(rule.loss_threshold).toFixed(1)}%`;
  const samplesText = !sideOn || !rule ? blank : String(rule.minimum_samples);
  const cooldownText = !sideOn ? blank : formatMinutes(
    sheet === "loss" ? rule?.cooldown_seconds : rule?.latency_cooldown_seconds,
    t,
  );
  const baselineValue = !sideOn || !rule
    ? blank
    : rule.adaptive_baseline_enabled
      ? rule.adaptive_baseline_ms
        ? `${Number(rule.adaptive_baseline_ms).toFixed(1)} ms`
        : t("notification.ping_loss.adaptive_status_warming")
      : rule.fixed_baseline_ms
        ? `${Number(rule.fixed_baseline_ms).toFixed(1)} ms`
        : t("notification.ping_loss.mode_fixed");
  const rangeText = (() => {
    if (!sideOn || !rule) return blank;
    if (!rule.adaptive_baseline_enabled) {
      return `${Number(rule.low_latency_threshold_ms || 0).toFixed(1)}–${Number(rule.high_latency_threshold_ms || 0).toFixed(1)} ms`;
    }
    const baseline = Number(rule.adaptive_baseline_ms);
    const lowerPercent = Number(rule.adaptive_lower_deviation_percent || 0);
    const upperPercent = Number(rule.adaptive_upper_deviation_percent || 0);
    if (!(baseline > 0)) {
      return `${t("notification.ping_loss.lower_deviation_percent")} ${lowerPercent}% · ${t("notification.ping_loss.upper_deviation_percent")} ${upperPercent}%`;
    }
    const low = baseline * (1 - lowerPercent / 100);
    const high = baseline * (1 + upperPercent / 100);
    return `${low.toFixed(1)}–${high.toFixed(1)} ms`;
  })();
  const noticedAt = sheet === "loss" ? rule?.last_notified : rule?.latency_last_notified;
  const lastNotified = !sideOn ? blank : noticedAt ? new Date(noticedAt).toLocaleString() : t("notification.ping_loss.never");
  const actionButtons = (
        <Flex gap="3" align="center" className="admin-card-actions admin-ping-loss-actions w-full">
          <ConfigurationDialog targets={[target]} onSaved={onSaved} section={sheet}>
            <IconButton
              variant="ghost"
              title={rule ? t("common.edit") : t("notification.ping_loss.add")}
              aria-label={rule ? t("common.edit") : t("notification.ping_loss.add")}
            >
              <Pencil size={16} />
            </IconButton>
          </ConfigurationDialog>
          {rule ? <DeleteRuleButton rule={rule} onDeleted={onSaved} /> : null}
        </Flex>
  );
  const detailCells: [string, React.ReactNode][] = sheet === "loss"
    ? [
        [t("notification.ping_loss.window"), windowText],
        [t("notification.ping_loss.threshold"), thresholdText],
        [t("notification.ping_loss.minimum_samples"), samplesText],
        [t("notification.ping_loss.cooldown"), cooldownText],
        [t("notification.ping_loss.recent_notice"), lastNotified],
      ]
    : [
        [t("notification.ping_loss.current_status"), currentStatus],
        [t("notification.ping_loss.window"), windowText],
        [t("notification.ping_loss.current_baseline"), baselineValue],
        [t("notification.ping_loss.alert_range"), rangeText],
        [t("notification.ping_loss.cooldown"), cooldownText],
        [t("notification.ping_loss.recent_notice"), lastNotified],
      ];

  if (asCard) {
    return (
      <AdminMobileListCard
        title={primary}
        headerExtra={checkbox}
        cells={[
          [secondaryLabel, secondary],
          [t("ping.target"), target.task.target || "-"],
          [t("common.status"), statusContent],
          ...detailCells,
        ]}
        actions={actionButtons}
      />
    );
  }

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="w-12 px-3" data-label={t("common.select")}>
        <div className="flex items-center justify-center">
          {checkbox}
        </div>
      </TableCell>
      <TableCell data-label={primaryLabel}>{primary}</TableCell>
      <TableCell data-label={secondaryLabel}>{secondary}</TableCell>
      <TableCell data-label={t("ping.target")}>{target.task.target || "-"}</TableCell>
      <TableCell data-label={t("common.status")}>{statusContent}</TableCell>
      {detailCells.map(([label, value]) => (
        <TableCell key={label} data-label={label}>{value}</TableCell>
      ))}
      <TableCell className="text-center" data-label={t("common.action")}>
        {actionButtons}
      </TableCell>
    </TableRow>
  );
};

const PingLossConfigurationFields = ({
  form,
  onChange,
  showMasterSwitch = true,
  baselinePreview,
  section = "both",
}: {
  form: FormState;
  onChange: React.Dispatch<React.SetStateAction<FormState>>;
  showMasterSwitch?: boolean;
  baselinePreview?: PingLossNotification;
  section?: AlertSheet | "both";
}) => {
  const { t } = useTranslation();
  const enableId = React.useId();
  const lossId = React.useId();
  const latencyId = React.useId();
  const adaptiveId = React.useId();
  return (
    <>
      {showMasterSwitch ? (
        <Flex justify="between" align="center">
          <label htmlFor={enableId}>{t("common.status")}</label>
          <Switch
            id={enableId}
            checked={form.enable}
            onCheckedChange={(enable) =>
              onChange((current) => ({ ...current, enable }))
            }
          />
        </Flex>
      ) : null}

      {section === "both" || section === "loss" ? (
      <fieldset className="grid min-w-0 gap-3 rounded-lg border border-border p-3">
        <Flex justify="between" align="center">
          <legend className="text-sm font-medium">
            {t("notification.ping_loss.loss_anomaly")}
          </legend>
          <Switch
            id={lossId}
            checked={form.lossEnabled}
            onCheckedChange={(lossEnabled) =>
              onChange((current) => ({ ...current, lossEnabled }))
            }
          />
        </Flex>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            label={t("notification.ping_loss.window_minutes")}
            value={form.windowMinutes}
            min={1}
            max={1440}
            onChange={(windowMinutes) =>
              onChange((current) => ({ ...current, windowMinutes }))
            }
          />
          <NumberField
            label={`${t("notification.ping_loss.threshold")} (%)`}
            value={form.lossThreshold}
            min={0.1}
            max={100}
            step={0.1}
            onChange={(lossThreshold) =>
              onChange((current) => ({ ...current, lossThreshold }))
            }
          />
          <NumberField
            label={t("notification.ping_loss.minimum_samples")}
            value={form.minimumSamples}
            min={1}
            max={100000}
            onChange={(minimumSamples) =>
              onChange((current) => ({ ...current, minimumSamples }))
            }
          />
          <NumberField
            label={t("notification.ping_loss.cooldown_minutes")}
            value={form.cooldownMinutes}
            min={1}
            max={10080}
            onChange={(cooldownMinutes) =>
              onChange((current) => ({ ...current, cooldownMinutes }))
            }
          />
        </div>
      </fieldset>
      ) : null}

      {section === "both" || section === "latency" ? (
      <fieldset className="grid min-w-0 gap-3 rounded-lg border border-border p-3">
        <Flex justify="between" align="center">
          <legend className="text-sm font-medium">
            {t("notification.ping_loss.latency_anomaly")}
          </legend>
          <Switch
            id={latencyId}
            checked={form.latencyEnabled}
            onCheckedChange={(latencyEnabled) =>
              onChange((current) => ({ ...current, latencyEnabled }))
            }
          />
        </Flex>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            label={t("notification.ping_loss.latency_window_minutes")}
            value={form.latencyWindowMinutes}
            min={1}
            max={1440}
            onChange={(latencyWindowMinutes) =>
              onChange((current) => ({ ...current, latencyWindowMinutes }))
            }
          />
          <NumberField
            label={t("notification.ping_loss.latency_minimum_samples")}
            value={form.latencyMinimumSamples}
            min={1}
            max={100000}
            onChange={(latencyMinimumSamples) =>
              onChange((current) => ({ ...current, latencyMinimumSamples }))
            }
          />
          <NumberField
            label={t("notification.ping_loss.latency_cooldown_minutes")}
            value={form.latencyCooldownMinutes}
            min={1}
            max={10080}
            onChange={(latencyCooldownMinutes) =>
              onChange((current) => ({ ...current, latencyCooldownMinutes }))
            }
          />
        </div>
        <Flex justify="between" align="center">
          <label htmlFor={adaptiveId}>
            {t("notification.ping_loss.adaptive_baseline_enabled")}
          </label>
          <Switch
            id={adaptiveId}
            checked={form.adaptiveBaselineEnabled}
            onCheckedChange={(adaptiveBaselineEnabled) =>
              onChange((current) => ({ ...current, adaptiveBaselineEnabled }))
            }
          />
        </Flex>
        {form.adaptiveBaselineEnabled ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label={`${t("notification.ping_loss.upper_deviation_percent")} (%)`}
              value={form.upperDeviationPercent}
              min={0.1}
              max={1000}
              step={0.1}
              onChange={(upperDeviationPercent) =>
                onChange((current) => ({ ...current, upperDeviationPercent }))
              }
            />
            <NumberField
              label={`${t("notification.ping_loss.lower_deviation_percent")} (%)`}
              value={form.lowerDeviationPercent}
              min={0.1}
              max={99.9}
              step={0.1}
              onChange={(lowerDeviationPercent) =>
                onChange((current) => ({ ...current, lowerDeviationPercent }))
              }
            />
            <NumberField
              label={t("notification.ping_loss.baseline_window_hours")}
              value={form.baselineWindowHours}
              min={1}
              max={720}
              onChange={(baselineWindowHours) =>
                onChange((current) => ({ ...current, baselineWindowHours }))
              }
            />
            <NumberField
              label={t("notification.ping_loss.baseline_minimum_samples")}
              value={form.baselineMinimumSamples}
              min={1}
              max={1000000}
              onChange={(baselineMinimumSamples) =>
                onChange((current) => ({ ...current, baselineMinimumSamples }))
              }
            />
            {baselinePreview ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {t("notification.ping_loss.current_baseline")}:{" "}
                  {baselinePreview.adaptive_baseline_ms
                    ? `${Number(baselinePreview.adaptive_baseline_ms).toFixed(1)} ms`
                    : t("notification.ping_loss.adaptive_status_warming")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(`notification.ping_loss.adaptive_status_${baselinePreview.adaptive_baseline_status || "warming"}`)}
                  {baselinePreview.adaptive_baseline_status === "warming"
                    ? ` · ${t("notification.ping_loss.baseline_progress", {
                        current: baselinePreview.adaptive_baseline_sample_count || 0,
                        total: baselinePreview.baseline_minimum_samples || form.baselineMinimumSamples,
                      })}`
                    : ""}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <NumberField
                label={t("notification.ping_loss.fixed_baseline_ms")}
                value={form.fixedBaselineMs}
                min={0.1}
                max={100000}
                step={0.1}
                onChange={(fixedBaselineMs) =>
                  onChange((current) => ({ ...current, fixedBaselineMs }))
                }
              />
            </div>
            <NumberField
              label={t("notification.ping_loss.high_latency_threshold_ms")}
              value={form.highLatencyThresholdMs}
              min={0.1}
              max={100000}
              step={0.1}
              onChange={(highLatencyThresholdMs) =>
                onChange((current) => ({ ...current, highLatencyThresholdMs }))
              }
            />
            <NumberField
              label={t("notification.ping_loss.low_latency_threshold_ms")}
              value={form.lowLatencyThresholdMs}
              min={0}
              max={100000}
              step={0.1}
              onChange={(lowLatencyThresholdMs) =>
                onChange((current) => ({ ...current, lowLatencyThresholdMs }))
              }
            />
          </div>
        )}
      </fieldset>
      ) : null}
    </>
  );
};

const PingLossDefaultDialog = () => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [cachedLoss, setCachedLoss] = React.useState<FormState>(defaultForm);
  const [cachedLatency, setCachedLatency] = React.useState<LatencyDefaultForm>(defaultLatencyForm);
  const [lossForm, setLossForm] = React.useState<FormState>(defaultForm);
  const [latencyForm, setLatencyForm] = React.useState<LatencyDefaultForm>(defaultLatencyForm);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/notification/ping-loss/default", { cache: "no-store" }).then(parseResponse),
      fetch("/api/admin/notification/ping-loss/latency-default", { cache: "no-store" }).then(parseResponse),
    ])
      .then(([lossData, latencyData]) => {
        if (cancelled) return;
        const value = lossData?.data;
        setCachedLoss({
          ...defaultForm,
          enable: value?.enabled === true,
          windowMinutes: (Number(value?.window_seconds) || 60) / 60,
          lossThreshold: Number(value?.loss_threshold) || 5,
          minimumSamples: Number(value?.minimum_samples) || 1,
          cooldownMinutes: (Number(value?.cooldown_seconds) || 300) / 60,
        });
        const latency = latencyData?.data;
        setCachedLatency({
          enable: latency?.enabled === true,
          windowMinutes: (Number(latency?.window_seconds) || 300) / 60,
          minimumSamples: Number(latency?.minimum_samples) || 30,
          cooldownMinutes: (Number(latency?.cooldown_seconds) || 1800) / 60,
          lowerDeviationPercent: Number(latency?.lower_deviation_percent) || 25,
          upperDeviationPercent: Number(latency?.upper_deviation_percent) || 25,
          baselineWindowHours: (Number(latency?.baseline_window_seconds) || 86400) / 3600,
          baselineMinimumSamples: Number(latency?.baseline_minimum_samples) || 30,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !isPingLossFormValid({ ...lossForm, enable: false, lossEnabled: true, latencyEnabled: false }) ||
      !isLatencyDefaultFormValid(latencyForm)
    ) {
      toast.error(t("notification.ping_loss.invalid_form"));
      return;
    }
    setSaving(true);
    try {
      const lossResponse = await fetch("/api/admin/notification/ping-loss/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: lossForm.enable,
          window_seconds: Math.round(lossForm.windowMinutes * 60),
          loss_threshold: lossForm.lossThreshold,
          minimum_samples: Math.round(lossForm.minimumSamples),
          cooldown_seconds: Math.round(lossForm.cooldownMinutes * 60),
        }),
      });
      await parseResponse(lossResponse);
      const latencyResponse = await fetch("/api/admin/notification/ping-loss/latency-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema_version: 2,
          enabled: latencyForm.enable,
          window_seconds: Math.round(latencyForm.windowMinutes * 60),
          minimum_samples: Math.round(latencyForm.minimumSamples),
          cooldown_seconds: Math.round(latencyForm.cooldownMinutes * 60),
          lower_deviation_percent: latencyForm.lowerDeviationPercent,
          upper_deviation_percent: latencyForm.upperDeviationPercent,
          baseline_window_seconds: Math.round(latencyForm.baselineWindowHours * 3600),
          baseline_minimum_samples: Math.round(latencyForm.baselineMinimumSamples),
        }),
      });
      await parseResponse(latencyResponse);
      toast.success(t("common.updated_successfully"));
      setCachedLoss(lossForm);
      setCachedLatency(latencyForm);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <MuiButton
          type="button"
          variant="outlined"
          startIcon={<Settings2 size={16} />}
          onClick={() => {
            setLossForm(cachedLoss);
            setLatencyForm(cachedLatency);
          }}
          sx={ADMIN_LIST_OUTLINE_SX}
        >
          {t("notification.ping_loss.default_config")}
        </MuiButton>
      </Dialog.Trigger>
      <AppDialogContent
        title={t("notification.ping_loss.default_config")}
        description={t("notification.ping_loss.default_config_description")}
        maxWidth="640px"
      >
        <form onSubmit={save} className="mt-4 flex flex-col gap-5">
          <fieldset className="grid min-w-0 gap-3 rounded-lg border border-border p-3">
            <Flex className="flex items-center justify-between gap-4">
              <legend className="text-sm font-medium">
                {t("notification.ping_loss.loss_anomaly")}
              </legend>
              <Switch
                checked={lossForm.enable}
                onCheckedChange={(enable) =>
                  setLossForm((current) => ({ ...current, enable }))
                }
              />
            </Flex>
            <span className="text-sm text-muted-foreground">
              {t("notification.ping_loss.default_config_enabled")}
            </span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField
                label={t("notification.ping_loss.window_minutes")}
                value={lossForm.windowMinutes}
                min={1}
                max={1440}
                onChange={(windowMinutes) =>
                  setLossForm((current) => ({ ...current, windowMinutes }))
                }
              />
              <NumberField
                label={`${t("notification.ping_loss.threshold")} (%)`}
                value={lossForm.lossThreshold}
                min={0.1}
                max={100}
                step={0.1}
                onChange={(lossThreshold) =>
                  setLossForm((current) => ({ ...current, lossThreshold }))
                }
              />
              <NumberField
                label={t("notification.ping_loss.minimum_samples")}
                value={lossForm.minimumSamples}
                min={1}
                max={100000}
                onChange={(minimumSamples) =>
                  setLossForm((current) => ({ ...current, minimumSamples }))
                }
              />
              <NumberField
                label={t("notification.ping_loss.cooldown_minutes")}
                value={lossForm.cooldownMinutes}
                min={1}
                max={10080}
                onChange={(cooldownMinutes) =>
                  setLossForm((current) => ({ ...current, cooldownMinutes }))
                }
              />
            </div>
          </fieldset>
          <fieldset className="grid min-w-0 gap-3 rounded-lg border border-border p-3">
            <Flex className="flex items-center justify-between gap-4">
              <legend className="text-sm font-medium">
                {t("notification.ping_loss.latency_anomaly")}
              </legend>
              <Switch
                checked={latencyForm.enable}
                onCheckedChange={(enable) =>
                  setLatencyForm((current) => ({ ...current, enable }))
                }
              />
            </Flex>
            <span className="text-sm text-muted-foreground">
              {t("notification.ping_loss.default_latency_config_enabled")}
            </span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField
                label={t("notification.ping_loss.latency_window_minutes")}
                value={latencyForm.windowMinutes}
                min={1}
                max={1440}
                onChange={(windowMinutes) =>
                  setLatencyForm((current) => ({ ...current, windowMinutes }))
                }
              />
              <NumberField
                label={t("notification.ping_loss.latency_minimum_samples")}
                value={latencyForm.minimumSamples}
                min={1}
                max={100000}
                onChange={(minimumSamples) =>
                  setLatencyForm((current) => ({ ...current, minimumSamples }))
                }
              />
              <NumberField
                label={t("notification.ping_loss.latency_cooldown_minutes")}
                value={latencyForm.cooldownMinutes}
                min={1}
                max={10080}
                onChange={(cooldownMinutes) =>
                  setLatencyForm((current) => ({ ...current, cooldownMinutes }))
                }
              />
              <NumberField
                label={`${t("notification.ping_loss.upper_deviation_percent")} (%)`}
                value={latencyForm.upperDeviationPercent}
                min={0.1}
                max={1000}
                step={0.1}
                onChange={(upperDeviationPercent) =>
                  setLatencyForm((current) => ({ ...current, upperDeviationPercent }))
                }
              />
              <NumberField
                label={`${t("notification.ping_loss.lower_deviation_percent")} (%)`}
                value={latencyForm.lowerDeviationPercent}
                min={0.1}
                max={99.9}
                step={0.1}
                onChange={(lowerDeviationPercent) =>
                  setLatencyForm((current) => ({ ...current, lowerDeviationPercent }))
                }
              />
              <NumberField
                label={t("notification.ping_loss.baseline_window_hours")}
                value={latencyForm.baselineWindowHours}
                min={1}
                max={720}
                onChange={(baselineWindowHours) =>
                  setLatencyForm((current) => ({ ...current, baselineWindowHours }))
                }
              />
              <NumberField
                label={t("notification.ping_loss.baseline_minimum_samples")}
                value={latencyForm.baselineMinimumSamples}
                min={1}
                max={1000000}
                onChange={(baselineMinimumSamples) =>
                  setLatencyForm((current) => ({ ...current, baselineMinimumSamples }))
                }
              />
            </div>
          </fieldset>
          <Flex gap="2" justify="end" className="mt-2">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button type="submit" loading={saving}>
              {t("common.save")}
            </Button>
          </Flex>
        </form>
      </AppDialogContent>
    </Dialog.Root>
  );
};

const ConfigurationDialog = ({
  children,
  targets,
  availableTargets,
  onSaved,
  batch = false,
  section,
}: {
  children: React.ReactNode;
  targets: AlertTarget[];
  availableTargets?: AlertTarget[];
  onSaved: () => Promise<void>;
  batch?: boolean;
  section: AlertSheet;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(defaultForm);
  const [createTargetKey, setCreateTargetKey] = React.useState("");
  const createMode = availableTargets !== undefined;
  const availableTargetSignature = (availableTargets || [])
    .map((target) => target.key)
    .join("|");
  const activeTargets = createMode
    ? (availableTargets || []).filter(
        (target) => target.key === createTargetKey,
      )
    : targets;
  const targetSignature = activeTargets.map((target) => target.key).join("|");

  React.useEffect(() => {
    if (!open || !createMode) return;
    setCreateTargetKey((current) =>
      (availableTargets || []).some((target) => target.key === current)
        ? current
        : availableTargets?.[0]?.key || "",
    );
  }, [open, createMode, availableTargetSignature]);

  React.useEffect(() => {
    if (!open) return;
    const rule = activeTargets.find((target) => target.rule)?.rule;
    setForm(formForSheet(rule, section));
  }, [open, section, targetSignature]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (activeTargets.length === 0) {
      toast.error(t("notification.ping_loss.select_required"));
      return;
    }
    const forms = activeTargets.map((target) =>
      applyPingLossSheet(formForSheet(target.rule, section), form, section),
    );
    if (forms.some((item) => !isPingLossFormValid(item))) {
      toast.error(t("notification.ping_loss.invalid_form"));
      return;
    }

    const notifications = forms.map((item, index) => formToPayload(item, activeTargets[index]));

    setSaving(true);
    try {
      const response = await fetch("/api/admin/notification/ping-loss/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications }),
      });
      await parseResponse(response);
      toast.success(t("common.updated_successfully"));
      setOpen(false);
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const firstRule = activeTargets.find((target) => target.rule)?.rule;
  const title = batch
    ? t("notification.ping_loss.batch_edit")
    : firstRule
      ? t("notification.ping_loss.edit")
      : t("notification.ping_loss.add");

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <AppDialogContent maxWidth="640px">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description className="sr-only">{title}</Dialog.Description>
        {batch ? (
          <span className="text-sm text-muted-foreground">
            {t("common.selected", { count: targets.length })}
          </span>
        ) : null}
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          {createMode ? (
            <Field label={`${t("ping.task")} / ${t("common.server")}`}>
              <Select.Root
                value={createTargetKey}
                onValueChange={setCreateTargetKey}
                disabled={(availableTargets || []).length === 0}
              >
                <Select.Trigger placeholder={t("common.select")} />
                <Select.Content>
                  {(availableTargets || []).map((target) => (
                    <Select.Item key={target.key} value={target.key}>
                      {target.task.name || `#${target.taskId}`} / {target.clientName}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
          ) : null}
          <PingLossConfigurationFields
            form={form}
            onChange={setForm}
            baselinePreview={batch ? undefined : firstRule}
            section={section}
          />

          <Flex gap="2" justify="end" className="mt-2">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={saving || activeTargets.length === 0}>
              {t("common.save")}
            </Button>
          </Flex>
        </form>
      </AppDialogContent>
    </Dialog.Root>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="flex min-w-0 flex-col gap-2">
    <span>{label}</span>
    {children}
  </label>
);

const NumberField = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) => (
  <Field label={label}>
    <TextField.Root
      type="number"
      value={String(value)}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </Field>
);

const DeleteRuleButton = ({
  rule,
  onDeleted,
}: {
  rule: PingLossNotification;
  onDeleted: () => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch("/api/admin/notification/ping-loss/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: [rule.id] }),
      });
      await parseResponse(response);
      toast.success(t("common.deleted_successfully"));
      setOpen(false);
      await onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          color="red"
          title={t("common.delete")}
          aria-label={t("common.delete")}
        >
          <Trash2 size={16} />
        </IconButton>
      </Dialog.Trigger>
      <AppDialogContent maxWidth="420px">
        <Dialog.Title>{t("notification.ping_loss.delete_title")}</Dialog.Title>
        <Dialog.Description className="sr-only">
          {t("notification.ping_loss.delete_title")}
        </Dialog.Description>
        <Flex gap="2" justify="end" className="mt-6">
          <Dialog.Close>
            <Button type="button" variant="soft" color="gray">
              {t("common.cancel")}
            </Button>
          </Dialog.Close>
          <Button color="red" onClick={remove} disabled={deleting}>
            {t("common.delete")}
          </Button>
        </Flex>
      </AppDialogContent>
    </Dialog.Root>
  );
};

export default PingLossPage;
