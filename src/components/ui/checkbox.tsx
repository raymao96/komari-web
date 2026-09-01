import MuiCheckbox from "@mui/material/Checkbox";
import type { ComponentProps } from "react";

type CheckedState = boolean | "indeterminate";

type CheckboxProps = Omit<
  ComponentProps<typeof MuiCheckbox>,
  "checked" | "defaultChecked" | "onChange" | "size"
> & {
  checked?: CheckedState;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: CheckedState) => void;
};

function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  className,
  sx,
  ...props
}: CheckboxProps) {
  const controlled = checked !== undefined;
  const indeterminate = checked === "indeterminate";

  return (
    <MuiCheckbox
      {...props}
      data-slot="checkbox"
      className={className}
      size="small"
      disableRipple
      indeterminate={indeterminate}
      {...(controlled
        ? { checked: indeterminate ? false : checked }
        : { defaultChecked })}
      onChange={(_, next) => onCheckedChange?.(next)}
      sx={{
        width: 32,
        height: 32,
        p: 0.75,
        flexShrink: 0,
        color: "text.secondary",
        "& .MuiSvgIcon-root": { fontSize: 20 },
        ...(Array.isArray(sx) ? Object.assign({}, ...sx) : sx),
      }}
    />
  );
}

export { Checkbox };
