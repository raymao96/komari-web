import type { Theme } from "@mui/material/styles";

import { ADMIN_MENU_FONT_SIZE } from "@/components/admin/adminMenu";
import { INPUT_FILL_DARK, LITE_BLUE, NEBURST_NEUTRAL } from "@/theme/brand";

export const FILTER_BAR = NEBURST_NEUTRAL;
export const FILTER_FIELD = "#FFFFFF";

const fieldFill = (theme: Theme) =>
  theme.palette.mode === "dark" ? INPUT_FILL_DARK : FILTER_FIELD;

export const ADMIN_LIST_FILTERS_BAR_SX = {
  bgcolor: (theme: Theme) =>
    theme.palette.mode === "dark" ? theme.palette.background.default : FILTER_BAR,
};

export const ADMIN_FILTER_MENU_ITEM_SX = {
  gap: 1,
  "&.Mui-selected": { bgcolor: "transparent" },
  "&.Mui-selected:hover": { bgcolor: "action.hover" },
};

export const ADMIN_LIST_FIELD_SX = {
  flex: { xs: "1 1 calc(50% - 12px)", md: "0 1 auto" },
  minWidth: { xs: 0, md: 132 },
  bgcolor: "transparent",
  "& .MuiInputLabel-root": {
    color: "text.secondary",
    fontSize: ADMIN_MENU_FONT_SIZE,
    fontWeight: 500,
    transform: "translate(14px, 9px) scale(1)",
    transition:
      "color 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": {
    transform: "translate(14px, -8px) scale(0.75)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: LITE_BLUE,
  },
  "&.km-admin-filter-control:not(.is-open) .MuiInputLabel-root.Mui-focused": {
    color: "text.secondary",
  },
  "&.km-admin-filter-control.is-open .MuiInputLabel-root": {
    color: LITE_BLUE,
  },
  "& .MuiOutlinedInput-root": {
    bgcolor: fieldFill,
    borderRadius: "8px",
    fontSize: ADMIN_MENU_FONT_SIZE,
    minHeight: 40,
    height: 40,
    transition: "background-color 180ms ease, box-shadow 180ms ease",
    "& fieldset": {
      borderRadius: "8px",
      transition: "border-color 180ms ease, border-width 180ms ease",
    },
    "& legend": {
      transition: "max-width 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    "&.Mui-focused fieldset": { borderColor: `${LITE_BLUE} !important` },
  },
  "&.km-admin-filter-control:not(.is-open) .km-admin-filter-select.Mui-focused fieldset": {
    borderColor: "var(--gray-a5) !important",
    borderWidth: "1px",
  },
  "&.km-admin-filter-control:not(.is-open) .km-admin-filter-select.Mui-focused": {
    boxShadow: "none",
  },
  "&.km-admin-filter-control:not(.is-open) .km-admin-filter-select:focus-visible fieldset": {
    borderColor: `${LITE_BLUE} !important`,
    borderWidth: "2px",
  },
  "&.km-admin-filter-control.is-open .km-admin-filter-select fieldset": {
    borderColor: `${LITE_BLUE} !important`,
    borderWidth: "2px",
  },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    py: 0,
    height: 40,
    boxSizing: "border-box",
    fontSize: ADMIN_MENU_FONT_SIZE,
    fontWeight: 500,
    lineHeight: "22px",
  },
  "& .MuiSelect-icon": {
    transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  "& .MuiSelect-iconOpen": {
    transform: "rotate(180deg)",
  },
};

export const ADMIN_LIST_SEARCH_SX = {
  flex: { xs: "1 1 100%", md: "1 1 160px" },
  minWidth: { xs: "100%", md: 160 },
  bgcolor: "transparent",
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    bgcolor: (theme: Theme) => `${fieldFill(theme)} !important`,
    fontSize: ADMIN_MENU_FONT_SIZE,
    minHeight: 40,
    height: 40,
    transition: "background-color 180ms ease, box-shadow 180ms ease",
    "& fieldset": {
      borderRadius: "8px",
      transition: "border-color 180ms ease, border-width 180ms ease",
    },
    "&.Mui-focused fieldset": { borderColor: `${LITE_BLUE} !important` },
    "& .MuiInputAdornment-root": {
      color: "text.secondary",
      transition: "color 180ms ease",
    },
    "&.Mui-focused .MuiInputAdornment-root": { color: LITE_BLUE },
  },
  "& .MuiInputBase-input": {
    fontSize: ADMIN_MENU_FONT_SIZE,
    fontWeight: 500,
    lineHeight: "22px",
    height: 40,
    py: 0,
    display: "flex",
    alignItems: "center",
  },
};

export const ADMIN_LIST_ACTION_SX = {
  textTransform: "none" as const,
  fontWeight: 700,
  fontSize: 14.5,
  height: 40,
  minHeight: 40,
  px: 1.75,
  borderRadius: "8px",
  boxShadow: "none",
  "&:hover": { boxShadow: "none" },
  "& .MuiButton-startIcon": { mr: 0.75, ml: 0 },
};

export const ADMIN_LIST_OUTLINE_SX = {
  ...ADMIN_LIST_ACTION_SX,
  bgcolor: "background.paper",
  borderColor: "rgba(145, 158, 171, 0.32)",
  color: "text.primary",
  "&:hover": {
    boxShadow: "none",
    bgcolor: "background.paper",
    borderColor: "rgba(145, 158, 171, 0.48)",
  },
};
