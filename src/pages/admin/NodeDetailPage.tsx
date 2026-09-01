import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useAdminTabParam } from "@/hooks/useAdminTabParam";
import { toast } from "sonner";

import Flag from "@/components/Flag";
import { CustomTags } from "@/components/PriceTags";
import { AdminSheetTabs, AdminTabLabel } from "@/components/admin/AdminSheetTabs";
import {
  AppDialogContent,
  Button as AdminButton,
  Dialog as AdminDialog,
  Flex,
  Select as AdminSelect,
  TextField as AdminTextField,
} from "@/components/admin/ui";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock,
  Cpu,
  Gauge,
  Globe,
  HardDrive,
  Info,
  MemoryStick,
  RefreshCw,
  Server,
  Settings,
  Terminal,
  WalletCards,
  Wifi,
} from "@/components/admin/muiIcons";
import { useNodeDetails, type NodeDetail } from "@/contexts/NodeDetailsContext";
import {
  AdminNodeLiveDataProvider,
  nodeOnlineState,
  useAdminNodeLiveData,
} from "@/hooks/use-admin-node-live-data";
import { currencyForDisplay, currencyForStorage } from "@/lib/currency";
import { dateInputToISOString, timestampToDateInput } from "@/lib/dateInput";
import NodeUsageStats from "@/pages/admin/NodeUsageStats";
import {
  EMPTY_DISPLAY,
  configLabel,
  displayOrEmpty,
  isEmptyValue,
} from "@/pages/admin/nodeDetailPreview";
import { getRegionCode, getRegionDisplayName } from "@/utils/regionHelper";
import { openRemoteTerminal } from "@/utils/remoteLaunch";
import { nodeTrafficType, trafficUsed } from "@/utils/trafficAccounting";
import { formatBytes, stringToBytes } from "@/utils/unitHelper";
import { billingRequest } from "@/utils/billing";
import { LITE_BLUE, LITE_BLUE_SOFT_STRONG } from "@/theme/brand";
import { getAdminMenuProps } from "@/components/admin/adminMenu";
import {
  metricCardSurfaceSx,
  metricCardSx,
} from "@/pages/admin/nodeDetailCardStyles";

const BILLING_CURRENCY_OPTIONS = ["¥", "$", "€", "£", "₽", "₣", "₹", "₫", "฿", "C$"];

const DETAIL_TABS = ["overview", "billing", "metrics"] as const;

type DetailTab = (typeof DETAIL_TABS)[number];

const cardSx = {
  overflow: "hidden",
};

const sectionCardSx = {
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

function Surface({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: Record<string, unknown>;
}) {
  return (
    <Box className="km-admin-detail-card" sx={{ ...cardSx, ...sx }}>
      {children}
    </Box>
  );
}

function DetailSectionHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        minHeight: 52,
        px: 2,
        py: 1.25,
        alignItems: "center",
        borderBottom: "1px solid rgba(145, 158, 171, 0.16)",
        bgcolor: "rgba(145, 158, 171, 0.06)",
      }}
    >
      <Box sx={{ display: "inline-flex", color: "text.secondary", lineHeight: 0 }}>
        {icon}
      </Box>
      <Typography variant="subtitle2" sx={{ minWidth: 0, flex: 1, fontWeight: 600 }}>
        {title}
      </Typography>
      {action}
    </Stack>
  );
}

const solidButtonSx = {
  textTransform: "none" as const,
  bgcolor: LITE_BLUE_SOFT_STRONG,
  color: LITE_BLUE,
  minHeight: 36,
  height: 36,
  px: 1.5,
  py: 0,
  fontSize: 13.5,
  fontWeight: 600,
  borderRadius: "8px",
  boxShadow: "none",
  "&:hover": {
    bgcolor: LITE_BLUE_SOFT_STRONG,
    boxShadow: "none",
    filter: "brightness(0.96)",
  },
  "html.dark &": {
    bgcolor: "rgba(7, 141, 238, 0.22)",
    color: "#7EC8F8",
    "&:hover": { bgcolor: "rgba(7, 141, 238, 0.32)", boxShadow: "none", filter: "none" },
  },
  "& .MuiButton-startIcon": { mr: 0.75, ml: 0 },
  "& .MuiButton-endIcon": { ml: 0.5, mr: 0 },
};

function cycleLabel(days: number, t: (key: string, fallback: string) => string) {
  if (days === 30) return t("admin.nodeDetail.payMonthly", "月付");
  if (days === 92) return t("common.quarterly", "季付");
  if (days === 184) return t("common.semi_annual", "半年付");
  if (days === 365) return t("admin.nodeDetail.payYearly", "年付");
  if (days === 730) return t("common.biennial", "两年付");
  if (days === -1) return t("common.once", "一次性");
  return t("common.monthly", "月付");
}

function MetaItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, alignItems: "center" }}>
      <Box className="admin-node-detail-meta-icon">
        {icon}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
        {text}
      </Typography>
    </Stack>
  );
}

const iconWellSx = {
  width: 48,
  height: 48,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  lineHeight: 0,
  borderRadius: "50%",
  bgcolor: "rgba(255, 255, 255, 0.58)",
  color: "#637381",
  position: "relative",
  zIndex: 1,
  "html.dark &": {
    bgcolor: "rgba(255, 255, 255, 0.08)",
    color: "#C4CDD5",
  },
} as const;

function SpecTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 1, sm: 1.25 }}
      sx={{
        ...metricCardSx,
        p: { xs: 1.5, sm: 2 },
        borderRadius: "8px",
        minWidth: 0,
        minHeight: 80,
        height: "100%",
        alignItems: "center",
      }}
    >
      <Box sx={iconWellSx}>{icon}</Box>
      <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Typography
          variant="caption"
          sx={{ color: "var(--metric-label-color)", lineHeight: 1.3, display: "block", fontSize: 13, fontWeight: 500 }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          noWrap
          title={value}
          sx={{
            mt: 0.25,
            fontWeight: 700,
            fontSize: { xs: 15, sm: 16 },
            lineHeight: 1.35,
            color: value === EMPTY_DISPLAY ? "var(--metric-empty-color)" : "var(--metric-value-color)",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function TrafficStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 1, sm: 1.25 }}
      sx={{
        ...metricCardSx,
        p: { xs: 1.5, sm: 2 },
        minHeight: 80,
        height: "100%",
        borderRadius: "8px",
        alignItems: "center",
      }}
    >
      <Box sx={iconWellSx}>{icon}</Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{ color: "var(--metric-label-color)", fontSize: 13, fontWeight: 500, display: "block" }}
        >
          {label}
        </Typography>
        <Typography
          variant="subtitle1"
          noWrap
          title={value}
          sx={{
            mt: 0.25,
            fontWeight: 700,
            fontSize: { xs: 15, sm: 16 },
            lineHeight: 1.35,
            color: value === EMPTY_DISPLAY ? "var(--metric-empty-color)" : "var(--metric-value-color)",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function DetailValueTile({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        ...metricCardSx,
        minHeight: 80,
        p: 2,
        alignItems: "center",
        borderRadius: "8px",
      }}
    >
      <Box sx={{ ...iconWellSx, width: 40, height: 40 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: "var(--metric-label-color)", display: "block" }}>
          {label}
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{
            mt: 0.25,
            color: muted ? "var(--metric-empty-color)" : "var(--metric-value-color)",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.35,
            wordBreak: "break-word",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function TrafficUsageProgress({
  label,
  percent,
  detail,
  available,
}: {
  label: string;
  percent: number;
  detail: string;
  available: boolean;
}) {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <Box
      data-testid="admin-node-traffic-progress"
      sx={{
        position: "relative",
        overflow: "hidden",
        minHeight: 83,
        flexShrink: 0,
        mt: 1,
        borderRadius: "8px",
        ...metricCardSurfaceSx,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          width: available ? `${safePercent}%` : 0,
          backgroundImage:
            "linear-gradient(90deg, rgba(7, 141, 238, 0.08) 0%, rgba(7, 141, 238, 0.16) 100%)",
          transition: "width 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <Stack
        direction="row"
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: 83,
          px: 2,
          py: 1.25,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0, alignSelf: "center" }}>
          <Typography
            variant="caption"
            data-testid="admin-node-traffic-label"
            sx={{ display: "block", color: "#919EAB", fontWeight: 500, lineHeight: 1.35 }}
          >
            {label}
          </Typography>
          <Typography
            variant="caption"
            data-testid="admin-node-traffic-detail"
            sx={{ display: "block", mt: 0.5, color: "#637381", fontWeight: 400, lineHeight: 1.35 }}
          >
            {detail}
          </Typography>
        </Box>
        <Typography
          variant="subtitle2"
          data-testid="admin-node-traffic-percent"
          sx={{
            color: available ? LITE_BLUE : "text.disabled",
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {available ? `${safePercent.toFixed(2)}%` : EMPTY_DISPLAY}
        </Typography>
      </Stack>
    </Box>
  );
}

function CopyRow({
  label,
  value,
  leading,
}: {
  label: string;
  value: string;
  leading?: ReactNode;
}) {
  const empty = !value || value === EMPTY_DISPLAY;
  return (
    <Stack
      data-testid="admin-node-network-row"
      direction="row"
      spacing={2}
      sx={{
        py: 1,
        px: 1.5,
        minHeight: 56,
        minWidth: 0,
        flex: 1,
        borderRadius: "8px",
        ...metricCardSurfaceSx,
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <Box
        sx={{
          width: 24,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#919EAB",
          lineHeight: 0,
        }}
      >
        {leading ?? <Globe size={18} />}
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          width: 104,
          flexShrink: 0,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
          {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          minWidth: 0,
          flex: 1,
          fontWeight: 600,
          wordBreak: "break-all",
          color: empty ? "text.disabled" : "text.primary",
        }}
      >
        {value || EMPTY_DISPLAY}
      </Typography>
    </Stack>
  );
}

export default function NodeDetailPage() {
  return (
    <AdminNodeLiveDataProvider>
      <NodeDetailPageBody />
    </AdminNodeLiveDataProvider>
  );
}

function NodeDetailPageBody() {
  const { uuid = "" } = useParams();
  const { t } = useTranslation();
  const { nodeDetail, isLoading, refresh } = useNodeDetails();
  const { liveData, available } = useAdminNodeLiveData();
  const [tab, setTab] = useAdminTabParam(DETAIL_TABS, "overview");
  const node = nodeDetail.find((item) => item.uuid === uuid);
  const online = nodeOnlineState(
    available,
    new Set(liveData?.data.online ?? []),
    uuid,
  );
  const live = liveData?.data.data?.[uuid];

  if (isLoading && !node) {
    return (
      <Typography color="text.secondary">{t("common.loading", "加载中...")}</Typography>
    );
  }

  if (!node) {
    return (
      <Stack spacing={2}>
        <Button
          component={Link}
          to="/admin/servers"
          className="km-admin-back-button"
          startIcon={<ChevronLeft />}
          sx={{ alignSelf: "flex-start", textTransform: "none" }}
        >
          {t("admin.nodeDetail.backToList", "返回列表")}
        </Button>
        <Typography>{t("admin.nodeDetail.notFound", "未找到该服务器")}</Typography>
      </Stack>
    );
  }

  const os = displayOrEmpty(node.os);
  const regionCode = getRegionCode(node.region);
  const hasRealRegion = Boolean(node.region?.trim()) && regionCode !== "UN";
  const locationName = hasRealRegion ? getRegionDisplayName(node.region) : "";
  const locationCode = hasRealRegion ? regionCode : "";
  const location = hasRealRegion ? `${locationName} (${locationCode})` : EMPTY_DISPLAY;
  const countryFlag = hasRealRegion ? (
    <span className="admin-node-detail-country-flag">
      <Flag flag={node.region} compact />
    </span>
  ) : null;
  const plan = configLabel(node);
  const used = live
    ? trafficUsed(nodeTrafficType(node), live.network.totalUp, live.network.totalDown)
    : null;
  const limit = Number(node.effective_traffic_limit) || 0;
  const remaining = used == null || !limit ? null : Math.max(0, limit - used);
  const trafficPct = used != null && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const statusLabel = online
    ? t("admin.nodeDetail.running", "正在运行")
    : t("nodeCard.offline", "离线");
  const statusPending = online === null;
  const openTerminal = () => {
    if (!openRemoteTerminal(node.uuid)) {
      toast.error("浏览器阻止了远程管理窗口");
    }
  };

  return (
    <Stack spacing={2} data-testid="admin-node-detail">
      <Button
        component={Link}
        to="/admin/servers"
        className="km-admin-back-button"
        startIcon={<ChevronLeft sx={{ fontSize: 18 }} />}
        sx={{
          alignSelf: "flex-start",
          px: 0,
          minWidth: 0,
          minHeight: 22,
          color: "text.secondary",
          textTransform: "none",
          fontWeight: 400,
          fontSize: 16,
          "&:hover": { bgcolor: "transparent", color: "text.primary" },
        }}
      >
        {t("admin.nodeDetail.backToList", "返回列表")}
      </Button>

      <Surface
        sx={{
          minHeight: { xs: 0, sm: 108 },
          p: { xs: 2, sm: 2.25 },
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2.5, sm: 3 }}
          sx={{ width: "100%", justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.35 }}>
                {node.name}
              </Typography>
              <Chip
                size="small"
                label={statusLabel}
                aria-hidden={statusPending || undefined}
                sx={{
                  height: 22,
                  fontWeight: 600,
                  fontSize: 12,
                  visibility: statusPending ? "hidden" : "visible",
                  color: online ? "#fff" : "var(--red-11)",
                  bgcolor: online ? "#22C55E" : "var(--red-a3)",
                }}
              />
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{
                mt: 0.875,
                alignItems: { xs: "flex-start", sm: "center" },
                flexWrap: "wrap",
                rowGap: 0.75,
                columnGap: 2,
              }}
            >
              {plan !== EMPTY_DISPLAY ? <MetaItem icon={<Server size={16} />} text={plan} /> : null}
              {os !== EMPTY_DISPLAY ? <MetaItem icon={<Terminal size={16} />} text={os} /> : null}
              <MetaItem icon={countryFlag} text={location} />
            </Stack>
            {node.tags?.trim() ? (
              <Box
                sx={{
                  mt: 1,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CustomTags tags={node.tags} />
              </Box>
            ) : null}
          </Box>
          <Box sx={{ width: { xs: "100%", sm: 104 }, flexShrink: 0 }}>
            <Button
              className="km-admin-terminal-button"
              variant="contained"
              fullWidth
              startIcon={<Terminal size={16} />}
              onClick={openTerminal}
              sx={solidButtonSx}
            >
              {t("terminal.title", "终端")}
            </Button>
          </Box>
        </Stack>
      </Surface>

      <AdminSheetTabs className="km-admin-node-detail-tabs">
        <Tabs
          value={tab}
          onChange={(_, next: DetailTab) => {
            if (next) setTab(next);
          }}
          data-testid="admin-node-detail-tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            value="overview"
            label={
              <AdminTabLabel icon={<Info size={18} />}>
                {t("admin.nodeDetail.overview", "概览")}
              </AdminTabLabel>
            }
          />
          <Tab
            value="billing"
            label={
              <AdminTabLabel icon={<WalletCards size={18} />}>
                {t("admin.nodeDetail.billing", "计费")}
              </AdminTabLabel>
            }
          />
          <Tab
            value="metrics"
            label={
              <AdminTabLabel icon={<ChartNoAxesCombined size={18} />}>
                {t("admin.nodeDetail.metrics", "用量统计")}
              </AdminTabLabel>
            }
          />
        </Tabs>
      </AdminSheetTabs>

      {tab === "overview" ? (
        <Box className="km-admin-sheet-panel admin-tab-panel">
          <Box
            sx={{
              display: "grid",
              alignItems: "stretch",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
            }}
          >
            <Surface sx={{ ...sectionCardSx, minWidth: 0 }}>
              <DetailSectionHeader
                icon={<Server size={18} />}
                title={t("admin.nodeDetail.overview", "概览")}
              />
              <Box
                sx={{
                  p: 2,
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "repeat(3, minmax(0, 1fr))",
                }}
              >
                <SpecTile
                  icon={<Server size={22} />}
                  label={t("admin.nodeDetail.config", "配置")}
                  value={plan}
                />
                <SpecTile
                  icon={<Cpu size={22} />}
                  label="VCPU"
                  value={displayOrEmpty(node.cpu_cores, (cores) => `${cores} vCPU`)}
                />
                <SpecTile
                  icon={<MemoryStick size={22} />}
                  label={t("admin.nodeDetail.memTotal", "内存")}
                  value={displayOrEmpty(node.mem_total, formatBytes)}
                />
                <SpecTile
                  icon={<HardDrive size={22} />}
                  label={t("admin.nodeDetail.diskTotal", "磁盘")}
                  value={displayOrEmpty(node.disk_total, formatBytes)}
                />
                <SpecTile
                  icon={<Wifi size={22} />}
                  label={t("admin.nodeDetail.traffic", "流量")}
                  value={
                    limit > 0
                      ? formatBytes(limit)
                      : t("admin.nodeDetail.unlimited", "未限流")
                  }
                />
                <SpecTile
                  icon={<Gauge size={22} />}
                  label={t("admin.nodeDetail.bandwidth", "带宽")}
                  value={displayOrEmpty(node.bandwidth)}
                />
              </Box>
            </Surface>

            <Surface sx={{ ...sectionCardSx, minWidth: 0 }}>
              <DetailSectionHeader
                icon={<Wifi size={18} />}
                title={t("admin.nodeDetail.traffic", "流量")}
              />
              <Box sx={{ p: 2, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  <TrafficStat
                    icon={<CheckCircle2 size={22} />}
                    label={t("admin.nodeDetail.remaining", "剩余")}
                    value={displayOrEmpty(remaining, formatBytes)}
                  />
                  <TrafficStat
                    icon={<ChartNoAxesCombined size={22} />}
                    label={t("admin.nodeDetail.used", "已用")}
                    value={displayOrEmpty(used, formatBytes)}
                  />
                  <TrafficStat
                    icon={<ArrowUp size={22} />}
                    label={t("admin.nodeDetail.outbound", "出站")}
                    value={displayOrEmpty(live?.network.totalUp, formatBytes)}
                  />
                  <TrafficStat
                    icon={<ArrowDown size={22} />}
                    label={t("admin.nodeDetail.inbound", "入站")}
                    value={displayOrEmpty(live?.network.totalDown, formatBytes)}
                  />
                </Box>
                <TrafficUsageProgress
                  label={t("admin.nodeDetail.trafficUsage", "流量使用率")}
                  percent={trafficPct}
                  detail={
                    used != null && limit > 0
                      ? `${formatBytes(used)} / ${formatBytes(limit)}`
                      : EMPTY_DISPLAY
                  }
                  available={used != null && limit > 0}
                />
              </Box>
            </Surface>

            <Surface sx={{ ...sectionCardSx, minWidth: 0 }}>
              <DetailSectionHeader
                icon={<Globe size={18} />}
                title={t("admin.nodeDetail.network", "网络信息")}
              />
              <Stack spacing={1.25} sx={{ p: 2, flex: 1, minHeight: 0 }}>
                <CopyRow
                  label={t("admin.nodeTable.region", "国家\\地区")}
                  value={location}
                  leading={countryFlag}
                />
                <CopyRow label="IPv4" value={displayOrEmpty(node.ipv4)} />
                <CopyRow label="IPv6" value={displayOrEmpty(node.ipv6)} />
                <CopyRow
                  label={t("admin.nodeDetail.uuid", "UUID")}
                  value={node.uuid}
                  leading={<Settings size={18} />}
                />
              </Stack>
            </Surface>
          </Box>
        </Box>
      ) : null}

      {tab === "billing" ? (
        <Box className="km-admin-sheet-panel admin-tab-panel">
          <BillingPanel node={node} onSaved={refresh} />
        </Box>
      ) : null}
      {tab === "metrics" ? (
        <Box className="km-admin-sheet-panel admin-tab-panel">
          <NodeUsageStats node={node} live={live} online={online === true} />
        </Box>
      ) : null}
    </Stack>
  );
}

function BillingPanel({ node, onSaved }: { node: NodeDetail; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [cycleEl, setCycleEl] = useState<null | HTMLElement>(null);
  const [trafficResetOpen, setTrafficResetOpen] = useState(false);
  const [ipChangeOpen, setIpChangeOpen] = useState(false);
  const [oneTimeFeeOpen, setOneTimeFeeOpen] = useState(false);
  const [currency] = useState(
    currencyForDisplay(node.currency || ""),
  );
  const [billingCycle, setBillingCycle] = useState(String(node.billing_cycle || 30));
  const [expiredAt, setExpiredAt] = useState(
    node.expired_at ? timestampToDateInput(node.expired_at) : "",
  );
  const [autoRenewal, setAutoRenewal] = useState(Boolean(node.auto_renewal));
  const displayPrice = node.price;
  const hasPrice = !isEmptyValue(displayPrice);
  const displayCycle = Number(node.billing_cycle) || 0;
  const hasCycle = !isEmptyValue(displayCycle);
  const displayExpired = expiredAt;
  const renewPriceLabel = hasPrice
    ? `${currency}${Number(displayPrice).toFixed(2)}${
        hasCycle ? ` / ${cycleLabel(Number(displayCycle || billingCycle), t)}` : ""
      }`
    : EMPTY_DISPLAY;

  const cycleOptions = useMemo(
    () => [
      { label: t("admin.nodeDetail.payMonthly", "月付"), value: "30" },
      { label: t("common.quarterly", "季付"), value: "92" },
      { label: t("common.semi_annual", "半年付"), value: "184" },
      { label: t("admin.nodeDetail.payYearly", "年付"), value: "365" },
      { label: t("common.biennial", "两年付"), value: "730" },
      { label: t("common.once", "一次性"), value: "-1" },
    ],
    [t],
  );

  const save = async (next?: {
    billing_cycle?: number;
    expired_at?: string | null;
    auto_renewal?: boolean;
  }) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: node.price ?? 0,
          billing_cycle: next?.billing_cycle ?? parseInt(billingCycle || "30", 10),
          expired_at:
            next && "expired_at" in next
              ? next.expired_at
              : expiredAt
                ? dateInputToISOString(expiredAt)
                : null,
          currency: currencyForStorage(currency),
          auto_renewal: next?.auto_renewal ?? autoRenewal,
        }),
      });
      toast.success(t("admin.nodeEdit.saveSuccess", "保存成功"));
      onSaved();
    } catch (error) {
      toast.error(`${t("admin.nodeEdit.saveError", "保存失败")}: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const actionSx = (bg: string, color: string) => ({
    textTransform: "none" as const,
    minHeight: 51,
    height: 51,
    borderRadius: "8px",
    bgcolor: bg,
    color,
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "none",
    "& .MuiButton-startIcon": { mr: 0.75, ml: 0 },
    "&:hover": { bgcolor: bg, boxShadow: "none", filter: "brightness(0.97)" },
  });

  return (
    <Stack spacing={2} data-testid="admin-node-billing">
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <Surface sx={{ ...sectionCardSx, minHeight: 238 }}>
          <DetailSectionHeader
            icon={<WalletCards size={18} />}
            title={t("admin.nodeDetail.billingInfo", "计费信息")}
          />
          <Stack spacing={1.25} sx={{ p: 1.5, flex: 1 }}>
            <DetailValueTile
              icon={<RefreshCw size={19} />}
              label={t("admin.nodeDetail.renewPrice", "续费价格")}
              value={renewPriceLabel}
              muted={!hasPrice}
            />
            <DetailValueTile
              icon={<Clock size={19} />}
              label={t("admin.nodeDetail.expiredAt", "到期时间")}
              value={displayExpired || EMPTY_DISPLAY}
              muted={!displayExpired}
            />
          </Stack>
        </Surface>

        <Surface sx={{ ...sectionCardSx, minHeight: 238 }}>
          <DetailSectionHeader
            icon={<Settings size={18} />}
            title={t("admin.nodeDetail.billingActions", "计费操作")}
          />
          <Box
            sx={{
              p: 1.5,
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <Button
              disabled={saving}
              startIcon={<Clock size={17} />}
              onClick={(event) => setCycleEl(event.currentTarget)}
              sx={actionSx(LITE_BLUE_SOFT_STRONG, LITE_BLUE)}
            >
              {t("admin.nodeDetail.changeCycle", "变更周期")}
            </Button>
            <Button
              disabled={saving}
              startIcon={<RefreshCw size={17} />}
              onClick={() => {
                const days = parseInt(billingCycle || "30", 10);
                const base = expiredAt ? new Date(`${expiredAt}T00:00:00`) : new Date();
                base.setDate(base.getDate() + Math.max(1, days));
                const next = timestampToDateInput(base);
                setExpiredAt(next);
                void save({ expired_at: dateInputToISOString(next) });
              }}
              sx={actionSx("rgba(34, 197, 94, 0.16)", "#118D57")}
            >
              {t("admin.nodeDetail.renewNow", "提前续费")}
            </Button>
            <Button
              startIcon={<ArrowRight size={17} />}
              onClick={() => setTrafficResetOpen(true)}
              sx={actionSx(LITE_BLUE_SOFT_STRONG, LITE_BLUE)}
            >
              {t("admin.nodeDetail.transfer", "流量重置")}
            </Button>
            <Button
              disabled={saving}
              startIcon={<CheckCircle2 size={17} />}
              onClick={() => {
                const next = !autoRenewal;
                setAutoRenewal(next);
                void save({ auto_renewal: next });
              }}
              sx={actionSx("rgba(34, 197, 94, 0.16)", "#118D57")}
            >
              {autoRenewal
                ? t("admin.nodeDetail.autoRenewOn", "自动续费中")
                : t("admin.nodeTable.autoRenewal", "自动续费")}
            </Button>
            <Button
              onClick={() => setIpChangeOpen(true)}
              sx={actionSx(LITE_BLUE_SOFT_STRONG, LITE_BLUE)}
            >
              {t("admin.nodeDetail.recordTrafficReset", "更换IP")}
            </Button>
            <Button
              onClick={() => setOneTimeFeeOpen(true)}
              sx={actionSx("rgba(34, 197, 94, 0.16)", "#118D57")}
            >
              {t("admin.nodeDetail.oneTimeFee", "一次性费用")}
            </Button>
          </Box>
          <Menu
            anchorEl={cycleEl}
            open={Boolean(cycleEl)}
            onClose={() => setCycleEl(null)}
            {...getAdminMenuProps(cycleEl?.clientWidth || 160)}
          >
            {cycleOptions.map((option) => (
              <MenuItem
                key={option.value}
                selected={option.value === billingCycle}
                onClick={() => {
                  setBillingCycle(option.value);
                  setCycleEl(null);
                  void save({ billing_cycle: parseInt(option.value, 10) });
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
          <TrafficResetCostDialog
            open={trafficResetOpen}
            node={node}
            onClose={() => setTrafficResetOpen(false)}
            onSaved={() => {
              setTrafficResetOpen(false);
              onSaved();
            }}
          />
          <IPChangeCostDialog
            open={ipChangeOpen}
            node={node}
            onClose={() => setIpChangeOpen(false)}
            onSaved={() => {
              setIpChangeOpen(false);
              onSaved();
            }}
          />
          <OneTimeFeeDialog
            open={oneTimeFeeOpen}
            node={node}
            onClose={() => setOneTimeFeeOpen(false)}
            onSaved={() => {
              setOneTimeFeeOpen(false);
              onSaved();
            }}
          />
        </Surface>
      </Box>
    </Stack>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function TrafficResetCostDialog({
  open,
  node,
  onClose,
  onSaved,
}: {
  open: boolean;
  node: NodeDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [allowance, setAllowance] = useState("");
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const currencyPrefix = currencyForDisplay(node.currency || "");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setAllowance(formatBytes(node.traffic_reset_allowance ?? 0));
    setIdempotencyKey(crypto.randomUUID());
  }, [open, node.traffic_reset_allowance]);

  const submit = async () => {
    if (!amount.trim()) return;
    const nextAllowance = stringToBytes(allowance);
    setSaving(true);
    try {
      await billingRequest(`/api/admin/client/${node.uuid}/billing/traffic-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount.trim(),
          currency: "",
          idempotency_key: idempotencyKey,
        }),
      });
      if (nextAllowance !== (node.traffic_reset_allowance ?? 0)) {
        await fetch(`/api/admin/client/${node.uuid}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traffic_reset_allowance: nextAllowance }),
        });
      }
      toast.success(t("admin.nodeDetail.trafficResetSaved", "流量重置费用已计入账单"));
      onSaved();
    } catch (error) {
      toast.error(`${t("admin.nodeDetail.trafficResetSaveFailed", "费用录入失败")}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <AppDialogContent maxWidth={440} className="km-node-dialog">
        <AdminDialog.Title>{t("admin.nodeDetail.transfer", "流量重置")}</AdminDialog.Title>
        <AdminDialog.Description>
          {t("admin.nodeDetail.trafficResetHint", "费用按点击确认时的北京时间计入当天账单；重置流量额度仅本周期有效。")}
        </AdminDialog.Description>
        <Flex direction="column" gap="3" className="km-node-dialog-fields">
          <div>
            <FieldLabel>{t("common.amount", "金额")}</FieldLabel>
            <AdminTextField.Root
              autoFocus
              required
              value={amount}
              placeholder="0.00"
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
            >
              {currencyPrefix ? (
                <AdminTextField.Slot>{currencyPrefix}</AdminTextField.Slot>
              ) : null}
            </AdminTextField.Root>
          </div>
          <div>
            <FieldLabel>{t("admin.nodeEdit.trafficResetAllowance", "重置流量额度")}</FieldLabel>
            <AdminTextField.Root
              value={allowance}
              onChange={(event) => setAllowance(event.target.value)}
              onBlur={() => setAllowance(formatBytes(stringToBytes(allowance)))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.nodeEdit.trafficResetAllowance_description", "同一计费周期可多次调整；与原流量限额相加，并在下个重置日自动归零。")}
            </p>
          </div>
        </Flex>
        <Flex gap="2" justify="end" className="km-node-dialog-actions">
          <AdminDialog.Close>
            <AdminButton variant="soft" color="gray" disabled={saving}>
              {t("common.cancel", "取消")}
            </AdminButton>
          </AdminDialog.Close>
          <AdminButton disabled={saving || !amount.trim()} onClick={() => void submit()}>
            {t("common.confirm", "确认")}
          </AdminButton>
        </Flex>
      </AppDialogContent>
    </AdminDialog.Root>
  );
}

function IPChangeCostDialog({
  open,
  node,
  onClose,
  onSaved,
}: {
  open: boolean;
  node: NodeDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const currencyPrefix = currencyForDisplay(node.currency || "");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setIdempotencyKey(crypto.randomUUID());
  }, [open]);

  const submit = async () => {
    if (!amount.trim()) return;
    setSaving(true);
    try {
      await billingRequest(`/api/admin/client/${node.uuid}/billing/ip-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount.trim(),
          currency: "",
          idempotency_key: idempotencyKey,
        }),
      });
      toast.success(t("admin.nodeDetail.ipChangeSaved", "更换 IP 费用已计入当天账单"));
      onSaved();
    } catch (error) {
      toast.error(`${t("admin.nodeDetail.ipChangeSaveFailed", "费用录入失败")}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <AppDialogContent maxWidth={400} className="km-node-dialog">
        <AdminDialog.Title>{t("admin.nodeDetail.recordTrafficReset", "更换IP")}</AdminDialog.Title>
        <AdminDialog.Description>
          {t("admin.nodeDetail.ipChangeHint", "费用按点击确认时的北京时间计入当天账单。")}
        </AdminDialog.Description>
        <div className="km-node-dialog-fields">
          <FieldLabel>{t("common.amount", "金额")}</FieldLabel>
          <AdminTextField.Root
            autoFocus
            required
            value={amount}
            placeholder="0.00"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
          >
            {currencyPrefix ? (
              <AdminTextField.Slot>{currencyPrefix}</AdminTextField.Slot>
            ) : null}
          </AdminTextField.Root>
        </div>
        <Flex gap="2" justify="end" className="km-node-dialog-actions">
          <AdminDialog.Close>
            <AdminButton variant="soft" color="gray" disabled={saving}>
              {t("common.cancel", "取消")}
            </AdminButton>
          </AdminDialog.Close>
          <AdminButton disabled={saving || !amount.trim()} onClick={() => void submit()}>
            {t("common.confirm", "确认")}
          </AdminButton>
        </Flex>
      </AppDialogContent>
    </AdminDialog.Root>
  );
}

function OneTimeFeeDialog({
  open,
  node,
  onClose,
  onSaved,
}: {
  open: boolean;
  node: NodeDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState(() => currencyForDisplay(node.currency || "$") || "$");
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const currencyOptions = BILLING_CURRENCY_OPTIONS.includes(currency)
    ? BILLING_CURRENCY_OPTIONS
    : [currency, ...BILLING_CURRENCY_OPTIONS];

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setNote("");
    setCurrency(currencyForDisplay(node.currency || "$") || "$");
    setIdempotencyKey(crypto.randomUUID());
  }, [open, node.currency]);

  const submit = async () => {
    if (!amount.trim()) return;
    setSaving(true);
    try {
      await billingRequest(`/api/admin/client/${node.uuid}/billing/one-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount.trim(),
          currency: currencyForStorage(currency),
          note: note.trim(),
          idempotency_key: idempotencyKey,
        }),
      });
      toast.success(t("admin.nodeDetail.oneTimeFeeSaved", "一次性费用已计入当月账单"));
      onSaved();
    } catch (error) {
      toast.error(`${t("admin.nodeDetail.oneTimeFeeSaveFailed", "费用录入失败")}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <AppDialogContent maxWidth={400} className="km-node-dialog">
        <AdminDialog.Title>{t("admin.nodeDetail.oneTimeFee", "一次性费用")}</AdminDialog.Title>
        <AdminDialog.Description>
          {t("admin.nodeDetail.oneTimeFeeHint", "费用按点击确认时的北京时间计入当月附加费用。")}
        </AdminDialog.Description>
        <Flex direction="column" gap="3" className="km-node-dialog-fields">
          <div>
            <FieldLabel>{t("common.amount", "金额")}</FieldLabel>
            <div className="flex items-center gap-2">
              <AdminSelect.Root value={currency} onValueChange={setCurrency}>
                <AdminSelect.Trigger
                  aria-label={t("admin.nodeTable.currency", "货币")}
                  className="w-[4.75rem]"
                />
                <AdminSelect.Content>
                  {currencyOptions.map((option) => (
                    <AdminSelect.Item key={option} value={option}>{option}</AdminSelect.Item>
                  ))}
                </AdminSelect.Content>
              </AdminSelect.Root>
              <AdminTextField.Root
                autoFocus
                required
                value={amount}
                placeholder="0.00"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          <div>
            <FieldLabel>{t("common.remark", "备注")}</FieldLabel>
            <AdminTextField.Root
              value={note}
              placeholder={t("admin.nodeDetail.oneTimeFeeNotePlaceholder", "例如：服务器溢价、线路升级、补差价")}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </Flex>
        <Flex gap="2" justify="end" className="km-node-dialog-actions">
          <AdminDialog.Close>
            <AdminButton variant="soft" color="gray" disabled={saving}>
              {t("common.cancel", "取消")}
            </AdminButton>
          </AdminDialog.Close>
          <AdminButton disabled={saving || !amount.trim()} onClick={() => void submit()}>
            {t("common.confirm", "确认")}
          </AdminButton>
        </Flex>
      </AppDialogContent>
    </AdminDialog.Root>
  );
}
