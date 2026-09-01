import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

import {
  flexAlign,
  flexJustify,
  layoutSx,
  type LayoutProps,
  type ResponsiveSpace,
  type SpaceValue,
} from "./shared";

type BoxProps = LayoutProps & {
  as?: ElementType;
  asChild?: boolean;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  align?: string;
  justify?: string;
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  columns?:
    | string
    | number
    | {
        initial?: string | number;
        xs?: string | number;
        sm?: string | number;
        md?: string | number;
        lg?: string | number;
        xl?: string | number;
      };
  size?: SpaceValue;
  weight?: "light" | "regular" | "medium" | "bold";
  color?: string;
  alignText?: string;
  highContrast?: boolean;
  variant?: string;
  mb?: ResponsiveSpace;
  children?: ReactNode;
  onClick?: ComponentPropsWithoutRef<"div">["onClick"];
  onDrop?: ComponentPropsWithoutRef<"div">["onDrop"];
  onDragOver?: ComponentPropsWithoutRef<"div">["onDragOver"];
  role?: string;
  id?: string;
  title?: string;
  "aria-label"?: string;
};

const textColor = (color?: string) => {
  if (!color || color === "gray") return "text.secondary";
  if (color === "red") return "error.main";
  if (color === "green") return "success.main";
  if (color === "orange") return "warning.main";
  if (color === "blue") return "info.main";
  return undefined;
};

const headingVariant = (size?: SpaceValue) => {
  if (size === "1" || size === 1) return "h6";
  if (size === "2" || size === 2) return "h6";
  if (size === "3" || size === 3) return "h6";
  if (size === "4" || size === 4) return "h5";
  if (size === "5" || size === 5) return "h4";
  if (size === "6" || size === 6) return "h3";
  if (size === "7" || size === 7) return "h3";
  if (size === "8" || size === 8) return "h3";
  return "h6";
};

const textSize = (size?: SpaceValue) => {
  if (size === "1" || size === 1) return 12;
  if (size === "3" || size === 3) return 16;
  if (size === "4" || size === 4) return 18;
  return 14;
};

const gridColumns = (columns?: BoxProps["columns"]) => {
  if (columns == null) return undefined;
  const toRepeat = (value: string | number | undefined) => {
    if (value == null) return undefined;
    const count = String(value);
    if (count.includes("fr") || count.includes("(")) return count;
    return `repeat(${count}, minmax(0, 1fr))`;
  };
  if (typeof columns !== "object") return toRepeat(columns);
  return {
    xs: toRepeat(columns.initial ?? columns.xs),
    sm: toRepeat(columns.sm),
    md: toRepeat(columns.md),
    lg: toRepeat(columns.lg),
    xl: toRepeat(columns.xl),
  };
};

export const Flex = forwardRef<HTMLDivElement, BoxProps>(function Flex(
  {
    as,
    className,
    style,
    direction = "row",
    align,
    justify,
    wrap,
    children,
    onClick,
    onDrop,
    onDragOver,
    role,
    id,
    title,
    ...rest
  },
  ref,
) {
  return (
    <Box
      ref={ref}
      component={as ?? "div"}
      className={className}
      id={id}
      title={title}
      role={role}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={style}
      sx={{
        ...layoutSx({ ...rest, display: undefined }),
        display: "flex",
        flexDirection: direction,
        alignItems: flexAlign(align),
        justifyContent: flexJustify(justify),
        flexWrap: wrap,
      }}
    >
      {children}
    </Box>
  );
});

export const BoxLayout = forwardRef<HTMLDivElement, BoxProps>(function BoxLayout(
  { as, className, style, children, onClick, role, id, ...rest },
  ref,
) {
  return (
    <Box
      ref={ref}
      component={as ?? "div"}
      className={className}
      id={id}
      role={role}
      onClick={onClick}
      style={style}
      sx={layoutSx(rest)}
    >
      {children}
    </Box>
  );
});

export const Grid = forwardRef<HTMLDivElement, BoxProps>(function Grid(
  { className, style, columns, children, ...rest },
  ref,
) {
  return (
    <Box
      ref={ref}
      className={className}
      style={style}
      sx={{
        ...layoutSx({ ...rest, display: undefined }),
        display: "grid",
        gridTemplateColumns: gridColumns(columns),
      }}
    >
      {children}
    </Box>
  );
});

export const Container = ({
  className,
  style,
  size,
  children,
  ...rest
}: BoxProps) => (
  <Box
    className={className}
    style={style}
    sx={{
      ...layoutSx({ ...rest, mx: undefined, width: undefined, maxWidth: undefined }),
      mx: "auto",
      width: "100%",
      maxWidth:
        size === "1" || size === 1
          ? 448
          : size === "2" || size === 2
            ? 688
            : size === "4" || size === 4
              ? 1136
              : 768,
    }}
  >
    {children}
  </Box>
);

export const Text = ({
  as,
  className,
  style,
  size,
  weight,
  color,
  align,
  children,
  ...rest
}: BoxProps & { align?: string }) => (
  <Typography
    component={(as as ElementType) ?? "span"}
    className={className}
    align={align as "inherit" | "left" | "center" | "right" | "justify"}
    style={style}
    sx={{
      ...layoutSx({ ...rest, display: undefined }),
      fontSize: textSize(size),
      fontWeight:
        weight === "bold" ? 700 : weight === "medium" ? 600 : weight === "light" ? 300 : 400,
      color: textColor(color),
      display: as === "div" || as === "p" ? "block" : undefined,
    }}
  >
    {children}
  </Typography>
);

export const Heading = ({
  className,
  style,
  size,
  children,
  ...rest
}: BoxProps) => (
  <Typography
    component="h3"
    variant={headingVariant(size)}
    className={className}
    style={style}
    sx={{ ...layoutSx(rest), fontWeight: 700 }}
  >
    {children}
  </Typography>
);

export const Code = ({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) => (
  <Box
    component="code"
    className={className}
    style={style}
    sx={{
      display: "inline-block",
      px: 0.75,
      py: 0.25,
      borderRadius: "6px",
      bgcolor: "action.hover",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 12.5,
    }}
  >
    {children}
  </Box>
);

export const Card = ({
  className,
  style,
  children,
  ...rest
}: BoxProps) => (
  <Paper
    className={className}
    style={style}
    sx={{
      ...layoutSx(rest),
      borderRadius: "8px",
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "none",
      bgcolor: "background.paper",
    }}
  >
    {children}
  </Paper>
);

export const Separator = ({
  className,
  size,
  ...rest
}: BoxProps) => (
  <Divider
    className={className}
    sx={{
      ...layoutSx({ ...rest, my: undefined }),
      my: size === "4" || size === 4 ? 1.5 : 1,
    }}
  />
);
