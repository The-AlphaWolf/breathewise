import { z } from "zod";
import type { AirSnapshot } from "./air.ts";
import { cityById } from "./cities.ts";

export class AirError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const num = z.number().nullable().optional();
const upstreamSchema = z.object({
  current: z.object({ time: z.string(), pm2_5: num, pm10: num, us_aqi: num }),
  hourly: z.object({ time: z.array(z.string()), us_aqi: z.array(z.number().nullable()) }),
});

const clean = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export type LiveTarget = string | { readonly lat: number; readonly lon: number };

/** One Open-Meteo request: current values plus the next 12 hourly US AQI values. */
export async function fetchLiveAir(target: LiveTarget): Promise<AirSnapshot> {
  const place =
    typeof target === "string"
      ? cityById(target)
      : { id: "here", label: "Your location (approx.)", latitude: target.lat, longitude: target.lon };
  if (place === undefined) throw new AirError("Unknown city.", 400);

  const query = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "pm2_5,pm10,us_aqi",
    hourly: "us_aqi",
    forecast_hours: "12",
    timezone: "Asia/Kolkata",
  });

  let upstream: Response;
  try {
    upstream = await fetch("https://air-quality-api.open-meteo.com/v1/air-quality?" + query, {
      // Fresh on every call. The route response is cached for 5 min by the CDN (Cache-Control);
      // Next's own data cache is stale-while-revalidate and served day-old values after idle gaps.
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new AirError("The modelled air-quality outlook is temporarily unavailable. Use official local alerts instead.", 503);
  }
  if (!upstream.ok) throw new AirError("The modelled air-quality provider did not return a usable response.", 502);

  const parsed = upstreamSchema.safeParse(await upstream.json().catch(() => null));
  if (!parsed.success) throw new AirError("The modelled air-quality provider returned an unexpected response.", 502);

  const { current, hourly } = parsed.data;
  return {
    mode: "live",
    cityId: place.id,
    locationLabel: place.label,
    sourceName: "Open-Meteo / CAMS model forecast",
    sourceType: "model",
    indexSystem: "US AQI",
    sourceTimestamp: current.time,
    retrievedAt: new Date().toISOString(),
    pm25: clean(current.pm2_5),
    pm10: clean(current.pm10),
    usAqi: clean(current.us_aqi),
    hourly: hourly.time.map((time, i) => ({ time, usAqi: clean(hourly.us_aqi[i]) })),
    caveat: "This is an area-level modelled condition, not a nearby CPCB station observation. Do not read it as Indian National AQI.",
  };
}
