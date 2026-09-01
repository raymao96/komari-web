import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  AdminFilterOptionContent,
  AdminFilterSelectFrame,
} from "@/components/admin/AdminFilterSelect";
import { getAdminMenuProps } from "@/components/admin/adminMenu";
import {
  ADMIN_FILTER_MENU_ITEM_SX,
  ADMIN_LIST_FIELD_SX,
  ADMIN_LIST_FILTERS_BAR_SX,
  ADMIN_LIST_SEARCH_SX,
} from "@/components/admin/adminListLayout";
import { Search } from "@/components/admin/muiIcons";
import { cn } from "@/lib/utils";

export function AdminListShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("km-admin-node-list", className)}>{children}</div>;
}

export function AdminListFiltersBar({ children }: { children: ReactNode }) {
  return (
    <Box className="km-admin-node-list-filters" sx={ADMIN_LIST_FILTERS_BAR_SX}>
      {children}
    </Box>
  );
}

export function AdminListSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const selectedLabel = (selected: unknown): ReactNode => {
    if (selected === "" || selected == null) {
      return "";
    }
    const findLabel = (nodes: ReactNode): ReactNode => {
      let match: ReactNode;
      Children.forEach(nodes, (child) => {
        if (match !== undefined || !isValidElement(child)) return;
        const props = child.props as { value?: unknown; children?: ReactNode };
        if (props.value !== undefined && String(props.value) === String(selected)) {
          match = props.children;
          return;
        }
        match = findLabel(props.children);
      });
      return match;
    };
    return findLabel(children) ?? String(selected);
  };
  const menuChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as {
      value?: unknown;
      children?: ReactNode;
      sx?: object;
    };
    const selected = String(props.value ?? "") === String(value ?? "");
    return cloneElement(child as ReactElement<any>, {
      disableRipple: true,
      sx: {
        ...props.sx,
        ...ADMIN_FILTER_MENU_ITEM_SX,
      },
      children: (
        <AdminFilterOptionContent selected={selected} label={props.children} />
      ),
    });
  });

  return (
    <AdminFilterSelectFrame
      label={label}
      hasValue={value !== ""}
      controlClassName="km-admin-list-select-control"
      sx={ADMIN_LIST_FIELD_SX}
      disabled={disabled}
    >
      {({ labelId, notched, open, onOpen, onClose }) => (
        <Select
          className={`km-admin-filter-select km-admin-list-select${open ? " is-open" : ""}`}
          labelId={labelId}
          label={label}
          notched={notched}
          value={value}
          displayEmpty
          open={open}
          onOpen={onOpen}
          onClose={onClose}
          inputProps={{ "aria-label": label }}
          renderValue={selectedLabel}
          onChange={(event) => onChange(String(event.target.value))}
          MenuProps={getAdminMenuProps()}
        >
          {menuChildren}
        </Select>
      )}
    </AdminFilterSelectFrame>
  );
}

export function AdminListSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
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
  );
}
