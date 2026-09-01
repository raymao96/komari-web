import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

import {
  AdminFilterOptionContent,
  AdminFilterSelectFrame,
} from "@/components/admin/AdminFilterSelect";
import {
  ADMIN_FILTER_MENU_ITEM_SX,
  ADMIN_LIST_FIELD_SX,
} from "@/components/admin/adminListLayout";
import { getAdminMenuProps } from "@/components/admin/adminMenu";

export type AdminMultiSelectOption = {
  value: string;
  label: string;
  secondary?: ReactNode;
  icon?: ReactNode;
  dot?: string;
  disabled?: boolean;
};

export default function AdminMultiSelect({
  label,
  placeholder,
  ariaLabel,
  options,
  value,
  onChange,
  fullWidth = false,
  disabled,
  menuMinWidth,
  sx,
}: {
  label?: string;
  placeholder?: string;
  ariaLabel: string;
  options: AdminMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  fullWidth?: boolean;
  disabled?: boolean;
  menuMinWidth?: number;
  sx?: SxProps<Theme>;
}) {
  const optionByValue = new Map(options.map((option) => [option.value, option]));
  const controlSx = sx
    ? ([ADMIN_LIST_FIELD_SX, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>)
    : ADMIN_LIST_FIELD_SX;

  return (
    <AdminFilterSelectFrame
      label={label}
      hasValue={value.length > 0}
      controlClassName="km-admin-multi-select-control"
      fullWidth={fullWidth}
      disabled={disabled}
      sx={controlSx}
    >
      {({ labelId, notched, open, onOpen, onClose }) => (
        <Select<string[]>
          className={`km-admin-filter-select km-admin-multi-select${open ? " is-open" : ""}`}
          multiple
          displayEmpty={!label}
          labelId={labelId}
          label={label}
          notched={notched}
          value={value}
          open={open}
          onOpen={onOpen}
          onClose={onClose}
          inputProps={{ "aria-label": ariaLabel }}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(
              typeof nextValue === "string"
                ? nextValue.split(",").filter(Boolean)
                : nextValue,
            );
          }}
          renderValue={(selected) => {
            if (selected.length === 0) {
              return (
                <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                  {placeholder || ""}
                </Box>
              );
            }
            return (
              <Box
                component="span"
                sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {selected.map((item) => optionByValue.get(item)?.label || item).join("、")}
              </Box>
            );
          }}
          MenuProps={getAdminMenuProps(menuMinWidth)}
        >
          {options.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              disableRipple
              sx={ADMIN_FILTER_MENU_ITEM_SX}
            >
              <AdminFilterOptionContent
                selected={value.includes(option.value)}
                label={option.label}
                secondary={option.secondary}
                icon={option.icon}
                dot={option.dot}
              />
            </MenuItem>
          ))}
        </Select>
      )}
    </AdminFilterSelectFrame>
  );
}
