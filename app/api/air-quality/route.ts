import { AirError, fetchLiveAir } from "../../../lib/air-server.ts";
import { cityById } from "../../../lib/cities.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city") ?? "delhi-ncr";
  if (cityById(city) === undefined) {
    return Response.json({ error: "Unknown city." }, { status: 400 });
  }

  try {
    return Response.json(await fetchLiveAir(city), {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" },
    });
  } catch (error) {
    const status = error instanceof AirError ? error.status : 503;
    const message = error instanceof AirError ? error.message : "The modelled air-quality outlook is temporarily unavailable.";
    return Response.json({ error: message }, { status });
  }
}
