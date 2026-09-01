import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Check } from "@/components/admin/muiIcons";

type SelectFrameState = {
  labelId: string | undefined;
  notched: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function AdminFilterSelectFrame({
  label,
  hasValue,
  controlClassName,
  fullWidth = false,
  disabled,
  sx,
  children,
}: {
  label?: string;
  hasValue: boolean;
  controlClassName: string;
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  children: (state: SelectFrameState) => ReactNode;
}) {
  const generatedId = useId();
  const labelId = label ? `${generatedId}-label` : undefined;
  const controlRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => () => {
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
  }, []);

  const close = () => {
    setOpen(false);
    const releaseFocus = () => {
      controlRef.current?.querySelector<HTMLElement>('[role="combobox"]')?.blur();
    };
    window.requestAnimationFrame(releaseFocus);
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(releaseFocus, 180);
  };

  return (
    <FormControl
      ref={controlRef}
      className={`km-admin-filter-control ${controlClassName}${open ? " is-open" : ""}`}
      fullWidth={fullWidth}
      size="small"
      disabled={disabled}
      sx={sx}
    >
      {label ? <InputLabel id={labelId} shrink={open || hasValue}>{label}</InputLabel> : null}
      {children({
        labelId,
        notched: open || hasValue,
        open,
        onOpen: () => setOpen(true),
        onClose: close,
      })}
    </FormControl>
  );
}

export function AdminFilterOptionContent({
  selected,
  label,
  secondary,
  icon,
  dot,
}: {
  selected: boolean;
  label: ReactNode;
  secondary?: ReactNode;
  icon?: ReactNode;
  dot?: string;
}) {
  return (
    <>
      <Box
        aria-hidden="true"
        sx={{
          display: "inline-flex",
          width: 16,
          height: 16,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          color: "primary.main",
        }}
      >
        {selected ? <Check size={16} strokeWidth={2.5} /> : null}
      </Box>
      {dot ? (
        <Box
          aria-hidden="true"
          sx={{ width: 7, height: 7, flexShrink: 0, borderRadius: "50%", bgcolor: dot }}
        />
      ) : null}
      {icon ? (
        <Box sx={{ display: "inline-flex", flexShrink: 0, alignItems: "center", lineHeight: 0 }}>
          {icon}
        </Box>
      ) : null}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
          {label}
        </Box>
        {secondary ? (
          <Box sx={{ mt: 0.25, color: "text.secondary", fontSize: 12, lineHeight: 1.2 }}>
            {secondary}
          </Box>
        ) : null}
      </Box>
    </>
  );
}
