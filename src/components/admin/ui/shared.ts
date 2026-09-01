import type { CSSProperties, ReactNode } from "react";
import { Children, isValidElement, type ReactElement } from "react";

export type SpaceValue = string | number | undefined;
export type ResponsiveSpace =
  | SpaceValue
  | {
      initial?: SpaceValue;
      xs?: SpaceValue;
      sm?: SpaceValue;
      md?: SpaceValue;
      lg?: SpaceValue;
      xl?: SpaceValue;
    };

export const spaceToPx = (value: SpaceValue): string | number | undefined => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return `${value * 4}px`;
  if (/^-?\d+(\.\d+)?$/.test(value)) return `${Number(value) * 4}px`;
  return value;
};

export const responsiveSpace = (value?: ResponsiveSpace) => {
  if (value == null) return undefined;
  if (typeof value !== "object") return spaceToPx(value);
  return {
    xs: spaceToPx(value.initial ?? value.xs),
    sm: spaceToPx(value.sm),
    md: spaceToPx(value.md),
    lg: spaceToPx(value.lg),
    xl: spaceToPx(value.xl),
  };
};

const ALIGN: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
  "flex-start": "flex-start",
  "flex-end": "flex-end",
};

const JUSTIFY: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
  "flex-start": "flex-start",
  "flex-end": "flex-end",
  "space-between": "space-between",
};

export type LayoutProps = {
  className?: string;
  style?: CSSProperties;
  gap?: ResponsiveSpace;
  p?: ResponsiveSpace;
  px?: ResponsiveSpace;
  py?: ResponsiveSpace;
  pt?: ResponsiveSpace;
  pb?: ResponsiveSpace;
  pl?: ResponsiveSpace;
  pr?: ResponsiveSpace;
  m?: ResponsiveSpace;
  mx?: ResponsiveSpace;
  my?: ResponsiveSpace;
  mt?: ResponsiveSpace;
  mb?: ResponsiveSpace;
  ml?: ResponsiveSpace;
  mr?: ResponsiveSpace;
  width?: SpaceValue;
  height?: SpaceValue;
  minWidth?: SpaceValue;
  minHeight?: SpaceValue;
  maxWidth?: SpaceValue;
  maxHeight?: SpaceValue;
  flexGrow?: SpaceValue;
  flexShrink?: SpaceValue;
  flexBasis?: SpaceValue;
  display?: string;
  children?: ReactNode;
};

export const layoutSx = (props: LayoutProps) => ({
  gap: responsiveSpace(props.gap),
  p: responsiveSpace(props.p),
  px: responsiveSpace(props.px),
  py: responsiveSpace(props.py),
  pt: responsiveSpace(props.pt),
  pb: responsiveSpace(props.pb),
  pl: responsiveSpace(props.pl),
  pr: responsiveSpace(props.pr),
  m: responsiveSpace(props.m),
  mx: responsiveSpace(props.mx),
  my: responsiveSpace(props.my),
  mt: responsiveSpace(props.mt),
  mb: responsiveSpace(props.mb),
  ml: responsiveSpace(props.ml),
  mr: responsiveSpace(props.mr),
  width: spaceToPx(props.width),
  height: spaceToPx(props.height),
  minWidth: spaceToPx(props.minWidth),
  minHeight: spaceToPx(props.minHeight),
  maxWidth: spaceToPx(props.maxWidth),
  maxHeight: spaceToPx(props.maxHeight),
  flexGrow: props.flexGrow,
  flexShrink: props.flexShrink,
  flexBasis: spaceToPx(props.flexBasis),
  display: props.display,
});

export const flexAlign = (value?: string) =>
  value ? ALIGN[value] ?? value : undefined;
export const flexJustify = (value?: string) =>
  value ? JUSTIFY[value] ?? value : undefined;

export const isComponentType = (
  child: ReactElement,
  type: unknown,
): boolean => {
  if (child.type === type) return true;
  const childName = (child.type as { displayName?: string })?.displayName;
  const typeName = (type as { displayName?: string })?.displayName;
  return Boolean(childName && typeName && childName === typeName);
};

export const walkElements = (
  node: ReactNode,
  visit: (child: ReactElement) => void,
) => {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    visit(child);
    const nested = (child.props as { children?: ReactNode }).children;
    if (nested) walkElements(nested, visit);
  });
};

export const chipColor = (color?: string) => {
  switch (color) {
    case "red":
    case "ruby":
    case "tomato":
    case "crimson":
      return "error" as const;
    case "green":
    case "jade":
    case "grass":
    case "teal":
    case "lime":
      return "success" as const;
    case "orange":
    case "amber":
    case "yellow":
    case "gold":
      return "warning" as const;
    case "blue":
    case "cyan":
    case "sky":
    case "indigo":
    case "iris":
      return "info" as const;
    default:
      return "default" as const;
  }
};
