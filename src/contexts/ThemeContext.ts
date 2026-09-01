import { createContext } from "react";

export const allowedAppearances = ["light", "dark", "system"] as const;
export type Appearance = typeof allowedAppearances[number];

export const THEME_DEFAULTS = {
  appearance: "system" as Appearance,
} as const;

export interface ThemeContextType {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  appearance: THEME_DEFAULTS.appearance,
  setAppearance: () => {},
});
