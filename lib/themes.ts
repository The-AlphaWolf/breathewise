export const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "light";
export const DARK_DEFAULT_THEME: ThemeId = "dark";
export const THEME_STORAGE_KEY = "bw-theme";
export const isTheme = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value);
