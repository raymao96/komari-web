import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { Button, Callout, Skeleton } from "@radix-ui/themes";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleCheck,
  Database,
  RefreshCw,
  Server,
  ServerOff,
  WalletCards,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer } from "@/components/ui/chart";
import {
  dashboardLocalStorageTotal,
  dashboardOnlinePercent,
  dashboardRuntimeStorageTotal,
  shortDashboardDay,
  type DashboardData,
  type DashboardDatabaseStatus,
} from "@/utils/dashboard";
import { formatBytes } from "@/utils/unitHelper";

const REFRESH_INTERVAL_MS = 15_000;

let dashboardSnapshot: DashboardData | null = null;
let pendingDashboardRequest: Promise<DashboardData> | null = null;

async function requestDashboard(): Promise<DashboardData> {
  if (pendingDashboardRequest) return pendingDashboardRequest;
  pendingDashboardRequest = fetch("/api/admin/dashboard", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const payload = await response.json();
          if (payload?.message) message = String(payload.message);
        } catch {
          // Keep the HTTP status fallback.
        }
        throw new Error(message);
      }
      return response.json() as Promise<DashboardData>;
    })
    .then((data) => {
      dashboardSnapshot = data;
      return data;
    })
    .finally(() => {
      pendingDashboardRequest = null;
    });
  return pendingDashboardRequest;
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-[126px] rounded-md border p-4">
          <Skeleton width="7rem" height="1rem" />
          <Skeleton className="mt-4" width="9rem" height="1.9rem" />
          <Skeleton className="mt-3" width="72%" height="0.85rem" />
        </div>
      ))}
    </div>
  );
}

function SummaryPanel({
  icon,
  label,
  value,
  children,
  tone = "accent",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  children: React.ReactNode;
  tone?: "accent" | "green" | "orange";
}) {
  const toneClass = {
    accent: "text-[var(--accent-11)]",
    green: "text-[var(--green-11)]",
    orange: "text-[var(--orange-11)]",
  }[tone];
  return (
    <section className="min-h-[126px] rounded-md border bg-[var(--gray-a2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={`flex size-7 items-center justify-center ${toneClass}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function PanelHeader({
  title,
  description,
  trailing,
}: {
  title: string;
  description: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {trailing}
    </div>
  );
}

function DatabaseStatusLine({ status }: { status: DashboardDatabaseStatus }) {
  const { t } = useTranslation();
  if (!status.error) return null;
  return (
    <Callout.Root color="red" size="1" className="mt-3">
      <Callout.Icon>
        <AlertCircle size={15} />
      </Callout.Icon>
      <Callout.Text>
        {t("admin_dashboard.database_read_failed")}: {status.error}
      </Callout.Text>
    </Callout.Root>
  );
}

function relativeTime(value: string | null, locale: string, fallback: string): string {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return fallback;
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function ServerStatusPanel({ data, locale }: { data: DashboardData; locale: string }) {
  const { t } = useTranslation();
  const percent = dashboardOnlinePercent(data);
  const visibleOffline = data.servers.offline_nodes.slice(0, 3);
  const remaining = Math.max(0, data.servers.offline - visibleOffline.length);

  return (
    <section className="h-full rounded-md border bg-[var(--accent-1)] p-4">
      <PanelHeader
        title={t("admin_dashboard.server_status")}
        description={t("admin_dashboard.server_status_hint")}
        trailing={<ServerOff size={18} className="mt-0.5 text-muted-foreground" />}
      />
      <div className={visibleOffline.length === 0
        ? "flex min-h-[180px] flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10"
        : "grid min-h-[220px] grid-cols-1 items-center gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]"}
      >
        <div className="flex justify-center">
          <div
            className="relative size-32 rounded-full"
            style={{
              background: `conic-gradient(var(--accent-9) 0 ${percent}%, var(--gray-a5) ${percent}% 100%)`,
            }}
          >
            <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-[var(--accent-1)]">
              <span className="text-2xl font-bold tabular-nums">{percent}%</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{t("admin_dashboard.online")}</span>
            </div>
          </div>
        </div>
        {visibleOffline.length === 0 ? (
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 text-base font-medium text-[var(--green-11)] sm:justify-start">
              <CircleCheck size={20} />
              <span>{t("admin_dashboard.all_online")}</span>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {t("admin_dashboard.online_count", { count: data.servers.online })}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t("admin_dashboard.offline_count", { count: data.servers.offline })}
            </div>
          </div>
        ) : (
          <div className="min-w-0 divide-y">
            {visibleOffline.map((node) => (
              <div key={node.uuid} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full bg-[var(--orange-9)]" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{node.name || node.uuid}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {node.region || t("admin_dashboard.region_unknown")}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(node.last_seen, locale, t("admin_dashboard.no_last_seen"))}
                </span>
              </div>
            ))}
            {remaining > 0 ? (
              <div className="pt-2.5 text-sm text-muted-foreground">
                {t("admin_dashboard.offline_more", { count: remaining })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function StoragePanel({ data, locale }: { data: DashboardData; locale: string }) {
  const { t } = useTranslation();
  const storageTotal = data.storage.database_files + data.storage.wal + data.storage.shm;
  const storageParts = [
    {
      label: t("admin_dashboard.database_files"),
      value: data.storage.database_files,
      barClass: "bg-[var(--accent-9)]",
      labelClass: "font-medium text-foreground",
    },
    {
      label: "WAL",
      value: data.storage.wal,
      barClass: "bg-[var(--orange-9)]",
      labelClass: "text-muted-foreground",
    },
    {
      label: "SHM",
      value: data.storage.shm,
      barClass: "bg-[var(--gray-9)]",
      labelClass: "text-muted-foreground",
    },
  ];

  return (
    <section className="h-full rounded-md border bg-[var(--accent-1)] p-4">
      <PanelHeader
        title={t("admin_dashboard.database_usage")}
        description={t("admin_dashboard.database_composition")}
        trailing={<Database size={18} className="mt-0.5 text-muted-foreground" />}
      />
      <div className="space-y-3 text-sm">
        <div className="space-y-3">
          {storageParts.map((part) => {
            const share = storageTotal > 0 ? (part.value / storageTotal) * 100 : 0;
            return (
              <div
                key={part.label}
                className="grid grid-cols-[minmax(5.5rem,auto)_minmax(3rem,1fr)_6.5rem] items-center gap-3"
              >
                <span className={part.labelClass}>{part.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--gray-a4)]">
                  <div
                    className={`h-full rounded-full ${part.barClass}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
                <span className="text-right tabular-nums text-muted-foreground">
                  {formatBytes(part.value)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="border-t pt-3">
          <div className="flex items-center justify-between gap-3">
            <span>{t("admin_dashboard.retention_period")}</span>
            <span className="tabular-nums">
              {data.storage.retention_days > 0
                ? t("admin_dashboard.days", { count: data.storage.retention_days })
                : t("admin_dashboard.not_available")}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span>{t("admin_dashboard.last_compaction")}</span>
            <span className="tabular-nums text-muted-foreground">
              {relativeTime(data.storage.last_compacted_at, locale, t("admin_dashboard.not_available"))}
            </span>
          </div>
        </div>
      </div>
      <DatabaseStatusLine status={data.database.main} />
      <DatabaseStatusLine status={data.database.monitoring} />
    </section>
  );
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [data, setData] = React.useState<DashboardData | null>(dashboardSnapshot);
  const [loading, setLoading] = React.useState(!dashboardSnapshot);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (silent = false) => {
    if (!silent && !dashboardSnapshot) setLoading(true);
    try {
      const next = await requestDashboard();
      setData(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(Boolean(dashboardSnapshot));
    const interval = window.setInterval(() => void load(true), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const locale = i18n.resolvedLanguage || i18n.language || "zh-CN";
  const dailyChartData = React.useMemo(
    () =>
      (data?.traffic.daily ?? []).map((item) => ({
        ...item,
        label: shortDashboardDay(item.day, locale),
      })),
    [data?.traffic.daily, locale],
  );

  return (
    <div className="flex flex-col gap-3 p-0 md:p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div>
          <AdminPageTitle>{t("admin_dashboard.title")}</AdminPageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin_dashboard.subtitle")}</p>
        </div>
        {data?.generated_at ? (
          <Button style={{ marginRight: 0 }} variant="ghost" color="gray" size="1" onClick={() => void load(false)}>
            <RefreshCw size={14} />
            {t("admin_dashboard.updated_at", {
              time: new Intl.DateTimeFormat(locale, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }).format(new Date(data.generated_at)),
            })}
          </Button>
        ) : null}
      </div>

      {error ? (
        <Callout.Root color="red" role="alert">
          <Callout.Icon>
            <AlertCircle size={16} />
          </Callout.Icon>
          <Callout.Text className="flex flex-wrap items-center gap-2">
            <span>{t("admin_dashboard.load_failed")}: {error}</span>
            <Button size="1" variant="soft" onClick={() => void load(false)}>
              <RefreshCw size={14} />
              {t("common.retry")}
            </Button>
          </Callout.Text>
        </Callout.Root>
      ) : null}

      {loading && !data ? <OverviewSkeleton /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SummaryPanel
              icon={<Server size={18} />}
              label={t("admin_dashboard.servers")}
              value={`${data.servers.online} / ${data.servers.total}`}
              tone={data.servers.offline > 0 ? "orange" : "green"}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{t("admin_dashboard.online_count", { count: data.servers.online })}</span>
                <span className={data.servers.offline > 0 ? "text-[var(--orange-11)]" : "text-[var(--green-11)]"}>
                  {t("admin_dashboard.offline_count", { count: data.servers.offline })}
                </span>
              </div>
            </SummaryPanel>

            <SummaryPanel
              icon={<WalletCards size={18} />}
              label={t("admin_dashboard.today_billable")}
              value={formatBytes(data.traffic.today_billable)}
            >
              <div className="grid grid-cols-2 gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <ArrowUpFromLine size={14} className="shrink-0 text-[var(--accent-11)]" />
                  <span className="truncate">{t("admin_dashboard.upload")} {formatBytes(data.traffic.today_up)}</span>
                </span>
                <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
                  <ArrowDownToLine size={14} className="shrink-0 text-[var(--orange-11)]" />
                  <span className="truncate">{t("admin_dashboard.download")} {formatBytes(data.traffic.today_down)}</span>
                </span>
              </div>
            </SummaryPanel>

            <SummaryPanel
              icon={<Database size={18} />}
              label={t("admin_dashboard.database_usage")}
              value={dashboardLocalStorageTotal(data) === null ? t("admin_dashboard.external_storage") : formatBytes(dashboardLocalStorageTotal(data) ?? 0)}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{t("admin_dashboard.database_files")} {formatBytes(data.storage.database_files)}</span>
                <span>WAL + SHM {formatBytes(dashboardRuntimeStorageTotal(data))}</span>
              </div>
            </SummaryPanel>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
            <section className="min-w-0 rounded-md border bg-[var(--accent-1)] p-4">
              <PanelHeader
                title={t("admin_dashboard.today_traffic")}
                description={t("admin_dashboard.hourly_traffic_hint")}
                trailing={(
                  <div className="mt-0.5 flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[var(--accent-9)]" />{t("admin_dashboard.upload")}</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[var(--orange-9)]" />{t("admin_dashboard.download")}</span>
                  </div>
                )}
              />
              <ChartContainer
                config={{
                  up: { label: t("admin_dashboard.upload"), color: "var(--accent-9)" },
                  down: { label: t("admin_dashboard.download"), color: "var(--orange-9)" },
                }}
                className="h-[220px] w-full aspect-auto"
              >
                <LineChart data={data.traffic.hourly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={(value) => formatBytes(Number(value)).replace(" ", "")} />
                  <Tooltip
                    content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-lg">
                        <div className="mb-1.5 text-muted-foreground">{label}</div>
                        <div className="font-medium text-[var(--accent-11)]">{t("admin_dashboard.upload")}: {formatBytes(Number(payload[0]?.value ?? 0))}</div>
                        <div className="mt-1 font-medium text-[var(--orange-11)]">{t("admin_dashboard.download")}: {formatBytes(Number(payload[1]?.value ?? 0))}</div>
                      </div>
                    ) : null}
                  />
                  <Line type="monotone" dataKey="up" stroke="var(--color-up)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                  <Line type="monotone" dataKey="down" stroke="var(--color-down)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            </section>

            <ServerStatusPanel data={data} locale={locale} />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
            <section className="min-w-0 rounded-md border bg-[var(--accent-1)] p-4">
              <PanelHeader
                title={t("admin_dashboard.daily_billable")}
                description={t("admin_dashboard.daily_billable_hint")}
                trailing={<span className="rounded-full bg-[var(--accent-a3)] px-2.5 py-1 text-xs font-medium text-[var(--accent-11)]">{t("admin_dashboard.recent_month")}</span>}
              />
              {!data.traffic.history_ready ? (
                <p className="mb-2 text-xs text-muted-foreground">{t("admin_dashboard.history_preparing")}</p>
              ) : null}
              <ChartContainer config={{ billable: { label: t("admin_dashboard.billable"), color: "var(--accent-9)" } }} className="h-[220px] w-full aspect-auto">
                <BarChart data={dailyChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={(value) => formatBytes(Number(value)).replace(" ", "")} />
                  <Tooltip
                    cursor={{ fill: "var(--accent-a3)" }}
                    content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-lg">
                        <div className="mb-1 text-muted-foreground">{label}</div>
                        <div className="font-medium">{t("admin_dashboard.billable")}: {formatBytes(Number(payload[0]?.value ?? 0))}</div>
                      </div>
                    ) : null}
                  />
                  <Bar dataKey="billable" fill="var(--color-billable)" radius={[2, 2, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ChartContainer>
            </section>

            <StoragePanel data={data} locale={locale} />
          </div>
        </>
      ) : null}
    </div>
  );
}
