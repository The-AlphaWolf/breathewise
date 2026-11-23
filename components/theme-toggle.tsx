"use client";

import { useEffect, useState } from "react";
import { isTheme, THEME_STORAGE_KEY, THEMES, type ThemeId } from "../lib/themes.ts";

function Icon({ id }: { readonly id: ThemeId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {id === "dark" ? (
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
      )}
    </svg>
  );
}

/** Light | Dark: both options stay visible and the active one is highlighted. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("light");

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
    <fieldset className="theme-toggle">
      <legend>Colour theme</legend>
      {THEMES.map((t) => (
        <label className="theme-option" key={t.id}>
          <input type="radio" name="theme" value={t.id} checked={theme === t.id} onChange={() => choose(t.id)} />
          <Icon id={t.id} />
          <span>{t.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
