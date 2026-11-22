import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DARK_DEFAULT_THEME, DEFAULT_THEME, THEME_STORAGE_KEY, THEMES } from "../lib/themes.ts";
import "./globals.css";

export const metadata: Metadata = {
  title: "BreatheWise | Urban Air Quality Assistant",
  description:
    "A context-aware planner for safer, lower-emission choices during urban air pollution.",
};

// Runs before first paint so the saved (or OS-preferred) theme never flashes the wrong colours.
const THEME_SCRIPT = `(function(){try{var ids=${JSON.stringify(THEMES.map((t) => t.id))},t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(ids.indexOf(t)<0)t=matchMedia("(prefers-color-scheme: dark)").matches?${JSON.stringify(DARK_DEFAULT_THEME)}:${JSON.stringify(DEFAULT_THEME)};document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
