export type ModelledAirResponse = {
  readonly locationLabel: string;
  readonly sourceName: string;
  readonly sourceType: "model";
  readonly indexSystem: "US AQI";
  readonly category: string;
  readonly sourceTimestamp: string;
  readonly retrievedAt: string;
  readonly pm25: number | null;
  readonly pm10: number | null;
  readonly usAqi: number | null;
  readonly caveat: string;
};

export function usAqiCategory(value: number | null): string {
  if (value === null) return "Unavailable";
  if (value <= 50) return "Good";
  if (value <= 100) return "Moderate";
  if (value <= 150) return "Unhealthy for sensitive groups";
  if (value <= 200) return "Unhealthy";
  if (value <= 300) return "Very unhealthy";
  return "Hazardous";
}
