import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Skeleton } from "@/components/admin/ui";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import DnsOutlined from "@mui/icons-material/DnsOutlined";
import ErrorOutlined from "@mui/icons-material/ErrorOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import Refresh from "@mui/icons-material/Refresh";
import StorageOutlined from "@mui/icons-material/StorageOutlined";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAccount } from "@/contexts/AccountContext";
import {
  AlertOverviewPanel,
  BillingTrendPanel,
  DailyTrafficRankingPanel,
  getDashboardChartsSnapshot,
  getDashboardSnapshot,
  LatencyPanel,
  LatencyJitterRankingPanel,
  LatencyRankingPanel,
  OverviewSkeleton,
  PacketLossRankingPanel,
  requestDashboard,
  requestDashboardCharts,
  ResourceRankingPanel,
  ReturnRouteStatusPanel,
  StoragePanel,
  SummaryCardSkeleton,
  SummaryPanel,
  TrafficTrendPanel,
} from "@/components/admin/DashboardPanels";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import {
  dashboardLocalStorageTotal,
  dashboardRuntimeStorageTotal,
  dashboardTrafficAxisWidth,
  shortDashboardDay,
  type DashboardChartsData,
  type DashboardData,
} from "@/utils/dashboard";
import {
  dashboardChartSections,
  dashboardCostCenterEnabled,
  dashboardModuleSpans,
  dashboardSummarySections,
  DASHBOARD_SUMMARY_CARD_IDS,
  enabledDashboardModules,
  packDashboardModules,
  type DashboardModuleId,
} from "@/utils/dashboardSettings";
import {
  billingQuery,
  formatBillingMoney,
  getBillingSnapshot,
  readStoredBillingCurrency,
  requestBillingCached,
  type BillingOverview,
} from "@/utils/billing";
import { formatBytes } from "@/utils/unitHelper";
import {
  readDashboardSession,
  writeDashboardSession,
  type DashboardViewState,
} from "@/utils/dashboardSession";

const moduleGridClass: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { account } = useAccount();
  const accountKey = account?.uuid || account?.username || "authenticated";
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useDashboardSettings(accountKey);

  const summarySections = React.useMemo(() => dashboardSummarySections(settings), [settings]);
  const chartSections = React.useMemo(() => dashboardChartSections(settings), [settings]);
  const summaryKey = `${summarySections.join(",")}:${settings.ranking_limit}`;
  const chartKey = `${chartSections.join(",")}:${settings.ranking_limit}`;
  const visibleModules = React.useMemo(() => enabledDashboardModules(settings), [settings]);
  const moduleSpans = React.useMemo(() => dashboardModuleSpans(settings), [settings]);
  const packedModules = React.useMemo(
    () => packDashboardModules(visibleModules, moduleSpans, settings.preset !== "custom"),
    [moduleSpans, settings.preset, visibleModules],
  );
  const viewKey = React.useMemo(
    () => settings.preset === "overview"
      ? "overview"
      : `${settings.preset}:${packedModules.map(({ id, span }) => `${id}:${span}`).join(",")}`,
    [packedModules, settings.preset],
  );
  const dashboardRootRef = React.useRef<HTMLDivElement>(null);
  const navigationAnchorRef = React.useRef<Omit<DashboardViewState, "scrollTop"> | null>(null);
  const restoredViewKeyRef = React.useRef<string | null>(null);
  const billingCurrency = readStoredBillingCurrency();
  const billingURL = billingQuery("/api/admin/billing/overview", { currency: billingCurrency, revision: 0 });

  const [data, setData] = React.useState<DashboardData | null>(() => getDashboardSnapshot(summaryKey, accountKey));
  const [charts, setCharts] = React.useState<DashboardChartsData | null>(() => getDashboardChartsSnapshot(chartKey, accountKey));
  const [billing, setBilling] = React.useState<BillingOverview | null>(
    () => getBillingSnapshot<BillingOverview>(billingURL),
  );
  const [loading, setLoading] = React.useState(() => getDashboardSnapshot(summaryKey, accountKey) === null);
  const [error, setError] = React.useState<string | null>(null);
  const [chartsError, setChartsError] = React.useState<string | null>(null);

  const loadSummary = React.useCallback(async (silent = false) => {
    if (summarySections.length === 0) {
      setData(null);
      if (!silent) setLoading(false);
      return;
    }
    if (!silent && !getDashboardSnapshot(summaryKey, accountKey)) setLoading(true);
    try {
      const next = await requestDashboard(summarySections, settings.ranking_limit, accountKey);
      setData(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accountKey, settings.ranking_limit, summaryKey, summarySections]);

  const costCenterVisible = dashboardCostCenterEnabled(settings);

  const loadBilling = React.useCallback(async () => {
    if (!costCenterVisible) {
      setBilling(null);
      return;
    }
    try {
      const next = await requestBillingCached<BillingOverview>(billingURL);
      setBilling(next);
    } catch {
      // Keep the last successful snapshot so a transient FX error does not blank the card.
    }
  }, [billingURL, costCenterVisible]);

  const loadCharts = React.useCallback(async () => {
    if (chartSections.length === 0) {
      setCharts(null);
      setChartsError(null);
      return;
    }
    try {
      const next = await requestDashboardCharts(chartSections, settings.ranking_limit, accountKey);
      setCharts(next);
      setChartsError(null);
    } catch (reason) {
      setChartsError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [accountKey, chartSections, settings.ranking_limit]);

  const refreshAll = React.useCallback(() => {
    void loadSummary(false);
    void loadCharts();
    void loadBilling();
  }, [loadBilling, loadCharts, loadSummary]);

  React.useEffect(() => {
    const cachedSummary = getDashboardSnapshot(summaryKey, accountKey);
    const cachedCharts = getDashboardChartsSnapshot(chartKey, accountKey);
    setData(cachedSummary);
    setCharts(cachedCharts);
    setLoading(!cachedSummary);
    void loadSummary(Boolean(cachedSummary));
    void loadCharts();
    if (costCenterVisible) {
      const snapshot = getBillingSnapshot<BillingOverview>(billingURL);
      if (snapshot) setBilling(snapshot);
      void loadBilling();
    } else {
      setBilling(null);
    }

    const refreshWhenVisible = (callback: () => void) => {
      if (document.visibilityState === "visible") callback();
    };
    const summaryInterval = summarySections.length > 0
      ? window.setInterval(
        () => refreshWhenVisible(() => void loadSummary(true)),
        settings.refresh_seconds * 1000,
      )
      : null;
    const chartInterval = chartSections.length > 0
      ? window.setInterval(
        () => refreshWhenVisible(() => void loadCharts()),
        settings.chart_refresh_seconds * 1000,
      )
      : null;
    const billingInterval = costCenterVisible
      ? window.setInterval(
        () => refreshWhenVisible(() => void loadBilling()),
        settings.refresh_seconds * 1000,
      )
      : null;
    return () => {
      if (summaryInterval !== null) window.clearInterval(summaryInterval);
      if (chartInterval !== null) window.clearInterval(chartInterval);
      if (billingInterval !== null) window.clearInterval(billingInterval);
    };
  }, [
    billingURL,
    chartKey,
    chartSections.length,
    costCenterVisible,
    loadBilling,
    loadCharts,
    loadSummary,
    settings.chart_refresh_seconds,
    settings.refresh_seconds,
    accountKey,
    summaryKey,
    summarySections.length,
  ]);

  const saveDashboardView = React.useCallback((anchor = navigationAnchorRef.current) => {
    const root = dashboardRootRef.current;
    const container = root?.closest<HTMLElement>("[data-admin-scroll-container]");
    if (!container) return;
    writeDashboardSession<DashboardViewState>("view", accountKey, viewKey, {
      scrollTop: container.scrollTop,
      ...(anchor ?? {}),
    });
  }, [accountKey, viewKey]);

  const rememberClickedModule = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest("a[href]")) return;
    const moduleElement = target.closest<HTMLElement>("[data-dashboard-module]");
    const container = dashboardRootRef.current?.closest<HTMLElement>("[data-admin-scroll-container]");
    if (!moduleElement || !container) return;
    const anchor = {
      moduleId: moduleElement.dataset.dashboardModule,
      moduleOffset: moduleElement.getBoundingClientRect().top - container.getBoundingClientRect().top,
    };
    navigationAnchorRef.current = anchor;
    saveDashboardView(anchor);
  }, [saveDashboardView]);

  React.useLayoutEffect(() => {
    if (settingsLoading || restoredViewKeyRef.current === viewKey) return;
    restoredViewKeyRef.current = viewKey;
    const snapshot = readDashboardSession<DashboardViewState>("view", accountKey, viewKey);
    const root = dashboardRootRef.current;
    const container = root?.closest<HTMLElement>("[data-admin-scroll-container]");
    if (!snapshot || !root || !container) return;

    let animationFrame = 0;
    let frameCount = 0;
    let stableFrames = 0;
    let previousHeight = -1;
    const restore = () => {
      frameCount++;
      const moduleElement = snapshot.moduleId
        ? root.querySelector<HTMLElement>(`[data-dashboard-module="${snapshot.moduleId}"]`)
        : null;
      if (moduleElement && Number.isFinite(snapshot.moduleOffset)) {
        const currentOffset = moduleElement.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTop = Math.max(0, container.scrollTop + currentOffset - (snapshot.moduleOffset ?? 0));
      } else {
        container.scrollTop = Math.max(0, snapshot.scrollTop);
      }

      if (container.scrollHeight === previousHeight) stableFrames++;
      else stableFrames = 0;
      previousHeight = container.scrollHeight;
      if (stableFrames < 2 && frameCount < 12) {
        animationFrame = window.requestAnimationFrame(restore);
      }
    };
    animationFrame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [accountKey, settingsLoading, viewKey]);

  React.useEffect(() => {
    const saveBeforePageHide = () => saveDashboardView();
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveDashboardView();
    };
    window.addEventListener("pagehide", saveBeforePageHide);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      saveDashboardView();
      window.removeEventListener("pagehide", saveBeforePageHide);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [saveDashboardView]);

  const locale = i18n.resolvedLanguage || i18n.language || "zh-CN";
  const dailyChartData = React.useMemo(
    () => (charts?.traffic.daily ?? []).map((item) => ({
      ...item,
      label: shortDashboardDay(item.day, locale),
    })),
    [charts?.traffic.daily, locale],
  );
  const hourlyTrafficAxisWidth = React.useMemo(
    () => dashboardTrafficAxisWidth(
      (charts?.traffic.hourly ?? []).flatMap((item) => [item.up, item.down]),
    ),
    [charts?.traffic.hourly],
  );
  const dailyTrafficAxisWidth = React.useMemo(
    () => dashboardTrafficAxisWidth(
      (charts?.traffic.daily ?? []).map((item) => item.billable),
    ),
    [charts?.traffic.daily],
  );

  const renderModule = (module: DashboardModuleId): React.ReactNode => {
    switch (module) {
      case "server_status":
        return data ? (
          <Link to="/admin/servers" className="group block h-full min-w-0 text-inherit no-underline">
            <SummaryPanel
              icon={<DnsOutlined />}
              label={t("admin_dashboard.servers")}
              value={`${data.servers.online} / ${data.servers.total}`}
              tone={data.servers.offline > 0 ? "orange" : "green"}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{t("admin_dashboard.online_count", { count: data.servers.online })}</span>
                <Box
                  component="span"
                  sx={{ color: data.servers.offline > 0 ? "warning.main" : "success.main" }}
                >
                  {t("admin_dashboard.offline_count", { count: data.servers.offline })}
                </Box>
              </div>
            </SummaryPanel>
          </Link>
        ) : <SummaryCardSkeleton />;
      case "traffic_summary":
        return (
          <SummaryPanel
            icon={<CreditCardOutlined />}
            label={t("admin_dashboard.today_billable")}
            value={charts && !charts.traffic.error ? formatBytes(charts.traffic.today_billable) : "-"}
            tone="accent"
          >
            {charts && !charts.traffic.error ? (
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <ArrowUpward sx={{ fontSize: 14, color: "text.secondary" }} className="shrink-0" />
                  <span className="whitespace-nowrap">{t("admin_dashboard.upload")} {formatBytes(charts.traffic.today_up)}</span>
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <ArrowDownward sx={{ fontSize: 14, color: "text.secondary" }} className="shrink-0" />
                  <span className="whitespace-nowrap">{t("admin_dashboard.download")} {formatBytes(charts.traffic.today_down)}</span>
                </span>
              </div>
            ) : <span>{chartsError ? t("admin_dashboard.data_unavailable") : t("admin_dashboard.chart_loading")}</span>}
          </SummaryPanel>
        );
      case "storage_summary":
        return data ? (
          <Link to="/admin/settings/metrics" className="group block h-full min-w-0 text-inherit no-underline">
            <SummaryPanel
              icon={<StorageOutlined />}
              label={t("admin_dashboard.database_usage")}
              tone="muted"
              value={dashboardLocalStorageTotal(data) === null
                ? t("admin_dashboard.external_storage")
                : formatBytes(dashboardLocalStorageTotal(data) ?? 0)}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{t("admin_dashboard.database_files")} {formatBytes(data.storage.database_files)}</span>
                <span>WAL + SHM {formatBytes(dashboardRuntimeStorageTotal(data))}</span>
              </div>
            </SummaryPanel>
          </Link>
        ) : <SummaryCardSkeleton />;
      case "cost_center":
        return (
          <Link to="/admin/billing" className="group block h-full min-w-0 text-inherit no-underline">
            <SummaryPanel
              icon={<AccountBalanceWalletOutlined />}
              label={t("admin_dashboard.cost_center")}
              value={billing ? formatBillingMoney(billing.summary.month.total, billingCurrency) : "-"}
              tone="accent"
            >
              {billing ? (
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="whitespace-nowrap">{t("admin_dashboard.cost_year")} {formatBillingMoney(billing.summary.year.total, billingCurrency)}</span>
                  <span className="whitespace-nowrap">{t("billing.metrics.remainingValue")} {formatBillingMoney(billing.summary.remaining_value, billingCurrency)}</span>
                </div>
              ) : (
                <span>{t("admin_dashboard.chart_loading")}</span>
              )}
            </SummaryPanel>
          </Link>
        );
      case "resource_ranking":
        return data
          ? <ResourceRankingPanel data={data} limit={settings.ranking_limit} />
          : <Skeleton className="h-[260px] w-full" />;
      case "daily_traffic_ranking":
        return (
          <DailyTrafficRankingPanel
            charts={charts}
            error={chartsError}
            limit={settings.ranking_limit}
          />
        );
      case "latency_ranking":
        return (
          <LatencyRankingPanel
            charts={charts}
            error={chartsError}
            limit={settings.ranking_limit}
          />
        );
      case "latency_jitter_ranking":
        return (
          <LatencyJitterRankingPanel
            charts={charts}
            error={chartsError}
            limit={settings.ranking_limit}
          />
        );
      case "packet_loss_ranking":
        return (
          <PacketLossRankingPanel
            charts={charts}
            error={chartsError}
            limit={settings.ranking_limit}
          />
        );
      case "latency_trend":
        return (
          <LatencyPanel
            charts={charts}
            locale={locale}
            requestError={chartsError}
            warningCount={data?.alerts?.latency_loss?.error ? 0 : data?.alerts?.latency_loss?.current ?? 0}
          />
        );
      case "traffic_trend":
        return <TrafficTrendPanel charts={charts} error={chartsError} axisWidth={hourlyTrafficAxisWidth} />;
      case "billing_trend":
        return (
          <BillingTrendPanel
            charts={charts}
            error={chartsError}
            data={dailyChartData}
            axisWidth={dailyTrafficAxisWidth}
          />
        );
      case "return_route":
        return data
          ? <ReturnRouteStatusPanel data={data} locale={locale} />
          : <Skeleton className="h-[286px] w-full" />;
      case "alerts":
        return data
          ? <AlertOverviewPanel data={data} locale={locale} accountKey={accountKey} />
          : <Skeleton className="h-[210px] w-full" />;
      case "storage_detail":
        return data
          ? <StoragePanel data={data} locale={locale} />
          : <Skeleton className="h-[190px] w-full" />;
      default:
        return null;
    }
  };

  const generatedAt = data?.generated_at || charts?.generated_at;
  const initialDataPending = summarySections.length > 0 && loading && !data;
  const formalLayout = (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {DASHBOARD_SUMMARY_CARD_IDS.map((module) => (
          <div key={module} data-dashboard-module={module} className="min-w-0">{renderModule(module)}</div>
        ))}
      </div>
      <div data-dashboard-module="latency_trend" className="min-w-0">{renderModule("latency_trend")}</div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {(["traffic_trend", "billing_trend"] as const).map((module) => (
          <div key={module} data-dashboard-module={module} className="min-w-0 [&>*]:h-full">{renderModule(module)}</div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {(["return_route", "alerts"] as const).map((module) => (
          <div
            key={module}
            data-dashboard-module={module}
            data-dashboard-span="6"
            className="min-w-0 [&>*]:h-full"
          >
            {renderModule(module)}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div
      ref={dashboardRootRef}
      data-admin-route-pending={initialDataPending ? "true" : undefined}
      onClickCapture={rememberClickedModule}
      className="flex flex-col gap-4 p-0 md:p-4"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <AdminPageTitle description={t("admin_dashboard.subtitle")}>
          {t("admin_dashboard.title")}
        </AdminPageTitle>
        {generatedAt ? (
          <Button
            color="inherit"
            onClick={refreshAll}
            startIcon={<Refresh sx={{ fontSize: 16 }} />}
            sx={{ mr: 0, color: "text.secondary" }}
          >
            {t("admin_dashboard.updated_at", {
              time: new Intl.DateTimeFormat(locale, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }).format(new Date(generatedAt)),
            })}
          </Button>
        ) : null}
      </div>

      {settingsError || error ? (
        <Alert
          severity="error"
          icon={<ErrorOutlined sx={{ fontSize: 18 }} />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (settingsError) void refetchSettings(true);
                refreshAll();
              }}
              startIcon={<Refresh sx={{ fontSize: 16 }} />}
            >
              {t("common.retry")}
            </Button>
          }
        >
          {t("admin_dashboard.load_failed")}: {settingsError?.message || error}
        </Alert>
      ) : null}

      {loading && !data && chartSections.length === 0 ? (
        <OverviewSkeleton />
      ) : settings.preset === "overview" ? formalLayout : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {packedModules.map(({ id, span }) => (
            <div
              key={id}
              data-dashboard-module={id}
              data-dashboard-span={span}
              className={`min-w-0 [&>*]:h-full ${moduleGridClass[span]}`}
            >
              {renderModule(id)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
