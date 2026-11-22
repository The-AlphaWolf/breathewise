"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, isTheme, THEME_STORAGE_KEY, THEMES, type ThemeId } from "../lib/themes.ts";

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);

  // The layout script already set data-theme before first paint; mirror it into state.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (isTheme(current)) setTheme(current);
  }, []);

  function choose(id: ThemeId) {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
  }

  return (
    <fieldset className="theme-picker">
      <legend>Colour theme</legend>
      {THEMES.map((t) => (
        <label className="theme-option" key={t.id} title={t.label}>
          <input
            type="radio"
            name="theme"
            value={t.id}
            checked={theme === t.id}
            onChange={() => choose(t.id)}
          />
          <span
            className="theme-swatch"
            aria-hidden="true"
            style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }}
          />
          <span className="theme-name">{t.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
