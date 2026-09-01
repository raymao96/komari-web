import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";

import { createAppTheme } from "./createAppTheme";
import "@fontsource-variable/public-sans";

type MuiAppProviderProps = {
  appearance: "light" | "dark";
  children: ReactNode;
};

export default function MuiAppProvider({
  appearance,
  children,
}: MuiAppProviderProps) {
  const theme = useMemo(() => createAppTheme(appearance), [appearance]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
