import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Cpu, HardDrive, MemoryStick } from "@/components/admin/muiIcons";
import { ChartContainer } from "@/components/ui/chart";
import type { NodeDetail } from "@/contexts/NodeDetailsContext";
import type { Record as LiveRecord } from "@/types/LiveData";
import { nodeTrafficType, trafficUsed } from "@/utils/trafficAccounting";
import { formatTrafficResetRangeLabel } from "@/utils/trafficCycle";
import { dashboardTrafficAxisWidth } from "@/utils/dashboard";
import { formatBytes } from "@/utils/unitHelper";
import { LITE_BLUE } from "@/theme/brand";
import {
  EMPTY_DISPLAY,
  type HoursRange,
  type LoadRecord,
  displayOrEmpty,
} from "@/pages/admin/nodeDetailPreview";
import { usageMetricCardSx } from "@/pages/admin/nodeDetailCardStyles";

function pct(used?: number | null, total?: number | null) {
  if (!total || total <= 0 || used == null) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

function formatSpeed(bytesPerSecond?: number | null) {
  if (bytesPerSecond == null || !Number.isFinite(Number(bytesPerSecond))) {
    return EMPTY_DISPLAY;
  }
  return `${formatBytes(Number(bytesPerSecond))}/s`;
}

function formatTimeLabel(value: string, hours: HoursRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (hours <= 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function shortDayLabel(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return day;
  return `${Number(match[2])}/${Number(match[3])}`;
}

function beijingDayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dailyFromNetworkRecords(rows: LoadRecord[]): DailyTrafficPoint[] {
  const lastByDay = new Map<string, { up: number; down: number }>();
  for (const row of rows) {
    const day = beijingDayKey(row.time);
    if (!day) continue;
    lastByDay.set(day, {
      up: Number(row.net_total_up) || 0,
      down: Number(row.net_total_down) || 0,
    });
  }
  const days = [...lastByDay.entries()].sort(([left], [right]) => left.localeCompare(right));
  return days.map(([day, point], index) => {
    const previous = days[index - 1]?.[1];
    return {
      day,
      label: shortDayLabel(day),
      up: previous ? Math.max(0, point.up - previous.up) : 0,
      down: previous ? Math.max(0, point.down - previous.down) : 0,
      billable: 0,
    };
  });
}

type DailyTrafficPoint = {
  day: string;
  label: string;
  up: number;
  down: number;
  billable: number;
};

function dailyTrafficAxisValues(daily: DailyTrafficPoint[]) {
  const values = daily.flatMap((point) => [point.up, point.down]);
  const max = values.reduce((highest, value) => Math.max(highest, Number(value) || 0), 0);
  if (!(max > 0)) return values;
  // Recharts ticks are interpolated, so "83.82GB" can be wider than any bar label.
  return [...values, 0, max * 0.25, max * 0.5, max * 0.75, max];
}

function UsageCard({
  icon,
  color,
  label,
  value,
  detail,
  remain,
  percent,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: string;
  detail?: string;
  remain?: string;
  percent: number;
}) {
  return (
    <Box
      className="km-admin-metric-card"
      data-testid="admin-node-usage-card"
      sx={{
        ...usageMetricCardSx,
        p: 2.25,
        flex: 1,
        minWidth: 0,
        minHeight: 116,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        boxShadow: "none",
      }}
    >
      <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
        <Box
          data-testid="admin-node-usage-icon"
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: `color-mix(in srgb, ${color} 12%, transparent)`,
            color,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "var(--metric-label-color)", fontSize: 13, fontWeight: 500 }}
          >
            {label}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.15, fontSize: 28 }}>
            {value}
            {value === EMPTY_DISPLAY ? null : (
              <Typography
                component="span"
                variant="subtitle2"
                sx={{ ml: 0.5, color: "var(--metric-label-color)", fontWeight: 400 }}
              >
                %
              </Typography>
            )}
          </Typography>
        </Box>
        {detail ? (
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography
              variant="body2"
              data-testid="admin-node-usage-detail"
              sx={{
                color: "var(--metric-label-color)",
                fontWeight: 400,
                display: "block",
                whiteSpace: "nowrap",
              }}
            >
              {detail}
            </Typography>
            {remain ? (
              <Typography
                variant="caption"
                data-testid="admin-node-usage-remain"
                sx={{ color: "var(--metric-label-color)", fontWeight: 400 }}
              >
                {remain}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          mt: 1.75,
          height: 7,
          borderRadius: 99,
          bgcolor: "rgba(145,158,171,0.16)",
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 99 },
        }}
      />
    </Box>
  );
}

function ChartPlaceholder({ height = 180 }: { height?: number }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography variant="body2" color="text.secondary">
        {t("admin.nodeDetail.noData", "暂无数据")}
      </Typography>
    </Box>
  );
}

function HistoryCard({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Box
      className="km-admin-surface"
      sx={{
        p: 2,
        minWidth: 0,
      }}
    >
      <Stack
        direction="row"
        sx={{ mb: 1.5, justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {extra}
      </Stack>
      {children}
    </Box>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: "center" }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: "#919EAB", fontWeight: 400 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function NodeUsageStats({
  node,
  live,
  online,
}: {
  node: NodeDetail;
  live?: LiveRecord;
  online: boolean;
}) {
  const { t } = useTranslation();
  const [hours, setHours] = useState<HoursRange>(1);
  const [records, setRecords] = useState<LoadRecord[]>([]);
  const [daily, setDaily] = useState<DailyTrafficPoint[]>([]);
  const [dailyReady, setDailyReady] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      `/api/records/load?uuid=${encodeURIComponent(node.uuid)}&hours=${hours}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || `HTTP ${response.status}`);
        const rows = payload?.data?.records ?? payload?.records ?? [];
        setRecords(Array.isArray(rows) && rows.length > 0 ? rows : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRecords([]);
        }
      });
    return () => controller.abort();
  }, [hours, node.uuid]);

  useEffect(() => {
    const controller = new AbortController();
    const loadLedger = async () => {
      const response = await fetch(
        `/api/admin/client/${encodeURIComponent(node.uuid)}/traffic-daily`,
        { cache: "no-store", signal: controller.signal },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || `HTTP ${response.status}`);
      const data = payload?.data ?? payload;
      const rows = Array.isArray(data?.daily) ? data.daily : [];
      if (rows.length === 0) throw new Error("empty daily ledger");
      setDailyReady(data?.history_ready !== false);
      setDaily(
        rows.map((row: { day?: string; up?: number; down?: number; billable?: number }) => {
          const day = String(row.day || "");
          return {
            day,
            label: shortDayLabel(day),
            up: Number(row.up) || 0,
            down: Number(row.down) || 0,
            billable: Number(row.billable) || 0,
          };
        }),
      );
    };
    const loadRecordsFallback = async () => {
      const response = await fetch(
        `/api/records/load?uuid=${encodeURIComponent(node.uuid)}&hours=720&load_type=network`,
        { cache: "no-store", signal: controller.signal },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || `HTTP ${response.status}`);
      const rows = payload?.data?.records ?? payload?.records ?? [];
      setDailyReady(true);
      setDaily(Array.isArray(rows) ? dailyFromNetworkRecords(rows) : []);
    };
    void loadLedger().catch(() => {
      if (controller.signal.aborted) return;
      void loadRecordsFallback().catch(() => {
        if (!controller.signal.aborted) {
          setDaily([]);
          setDailyReady(true);
        }
      });
    });
    return () => controller.abort();
  }, [node.uuid]);

  const latestRecord = records.at(-1);
  const memTotal =
    Number(node.mem_total) ||
    Number(latestRecord?.ram_total) ||
    0;
  const diskTotal =
    Number(node.disk_total) ||
    Number(latestRecord?.disk_total) ||
    0;
  const cpuValue = live?.cpu.usage ?? latestRecord?.cpu;
  const memValue = live?.ram.used ?? latestRecord?.ram;
  const diskValue = live?.disk.used ?? latestRecord?.disk;
  const hasCpu = cpuValue != null && Number.isFinite(Number(cpuValue));
  const hasMem = memValue != null && Number.isFinite(Number(memValue)) && memTotal > 0;
  const hasDisk = diskValue != null && Number.isFinite(Number(diskValue)) && diskTotal > 0;
  const cpuPct = hasCpu ? Number(cpuValue) : 0;
  const memUsed = hasMem ? Number(memValue) : 0;
  const diskUsed = hasDisk ? Number(diskValue) : 0;
  const memPct = pct(hasMem ? memUsed : null, memTotal);
  const diskPct = pct(hasDisk ? diskUsed : null, diskTotal);
  const inbound = live?.network.totalDown ?? latestRecord?.net_total_down;
  const outbound = live?.network.totalUp ?? latestRecord?.net_total_up;
  const inboundSpeed = live?.network.down ?? latestRecord?.net_in;
  const outboundSpeed = live?.network.up ?? latestRecord?.net_out;
  const trafficType = nodeTrafficType(node);
  const usedTraffic =
    inbound == null && outbound == null
      ? null
      : trafficUsed(trafficType, outbound ?? 0, inbound ?? 0);
  const trafficLimit = Number(node.effective_traffic_limit) || 0;
  const trafficPct = pct(usedTraffic, trafficLimit);
  const hasTrafficSplit = (inbound ?? 0) + (outbound ?? 0) > 0;
  const inShare = hasTrafficSplit ? Math.round(((inbound ?? 0) / ((inbound ?? 0) + (outbound ?? 0))) * 100) : 0;
  const pieData = hasTrafficSplit
    ? [
        { name: "in", value: inbound ?? 0 },
        { name: "out", value: outbound ?? 0 },
      ]
    : [];

  const points = useMemo(
    () =>
      records.map((row) => ({
        time: row.time,
        label: formatTimeLabel(row.time, hours),
        cpu: Number(row.cpu) || 0,
        mem: pct(row.ram, row.ram_total || memTotal),
        disk: pct(row.disk, row.disk_total || diskTotal),
        down: Number(row.net_in) || 0,
        up: Number(row.net_out) || 0,
        totalUp: Number(row.net_total_up) || 0,
        totalDown: Number(row.net_total_down) || 0,
      })),
    [diskTotal, hours, memTotal, records],
  );

  const dailyAxisWidth = useMemo(
    () => dashboardTrafficAxisWidth(dailyTrafficAxisValues(daily)),
    [daily],
  );

  const usageRangeLabel =
    formatTrafficResetRangeLabel(node.traffic_reset_day) ?? EMPTY_DISPLAY;

  const remainingTraffic =
    usedTraffic != null && trafficLimit > 0
      ? Math.max(0, trafficLimit - usedTraffic)
      : null;

  const rangeButtons = (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={hours}
      onChange={(_, next: HoursRange | null) => {
        if (next) setHours(next);
      }}
      sx={{
        bgcolor: "rgba(145, 158, 171, 0.08)",
        borderRadius: "8px",
        p: "2px",
        "& .MuiToggleButtonGroup-grouped": {
          border: 0,
          borderRadius: "6px !important",
          mx: 0,
        },
        "& .MuiToggleButton-root": {
          textTransform: "none",
          fontSize: 13,
          fontWeight: 600,
          px: 1.25,
          py: 0.5,
          border: 0,
          color: "#637381",
          transition: "background-color 160ms ease, color 160ms ease",
          "&.Mui-selected": {
            bgcolor: "#fff",
            color: "#1C252E",
            boxShadow: "0 1px 2px rgba(145,158,171,0.24)",
          },
        },
      }}
    >
      <ToggleButton value={1}>{t("admin.nodeDetail.range1h", "1 小时")}</ToggleButton>
      <ToggleButton value={24}>{t("admin.nodeDetail.range1d", "1 天")}</ToggleButton>
      <ToggleButton value={168}>{t("admin.nodeDetail.range1w", "1 周")}</ToggleButton>
    </ToggleButtonGroup>
  );

  void online;

  return (
    <Stack spacing={2} data-testid="admin-node-usage-stats">
      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "stretch",
          gridTemplateColumns: { xs: "1fr", md: "minmax(340px, 0.42fr) minmax(0, 1fr)" },
        }}
      >
        <Stack spacing={1.5} sx={{ height: "100%" }}>
          <UsageCard
            icon={<Cpu size={24} />}
            color={LITE_BLUE}
            label={t("admin.nodeDetail.cpuUsage", "CPU 使用率")}
            value={hasCpu ? cpuPct.toFixed(1) : EMPTY_DISPLAY}
            percent={hasCpu ? cpuPct : 0}
          />
          <UsageCard
            icon={<MemoryStick size={24} />}
            color="#FFAB00"
            label={t("admin.nodeDetail.memUsage", "内存使用率")}
            value={hasMem ? memPct.toFixed(1) : EMPTY_DISPLAY}
            detail={
              hasMem ? `${formatBytes(memUsed)} / ${formatBytes(memTotal)}` : undefined
            }
            remain={
              hasMem
                ? `${formatBytes(Math.max(0, memTotal - memUsed))} ${t("admin.nodeDetail.remaining", "剩余")}`
                : undefined
            }
            percent={memPct}
          />
          <UsageCard
            icon={<HardDrive size={24} />}
            color="#22C55E"
            label={t("admin.nodeDetail.diskUsage", "磁盘使用率")}
            value={hasDisk ? diskPct.toFixed(1) : EMPTY_DISPLAY}
            detail={
              hasDisk
                ? `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}`
                : undefined
            }
            remain={
              hasDisk
                ? `${formatBytes(Math.max(0, diskTotal - diskUsed))} ${t("admin.nodeDetail.remaining", "剩余")}`
                : undefined
            }
            percent={diskPct}
          />
        </Stack>

        <Box
          className="km-admin-detail-card"
          sx={{
            p: 2.25,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            {t("admin.nodeDetail.networkPanel", "网络")}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: "center", flex: 1 }}
          >
            <Box sx={{ width: 168, height: 168, position: "relative", flexShrink: 0 }}>
              {hasTrafficSplit ? (
                <>
              <ChartContainer
                config={{ in: { color: LITE_BLUE }, out: { color: "#FFAB00" } }}
                className="h-[168px] w-[168px] aspect-auto"
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={52}
                    outerRadius={74}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    <Cell fill={LITE_BLUE} />
                    <Cell fill="#FFAB00" />
                  </Pie>
                </PieChart>
              </ChartContainer>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {inShare} / {100 - inShare}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  %
                </Typography>
              </Box>
                </>
              ) : (
                <ChartPlaceholder height={168} />
              )}
            </Box>
            <Box
              sx={{
                flex: 1,
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: "1fr 1fr",
                width: "100%",
              }}
            >
              <LegendItem color={LITE_BLUE} label={t("admin.nodeDetail.inbound", "入站")} value={displayOrEmpty(inbound, formatBytes)} />
              <LegendItem color="#69B1FF" label={t("admin.nodeDetail.speedIn", "入站速度")} value={formatSpeed(inboundSpeed)} />
              <LegendItem color="#FFAB00" label={t("admin.nodeDetail.outbound", "出站")} value={displayOrEmpty(outbound, formatBytes)} />
              <LegendItem color="#FF5630" label={t("admin.nodeDetail.speedOut", "出站速度")} value={formatSpeed(outboundSpeed)} />
              <LegendItem
                color="#637381"
                label={`${t("admin.nodeDetail.total", "总计")}${
                  trafficType
                    ? ` · ${t(`admin.nodeEdit.trafficLimitType_${trafficType}`)}`
                    : ""
                }`}
                value={displayOrEmpty(usedTraffic, formatBytes)}
              />
              <LegendItem
                color="#22C55E"
                label={t("admin.nodeDetail.trafficLimit", "流量限制")}
                value={
                  trafficLimit > 0
                    ? formatBytes(trafficLimit)
                    : t("admin.nodeDetail.unlimited", "未限流")
                }
              />
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={trafficPct}
            sx={{
              mt: 2,
              height: 10,
              borderRadius: 99,
              bgcolor: "rgba(145,158,171,0.16)",
              "& .MuiLinearProgress-bar": { bgcolor: LITE_BLUE, borderRadius: 99 },
            }}
          />
          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 1.25, justifyContent: "space-between", alignItems: "center" }}
          >
            <Typography
              variant="body2"
              sx={{ minWidth: 0, color: "#7C8996", fontWeight: 400 }}
            >
              {usedTraffic != null && trafficLimit > 0
                ? t("admin.nodeDetail.usedOf", "已用 {{used}}，共 {{total}}", {
                    used: formatBytes(usedTraffic),
                    total: formatBytes(trafficLimit),
                  })
                : t("admin.nodeDetail.noData", "暂无数据")}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#7C8996",
                fontWeight: 400,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {remainingTraffic != null
                ? `${t("admin.nodeDetail.remaining", "剩余")} ${formatBytes(remainingTraffic)}`
                : EMPTY_DISPLAY}
            </Typography>
          </Stack>
          <Box
            data-testid="admin-node-network-summary"
            sx={{
              mt: 1.5,
              minHeight: 84,
              px: { xs: 1.5, sm: 2 },
              py: 1.25,
              borderRadius: "8px",
              bgcolor: "rgba(145, 158, 171, 0.04)",
              display: "grid",
              gridTemplateColumns: { xs: "1fr auto", sm: "1fr auto 1fr" },
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Typography
              variant="body2"
              data-testid="admin-node-network-range"
              sx={{ minWidth: 0, color: "#919EAB", fontWeight: 400, fontSize: 13 }}
            >
              {usageRangeLabel}
            </Typography>
            <Typography
              sx={{
                color: usedTraffic != null && trafficLimit > 0 ? LITE_BLUE : "text.disabled",
                fontWeight: 700,
                fontSize: { xs: 28, sm: 32 },
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {usedTraffic != null && trafficLimit > 0 ? `${trafficPct.toFixed(1)}%` : EMPTY_DISPLAY}
            </Typography>
            <Typography
              variant="body2"
              data-testid="admin-node-network-summary-label"
              sx={{
                display: { xs: "none", sm: "block" },
                color: "#919EAB",
                fontWeight: 400,
                fontSize: 13,
                textAlign: "right",
              }}
            >
              {t("admin.nodeDetail.trafficUsage", "流量使用率")}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        <HistoryCard title={t("admin.nodeDetail.cpuHistory", "CPU 历史数据")} extra={rangeButtons}>
          {points.length ? (
          <ChartContainer config={{ cpu: { label: "CPU", color: LITE_BLUE } }} className="h-[180px] w-full aspect-auto">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="mt-1 font-medium">{Number(payload[0]?.value ?? 0).toFixed(1)}%</div>
                    </div>
                  ) : null
                }
              />
              <Line type="monotone" dataKey="cpu" stroke={LITE_BLUE} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
          ) : (
            <ChartPlaceholder />
          )}
        </HistoryCard>
        <HistoryCard title={t("admin.nodeDetail.memHistory", "内存历史用量")}>
          {points.length ? (
          <ChartContainer config={{ mem: { label: "Mem", color: "#2065D1" } }} className="h-[180px] w-full aspect-auto">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="mt-1 font-medium">{Number(payload[0]?.value ?? 0).toFixed(1)}%</div>
                    </div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="mem" stroke="#2065D1" fill="rgba(32,101,209,0.18)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
          ) : (
            <ChartPlaceholder />
          )}
        </HistoryCard>
        <HistoryCard title={t("admin.nodeDetail.diskHistory", "Disk 历史用量")}>
          {points.length ? (
          <ChartContainer config={{ disk: { label: "Disk", color: "#00A76F" } }} className="h-[180px] w-full aspect-auto">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="mt-1 font-medium">{Number(payload[0]?.value ?? 0).toFixed(1)}%</div>
                    </div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="disk" stroke="#00A76F" fill="rgba(0,167,111,0.16)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
          ) : (
            <ChartPlaceholder />
          )}
        </HistoryCard>
        <HistoryCard title={t("admin.nodeDetail.networkHistory", "网络历史用量")}>
          {points.length ? (
          <ChartContainer
            config={{ down: { label: "In", color: LITE_BLUE }, up: { label: "Out", color: "#FFAB00" } }}
            className="h-[180px] w-full aspect-auto"
          >
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                      <div className="text-muted-foreground">{label}</div>
                      {payload.map((item) => (
                        <div key={String(item.dataKey)} className="mt-1 font-medium">
                          {item.dataKey === "down"
                            ? t("admin.nodeDetail.inbound", "入站")
                            : t("admin.nodeDetail.outbound", "出站")}{" "}
                          {formatBytes(Number(item.value) || 0)}/s
                        </div>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Area type="monotone" dataKey="down" stroke={LITE_BLUE} fill="rgba(14,134,221,0.16)" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="up" stroke="#FFAB00" fill="rgba(255,171,0,0.14)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
          ) : (
            <ChartPlaceholder />
          )}
        </HistoryCard>
      </Box>

      <HistoryCard
        title={t("admin.nodeDetail.dailyTraffic", "每日网络流量")}
        extra={
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("admin_dashboard.recent_month", "最近 30 天")}
          </Typography>
        }
      >
        {!dailyReady ? (
          <Typography variant="caption" sx={{ mb: 1, display: "block", color: "text.secondary" }}>
            {t("admin_dashboard.history_preparing", "历史流量正在准备中")}
          </Typography>
        ) : null}
        {daily.length ? (
        <ChartContainer
          config={{ down: { label: "In", color: "#FF5630" }, up: { label: "Out", color: LITE_BLUE } }}
          className="h-[200px] w-full aspect-auto [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible"
        >
          <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={dailyAxisWidth}
              tickMargin={4}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => formatBytes(Number(value)).replace(" ", "")}
            />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                    <div className="text-muted-foreground">{label}</div>
                    {payload.map((item) => (
                      <div key={String(item.dataKey)} className="mt-1 font-medium">
                        {item.dataKey === "down"
                          ? t("admin.nodeDetail.inbound", "入站")
                          : t("admin.nodeDetail.outbound", "出站")}{" "}
                        {formatBytes(Number(item.value) || 0)}
                      </div>
                    ))}
                    <div className="mt-1 font-medium">
                      {t("admin_dashboard.billable", "计费")}{" "}
                      {formatBytes(Number(payload[0]?.payload?.billable) || 0)}
                    </div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="down" fill="#FF5630" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="up" fill={LITE_BLUE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        ) : (
          <ChartPlaceholder height={200} />
        )}
      </HistoryCard>
    </Stack>
  );
}
