import type { Action } from "./actions.ts";

/** Plain-text message for a school group or RWA, built only from approved community-scope actions. */
export function buildCommunityMessage(cityLabel: string, levelLabel: string, approved: readonly Action[]): string | null {
  const steps = approved.filter((a) => a.scope === "community");
  if (steps.length === 0) return null;
  return [
    `Air quality update for ${cityLabel}: ${levelLabel} today (area-level model forecast, US AQI).`,
    "",
    "Small steps we can take together:",
    ...steps.map((a) => `- ${a.title}: ${a.do}`),
    "",
    "General information, not medical advice. Official local alerts take precedence.",
  ].join("\n");
}
