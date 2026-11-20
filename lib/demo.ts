import type { AirSnapshot } from "./air.ts";

export type DemoId = "severe" | "moderate" | "improving";

function hourly(startHour: number, values: (number | null)[]) {
  return values.map((usAqi, i) => ({ time: `2026-11-20T${String(startHour + i).padStart(2, "0")}:00`, usAqi }));
}

function fixture(
  id: DemoId, label: string, startHour: number, values: number[], pm25: number, pm10: number, caveat: string,
): { label: string; snapshot: AirSnapshot } {
  return {
    label,
    snapshot: {
      mode: "demo",
      cityId: "delhi-ncr",
      locationLabel: "Delhi NCR",
      sourceName: `Demo fixture — ${label}`,
      sourceType: "demo",
      indexSystem: "US AQI",
      sourceTimestamp: `2026-11-20T${String(startHour).padStart(2, "0")}:00`,
      retrievedAt: `2026-11-20T${String(startHour).padStart(2, "0")}:00:00+05:30`,
      pm25,
      pm10,
      usAqi: values[0],
      hourly: hourly(startHour, values),
      caveat,
    },
  };
}

export const DEMO_SCENARIOS: Record<DemoId, { label: string; snapshot: AirSnapshot }> = {
  severe: fixture("severe", "Severe smog morning", 8,
    [320, 330, 335, 330, 325, 320, 318, 310, 305, 300, 302, 310], 280, 400,
    "Fixed data for demonstration. It is not a live reading."),
  moderate: fixture("moderate", "Moderate conditions", 12,
    [85, 90, 95, 90, 80, 70, 60, 55, 58, 65, 75, 80], 30, 70,
    "Fixed data for demonstration. Check official local alerts before making health decisions."),
  improving: fixture("improving", "Improving afternoon", 16,
    [160, 150, 130, 110, 95, 85, 80, 78, 80, 85, 95, 110], 70, 120,
    "Fixed data for demonstration. A forecast is not a guarantee of street-level conditions."),
};

export const DEMO_IDS = Object.keys(DEMO_SCENARIOS) as DemoId[];
