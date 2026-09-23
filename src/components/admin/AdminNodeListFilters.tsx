import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import Flag from "@/components/Flag";
import { AdminActiveFilters } from "@/components/admin/AdminActiveFilters";
import AdminMultiSelect from "@/components/admin/AdminMultiSelect";
import { Search } from "@/components/admin/muiIcons";
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
          label={t("admin.nodeTable.region", "国家/地区")}
          ariaLabel={t("admin.nodeTable.region", "国家/地区")}
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

      <AdminActiveFilters
        resultCount={resultCount}
        onClearAll={clearAll}
        chips={[
          ...statusFilters.map((status) => ({
            key: `status-${status}`,
            onDelete: () =>
              onStatusFiltersChange(statusFilters.filter((item) => item !== status)),
            sx: {
              bgcolor:
                status === "online" ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 86, 48, 0.12)",
            },
            label: (
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
                  {t("common.status", "状态")}:{" "}
                  {status === "online"
                    ? t("nodeCard.online", "在线")
                    : t("nodeCard.offline", "离线")}
                </span>
              </Stack>
            ),
          })),
          ...selectedRegions.map((region) => ({
            key: `region-${region.key}`,
            onDelete: () =>
              onRegionFiltersChange(regionFilters.filter((item) => item !== region.key)),
            label: `${t("admin.nodeTable.region", "国家/地区")}: ${regionLabel(region.region, region.key)}`,
          })),
          ...selectedGroups.map((group) => ({
            key: `group-${group.key}`,
            onDelete: () =>
              onGroupFiltersChange(groupFilters.filter((item) => item !== group.key)),
            label: `${t("common.group", "分组")}: ${group.label}`,
          })),
          ...(searchTerm.trim()
            ? [
                {
                  key: "search",
                  onDelete: () => onSearchTermChange(""),
                  label: `${t("common.search", "搜索")}: ${searchTerm.trim()}`,
                },
              ]
            : []),
          ...(alertChip
            ? [
                {
                  key: "alert",
                  onDelete: alertChip.onClear,
                  label: alertChip.label,
                },
              ]
            : []),
        ]}
      />
    </Box>
  );
}
