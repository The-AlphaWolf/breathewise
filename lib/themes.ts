export const THEMES = [
  { id: "sky", label: "Clear Sky", swatch: ["#f7f8fc", "#2d66cf"] },
  { id: "midnight", label: "Midnight", swatch: ["#0a1120", "#7db0ff"] },
  { id: "forest", label: "Forest", swatch: ["#f2f8f3", "#1b7a4b"] },
  { id: "sunset", label: "Sunset", swatch: ["#fcf4ed", "#b33b0a"] },
  { id: "contrast", label: "High contrast", swatch: ["#000000", "#ffd400"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "sky";
export const DARK_DEFAULT_THEME: ThemeId = "midnight";
export const THEME_STORAGE_KEY = "bw-theme";
export const isTheme = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value);
