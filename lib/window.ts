export type HourlyPoint = { readonly time: string; readonly usAqi: number | null };

export type BetterWindow = {
  readonly start: string;
  readonly end: string;
  readonly avgAqi: number;
  readonly gainPercent: number;
};

const MIN_GAIN = 0.2;

function plusOneHour(time: string): string {
  return new Date(Date.parse(time + ":00Z") + 3_600_000).toISOString().slice(0, 16);
}

/**
 * Lowest-average 2-hour window strictly after the current hour, shown only
 * when it is at least 20% lower than the current US AQI.
 */
export function findBetterWindow(
  hourly: readonly HourlyPoint[],
  currentAqi: number | null,
): BetterWindow | null {
  if (currentAqi === null || currentAqi <= 0) return null;

  let best: { index: number; avg: number } | null = null;
  for (let i = 1; i + 1 < hourly.length; i++) {
    const a = hourly[i].usAqi;
    const b = hourly[i + 1].usAqi;
    if (a === null || b === null) continue;
    const avg = (a + b) / 2;
    if (best === null || avg < best.avg) best = { index: i, avg };
  }

  if (best === null || best.avg > currentAqi * (1 - MIN_GAIN)) return null;

  return {
    start: hourly[best.index].time,
    end: plusOneHour(hourly[best.index + 1].time),
    avgAqi: Math.round(best.avg),
    gainPercent: Math.round((1 - best.avg / currentAqi) * 100),
  };
}
