import { AirError, fetchLiveAir } from "../../../lib/air-server.ts";
import { cityById } from "../../../lib/cities.ts";
import { parseCoords } from "../../../lib/geo.ts";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const wantsCoords = params.has("lat") || params.has("lon");
  const coords = wantsCoords ? parseCoords(params.get("lat"), params.get("lon")) : null;
  const city = params.get("city") ?? "delhi-ncr";

  if (wantsCoords ? coords === null : cityById(city) === undefined) {
    return Response.json({ error: wantsCoords ? "Location is outside the supported area." : "Unknown city." }, { status: 400 });
  }

  try {
    return Response.json(await fetchLiveAir(coords ?? city), {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" },
    });
  } catch (error) {
    const status = error instanceof AirError ? error.status : 503;
    const message = error instanceof AirError ? error.message : "The modelled air-quality outlook is temporarily unavailable.";
    return Response.json({ error: message }, { status });
  }
}
