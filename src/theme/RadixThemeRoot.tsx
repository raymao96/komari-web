import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import type { CSSProperties, ReactNode } from "react";

type RadixThemeRootProps = {
  appearance: "light" | "dark";
  scaling?: "100%" | "110%";
  children: ReactNode;
};

const rootStyle: CSSProperties = {
  backgroundColor: "transparent",
  minHeight: "var(--app-viewport-height, 100vh)",
};

export default function RadixThemeRoot({
  appearance,
  scaling = "110%",
  children,
}: RadixThemeRootProps) {
  return (
    <Theme
      appearance={appearance}
      accentColor="blue"
      grayColor="slate"
      radius="large"
      scaling={scaling}
      className="theme-root"
      style={rootStyle}
    >
      {children}
    </Theme>
  );
}
