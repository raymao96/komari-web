import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAdminTabParam } from "@/hooks/useAdminTabParam";
import { useHeldTab } from "@/hooks/useHeldTab";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AdminMultiSelect from "@/components/admin/AdminMultiSelect";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import Flag from "@/components/Flag";
import { useAdminDefaultPageSize } from "@/hooks/useAdminDefaultPageSize";
import {
  AdminListFiltersBar,
  AdminListSearch,
  AdminListSelect,
  AdminListShell,
} from "@/components/admin/AdminListShell";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSheetTabs, AdminTabLabel } from "@/components/admin/AdminSheetTabs";
import {
  ChartNoAxesCombined,
  CircleDollarSign,
  Clock,
  FilterOff,
  Globe,
  History,
  Server,
  WalletCards,
  X,
} from "@/components/admin/muiIcons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BILLING_CURRENCY_STORAGE_KEY,
  billingCurrencies,
  billingCurrencySymbol,
  billingNativeCurrencies,
  billingDate,
  billingDateTime,
  billingQuery,
  billingRequest,
  getBillingSnapshot,
  isLongTermExpiry,
  readStoredBillingCurrency,
  requestBillingCached,
  formatBillingMoney,
  type BillingCurrency,
  type BillingEntry,
  type BillingEntryPage,
  type BillingFXState,
  type BillingOverview,
  type BillingPeriod,
  type BillingPeriodPage,
  type BillingServer,
  type BillingServerPage,
} from "@/utils/billing";
import { getRegionCode, getRegionDisplayName } from "@/utils/regionHelper";

type BillingTab = "overview" | "monthly" | "yearly";
type BillingClientInfo = { uuid: string; name: string; region?: string; group?: string; tags?: string };

const BILLING_TABS = ["overview", "monthly", "yearly"] as const;

const ONE_TIME_FEE_COLOR = "#8250DF";

const panelSx = {
  overflow: "hidden",
  borderRadius: "8px",
  borderColor: "divider",
  bgcolor: "background.paper",
  boxShadow: "none",
};

function metricGridSx(columns: 4 | 5 | 6 = 4) {
  return {
    display: "grid",
    gridTemplateColumns: {
      xs: "repeat(2, minmax(0, 1fr))",
      md: columns >= 6 ? "repeat(3, minmax(0, 1fr))" : `repeat(${columns}, minmax(0, 1fr))`,
      lg: `repeat(${columns}, minmax(0, 1fr))`,
    },
    gap: { xs: 1.25, md: 1.75 },
  };
}

const nativeCurrencyOptions = billingNativeCurrencies.map((currency) => ({
  value: currency,
  label: billingCurrencySymbol(currency),
}));

function billingRegionOptions(clients: BillingClientInfo[], lang: "zh" | "en") {
  const map = new Map<string, { key: string; region: string; count: number }>();
  for (const client of clients) {
    const key = getRegionCode(client.region) || "UN";
    const current = map.get(key);
    if (current) {
      current.count += 1;
      continue;
    }
    map.set(key, { key, region: client.region || "", count: 1 });
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((option) => {
    const name = getRegionDisplayName(option.region, lang);
    return {
      value: option.key,
      label: name && name !== option.region ? `${name} (${option.key})` : option.key,
      icon: <Flag flag={option.region} compact />,
    };
  });
}

function billingGroupOptions(clients: BillingClientInfo[], t: TFunction) {
  const map = new Map<string, { key: string; label: string; count: number }>();
  for (const client of clients) {
    const name = client.group?.trim() || "";
    const key = name || "__none__";
    const current = map.get(key);
    if (current) {
      current.count += 1;
      continue;
    }
    map.set(key, { key, label: name || t("admin.nodeTable.ungrouped", "未分组"), count: 1 });
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === "__none__") return 1;
    if (b.key === "__none__") return -1;
    return a.label.localeCompare(b.label);
  }).map((option) => ({ value: option.key, label: option.label }));
}

function billingEntryTypeOptions(t: TFunction) {
  return [
    { value: "base_accrual", label: t("billing.types.base") },
    { value: "traffic_reset", label: t("billing.types.trafficReset") },
    { value: "ip_change", label: t("billing.types.ipChange") },
    { value: "adjustment", label: t("billing.types.oneTimeFee") },
  ];
}

function billingCycleLabel(t: TFunction, days: number) {
  if (days === -1) return t("billing.cycles.oneTime");
  if (days >= 27 && days <= 32) return t("billing.cycles.monthly");
  if (days >= 87 && days <= 95) return t("billing.cycles.quarterly");
  if (days >= 175 && days <= 185) return t("billing.cycles.semiannual");
  if (days >= 360 && days <= 370) return t("billing.cycles.annual");
  return t("billing.cycles.days", { count: days });
}

function billingTypeLabel(t: TFunction, type: string) {
  const key = {
    base_accrual: "base",
    traffic_reset: "trafficReset",
    ip_change: "ipChange",
    adjustment: "oneTimeFee",
    reversal: "reversal",
    voided: "voided",
  }[type];
  return key ? t(`billing.types.${key}`) : type;
}

function billingStatusLabel(t: TFunction, status: BillingPeriod["status"]) {
  if (status === "in_progress") return t("billing.status.inProgress");
  if (status === "projected") return t("billing.status.projected");
  if (status === "settled") return t("billing.status.settled");
  if (status === "no_record") return t("billing.status.noRecord");
  return "--";
}

function currentBeijingYear() {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date());
}

function currentBeijingDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function currentBeijingMonthNumber() {
  return currentBeijingDate().slice(5, 7);
}

function calendarMonthOptions(t: TFunction) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return { value: month, label: t("billing.common.monthOnly", { month }) };
  });
}

function yearMonthKeys(year: string): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}

function yearFromRange(from?: string, to?: string) {
  if (from && /^\d{4}/.test(from)) return from.slice(0, 4);
  if (to && /^\d{4}/.test(to)) return to.slice(0, 4);
  return currentBeijingYear();
}

function rangeForSelectedYear(year: string, from?: string, to?: string) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const fromYear = from?.slice(0, 4);
  const toYear = to?.slice(0, 4);
  if (from && fromYear === year && (!to || toYear === year)) {
    return {
      from: from > start ? from : start,
      to: to && to < end ? to : end,
    };
  }
  return { from: start, to: end };
}

function detailYearOptions(from?: string, to?: string) {
  const current = Number(currentBeijingYear());
  const years = new Set<string>([String(current)]);
  if (from && /^\d{4}/.test(from)) years.add(from.slice(0, 4));
  if (to && /^\d{4}/.test(to)) years.add(to.slice(0, 4));
  for (let year = current - 3; year <= current + 1; year += 1) years.add(String(year));
  return [...years].sort((left, right) => right.localeCompare(left));
}

function useBillingData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(() =>
    url ? getBillingSnapshot<T>(url) : null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => (url ? !getBillingSnapshot(url) : false));
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = getBillingSnapshot<T>(url);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
      setError("");
    }
    void requestBillingCached<T>(url)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError("");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, revision]);

  return { data, error, loading, retry };
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
  loading,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "orange";
  loading?: boolean;
}) {
  const colors = {
    blue: { bg: "rgba(14, 134, 221, 0.12)", fg: "#0E86DD" },
    green: { bg: "rgba(17, 141, 87, 0.12)", fg: "#118D57" },
    orange: { bg: "rgba(255, 171, 0, 0.15)", fg: "#B76E00" },
  }[tone];
  return (
    <Paper variant="outlined" sx={{ ...panelSx, minWidth: 0, minHeight: 124, p: { xs: 1.5, sm: 2 } }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography color="text.secondary" sx={{ minWidth: 0, fontSize: 13.5, fontWeight: 400 }}>
          {label}
        </Typography>
        <Box sx={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: colors.bg, color: colors.fg, flexShrink: 0 }}>
          {icon}
        </Box>
      </Stack>
      {loading ? <Skeleton width="72%" height={36} /> : (
        <Typography sx={{ mt: 1, overflow: "hidden", textOverflow: "ellipsis", fontSize: { xs: 19, sm: 23 }, lineHeight: 1.3, fontWeight: 400, whiteSpace: "nowrap" }}>
          {value}
        </Typography>
      )}
      <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 12, lineHeight: 1.35 }}>
        {helper}
      </Typography>
    </Paper>
  );
}

function ErrorPanel({ message, retry }: { message: string; retry: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert severity="error" action={<Button color="inherit" size="small" onClick={retry}>{t("billing.actions.retry")}</Button>}>
      {message}
    </Alert>
  );
}

function FxStatus({ state }: { state?: BillingFXState }) {
  const { t } = useTranslation();
  const status = state?.status || "unavailable";
  const label = t(`billing.fx.${status}`);
  const color = status === "latest" ? "success.main" : status === "cached" ? "warning.main" : status === "expired" ? "error.main" : "text.disabled";
  return (
    <Stack direction="row" sx={{ minHeight: 40, alignItems: "center", gap: 0.9, color: "text.secondary", whiteSpace: "nowrap" }}>
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color, boxShadow: (theme) => `0 0 0 3px ${theme.palette.action.hover}` }} />
      <Typography sx={{ fontSize: 12.5 }}>
        {label}{state?.fetched_at ? ` · ${billingDateTime(state.fetched_at)}` : ""}
      </Typography>
    </Stack>
  );
}

function BreakdownPanel({ overview, currency }: { overview: BillingOverview; currency: BillingCurrency }) {
  const { t } = useTranslation();
  const values = [
    { label: t("billing.types.base"), amount: overview.month_composition.base, percent: overview.month_composition.base_percent, color: "primary.main" },
    { label: t("billing.types.trafficReset"), amount: overview.month_composition.extra, percent: overview.month_composition.extra_percent, color: "warning.main" },
    { label: t("billing.types.ipChange"), amount: overview.month_composition.other || "0", percent: overview.month_composition.other_percent, color: "success.main" },
    { label: t("billing.types.oneTimeFee"), amount: overview.month_composition.one_time || "0", percent: overview.month_composition.one_time_percent, color: ONE_TIME_FEE_COLOR },
  ];
  return (
    <Paper variant="outlined" sx={{ ...panelSx, width: "100%" }}>
      <Box sx={{ minHeight: 44, px: 2, display: "flex", alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
        <Typography sx={{ fontWeight: 400 }}>{t("billing.breakdown.monthComposition")}</Typography>
      </Box>
      <Stack spacing={1.15} sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
          <Typography color="text.secondary" sx={{ fontSize: 13 }}>{t("billing.breakdown.ledgerTotal")}</Typography>
          <Typography sx={{ fontSize: 21, fontWeight: 400 }}>{formatBillingMoney(overview.month_composition.total, currency)}</Typography>
        </Stack>
        {values.map((item) => (
          <Box key={item.label}>
            <Stack direction="row" sx={{ mb: 0.75, justifyContent: "space-between", gap: 1 }}>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 400 }}>{formatBillingMoney(item.amount, currency)} · {item.percent || "0.00"}%</Typography>
            </Stack>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${Math.min(100, Math.max(0, Number(item.percent) || 0))}%`,
                  height: "100%",
                  borderRadius: 3,
                  bgcolor: item.color,
                }}
              />
            </Box>
          </Box>
        ))}
        <Typography color="text.secondary" sx={{ pt: 1.25, borderTop: 1, borderColor: "divider", fontSize: 12 }}>
          {t("billing.breakdown.ratesStored")} · {overview.fx.fetched_at ? billingDateTime(overview.fx.fetched_at) : t("billing.breakdown.noSnapshot")}
        </Typography>
      </Stack>
    </Paper>
  );
}

function TrendPanel({ overview, currency }: { overview: BillingOverview; currency: BillingCurrency }) {
  const { t } = useTranslation();
  const chartData = overview.monthly_trend.map((item) => ({
    period: item.period.slice(5),
    base: Number(item.base),
    extra: Number(item.extra),
    other: Number(item.other),
    one_time: Number(item.one_time),
  }));
  return (
    <Paper variant="outlined" sx={{ ...panelSx, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ minHeight: 44, px: 2, display: "flex", alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
        <Typography sx={{ fontWeight: 400 }}>{t("billing.trend.title")}</Typography>
      </Box>
      <Box sx={{ position: "relative", flex: 1, minHeight: { xs: 220 } }}>
        <Box sx={{ position: "absolute", inset: 0, p: "8px 8px 0 0" }}>
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={0} barCategoryGap="22%">
            <CartesianGrid stroke="rgba(145,158,171,.16)" vertical={false} />
            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#919EAB", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} width={48} tick={{ fill: "#919EAB", fontSize: 11 }} />
            <Tooltip formatter={(value) => formatBillingMoney(String(value ?? "0"), currency)} contentStyle={{ borderRadius: 8, borderColor: "rgba(145,158,171,.24)", fontSize: 12 }} />
            <Bar dataKey="base" name={t("billing.types.base")} fill="#0E86DD" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="extra" name={t("billing.types.trafficReset")} fill="#FFAB00" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="other" name={t("billing.types.ipChange")} fill="#118D57" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="one_time" name={t("billing.types.oneTimeFee")} fill={ONE_TIME_FEE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Paper>
  );
}

function ActiveFilters({
  chips,
  onClear,
}: {
  chips: { key: string; label: string; remove: () => void }[];
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Collapse in={chips.length > 0} timeout={{ enter: 260, exit: 180 }} easing={{ enter: "cubic-bezier(0.22, 1, 0.36, 1)", exit: "cubic-bezier(0.4, 0, 1, 1)" }} unmountOnExit>
      <Stack className="km-admin-active-filters" direction="row" spacing={0.75} useFlexGap sx={{ pt: 1.75, flexWrap: "wrap", alignItems: "center" }}>
        {chips.map((chip) => <Chip key={chip.key} className="km-admin-filter-chip" size="small" label={chip.label} onDelete={chip.remove} deleteIcon={<X size={14} />} />)}
        <Button color="error" size="small" startIcon={<FilterOff size={16} />} onClick={onClear}>{t("billing.actions.clearAll")}</Button>
      </Stack>
    </Collapse>
  );
}

function DetailsButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      className="km-billing-action-btn"
      data-text-action="true"
      size="small"
      disabled={disabled}
      onClick={onClick}
    >
      {t("billing.actions.details")}
    </Button>
  );
}

function BillingActionHead({ children }: { children: ReactNode }) {
  return (
    <TableHead className="km-billing-actions">
      <div className="km-billing-action-slot">{children}</div>
    </TableHead>
  );
}

function BillingActionCell({
  children,
  dataLabel,
}: {
  children: ReactNode;
  dataLabel?: string;
}) {
  return (
    <TableCell className="km-billing-actions" data-label={dataLabel}>
      <div className="km-billing-action-slot">{children}</div>
    </TableCell>
  );
}

function useFollowsAdminPageSize() {
  const defaultPageSize = useAdminDefaultPageSize();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const customized = useRef(false);
  useEffect(() => {
    if (customized.current) return;
    setPageSizeState(defaultPageSize);
    setPage(1);
  }, [defaultPageSize]);
  const setPageSize = useCallback((value: number) => {
    customized.current = true;
    setPageSizeState(value);
    setPage(1);
  }, []);
  return { page, setPage, pageSize, setPageSize };
}

function BillingServerIdentity({
  server,
  groupFallback,
}: {
  server: BillingServer;
  groupFallback: string;
}) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
      <Box className="admin-node-country-flag" sx={{ flexShrink: 0, lineHeight: 0 }}>
        {server.region ? <Flag flag={server.region} compact /> : <Server size={17} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>{server.name || server.client}</Typography>
        <Typography noWrap color="text.secondary" sx={{ fontSize: 12 }}>{server.group || groupFallback}</Typography>
      </Box>
    </Stack>
  );
}

function ServerStatus({ server }: { server: BillingServer }) {
  const { t } = useTranslation();
  if (!server.currency_valid) return <Chip size="small" color="warning" label={t("billing.status.currencyCorrection")} />;
  if (server.billing_status === "free") return <Chip size="small" color="success" label={t("billing.status.free")} />;
  if (server.billing_status === "unconfigured") return <Chip size="small" label={t("billing.status.unconfigured")} />;
  if (server.billing_status === "one_time") return <Chip size="small" color="info" label={t("billing.status.oneTime")} />;
  return null;
}

function billingExpiryPrimary(t: TFunction, expiredAt?: string | null) {
  if (isLongTermExpiry(expiredAt)) return t("common.long_term");
  return billingDate(expiredAt);
}

function billingExpiryCaption(t: TFunction, server: BillingServer) {
  if (isLongTermExpiry(server.expired_at)) return null;
  if (server.remaining_days == null) return t("billing.status.noExpiry");
  if (server.remaining_days <= 0) return t("billing.status.expired");
  return t("billing.status.remainingDays", { count: server.remaining_days });
}

function ExpiryCell({ server }: { server: BillingServer }) {
  const { t } = useTranslation();
  const caption = billingExpiryCaption(t, server);
  return (
    <TableCell>
      <Typography sx={{ fontSize: 13 }}>{billingExpiryPrimary(t, server.expired_at)}</Typography>
      {caption ? (
        <Typography color={server.remaining_days != null && server.remaining_days <= 30 ? "warning.main" : "text.secondary"} sx={{ fontSize: 11.5 }}>
          {caption}
        </Typography>
      ) : null}
    </TableCell>
  );
}

function ServerList({
  data,
  loading,
  currency,
  page,
  pageSize,
  onPage,
  onPageSize,
  onDetails,
}: {
  data: BillingServerPage | null;
  loading: boolean;
  currency: BillingCurrency;
  page: number;
  pageSize: number;
  onPage: (value: number) => void;
  onPageSize: (value: number) => void;
  onDetails: (server: BillingServer) => void;
}) {
  const { t } = useTranslation();
  if (loading && !data) return <Box sx={{ p: 2 }}><Skeleton height={260} /></Box>;
  if (!data?.items.length) return <Box className="km-admin-list-empty">{t("billing.empty.servers")}</Box>;
  return (
    <>
      <Box sx={{ display: { xs: "none", md: "block" } }} className="admin-responsive-table-wrap overflow-x-auto">
        <Table container={false} className="admin-responsive-table min-w-[1300px] table-fixed">
          <TableHeader><TableRow>
            <TableHead className="w-[190px]">{t("billing.table.server")}</TableHead><TableHead className="w-[130px]">{t("billing.table.nativePrice")}</TableHead><TableHead className="w-[360px]">{t("billing.table.averages")}</TableHead><TableHead className="w-[120px]">{t("billing.table.monthExtra")}</TableHead><TableHead className="w-[130px]">{t("billing.table.monthTotal")}</TableHead><TableHead className="w-[150px]">{t("billing.table.expiry")}</TableHead><TableHead className="w-[120px]">{t("billing.table.remainingValue")}</TableHead><BillingActionHead>{t("billing.table.actions")}</BillingActionHead>
          </TableRow></TableHeader>
          <TableBody>{data.items.map((server) => <TableRow key={server.client}>
            <TableCell><BillingServerIdentity server={server} groupFallback={t("billing.status.noGroup")} /></TableCell>
            <TableCell><ServerStatus server={server} />{server.billing_status === "recurring" ? <><Typography sx={{ fontSize: 13.5, fontWeight: 400 }}>{formatBillingMoney(server.original_amount, server.original_currency)}</Typography><Typography color="text.secondary" sx={{ fontSize: 12 }}>{billingCycleLabel(t, server.billing_cycle_days)} · {billingCurrencySymbol(server.original_currency)}</Typography></> : null}</TableCell>
            <TableCell>
              <Box className="km-billing-averages">
                {[[t("billing.common.dailyAverage"), server.daily_average], [t("billing.common.monthlyAverage"), server.monthly_average], [t("billing.common.yearlyAverage"), server.yearly_average]].map(([label, value]) => (
                  <Typography key={label} noWrap sx={{ fontSize: 12.5, fontWeight: 400, fontVariantNumeric: "tabular-nums" }}>
                    <Box component="span" sx={{ mr: 0.5, color: "text.secondary" }}>{label}</Box>
                    {formatBillingMoney(value, currency)}
                  </Typography>
                ))}
              </Box>
            </TableCell>
            <TableCell><Typography sx={{ fontWeight: 400 }}>{formatBillingMoney(server.month_extra, currency)}</Typography></TableCell>
            <TableCell><Typography sx={{ fontWeight: 400 }}>{formatBillingMoney(server.month_total, currency)}</Typography><Typography color="text.secondary" sx={{ fontSize: 11.5 }}>{t("billing.types.base")} {formatBillingMoney(server.month_base, currency)}</Typography></TableCell>
            <ExpiryCell server={server} />
            <TableCell><Typography sx={{ fontWeight: 400 }}>{formatBillingMoney(server.remaining_value, currency)}</Typography></TableCell>
            <BillingActionCell><DetailsButton onClick={() => onDetails(server)} /></BillingActionCell>
          </TableRow>)}</TableBody>
        </Table>
      </Box>
      <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, p: 1.25 }}>
        {data.items.map((server) => <Paper key={server.client} variant="outlined" sx={{ borderRadius: "8px", overflow: "hidden", borderColor: "divider" }}>
          <Stack direction="row" spacing={1.25} sx={{ p: 1.5, alignItems: "center", bgcolor: "action.hover" }}><Box sx={{ minWidth: 0, flex: 1 }}><BillingServerIdentity server={server} groupFallback={t("billing.status.noGroup")} /></Box><DetailsButton onClick={() => onDetails(server)} /></Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>{[[t("billing.table.nativePrice"), server.billing_status === "recurring" ? formatBillingMoney(server.original_amount, server.original_currency) : server.billing_status === "free" ? t("billing.status.free") : server.billing_status === "one_time" ? t("billing.status.oneTime") : t("billing.status.unconfigured")], [t("billing.common.monthlyAverage"), formatBillingMoney(server.monthly_average, currency)], [t("billing.table.monthExtra"), formatBillingMoney(server.month_extra, currency)], [t("billing.table.monthTotal"), formatBillingMoney(server.month_total, currency)], [t("billing.table.expiry"), billingExpiryPrimary(t, server.expired_at)], [t("billing.table.remainingValue"), formatBillingMoney(server.remaining_value, currency)]].map(([label, value]) => <Box key={label} sx={{ p: 1.35, borderTop: 1, borderRight: 1, borderColor: "divider", "&:nth-of-type(2n)": { borderRight: 0 } }}><Typography color="text.secondary" sx={{ mb: 0.4, fontSize: 11.5 }}>{label}</Typography><Typography sx={{ fontSize: 13.5, fontWeight: 400 }}>{value}</Typography></Box>)}</Box>
        </Paper>)}
      </Stack>
      <AdminPagination page={page} total={data.pagination.total} pageSize={pageSize} onPageChange={onPage} onPageSizeChange={onPageSize} showSummary={false} />
    </>
  );
}

function PeriodSummary({ data, currency, monthly, loading }: { data: BillingPeriodPage | null; currency: BillingCurrency; monthly: boolean; loading: boolean }) {
  const { t } = useTranslation();
  const summary = data?.summary;
  return <Box sx={metricGridSx(6)}>
    <MetricCard label={t("billing.metrics.rangeTotal")} value={formatBillingMoney(summary?.total, currency)} helper={monthly ? t("billing.helpers.currentPeriods") : t("billing.helpers.annualTotal")} icon={<CircleDollarSign size={18} />} loading={loading && !data} />
    <MetricCard label={t("billing.types.base")} value={formatBillingMoney(summary?.base, currency)} helper={t("billing.helpers.serverAccrual")} icon={<Server size={18} />} loading={loading && !data} />
    <MetricCard label={t("billing.types.trafficReset")} value={formatBillingMoney(summary?.extra, currency)} helper={t("billing.helpers.addonsPosted")} tone="orange" icon={<WalletCards size={18} />} loading={loading && !data} />
    <MetricCard label={t("billing.types.ipChange")} value={formatBillingMoney(summary?.other, currency)} helper={t("billing.helpers.otherTotal")} icon={<Globe size={18} />} loading={loading && !data} />
    <MetricCard label={t("billing.types.oneTimeFee")} value={formatBillingMoney(summary?.one_time, currency)} helper={t("billing.helpers.oneTimeTotal")} icon={<WalletCards size={18} />} loading={loading && !data} />
    <MetricCard label={monthly ? t("billing.metrics.monthlyAverage") : t("billing.metrics.yearlyAverage")} value={formatBillingMoney(monthly ? data?.monthly_average : data?.yearly_average, currency)} helper={monthly ? t("billing.helpers.completeMonthsOnly") : t("billing.helpers.completeYearsOnly")} tone="green" icon={<ChartNoAxesCombined size={18} />} loading={loading && !data} />
  </Box>;
}

function PeriodList({ data, currency, monthly, page, pageSize, onPage, onPageSize, onDetails }: { data: BillingPeriodPage | null; currency: BillingCurrency; monthly: boolean; page: number; pageSize: number; onPage: (value: number) => void; onPageSize: (value: number) => void; onDetails: (period: BillingPeriod) => void }) {
  const { t } = useTranslation();
  if (!data?.items.length) return <Box className="km-admin-list-empty">{t("billing.empty.periods")}</Box>;
  return <>
    <Box className="admin-responsive-table-wrap overflow-x-auto"><Table container={false} className="admin-responsive-table km-billing-period-table w-full table-fixed">
      <TableHeader><TableRow>
        <TableHead className="w-[168px]">{t("billing.table.period")}</TableHead>
        <TableHead>{t("billing.types.base")}</TableHead>
        <TableHead>{t("billing.types.trafficReset")}</TableHead>
        <TableHead>{t("billing.types.ipChange")}</TableHead>
        <TableHead>{t("billing.types.oneTimeFee")}</TableHead>
        <TableHead>{t("billing.table.total")}</TableHead>
        {monthly ? <TableHead className="w-[96px]">{t("billing.table.server")}</TableHead> : <TableHead className="w-[96px]">{t("billing.table.yearOverYear")}</TableHead>}
        <TableHead className="w-[108px]">{t("billing.table.status")}</TableHead>
        <BillingActionHead>{t("billing.table.actions")}</BillingActionHead>
      </TableRow></TableHeader>
      <TableBody>{data.items.map((period) => <TableRow key={period.period}>
        <TableCell data-label={t("billing.table.period")}><Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><Box sx={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText" }}><History size={15} /></Box><Typography sx={{ fontWeight: 400 }}>{period.period}</Typography></Stack></TableCell>
        <TableCell data-label={t("billing.types.base")}>{period.status === "no_record" ? "--" : formatBillingMoney(period.base, currency)}</TableCell><TableCell data-label={t("billing.types.trafficReset")}>{period.status === "no_record" ? "--" : formatBillingMoney(period.extra, currency)}</TableCell><TableCell data-label={t("billing.types.ipChange")}>{period.status === "no_record" ? "--" : formatBillingMoney(period.other, currency)}</TableCell><TableCell data-label={t("billing.types.oneTimeFee")}>{period.status === "no_record" ? "--" : formatBillingMoney(period.one_time, currency)}</TableCell><TableCell data-label={t("billing.table.total")}><Typography sx={{ fontWeight: 400 }}>{period.status === "no_record" ? "--" : formatBillingMoney(period.total, currency)}</Typography></TableCell>
        <TableCell data-label={monthly ? t("billing.table.server") : t("billing.table.yearOverYear")}>{monthly ? t("billing.common.serverCount", { count: period.server_count || 0 }) : period.year_over_year ? `${Number(period.year_over_year) > 0 ? "+" : ""}${period.year_over_year}%` : "--"}</TableCell>
        <TableCell data-label={t("billing.table.status")}><Chip size="small" color={period.status === "in_progress" ? "info" : period.status === "projected" ? "warning" : period.status === "no_record" ? "default" : "success"} label={billingStatusLabel(t, period.status)} /></TableCell>
        <BillingActionCell dataLabel={t("billing.table.actions")}><DetailsButton disabled={period.status === "no_record"} onClick={() => onDetails(period)} /></BillingActionCell>
      </TableRow>)}</TableBody>
    </Table></Box>
    <AdminPagination page={page} total={data.pagination.total} pageSize={pageSize} onPageChange={onPage} onPageSizeChange={onPageSize} showSummary={false} />
  </>;
}

function EntryDetailsDialog({
  open,
  title,
  currency,
  client,
  from,
  to,
  onClose,
  onChanged,
}: {
  open: boolean;
  title: string;
  currency: BillingCurrency;
  client?: string;
  from?: string;
  to?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const entryTypes = useMemo(() => billingEntryTypeOptions(t), [t]);
  const { page, setPage, pageSize, setPageSize } = useFollowsAdminPageSize();
  const [types, setTypes] = useState<string[]>([]);
  const [year, setYear] = useState(() => yearFromRange(from, to));
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [voidEntry, setVoidEntry] = useState<BillingEntry | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const range = rangeForSelectedYear(year, from, to);
  const url = open
    ? billingQuery("/api/admin/billing/entries", {
        currency,
        client,
        from: range.from,
        to: range.to,
        types: types.length ? types : undefined,
        q: search.trim() || undefined,
        page,
        page_size: pageSize,
        revision,
      })
    : null;
  const request = useBillingData<BillingEntryPage>(url);
  const years = useMemo(() => detailYearOptions(from, to), [from, to]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setTypes([]);
    setSearch("");
    setYear(yearFromRange(from, to));
  }, [open, client, from, to, setPage]);

  const confirmVoid = async () => {
    if (!voidEntry || !reason.trim()) return;
    setSaving(true);
    try {
      await billingRequest(`/api/admin/billing/entries/${voidEntry.id}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason.trim() }) });
      setVoidEntry(null); setReason(""); setRevision((value) => value + 1); onChanged();
    } finally { setSaving(false); }
  };

  return <>
    <Dialog
      open={open}
      onClose={onClose}
      disablePortal
      fullWidth
      maxWidth="lg"
      slotProps={{
        paper: {
          className: "km-admin-node-list",
          sx: {
            display: "flex",
            flexDirection: "column",
            borderRadius: { xs: 0, sm: "8px" },
            maxHeight: { xs: "100%", sm: "88vh" },
            m: { xs: 0, sm: 2 },
            width: { xs: "100%", sm: "calc(100% - 32px)" },
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 2, pt: 1.75, pb: 1.5, fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", px: 0, pt: 0, pb: 0, "&:first-of-type": { pt: 0 } }}>
        <AdminListFiltersBar>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: { xs: "wrap", md: "nowrap" }, alignItems: "center" }}>
            <AdminMultiSelect
              label={t("billing.filters.year")}
              ariaLabel={t("billing.filters.year")}
              value={[year]}
              onChange={(value) => {
                const next = value.find((item) => item !== year) || value[0] || yearFromRange(from, to);
                setYear(next);
                setPage(1);
              }}
              options={years.map((item) => ({ value: item, label: t("billing.common.yearLabel", { year: item }) }))}
            />
            <AdminMultiSelect
              label={t("billing.filters.feeType")}
              ariaLabel={t("billing.filters.feeType")}
              value={types}
              onChange={(value) => { setTypes(value); setPage(1); }}
              options={entryTypes}
            />
            <AdminListSearch
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder={t("billing.filters.detailsSearchPlaceholder")}
            />
          </Stack>
        </AdminListFiltersBar>
        {request.error ? <ErrorPanel message={request.error} retry={request.retry} /> : null}
        {request.loading && !request.data ? <Box sx={{ p: 2 }}><Skeleton height={240} /></Box> : request.data?.items.length ? <>
          <Box className="admin-responsive-table-wrap overflow-x-auto"><Table container={false} className="admin-responsive-table km-billing-details-table w-full table-fixed"><TableHeader><TableRow><TableHead className="w-[132px]">{t("billing.filters.feeType")}</TableHead><TableHead>{t("billing.table.server")}</TableHead><TableHead className="w-[120px]">{t("billing.table.originalAmount")}</TableHead><TableHead className="w-[120px]">{t("billing.table.convertedAmount")}</TableHead><TableHead className="w-[168px]">{t("billing.table.occurredAt")}</TableHead><TableHead className="km-billing-note">{t("billing.table.note")}</TableHead><BillingActionHead>{t("billing.table.actions")}</BillingActionHead></TableRow></TableHeader><TableBody>{request.data.items.map((entry) => <TableRow key={`${entry.client}-${entry.type}-${entry.day}-${entry.id}-${entry.occurred_at}`}><TableCell data-label={t("billing.filters.feeType")}><Chip size="small" color={entry.voided || entry.type === "reversal" ? "error" : entry.category === "traffic_reset" || entry.category === "ip_change" || entry.category === "adjustment" ? "warning" : "default"} label={entry.voided ? t("billing.types.voided") : billingTypeLabel(t, entry.type)} /></TableCell><TableCell data-label={t("billing.table.server")}><Typography sx={{ fontWeight: 600 }}>{entry.client_name || entry.client}</Typography></TableCell><TableCell data-label={t("billing.table.originalAmount")}>{formatBillingMoney(entry.original_amount, entry.original_currency)}</TableCell><TableCell data-label={t("billing.table.convertedAmount")}>{entry.pending_fx ? <Chip size="small" color="warning" label={t("billing.status.pendingFx")} /> : formatBillingMoney(entry.converted_amount, entry.converted_currency)}</TableCell><TableCell data-label={t("billing.table.occurredAt")}>{billingDateTime(entry.occurred_at)}</TableCell><TableCell className="km-billing-note" data-label={t("billing.table.note")}><Typography noWrap title={entry.note || undefined}>{entry.note || "--"}</Typography></TableCell><BillingActionCell dataLabel={t("billing.table.actions")}>{entry.voidable ? <Button className="km-billing-action-btn" color="error" data-text-action="true" size="small" onClick={() => setVoidEntry(entry)}>{t("billing.actions.void")}</Button> : "--"}</BillingActionCell></TableRow>)}</TableBody></Table></Box>
        </> : <Box className="km-admin-list-empty">{t("billing.empty.details")}</Box>}
      </DialogContent>
      {request.data?.items.length ? <AdminPagination page={page} total={request.data.pagination.total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} showSummary={false} /> : null}
      <DialogActions sx={{ px: 2, py: 1.25 }}><Button onClick={onClose}>{t("billing.actions.close")}</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(voidEntry)} onClose={() => !saving && setVoidEntry(null)} fullWidth maxWidth="xs"><DialogTitle>{t("billing.dialogs.voidTitle")}</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2, fontSize: 13 }}>{t("billing.dialogs.voidDescription")}</Typography><TextField autoFocus fullWidth multiline rows={3} label={t("billing.dialogs.voidReason")} value={reason} onChange={(event) => setReason(event.target.value)} /></DialogContent><DialogActions><Button disabled={saving} onClick={() => setVoidEntry(null)}>{t("billing.actions.cancel")}</Button><Button color="error" variant="contained" disabled={saving || !reason.trim()} onClick={() => void confirmVoid()}>{t("billing.actions.voidConfirm")}</Button></DialogActions></Dialog>
  </>;
}

export default function BillingCenterPage() {
  const { t, i18n } = useTranslation();
  const entryTypes = useMemo(() => billingEntryTypeOptions(t), [t]);
  const regionLang = i18n.language.startsWith("zh") ? "zh" : "en";
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = currentBeijingYear();
  const currentMonthNumber = currentBeijingMonthNumber();
  const [tab, setTab] = useAdminTabParam(BILLING_TABS, "overview");
  const [currency, setCurrency] = useState<BillingCurrency>(readStoredBillingCurrency);
  const [revision, setRevision] = useState(0);
  const { page: serverPage, setPage: setServerPage, pageSize: serverPageSize, setPageSize: setServerPageSize } = useFollowsAdminPageSize();
  const [search, setSearch] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [expiry, setExpiry] = useState("");
  const [periodClients, setPeriodClients] = useState<string[]>([]);
  const [periodTypes, setPeriodTypes] = useState<string[]>([]);
  const [periodCurrencies, setPeriodCurrencies] = useState<string[]>([]);
  const { page: monthlyPage, setPage: setMonthlyPage, pageSize: monthlyPageSize, setPageSize: setMonthlyPageSize } = useFollowsAdminPageSize();
  const [yearlyYears, setYearlyYears] = useState<string[]>(() => [currentBeijingYear()]);
  const { page: yearlyPage, setPage: setYearlyPage, pageSize: yearlyPageSize, setPageSize: setYearlyPageSize } = useFollowsAdminPageSize();
  const [clients, setClients] = useState<BillingClientInfo[]>([]);
  const [detail, setDetail] = useState<{ title: string; client?: string; from?: string; to?: string } | null>(null);

  const monthlyYear = useMemo(() => {
    const combined = searchParams.get("months")?.split(",").find((value) => /^\d{4}-\d{2}$/.test(value));
    if (combined) return combined.slice(0, 4);
    const year = searchParams.get("year");
    return year && /^\d{4}$/.test(year) ? year : currentYear;
  }, [currentYear, searchParams]);
  const monthlyMonth = useMemo(() => {
    const combined = searchParams.get("months")?.split(",").find((value) => /^\d{4}-\d{2}$/.test(value));
    if (combined) return combined.slice(5, 7);
    if (!searchParams.has("month")) return currentMonthNumber;
    const month = searchParams.get("month");
    return month && /^\d{2}$/.test(month) ? month : "";
  }, [currentMonthNumber, searchParams]);
  const monthlyMonths = monthlyMonth ? [`${monthlyYear}-${monthlyMonth}`] : yearMonthKeys(monthlyYear);

  const setMonthlyPeriod = (year: string, month: string) => {
    const nextYear = year && /^\d{4}$/.test(year) ? year : currentYear;
    const nextMonth = month === "" ? "" : month && /^\d{2}$/.test(month) ? month : currentMonthNumber;
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set("year", nextYear);
      params.set("month", nextMonth);
      params.delete("years");
      params.delete("months");
      return params;
    }, { replace: true });
    setMonthlyPage(1);
  };

  useEffect(() => {
    if (!searchParams.get("year") || !searchParams.has("month")) {
      setMonthlyPeriod(searchParams.get("year") || monthlyYear, searchParams.has("month") ? monthlyMonth : currentMonthNumber);
    }
    // The URL is the source of truth after initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { localStorage.setItem(BILLING_CURRENCY_STORAGE_KEY, currency); }, [currency]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/client/list", { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))).then((rows: unknown) => {
      if (!Array.isArray(rows)) return;
      setClients(rows.flatMap((row) => {
        if (!row || typeof row !== "object" || !("uuid" in row)) return [];
        const item = row as { uuid?: unknown; name?: unknown; region?: unknown; group?: unknown; tags?: unknown };
        if (typeof item.uuid !== "string") return [];
        return [{
          uuid: item.uuid,
          name: typeof item.name === "string" ? item.name : item.uuid,
          region: typeof item.region === "string" ? item.region : "",
          group: typeof item.group === "string" ? item.group : "",
          tags: typeof item.tags === "string" ? item.tags : "",
        }];
      }));
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const overviewURL = billingQuery("/api/admin/billing/overview", { currency, revision });
  const serversURL = billingQuery("/api/admin/billing/servers", { currency, q: search.trim(), regions, groups, expiry, page: serverPage, page_size: serverPageSize, revision });
  const monthlyURL = tab === "monthly" ? billingQuery("/api/admin/billing/periods/monthly", { currency, months: monthlyMonths, clients: periodClients, types: periodTypes, native_currencies: periodCurrencies, page: monthlyPage, page_size: monthlyPageSize, revision }) : null;
  const yearlyURL = tab === "yearly" ? billingQuery("/api/admin/billing/periods/yearly", { currency, years: yearlyYears, clients: periodClients, types: periodTypes, native_currencies: periodCurrencies, page: yearlyPage, page_size: yearlyPageSize, revision }) : null;
  const overview = useBillingData<BillingOverview>(overviewURL);
  const servers = useBillingData<BillingServerPage>(serversURL);
  const monthly = useBillingData<BillingPeriodPage>(monthlyURL);
  const yearly = useBillingData<BillingPeriodPage>(yearlyURL);

  const clientOptions = clients.map((client) => ({ value: client.uuid, label: client.name || client.uuid }));
  const regionOptions = useMemo(() => billingRegionOptions(clients, regionLang), [clients, regionLang]);
  const groupOptions = useMemo(() => billingGroupOptions(clients, t), [clients, t]);
  const availableYears = [...new Set([currentYear, ...(monthly.data?.available_years || []).map(String), ...(yearly.data?.available_years || []).map(String)])].sort((a, b) => b.localeCompare(a)).map((year) => ({ value: year, label: t("billing.common.yearLabel", { year }) }));
  const calendarMonths = calendarMonthOptions(t);
  const periodChips = [
    ...periodClients.map((value) => ({ key: `client-${value}`, label: t("billing.chips.server", { value: clientOptions.find((item) => item.value === value)?.label || value }), remove: () => { setPeriodClients((items) => items.filter((item) => item !== value)); setMonthlyPage(1); setYearlyPage(1); } })),
    ...periodTypes.map((value) => ({ key: `type-${value}`, label: t("billing.chips.feeType", { value: billingTypeLabel(t, value) }), remove: () => { setPeriodTypes((items) => items.filter((item) => item !== value)); setMonthlyPage(1); setYearlyPage(1); } })),
    ...periodCurrencies.map((value) => ({ key: `currency-${value}`, label: t("billing.chips.nativeCurrency", { value }), remove: () => { setPeriodCurrencies((items) => items.filter((item) => item !== value)); setMonthlyPage(1); setYearlyPage(1); } })),
  ];
  if (tab === "monthly" && monthlyYear !== currentYear) periodChips.unshift({ key: "monthly-year", label: t("billing.chips.year", { value: monthlyYear }), remove: () => setMonthlyPeriod(currentYear, monthlyMonth) });
  if (tab === "monthly" && monthlyMonth && monthlyMonth !== currentMonthNumber) periodChips.unshift({ key: "monthly-month", label: t("billing.chips.month", { value: calendarMonths.find((item) => item.value === monthlyMonth)?.label || monthlyMonth }), remove: () => setMonthlyPeriod(monthlyYear, currentMonthNumber) });
  if (tab === "yearly") yearlyYears.filter((year) => year !== currentYear || yearlyYears.length > 1).forEach((year) => periodChips.unshift({ key: `year-${year}`, label: t("billing.chips.year", { value: year }), remove: () => { setYearlyYears((items) => { const next = items.filter((item) => item !== year); return next.length ? next : [currentYear]; }); setYearlyPage(1); } }));

  const clearPeriods = () => { setPeriodClients([]); setPeriodTypes([]); setPeriodCurrencies([]); setMonthlyPeriod(currentYear, currentMonthNumber); setYearlyYears([currentYear]); setMonthlyPage(1); setYearlyPage(1); };
  const changed = () => setRevision((value) => value + 1);
  const tabReady =
    tab === "overview"
      ? Boolean(overview.data || overview.error) && Boolean(servers.data || servers.error)
      : tab === "monthly"
        ? Boolean(monthly.data || monthly.error)
        : Boolean(yearly.data || yearly.error);
  const displayTab = useHeldTab(tab, tabReady);
  const billingPending =
    displayTab === "overview"
      ? (!overview.data && !overview.error) || (!servers.data && !servers.error)
      : displayTab === "monthly"
        ? !monthly.data && !monthly.error
        : !yearly.data && !yearly.error;
  const openPeriodDetails = (period: BillingPeriod, monthlyPeriod: boolean) => {
    if (monthlyPeriod) {
      const [year, month] = period.period.split("-").map(Number);
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      setDetail({ title: t("billing.details.periodTitle", { period: period.period }), from: `${period.period}-01`, to: `${period.period}-${String(last).padStart(2, "0")}` });
    } else setDetail({ title: t("billing.details.yearTitle", { year: period.period }), from: `${period.period}-01-01`, to: `${period.period}-12-31` });
  };

  return <div className="flex flex-col gap-4 p-0 md:p-4" data-testid="billing-center-page" data-admin-route-pending={billingPending ? "true" : undefined}>
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <AdminPageTitle description={t("billing.description", "统一查看服务器成本、到期时间、附加费用与剩余价值。")}>{t("billing.title", "成本中心")}</AdminPageTitle>
      <Stack direction="row" spacing={1.25} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
        <AdminListSelect label={t("billing.filters.currency")} value={currency} onChange={(value) => setCurrency(value as BillingCurrency)}>{billingCurrencies.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</AdminListSelect>
        <FxStatus state={overview.data?.fx} />
      </Stack>
    </div>

    {overview.error ? <ErrorPanel message={overview.error} retry={overview.retry} /> : null}
    {overview.data?.pending_fx_entries ? <Alert severity="warning">{t("billing.alerts.pendingFx", { count: overview.data.pending_fx_entries })}</Alert> : null}

    <AdminSheetTabs><Tabs value={tab} onChange={(_, value: BillingTab) => { if (value) setTab(value); }} variant="scrollable" scrollButtons={false}>
      <Tab value="overview" label={<AdminTabLabel icon={<CircleDollarSign size={18} />}>{t("billing.tabs.overview")}</AdminTabLabel>} />
      <Tab value="monthly" label={<AdminTabLabel icon={<Clock size={18} />}>{t("billing.tabs.monthly")}</AdminTabLabel>} />
      <Tab value="yearly" label={<AdminTabLabel icon={<History size={18} />}>{t("billing.tabs.yearly")}</AdminTabLabel>} />
    </Tabs></AdminSheetTabs>

    {displayTab === "overview" ? <Stack spacing={1.75}>
      <Box sx={metricGridSx()}>
        <MetricCard label={t("billing.metrics.today")} value={formatBillingMoney(overview.data?.summary.today.total, currency)} helper={t("billing.helpers.includesTrafficReset")} icon={<CircleDollarSign size={18} />} loading={overview.loading && !overview.data} />
        <MetricCard label={t("billing.metrics.month")} value={formatBillingMoney(overview.data?.summary.month.total, currency)} helper={t("billing.helpers.baseAndExtra")} icon={<WalletCards size={18} />} tone="orange" loading={overview.loading && !overview.data} />
        <MetricCard label={t("billing.metrics.year")} value={formatBillingMoney(overview.data?.summary.year.total, currency)} helper={t("billing.helpers.untilDate", { date: currentBeijingDate() })} icon={<ChartNoAxesCombined size={18} />} tone="green" loading={overview.loading && !overview.data} />
        <MetricCard label={t("billing.metrics.remainingValue")} value={formatBillingMoney(overview.data?.summary.remaining_value, currency)} helper={t("billing.helpers.estimatedExpiry", { count: overview.data?.summary.expiring_within_30_days || 0 })} icon={<Clock size={18} />} loading={overview.loading && !overview.data} />
      </Box>
      {overview.data ? (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, alignItems: "stretch", gap: 1.75 }}>
          <Box sx={{ flex: { lg: "1.7 1 0" }, minWidth: 0, display: "flex" }}><TrendPanel overview={overview.data} currency={currency} /></Box>
          <Box sx={{ flex: { lg: "0.8 1 0" }, minWidth: { lg: 300 } }}><BreakdownPanel overview={overview.data} currency={currency} /></Box>
        </Box>
      ) : <Skeleton height={300} />}
      <AdminListShell>
        <AdminListFiltersBar>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: { xs: "wrap", md: "nowrap" }, alignItems: "center" }}>
            <AdminMultiSelect label={t("billing.filters.region")} ariaLabel={t("billing.filters.region")} value={regions} onChange={(value) => { setRegions(value); setServerPage(1); }} options={regionOptions} />
            <AdminMultiSelect label={t("billing.filters.group")} ariaLabel={t("billing.filters.group")} value={groups} onChange={(value) => { setGroups(value); setServerPage(1); }} options={groupOptions} />
            <AdminListSelect label={t("billing.filters.expiry")} value={expiry} onChange={(value) => { setExpiry(value); setServerPage(1); }}><MenuItem value="">{t("billing.filters.allExpiry")}</MenuItem><MenuItem value="7">{t("billing.filters.withinDays", { count: 7 })}</MenuItem><MenuItem value="30">{t("billing.filters.withinDays", { count: 30 })}</MenuItem><MenuItem value="90">{t("billing.filters.withinDays", { count: 90 })}</MenuItem></AdminListSelect>
            <AdminListSearch value={search} onChange={(value) => { setSearch(value); setServerPage(1); }} placeholder={t("billing.filters.searchPlaceholder")} />
          </Stack>
          <ActiveFilters chips={[...regions.map((value) => ({ key: `region-${value}`, label: t("billing.chips.region", { value: regionOptions.find((item) => item.value === value)?.label || value }), remove: () => { setRegions((items) => items.filter((item) => item !== value)); setServerPage(1); } })), ...groups.map((value) => ({ key: `group-${value}`, label: t("billing.chips.group", { value: groupOptions.find((item) => item.value === value)?.label || value }), remove: () => { setGroups((items) => items.filter((item) => item !== value)); setServerPage(1); } })), ...(expiry ? [{ key: "expiry", label: t("billing.chips.expiry", { count: Number(expiry) }), remove: () => { setExpiry(""); setServerPage(1); } }] : []), ...(search.trim() ? [{ key: "search", label: t("billing.chips.search", { value: search.trim() }), remove: () => { setSearch(""); setServerPage(1); } }] : [])]} onClear={() => { setRegions([]); setGroups([]); setExpiry(""); setSearch(""); setServerPage(1); }} />
        </AdminListFiltersBar>
        {servers.error ? <ErrorPanel message={servers.error} retry={servers.retry} /> : null}
        <ServerList data={servers.data} loading={servers.loading} currency={currency} page={serverPage} pageSize={serverPageSize} onPage={setServerPage} onPageSize={setServerPageSize} onDetails={(server) => setDetail({ title: t("billing.details.serverTitle", { server: server.name || server.client }), client: server.client })} />
      </AdminListShell>
    </Stack> : null}

    {displayTab === "monthly" || displayTab === "yearly" ? <Stack spacing={1.75}>
      <PeriodSummary data={displayTab === "monthly" ? monthly.data : yearly.data} currency={currency} monthly={displayTab === "monthly"} loading={displayTab === "monthly" ? monthly.loading : yearly.loading} />
      <AdminListShell>
        <AdminListFiltersBar>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: { xs: "wrap", md: "nowrap" }, alignItems: "center" }}>
            {displayTab === "monthly" ? <>
              <AdminListSelect label={t("billing.filters.year")} value={monthlyYear} onChange={(value) => setMonthlyPeriod(value, monthlyMonth)}>{availableYears.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</AdminListSelect>
              <AdminListSelect label={t("billing.filters.month")} value={monthlyMonth} onChange={(value) => setMonthlyPeriod(monthlyYear, value)}><MenuItem value="">{t("billing.filters.allMonths")}</MenuItem>{calendarMonths.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</AdminListSelect>
            </> : <AdminMultiSelect label={t("billing.filters.year")} ariaLabel={t("billing.filters.year")} value={yearlyYears} onChange={(value) => { setYearlyYears(value.length ? value : [currentYear]); setYearlyPage(1); }} options={availableYears} />}
            <AdminMultiSelect label={t("billing.filters.server")} ariaLabel={t("billing.filters.server")} value={periodClients} onChange={(value) => { setPeriodClients(value); setMonthlyPage(1); setYearlyPage(1); }} options={clientOptions} />
            <AdminMultiSelect label={t("billing.filters.feeType")} ariaLabel={t("billing.filters.feeType")} value={periodTypes} onChange={(value) => { setPeriodTypes(value); setMonthlyPage(1); setYearlyPage(1); }} options={entryTypes} />
            <AdminMultiSelect label={t("billing.filters.nativeCurrency")} ariaLabel={t("billing.filters.nativeCurrency")} value={periodCurrencies} onChange={(value) => { setPeriodCurrencies(value); setMonthlyPage(1); setYearlyPage(1); }} options={nativeCurrencyOptions} />
          </Stack><ActiveFilters chips={periodChips} onClear={clearPeriods} />
        </AdminListFiltersBar>
        {(displayTab === "monthly" ? monthly.error : yearly.error) ? <ErrorPanel message={(displayTab === "monthly" ? monthly.error : yearly.error) || ""} retry={displayTab === "monthly" ? monthly.retry : yearly.retry} /> : null}
        {(displayTab === "monthly" ? monthly.loading && !monthly.data : yearly.loading && !yearly.data) ? <Box sx={{ p: 2 }}><Skeleton height={280} /></Box> : <PeriodList data={displayTab === "monthly" ? monthly.data : yearly.data} currency={currency} monthly={displayTab === "monthly"} page={displayTab === "monthly" ? monthlyPage : yearlyPage} pageSize={displayTab === "monthly" ? monthlyPageSize : yearlyPageSize} onPage={displayTab === "monthly" ? setMonthlyPage : setYearlyPage} onPageSize={displayTab === "monthly" ? setMonthlyPageSize : setYearlyPageSize} onDetails={(period) => openPeriodDetails(period, displayTab === "monthly")} />}
      </AdminListShell>
    </Stack> : null}

    <EntryDetailsDialog open={Boolean(detail)} title={detail?.title || t("billing.actions.details")} currency={currency} client={detail?.client} from={detail?.from} to={detail?.to} onClose={() => setDetail(null)} onChanged={changed} />
  </div>;
}
