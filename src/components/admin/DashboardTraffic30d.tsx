import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AdminListFiltersBar,
  AdminListSearch,
  AdminListShell,
} from "@/components/admin/AdminListShell";
import { AdminMobileCardStack, AdminMobileListCard } from "@/components/admin/AdminMobileListCard";
import {
  AdminPagination,
  useAdminPagination,
} from "@/components/admin/AdminPagination";
import { ArrowDown, ArrowUp, ArrowUpDown } from "@/components/admin/muiIcons";
import { AppDialogContent, Button, Dialog, Skeleton } from "@/components/admin/ui";
import { ChartContainer } from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  filterAndSortTrafficDayItems,
  type DashboardChartsData,
  type DashboardTrafficDaySortDir,
  type DashboardTrafficDaySortKey,
  type DashboardTrafficRankItem,
} from "@/utils/dashboard";
import {
  getCachedDashboardTrafficDay,
  prefetchDashboardTrafficDay,
  requestDashboardTrafficDay,
} from "@/utils/dashboardApi";
import { formatBytes } from "@/utils/unitHelper";

type DailyChartPoint = DashboardChartsData["traffic"]["daily"][number] & { label: string };

export function BillingTrendPanel({
  charts,
  error,
  data,
  axisWidth,
}: {
  charts: DashboardChartsData | null;
  error: string | null;
  data: DailyChartPoint[];
  axisWidth: number;
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortKey, setSortKey] = React.useState<DashboardTrafficDaySortKey>("billable");
  const [sortDir, setSortDir] = React.useState<DashboardTrafficDaySortDir>("desc");
  const [dayItems, setDayItems] = React.useState<DashboardTrafficRankItem[] | null>(null);
  const [dayLoading, setDayLoading] = React.useState(false);
  const [dayError, setDayError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const selectedPoint = data.find((item) => item.day === selectedDay) ?? null;
  const chartUnavailable = Boolean(error || charts?.traffic.error);
  const hoverPrefetchTimer = React.useRef(0);

  React.useEffect(() => {
    return () => window.clearTimeout(hoverPrefetchTimer.current);
  }, []);

  const scheduleHoverPrefetch = (day: string) => {
    if (!day) return;
    window.clearTimeout(hoverPrefetchTimer.current);
    hoverPrefetchTimer.current = window.setTimeout(() => {
      prefetchDashboardTrafficDay(day);
    }, 80);
  };

  const openDay = (day: string) => {
    const cached = getCachedDashboardTrafficDay(day);
    setSelectedDay(day);
    setDayError(null);
    if (cached) {
      setDayItems(cached.items);
      setDayLoading(false);
      return;
    }
    setDayItems(null);
    setDayLoading(true);
  };

  React.useEffect(() => {
    if (!selectedDay) {
      setDayError(null);
      setDayLoading(false);
      return;
    }
    const cached = getCachedDashboardTrafficDay(selectedDay);
    if (cached) {
      setDayItems(cached.items);
      setDayError(null);
      setDayLoading(false);
      return;
    }
    let cancelled = false;
    setDayLoading(true);
    setDayError(null);
    void requestDashboardTrafficDay(selectedDay)
      .then((response) => {
        if (cancelled) return;
        setDayItems(response.items);
      })
      .catch((reason) => {
        if (cancelled) return;
        setDayItems(null);
        setDayError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setDayLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, selectedDay]);

  React.useEffect(() => {
    setSearchTerm("");
    setSortKey("billable");
    setSortDir("desc");
  }, [selectedDay]);

  const filteredItems = React.useMemo(
    () => filterAndSortTrafficDayItems(dayItems ?? [], searchTerm, sortKey, sortDir),
    [dayItems, searchTerm, sortDir, sortKey],
  );
  const { page, setPage, pageItems, pageSize, setPageSize } = useAdminPagination(filteredItems);

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, sortDir, sortKey, selectedDay, setPage]);

  const toggleSort = (key: DashboardTrafficDaySortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  };

  const sortIcon = (key: DashboardTrafficDaySortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={14} className="text-muted-foreground opacity-60" />;
    return sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <section className="@container flex h-full min-w-0 flex-col km-admin-surface p-3">
      <div className="mb-3 flex items-start justify-between gap-3 @max-[28rem]:flex-col @max-[28rem]:gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{t("admin_dashboard.daily_billable")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("admin_dashboard.daily_billable_hint")}</p>
        </div>
        <span className="km-dashboard-chip km-dashboard-chip--accent @max-[28rem]:ml-auto">
          {t("admin_dashboard.recent_month")}
        </span>
      </div>
      {charts && !charts.traffic.error && !charts.traffic.history_ready ? (
        <p className="mb-2 text-xs text-muted-foreground">{t("admin_dashboard.history_preparing")}</p>
      ) : null}
      {chartUnavailable ? (
        <div className="flex min-h-[220px] flex-1 items-center justify-center text-sm text-[var(--red-11)]">
          {t("admin_dashboard.data_unavailable")}
        </div>
      ) : charts ? (
        <ChartContainer
          config={{ billable: { label: t("admin_dashboard.billable"), color: "var(--accent-9)" } }}
          className="min-h-[220px] w-full flex-1 aspect-auto"
        >
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              const day = (state?.activePayload?.[0]?.payload as DailyChartPoint | undefined)?.day;
              if (day) scheduleHoverPrefetch(day);
            }}
            onClick={(state) => {
              const day = (state?.activePayload?.[0]?.payload as DailyChartPoint | undefined)?.day;
              if (day) openDay(day);
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={axisWidth} tickFormatter={(value) => formatBytes(Number(value)).replace(" ", "")} />
            <Tooltip
              cursor={{ fill: "var(--accent-a3)" }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                  <div className="mb-1 text-muted-foreground">{label}</div>
                  <div className="font-medium">{t("admin_dashboard.billable")}: {formatBytes(Number(payload[0]?.value ?? 0))}</div>
                  <div className="mt-1 text-muted-foreground">{t("admin_dashboard.click_bar_hint")}</div>
                </div>
              ) : null}
            />
            <Bar dataKey="billable" radius={[2, 2, 0, 0]} maxBarSize={24} isAnimationActive={false} cursor="pointer">
              {data.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={entry.day === selectedDay ? "var(--accent-9)" : "var(--color-billable)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : <Skeleton className="min-h-[220px] w-full flex-1" />}

      <Dialog.Root
        open={Boolean(selectedDay)}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
      >
        <AppDialogContent maxWidth="960px" className="flex max-h-[88vh] flex-col overflow-hidden">
          <Dialog.Title className="km-traffic-day-dialog-title">
            <span className="flex w-full min-w-0 flex-col items-start gap-2.5 pr-1">
              <span className="truncate">
                {t("admin_dashboard.day_server_traffic", { day: selectedPoint?.label || selectedDay || "" })}
              </span>
              {selectedPoint ? (
                <span className="km-dashboard-chip km-dashboard-chip--accent">
                  {t("admin_dashboard.billable")} {formatBytes(selectedPoint.billable)}
                </span>
              ) : null}
            </span>
          </Dialog.Title>
          <Dialog.Description className="sr-only !m-0 !h-0 !overflow-hidden">
            {selectedPoint
              ? `${t("admin_dashboard.billable")} ${formatBytes(selectedPoint.billable)}`
              : t("admin_dashboard.click_bar_hint")}
          </Dialog.Description>
          <AdminListShell className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden">
            <AdminListFiltersBar>
              <Stack spacing={1.25} sx={{ width: 1 }}>
                <Box sx={{ width: 1, "& .MuiTextField-root": { width: 1, minWidth: "0 !important" } }}>
                  <AdminListSearch
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={t("admin_dashboard.search_server_name")}
                  />
                </Box>
                {isMobile ? (
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {([
                      ["name", t("admin.nodeTable.name")],
                      ["up", t("admin_dashboard.upload")],
                      ["down", t("admin_dashboard.download")],
                      ["billable", t("admin_dashboard.billable")],
                    ] as const).map(([key, label]) => (
                      <Button
                        key={key}
                        type="button"
                        size="1"
                        variant={sortKey === key ? "solid" : "soft"}
                        color="gray"
                        title={t("common.sort")}
                        onClick={() => toggleSort(key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortIcon(key)}
                        </span>
                      </Button>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </AdminListFiltersBar>
            {dayLoading && !dayItems ? (
              <div className="km-admin-list-empty min-h-[min(56vh,32rem)]">
                <Skeleton className="h-[min(56vh,32rem)] w-full" />
              </div>
            ) : dayError ? (
              <div className="km-admin-list-empty flex flex-col items-center justify-center gap-3 text-[var(--red-11)]">
                <span>{t("admin_dashboard.data_unavailable")}</span>
                <Button variant="soft" color="gray" onClick={() => setReloadKey((value) => value + 1)}>
                  {t("common.retry")}
                </Button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="km-admin-list-empty">
                {searchTerm.trim()
                  ? t("admin_dashboard.no_matching_servers")
                  : t("admin_dashboard.no_day_traffic")}
              </div>
            ) : (
              <>
                {isMobile ? (
                  <div className="max-h-[min(56vh,32rem)] min-h-0 flex-1 overflow-y-auto">
                    <AdminMobileCardStack>
                      {pageItems.map((item) => (
                        <AdminMobileListCard
                          key={item.uuid}
                          title={
                            item.detail_url ? (
                              <Link to={item.detail_url} className="text-inherit hover:underline">
                                {item.name}
                              </Link>
                            ) : item.name
                          }
                          headerExtra={
                            <Box sx={{ textAlign: "right" }}>
                              <Typography color="text.secondary" sx={{ fontSize: 11.5, lineHeight: 1.25 }}>
                                {t("admin_dashboard.billable")}
                              </Typography>
                              <Typography sx={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                {formatBytes(item.billable)}
                              </Typography>
                            </Box>
                          }
                          cells={[
                            [t("admin_dashboard.upload"), formatBytes(item.up)],
                            [t("admin_dashboard.download"), formatBytes(item.down)],
                          ]}
                        />
                      ))}
                    </AdminMobileCardStack>
                  </div>
                ) : (
                <div className="admin-responsive-table-wrap max-h-[min(56vh,32rem)] min-h-0 flex-1 overflow-y-auto">
                  <Table container={false} className="admin-responsive-table km-traffic-day-table w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[34%]" aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                          <button type="button" className="inline-flex items-center gap-1" title={t("common.sort")} onClick={() => toggleSort("name")}>
                            {t("admin.nodeTable.name")}
                            {sortIcon("name")}
                          </button>
                        </TableHead>
                        <TableHead className="w-[22%] text-center" aria-sort={sortKey === "up" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                          <button type="button" className="mx-auto inline-flex items-center justify-center gap-1" title={t("common.sort")} onClick={() => toggleSort("up")}>
                            {t("admin_dashboard.upload")}
                            {sortIcon("up")}
                          </button>
                        </TableHead>
                        <TableHead className="w-[22%] text-center" aria-sort={sortKey === "down" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                          <button type="button" className="mx-auto inline-flex items-center justify-center gap-1" title={t("common.sort")} onClick={() => toggleSort("down")}>
                            {t("admin_dashboard.download")}
                            {sortIcon("down")}
                          </button>
                        </TableHead>
                        <TableHead className="w-[22%] text-center" aria-sort={sortKey === "billable" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                          <button type="button" className="mx-auto inline-flex items-center justify-center gap-1" title={t("common.sort")} onClick={() => toggleSort("billable")}>
                            {t("admin_dashboard.billable")}
                            {sortIcon("billable")}
                          </button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((item) => (
                        <TableRow key={item.uuid}>
                          <TableCell data-label={t("admin.nodeTable.name")} className="max-w-0 truncate font-medium">
                            {item.detail_url ? (
                              <Link to={item.detail_url} className="text-inherit hover:underline">
                                {item.name}
                              </Link>
                            ) : item.name}
                          </TableCell>
                          <TableCell data-label={t("admin_dashboard.upload")} className="text-center tabular-nums">
                            {formatBytes(item.up)}
                          </TableCell>
                          <TableCell data-label={t("admin_dashboard.download")} className="text-center tabular-nums">
                            {formatBytes(item.down)}
                          </TableCell>
                          <TableCell data-label={t("admin_dashboard.billable")} className="text-center tabular-nums font-medium">
                            {formatBytes(item.billable)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
                <AdminPagination
                  page={page}
                  total={filteredItems.length}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  showSummary={false}
                />
              </>
            )}
          </AdminListShell>
        </AppDialogContent>
      </Dialog.Root>
    </section>
  );
}
