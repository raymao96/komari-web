import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import PopoverBase from "@mui/material/Popover";
import TooltipBase from "@mui/material/Tooltip";
import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { adminMenuProps } from "@/components/admin/adminMenu";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within Tabs.Root");
  return ctx;
};

const TabsRoot = ({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
  className?: string;
}) => {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const current = value ?? uncontrolled;
  return (
    <TabsContext.Provider
      value={{
        value: current,
        onValueChange: (next) => {
          if (value === undefined) setUncontrolled(next);
          onValueChange?.(next);
        },
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = forwardRef<HTMLDivElement, { className?: string; children?: ReactNode }>(
  function TabsList({ className, children }, ref) {
    return (
      <div ref={ref} role="tablist" className={className}>
        {children}
      </div>
    );
  },
);
TabsList.displayName = "TabsList";

const TabsTrigger = forwardRef<
  HTMLButtonElement,
  { value: string; className?: string; children?: ReactNode }
>(function TabsTrigger({ value, className, children }, ref) {
  const ctx = useTabs();
  const selected = ctx.value === value;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={selected}
      data-state={selected ? "active" : "inactive"}
      className={cn("MuiTab-root", selected && "Mui-selected", className)}
      onClick={() => ctx.onValueChange(value)}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children?: ReactNode;
}) => {
  const ctx = useTabs();
  if (ctx.value !== value) return null;
  return (
    <div className={className} data-state="active" role="tabpanel">
      {children}
    </div>
  );
};
TabsContent.displayName = "TabsContent";

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};

type MenuContextValue = {
  anchor: HTMLElement | null;
  setAnchor: (el: HTMLElement | null) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

function DropdownTrigger({
  children,
  asChild,
}: {
  children?: ReactNode;
  asChild?: boolean;
}) {
  const ctx = useContext(MenuContext);
  if (!ctx) return <>{children}</>;
  const onClick = (event: MouseEvent<HTMLElement>) => {
    (children as ReactElement<any>)?.props?.onClick?.(event);
    ctx.setAnchor(event.currentTarget);
  };
  if (isValidElement(children) && (asChild || true)) {
    return cloneElement(children as ReactElement<any>, { onClick });
  }
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}
DropdownTrigger.displayName = "DropdownMenuTrigger";

function DropdownItem({
  children,
  onSelect,
  color,
  disabled,
}: {
  children?: ReactNode;
  onSelect?: (event: Event) => void;
  color?: string;
  disabled?: boolean;
}) {
  const ctx = useContext(MenuContext);
  return (
    <MenuItem
      disabled={disabled}
      onClick={() => {
        onSelect?.({ preventDefault() {} } as Event);
        ctx?.setAnchor(null);
      }}
      sx={color === "orange" || color === "red" ? { color: "warning.main" } : undefined}
    >
      {children}
    </MenuItem>
  );
}
DropdownItem.displayName = "DropdownMenuItem";

function DropdownSeparator() {
  return <Divider sx={{ my: 0.5 }} />;
}
DropdownSeparator.displayName = "DropdownMenuSeparator";

function DropdownContent({
  children,
}: {
  children?: ReactNode;
  align?: string;
  className?: string;
}) {
  const ctx = useContext(MenuContext);
  if (!ctx) return null;
  return (
    <Menu
      open={Boolean(ctx.anchor)}
      anchorEl={ctx.anchor}
      onClose={() => ctx.setAnchor(null)}
      {...adminMenuProps}
    >
      {children}
    </Menu>
  );
}
DropdownContent.displayName = "DropdownMenuContent";

function DropdownRoot({ children }: { children?: ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <MenuContext.Provider value={{ anchor, setAnchor }}>{children}</MenuContext.Provider>
  );
}

export const DropdownMenu = {
  Root: DropdownRoot,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: DropdownSeparator,
};

const PopoverContext = createContext<MenuContextValue | null>(null);

function PopoverTrigger({ children }: { children?: ReactNode }) {
  const ctx = useContext(PopoverContext);
  if (!ctx) return <>{children}</>;
  const onClick = (event: MouseEvent<HTMLElement>) => {
    (children as ReactElement<any>)?.props?.onClick?.(event);
    ctx.setAnchor(ctx.anchor ? null : event.currentTarget);
  };
  if (isValidElement(children)) {
    return cloneElement(children as ReactElement<any>, { onClick });
  }
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}
PopoverTrigger.displayName = "PopoverTrigger";

function PopoverContent({
  children,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  side?: string;
  sideOffset?: number;
  align?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ctx = useContext(PopoverContext);
  if (!ctx) return null;
  return (
    <PopoverBase
      open={Boolean(ctx.anchor)}
      anchorEl={ctx.anchor}
      onClose={() => ctx.setAnchor(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: {
          className,
          style,
          onMouseEnter,
          onMouseLeave,
          sx: { p: 1, borderRadius: "8px", mt: 0.5 },
        },
      }}
    >
      <Box>{children}</Box>
    </PopoverBase>
  );
}
PopoverContent.displayName = "PopoverContent";

function PopoverRoot({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const set = (el: HTMLElement | null) => {
    setAnchor(el);
    onOpenChange?.(Boolean(el));
  };
  const value = useMemo(
    () => ({
      anchor: open === false ? null : anchor,
      setAnchor: set,
    }),
    [anchor, open],
  );
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
};

export function Tooltip({
  content,
  children,
}: {
  content?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <TooltipBase title={content ?? ""}>
      <Box component="span" sx={{ display: "inline-flex", minWidth: 0 }}>
        {children}
      </Box>
    </TooltipBase>
  );
}
