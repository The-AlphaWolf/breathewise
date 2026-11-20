import { z } from "zod";
import { type ModelledAirResponse, usAqiCategory } from "../../../lib/air-quality";

export const runtime = "nodejs";

const DELHI_NCR = {
  label: "Delhi NCR",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
} as const;

const upstreamSchema = z.object({
  current: z.object({
    time: z.string(),
    pm2_5: z.number().nullable().optional(),
    pm10: z.number().nullable().optional(),
    us_aqi: z.number().nullable().optional(),
  }),
});

function toNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city");

  if (city !== null && city !== "delhi-ncr") {
    return Response.json(
      { error: "Only the Delhi NCR model-outlook adapter is enabled in this MVP." },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({
    latitude: String(DELHI_NCR.latitude),
    longitude: String(DELHI_NCR.longitude),
    current: "pm2_5,pm10,us_aqi",
    timezone: DELHI_NCR.timezone,
  });

  try {
    const upstream = await fetch(
      "https://air-quality-api.open-meteo.com/v1/air-quality?" + query.toString(),
      {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!upstream.ok) {
      return Response.json(
        { error: "The modelled air-quality provider did not return a usable response." },
        { status: 502 },
      );
    }

    const parsed = upstreamSchema.safeParse(await upstream.json());

    if (!parsed.success) {
      return Response.json(
        { error: "The modelled air-quality provider returned an unexpected response." },
        { status: 502 },
      );
    }

    const pm25 = toNumberOrNull(parsed.data.current.pm2_5);
    const pm10 = toNumberOrNull(parsed.data.current.pm10);
    const usAqi = toNumberOrNull(parsed.data.current.us_aqi);
    const response: ModelledAirResponse = {
      locationLabel: DELHI_NCR.label,
      sourceName: "Open-Meteo / CAMS model forecast",
      sourceType: "model",
      indexSystem: "US AQI",
      category: usAqiCategory(usAqi),
      sourceTimestamp: parsed.data.current.time,
      retrievedAt: new Date().toISOString(),
      pm25,
      pm10,
      usAqi,
      caveat:
        "This is an area-level modelled condition, not a nearby CPCB station observation. Do not read it as Indian National AQI.",
    };

    return Response.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "The modelled air-quality outlook is temporarily unavailable. Use official local alerts instead.",
      },
      { status: 503 },
    );
  }
}
