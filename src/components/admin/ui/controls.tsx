import ButtonBase from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import IconButtonBase from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import SelectBase from "@mui/material/Select";
import SkeletonBase from "@mui/material/Skeleton";
import SwitchBase from "@mui/material/Switch";
import TextFieldBase from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  ADMIN_LIST_ACTION_SX,
  ADMIN_LIST_OUTLINE_SX,
} from "@/components/admin/adminListLayout";
import { cn } from "@/lib/utils";

import {
  chipColor,
  isComponentType,
  layoutSx,
  spaceToPx,
  type LayoutProps,
  type SpaceValue,
} from "./shared";

type Variant = string;

type ButtonProps = LayoutProps & {
  variant?: Variant;
  color?: string;
  size?: SpaceValue;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  asChild?: boolean;
  highContrast?: boolean;
  radius?: string;
  title?: string;
  name?: string;
  id?: string;
  form?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

const buttonSize = (size?: SpaceValue) => {
  if (size === "1" || size === 1) return "small" as const;
  if (size === "3" || size === 3 || size === "4" || size === 4) {
    return "large" as const;
  }
  return "medium" as const;
};

const muiButtonVariant = (variant?: Variant) => {
  if (variant === "ghost" || variant === "text") return "text" as const;
  if (
    variant === "soft" ||
    variant === "outline" ||
    variant === "outlined" ||
    variant === "surface"
  ) {
    return "outlined" as const;
  }
  return "contained" as const;
};

const muiButtonColor = (color?: string, variant?: Variant) => {
  if (color === "red") return "error" as const;
  if (color === "green") return "success" as const;
  if (color === "orange") return "warning" as const;
  if (color === "blue") return "primary" as const;
  if (color === "gray" || variant === "soft" || variant === "ghost") {
    return "inherit" as const;
  }
  return "primary" as const;
};

const buttonHasText = (node: ReactNode): boolean => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim().length > 0;
  }
  return Children.toArray(node).some((child) => {
    if (typeof child === "string" || typeof child === "number") {
      return String(child).trim().length > 0;
    }
    if (!isValidElement(child)) return false;
    return buttonHasText((child.props as { children?: ReactNode }).children);
  });
};

const commonActionButtonSx = {
  ...ADMIN_LIST_ACTION_SX,
  height: 36,
  minHeight: 36,
  px: 1.75,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.35,
} as const;

const commonOutlineButtonSx = {
  ...ADMIN_LIST_OUTLINE_SX,
  ...commonActionButtonSx,
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "solid",
    color,
    size,
    className,
    style,
    disabled,
    type = "button",
    asChild,
    children,
    highContrast: _highContrast,
    radius: _radius,
    loading: _loading,
    ...rest
  },
  ref,
) {
  void _highContrast;
  void _radius;
  void _loading;
  const neutralOutline =
    muiButtonVariant(variant) === "outlined" && (!color || color === "gray");
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<any>, {
      ref,
      className: cn(className, (children.props as { className?: string }).className),
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        (children.props as { onClick?: (event: MouseEvent<HTMLButtonElement>) => void }).onClick?.(
          event,
        );
        rest.onClick?.(event);
      },
    });
  }
  return (
    <ButtonBase
      ref={ref}
      className={className}
      style={style}
      type={type}
      disabled={disabled}
      variant={muiButtonVariant(variant)}
      color={muiButtonColor(color, variant)}
      size={buttonSize(size)}
      onClick={rest.onClick}
      title={rest.title}
      name={rest.name}
      id={rest.id}
      form={rest.form}
      data-text-action={buttonHasText(children) ? "true" : undefined}
      sx={[
        neutralOutline ? commonOutlineButtonSx : commonActionButtonSx,
        layoutSx(rest),
      ]}
    >
      {children}
    </ButtonBase>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function IconButton(
    {
      variant = "ghost",
      color,
      size,
      className,
      style,
      disabled,
      type = "button",
      asChild,
      children,
      title,
      ...rest
    },
    ref,
  ) {
    if (asChild && isValidElement(children)) {
      return cloneElement(children as ReactElement<any>, {
        ref,
        className: cn(className, (children.props as { className?: string }).className),
        title,
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          (children.props as { onClick?: (event: MouseEvent<HTMLButtonElement>) => void }).onClick?.(
            event,
          );
          rest.onClick?.(event);
        },
      });
    }
    return (
      <IconButtonBase
        ref={ref}
        className={className}
        style={style}
        type={type}
        disabled={disabled}
        title={title}
        color={muiButtonColor(color, variant)}
        size={buttonSize(size)}
        onClick={rest.onClick}
        sx={{
          borderRadius: "8px",
          ...(color === "red"
            ? {
                color: "error.main",
                "&:hover": { color: "error.dark", bgcolor: "rgba(255, 86, 48, 0.08)" },
              }
            : {}),
          ...(variant === "soft"
            ? { bgcolor: "action.hover", "&:hover": { bgcolor: "action.selected" } }
            : {}),
          ...layoutSx(rest),
        }}
      >
        {children}
      </IconButtonBase>
    );
  },
);

export const Badge = ({
  color,
  variant = "soft",
  className,
  children,
}: {
  color?: string;
  variant?: Variant;
  size?: SpaceValue;
  className?: string;
  children?: ReactNode;
}) => (
  <Chip
    className={className}
    size="small"
    color={chipColor(color)}
    variant={variant === "outline" || variant === "outlined" || variant === "surface" ? "outlined" : "filled"}
    label={children}
    sx={(theme) => {
      const tone = chipColor(color);
      const dark = theme.palette.mode === "dark";
      const palette = {
        success: {
          background: dark ? "rgba(34, 197, 94, 0.20)" : "rgba(34, 197, 94, 0.12)",
          foreground: dark ? "#86efac" : "#118d57",
        },
        error: {
          background: dark ? "rgba(255, 86, 48, 0.20)" : "rgba(255, 86, 48, 0.12)",
          foreground: dark ? "#ffab91" : "#b71d18",
        },
        warning: {
          background: dark ? "rgba(255, 171, 0, 0.20)" : "rgba(255, 171, 0, 0.14)",
          foreground: dark ? "#ffd666" : "#b76e00",
        },
        info: {
          background: dark ? "rgba(24, 144, 255, 0.22)" : "rgba(24, 144, 255, 0.12)",
          foreground: dark ? "#74caff" : "#0c68e9",
        },
        default: {
          background: dark ? "rgba(145, 158, 171, 0.20)" : "rgba(145, 158, 171, 0.14)",
          foreground: dark ? "#d7dde3" : "#454f5b",
        },
      }[tone];
      const soft = variant !== "outline" && variant !== "outlined" && variant !== "surface";
      return {
        height: 24,
        borderRadius: "6px",
        border: soft ? 0 : undefined,
        bgcolor: soft ? palette.background : undefined,
        color: soft ? `${palette.foreground} !important` : undefined,
        fontWeight: 600,
        fontSize: 12,
        "& .MuiChip-label": {
          px: 0.875,
          py: 0,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          fontSize: 12,
        },
        "& .MuiChip-label > svg": {
          display: "block",
          width: 14,
          height: 14,
          flex: "0 0 14px",
          alignSelf: "center",
        },
      };
    }}
  />
);

export const Switch = ({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  id,
  name,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  [key: string]: any;
}) => (
  <SwitchBase
    id={id}
    name={name}
    className={className}
    checked={checked}
    defaultChecked={defaultChecked}
    disabled={disabled}
    onChange={(_, next) => onCheckedChange?.(next)}
  />
);

type TextFieldSlotProps = {
  side?: "left" | "right";
  className?: string;
  children?: ReactNode;
};

const TextFieldSlot = ({ children }: TextFieldSlotProps) => <>{children}</>;
TextFieldSlot.displayName = "TextFieldSlot";

type TextFieldRootProps = LayoutProps & {
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  type?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  color?: string;
  variant?: string;
  size?: SpaceValue;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: string;
  spellCheck?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export const TextFieldRoot = forwardRef<HTMLInputElement, TextFieldRootProps>(
  function TextFieldRoot(
    {
      className,
      style,
      placeholder,
      value,
      defaultValue,
      type,
      name,
      id,
      disabled,
      required,
      min,
      max,
      step,
      children,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const start: ReactNode[] = [];
    const end: ReactNode[] = [];
    Children.forEach(children, (child) => {
      if (!isValidElement(child) || !isComponentType(child, TextFieldSlot)) return;
      const side = (child.props as TextFieldSlotProps).side;
      if (side === "right") end.push((child.props as TextFieldSlotProps).children);
      else start.push((child.props as TextFieldSlotProps).children);
    });
    return (
      <TextFieldBase
        inputRef={ref}
        className={className}
        style={style}
        size="small"
        fullWidth
        placeholder={placeholder}
        {...(value !== undefined ? { value } : { defaultValue })}
        type={type}
        name={name}
        id={id}
        disabled={disabled}
        required={required}
        autoFocus={rest.autoFocus}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        slotProps={{
          htmlInput: {
            min,
            max,
            step,
            readOnly: rest.readOnly,
            inputMode: rest.inputMode as InputHTMLAttributes<HTMLInputElement>["inputMode"],
            spellCheck: rest.spellCheck,
            autoComplete: rest.autoComplete,
            maxLength: rest.maxLength,
            minLength: rest.minLength,
            pattern: rest.pattern,
            "aria-label": rest["aria-label"],
            "aria-expanded": rest["aria-expanded"],
          },
          input: {
            startAdornment: start.length ? (
              <InputAdornment position="start">{start}</InputAdornment>
            ) : undefined,
            endAdornment: end.length ? (
              <InputAdornment position="end">{end}</InputAdornment>
            ) : undefined,
          },
        }}
        sx={{
          ...layoutSx(rest),
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
          },
        }}
      />
    );
  },
);

export const TextField = {
  Root: TextFieldRoot,
  Slot: TextFieldSlot,
};

type TextAreaProps = LayoutProps & {
  rows?: number;
  resize?: string;
  autosize?: boolean;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, style, rows = 4, resize = "vertical", autosize = false, ...rest },
  ref,
) {
  return (
    <TextFieldBase
      inputRef={ref}
      className={className}
      style={style}
      multiline
      {...(autosize ? { minRows: rows } : { rows })}
      fullWidth
      size="small"
      placeholder={rest.placeholder}
      value={rest.value}
      defaultValue={rest.defaultValue}
      name={rest.name}
      id={rest.id}
      disabled={rest.disabled}
      required={rest.required}
      autoFocus={rest.autoFocus}
      onChange={rest.onChange}
      onFocus={rest.onFocus}
      onBlur={rest.onBlur}
      slotProps={{
        htmlInput: { readOnly: rest.readOnly },
      }}
        sx={{
          ...layoutSx(rest),
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            alignItems: "stretch",
          },
          "& textarea": {
            resize: resize === "none" ? "none" : "vertical",
            overflow: "auto !important",
          },
        }}
    />
  );
});

type SelectItemProps = {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
};

const SelectItem = ({ children }: SelectItemProps) => <>{children}</>;
SelectItem.displayName = "SelectItem";

const SelectTrigger = ({
  children,
  className,
  placeholder,
  id,
  name,
  "aria-label": ariaLabel,
}: {
  children?: ReactNode;
  className?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}) => (
  <span className={className} id={id} data-name={name} data-placeholder={placeholder} aria-label={ariaLabel}>
    {children}
  </span>
);
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = ({ children }: { children?: ReactNode }) => <>{children}</>;
SelectContent.displayName = "SelectContent";

const SelectRoot = ({
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  children?: ReactNode;
  className?: string;
}) => {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const current = value ?? uncontrolled;
  const items: Array<{ value: string; label: ReactNode; disabled?: boolean }> = [];
  let triggerClass = className;
  let placeholder: string | undefined;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (isComponentType(child, SelectTrigger)) {
      triggerClass = cn(triggerClass, (child.props as { className?: string }).className);
      placeholder = (child.props as { placeholder?: string }).placeholder;
    }
  });
  const collect = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      if (isComponentType(child, SelectItem)) {
        const props = child.props as SelectItemProps;
        items.push({
          value: props.value,
          label: props.children,
          disabled: props.disabled,
        });
        return;
      }
      collect((child.props as { children?: ReactNode }).children);
    });
  };
  collect(children);
  const labels = useMemo(() => {
    const map = new Map<string, ReactNode>();
    for (const item of items) map.set(item.value, item.label);
    return map;
  }, [children]);

  return (
    <FormControl
      size="small"
      disabled={disabled}
      className={triggerClass}
      fullWidth={Boolean(triggerClass?.includes("w-full"))}
      sx={{ minWidth: 120 }}
    >
      <SelectBase
        name={name}
        displayEmpty
        value={current}
        disabled={disabled}
        onChange={(event) => {
          const next = String(event.target.value);
          if (value === undefined) setUncontrolled(next);
          onValueChange?.(next);
        }}
        renderValue={(selected) => {
          if (selected === "" || selected == null) {
            return <span style={{ color: "#919EAB" }}>{placeholder || ""}</span>;
          }
          return labels.get(String(selected)) ?? selected;
        }}
        sx={{
          borderRadius: "8px",
          fontWeight: 500,
          fontSize: 15,
        }}
      >
        {items.map((item) => (
          <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </MenuItem>
        ))}
      </SelectBase>
    </FormControl>
  );
};

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
};

const SegmentedContext = createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

const SegmentedItem = ({
  value,
  children,
}: {
  value: string;
  children?: ReactNode;
}) => {
  useContext(SegmentedContext);
  return (
    <ToggleButton value={value} disableRipple>
      {children}
    </ToggleButton>
  );
};
SegmentedItem.displayName = "SegmentedItem";

const SegmentedRoot = ({
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
    <SegmentedContext.Provider
      value={{
        value: current,
        onValueChange: (next) => {
          if (value === undefined) setUncontrolled(next);
          onValueChange?.(next);
        },
      }}
    >
      <ToggleButtonGroup
        exclusive
        className={className}
        value={current}
        onChange={(_, next) => {
          if (typeof next === "string") {
            if (value === undefined) setUncontrolled(next);
            onValueChange?.(next);
          }
        }}
        sx={{
          "& .MuiToggleButton-root": {
            textTransform: "none",
            fontWeight: 700,
            px: 1.5,
            py: 0.5,
            fontSize: 13.5,
            borderRadius: "8px",
          },
        }}
      >
        {children}
      </ToggleButtonGroup>
    </SegmentedContext.Provider>
  );
};

export const SegmentedControl = {
  Root: SegmentedRoot,
  Item: SegmentedItem,
};

export const Progress = ({
  value = 0,
  className,
  color,
  style,
}: {
  value?: number;
  className?: string;
  color?: string;
  size?: SpaceValue;
  style?: CSSProperties;
}) => {
  const mapped = chipColor(color);
  return (
    <LinearProgress
      className={className}
      style={style}
      variant="determinate"
      value={Math.max(0, Math.min(100, value))}
      color={mapped === "default" ? "primary" : mapped}
      sx={{ height: 8, borderRadius: 99, mt: className?.includes("mt-2") ? 1 : 0 }}
    />
  );
};

export const Spinner = ({
  size,
  className,
}: {
  size?: SpaceValue;
  className?: string;
}) => (
  <CircularProgress
    className={className}
    size={size === "3" || size === 3 ? 28 : size === "1" || size === 1 ? 16 : 22}
  />
);

export const Skeleton = ({
  className,
  width,
  height,
  style,
}: {
  className?: string;
  width?: SpaceValue;
  height?: SpaceValue;
  style?: CSSProperties;
}) => (
  <SkeletonBase
    className={className}
    width={spaceToPx(width)}
    height={spaceToPx(height)}
    style={style}
    variant="rounded"
  />
);
