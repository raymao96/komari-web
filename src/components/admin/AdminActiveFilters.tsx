import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Filter, FilterOff, X } from "@/components/admin/muiIcons";

export type AdminActiveFilterChip = {
  key: string;
  label: ReactNode;
  onDelete: () => void;
  sx?: SxProps<Theme>;
};

export function AdminActiveFilters({
  resultCount,
  chips,
  onClearAll,
}: {
  resultCount: number;
  chips: AdminActiveFilterChip[];
  onClearAll: () => void;
}) {
  const { t } = useTranslation();
  const hasActive = chips.length > 0;

  return (
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
              count: chips.length,
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
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              className="km-admin-filter-chip"
              size="small"
              onDelete={chip.onDelete}
              deleteIcon={<X size={14} />}
              label={chip.label}
              sx={chip.sx}
            />
          ))}
          <Button
            color="error"
            size="small"
            onClick={onClearAll}
            startIcon={<FilterOff size={16} />}
            sx={{ ml: 0.5 }}
          >
            {t("admin.nodeTable.clearAllFilters", "清除全部")}
          </Button>
        </Stack>
      </Stack>
    </Collapse>
  );
}
