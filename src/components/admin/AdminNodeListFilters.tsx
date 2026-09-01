import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import Flag from "@/components/Flag";
import AdminMultiSelect from "@/components/admin/AdminMultiSelect";
import { Filter, FilterOff, Search, X } from "@/components/admin/muiIcons";
import { ADMIN_LIST_FILTERS_BAR_SX, ADMIN_LIST_SEARCH_SX } from "@/components/admin/adminListLayout";
import type { NodeDetail } from "@/contexts/NodeDetailsContext";
import { NODE_OFFLINE, NODE_ONLINE } from "@/theme/brand";
import { getRegionCode, getRegionDisplayName } from "@/utils/regionHelper";

type RegionOption = {
  key: string;
  region: string;
  count: number;
};

type GroupOption = {
  key: string;
  label: string;
  count: number;
};

export type AdminNodeStatusValue = "online" | "offline";

export default function AdminNodeListFilters({
  nodes,
  onlineSet,
  available,
  resultCount,
  searchTerm,
  onSearchTermChange,
  statusFilters,
  onStatusFiltersChange,
  regionFilters,
  onRegionFiltersChange,
  groupFilters,
  onGroupFiltersChange,
  searchPlaceholder,
  endAction,
  alertChip,
}: {
  nodes: NodeDetail[];
  onlineSet: ReadonlySet<string>;
  available: boolean;
  resultCount: number;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilters: AdminNodeStatusValue[];
  onStatusFiltersChange: (value: AdminNodeStatusValue[]) => void;
  regionFilters: string[];
  onRegionFiltersChange: (value: string[]) => void;
  groupFilters: string[];
  onGroupFiltersChange: (value: string[]) => void;
  searchPlaceholder?: string;
  endAction?: ReactNode;
  alertChip?: { label: string; onClear: () => void } | null;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh") ? "zh" : "en";
  const online = onlineSet.size;
  const offline = Math.max(0, nodes.length - online);

  const regionOptions = useMemo(() => {
    const map = new Map<string, RegionOption>();
    for (const node of nodes) {
      const key = getRegionCode(node.region) || "UN";
      const current = map.get(key);
      if (current) {
        current.count += 1;
        continue;
      }
      map.set(key, { key, region: node.region, count: 1 });
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [nodes]);

  const groupOptions = useMemo(() => {
    const map = new Map<string, GroupOption>();
    for (const node of nodes) {
      const name = node.group?.trim() || "";
      const key = name || "__none__";
      const current = map.get(key);
      if (current) {
        current.count += 1;
        continue;
      }
      map.set(key, {
        key,
        label: name || t("admin.nodeTable.ungrouped", "未分组"),
        count: 1,
      });
    }
    return [...map.values()].sort((a, b) => {
      if (a.key === "__none__") return 1;
      if (b.key === "__none__") return -1;
      return a.label.localeCompare(b.label, lang === "zh" ? "zh" : "en");
    });
  }, [lang, nodes, t]);

  const regionLabel = (region: string, code: string) => {
    const name = getRegionDisplayName(region, lang);
    return name && name !== region ? `${name} (${code})` : code;
  };

  const selectedRegions = regionOptions.filter((item) => regionFilters.includes(item.key));
  const selectedGroups = groupOptions.filter((item) => groupFilters.includes(item.key));

  const hasActive =
    Boolean(searchTerm.trim()) ||
    statusFilters.length > 0 ||
    regionFilters.length > 0 ||
    groupFilters.length > 0 ||
    Boolean(alertChip);
  const activeFilterCount =
    statusFilters.length +
    regionFilters.length +
    groupFilters.length +
    (searchTerm.trim() ? 1 : 0) +
    (alertChip ? 1 : 0);

  const clearAll = () => {
    onSearchTermChange("");
    onStatusFiltersChange([]);
    onRegionFiltersChange([]);
    onGroupFiltersChange([]);
    alertChip?.onClear();
  };

  return (
    <Box className="km-admin-node-list-filters" sx={ADMIN_LIST_FILTERS_BAR_SX}>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{
          flexWrap: { xs: "wrap", md: "nowrap" },
          alignItems: "center",
        }}
      >
        <AdminMultiSelect
          label={t("admin.nodeTable.region", "国家\\地区")}
          ariaLabel={t("admin.nodeTable.region", "国家\\地区")}
          value={regionFilters}
          onChange={onRegionFiltersChange}
          options={regionOptions.map((option) => ({
            value: option.key,
            label: regionLabel(option.region, option.key),
            icon: <Flag flag={option.region} compact />,
            secondary: t("admin.nodeTable.filterCount", {
              count: option.count,
              defaultValue: "{{count}} 个节点",
            }),
          }))}
        />

        <AdminMultiSelect
          label={t("common.status", "状态")}
          ariaLabel={t("common.status", "状态")}
          value={statusFilters}
          onChange={(value) => onStatusFiltersChange(value as AdminNodeStatusValue[])}
          options={[
            {
              value: "online",
              label: t("nodeCard.online", "在线"),
              dot: NODE_ONLINE,
              secondary: available
                ? t("admin.nodeTable.filterCount", {
                    count: online,
                    defaultValue: "{{count}} 个节点",
                  })
                : "--",
              disabled: !available,
            },
            {
              value: "offline",
              label: t("nodeCard.offline", "离线"),
              dot: NODE_OFFLINE,
              secondary: available
                ? t("admin.nodeTable.filterCount", {
                    count: offline,
                    defaultValue: "{{count}} 个节点",
                  })
                : "--",
              disabled: !available,
            },
          ]}
        />

        <AdminMultiSelect
          label={t("common.group", "分组")}
          ariaLabel={t("common.group", "分组")}
          value={groupFilters}
          onChange={onGroupFiltersChange}
          options={groupOptions.map((option) => ({
            value: option.key,
            label: option.label,
            secondary: t("admin.nodeTable.filterCount", {
              count: option.count,
              defaultValue: "{{count}} 个节点",
            }),
          }))}
        />

        <TextField
          size="small"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={
            searchPlaceholder ??
            t("admin.nodeTable.searchPlaceholder", "搜索名称、IP、备注、标签、分组...")
          }
          sx={ADMIN_LIST_SEARCH_SX}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
        {endAction}
      </Stack>

      <Collapse
        in={hasActive}
        timeout={{ enter: 260, exit: 180 }}
        easing={{
          enter: "cubic-bezier(0.22, 1, 0.36, 1)",
          exit: "cubic-bezier(0.4, 0, 1, 1)",
        }}
        unmountOnExit
        sx={{
          "& .km-admin-active-filters": {
            opacity: 0,
            transform: "translateY(-6px)",
            transformOrigin: "top left",
            transition:
              "opacity 150ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          },
          "&.MuiCollapse-entered .km-admin-active-filters": {
            opacity: 1,
            transform: "translateY(0)",
            transitionDelay: "20ms",
          },
        }}
      >
        <Stack className="km-admin-active-filters" spacing={1.1} sx={{ pt: 1.75 }}>
          <Stack
            direction="row"
            spacing={1.25}
            useFlexGap
            sx={{ flexWrap: "wrap", alignItems: "center" }}
          >
            <Typography
              component="div"
              color="text.secondary"
              sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5, fontSize: 13 }}
            >
              <Box
                component="span"
                sx={{ color: "text.primary", fontSize: 22, fontWeight: 700, lineHeight: 1 }}
              >
                {resultCount}
              </Box>
              {t("admin.nodeTable.matchResultSuffix", "个匹配结果")}
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                color: "primary.main",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Filter size={14} />
              {t("admin.nodeTable.activeFilterCount", {
                count: activeFilterCount,
                defaultValue: "{{count}} 个筛选条件",
              })}
            </Box>
          </Stack>
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "center",
              "& .km-admin-filter-chip": {
                animation: "adminFilterChipIn 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              },
              "@keyframes adminFilterChipIn": {
                from: { opacity: 0, transform: "translateY(-3px) scale(0.96)" },
                to: { opacity: 1, transform: "translateY(0) scale(1)" },
              },
            }}
          >
            {statusFilters.map((status) => (
              <Chip
                key={status}
                className="km-admin-filter-chip"
                size="small"
                onDelete={() => onStatusFiltersChange(statusFilters.filter((item) => item !== status))}
                deleteIcon={<X size={14} />}
                label={
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: status === "online" ? NODE_ONLINE : NODE_OFFLINE,
                      }}
                    />
                    <span>
                      {t("common.status", "状态")}: {status === "online" ? t("nodeCard.online", "在线") : t("nodeCard.offline", "离线")}
                    </span>
                  </Stack>
                }
                sx={{ bgcolor: status === "online" ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 86, 48, 0.12)" }}
              />
            ))}
            {selectedRegions.map((region) => (
              <Chip
                key={region.key}
                className="km-admin-filter-chip"
                size="small"
                onDelete={() => onRegionFiltersChange(regionFilters.filter((item) => item !== region.key))}
                deleteIcon={<X size={14} />}
                label={`${t("admin.nodeTable.region", "国家\\地区")}: ${regionLabel(region.region, region.key)}`}
              />
            ))}
            {selectedGroups.map((group) => (
              <Chip
                key={group.key}
                className="km-admin-filter-chip"
                size="small"
                onDelete={() => onGroupFiltersChange(groupFilters.filter((item) => item !== group.key))}
                deleteIcon={<X size={14} />}
                label={`${t("common.group", "分组")}: ${group.label}`}
              />
            ))}
            {searchTerm.trim() ? (
              <Chip
                className="km-admin-filter-chip"
                size="small"
                onDelete={() => onSearchTermChange("")}
                deleteIcon={<X size={14} />}
                label={`${t("common.search", "搜索")}: ${searchTerm.trim()}`}
              />
            ) : null}
            {alertChip ? (
              <Chip
                className="km-admin-filter-chip"
                size="small"
                onDelete={alertChip.onClear}
                deleteIcon={<X size={14} />}
                label={alertChip.label}
              />
            ) : null}
            <Button
              color="error"
              size="small"
              onClick={clearAll}
              startIcon={<FilterOff size={16} />}
              sx={{ ml: 0.5 }}
            >
              {t("admin.nodeTable.clearAllFilters", "清除全部")}
            </Button>
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}
