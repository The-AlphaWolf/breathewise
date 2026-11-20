export const LEVEL_LABELS = [
  "Good",
  "Moderate",
  "Unhealthy for sensitive groups",
  "Unhealthy",
  "Very unhealthy",
  "Hazardous",
] as const;

export type Level = 0 | 1 | 2 | 3 | 4 | 5;

const UPPER_BOUNDS = [50, 100, 150, 200, 300] as const;

/** US AQI → level 0–5, or null when the value is unavailable. */
export function aqiLevel(value: number | null): Level | null {
  if (value === null) return null;
  const index = UPPER_BOUNDS.findIndex((bound) => value <= bound);
  return (index === -1 ? 5 : index) as Level;
}

export function usAqiCategory(value: number | null): string {
  const level = aqiLevel(value);
  return level === null ? "Unavailable" : LEVEL_LABELS[level];
}

/** Extra caution treats the air as one level worse for exposure rules. */
export function effectiveLevel(level: Level, extraCaution: boolean): Level {
  return (extraCaution ? Math.min(5, level + 1) : level) as Level;
}
