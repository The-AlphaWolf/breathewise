// India bounding box; the app only serves Indian cities and uses the Asia/Kolkata timezone.
const LAT = [6.5, 35.7] as const;
const LON = [68, 97.5] as const;

const toNumber = (v: unknown) => (typeof v === "string" ? (v.trim() === "" ? Number.NaN : Number(v)) : v);
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Validates and rounds coordinates to 2 decimals (~1 km) so precise locations are never used or sent on. */
export function parseCoords(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  const a = toNumber(lat);
  const b = toNumber(lon);
  if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < LAT[0] || a > LAT[1] || b < LON[0] || b > LON[1]) return null;
  return { lat: round2(a), lon: round2(b) };
}
