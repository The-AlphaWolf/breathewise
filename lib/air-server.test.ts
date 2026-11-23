import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchLiveAir } from "./air-server.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const payload = {
  current: { time: "2026-11-23T10:30", pm2_5: 100, pm10: 110, us_aqi: 189 },
  hourly: { time: ["2026-11-23T10:00", "2026-11-23T11:00"], us_aqi: [189, 180] },
};

test("upstream request bypasses Next's stale-while-revalidate fetch cache", async () => {
  let init: (RequestInit & { next?: unknown }) | undefined;
  globalThis.fetch = (async (_url: unknown, options?: RequestInit) => {
    init = options;
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as typeof fetch;

  const air = await fetchLiveAir("delhi-ncr");

  assert.equal(air.sourceTimestamp, "2026-11-23T10:30");
  assert.equal(init?.cache, "no-store", "must not serve a cached upstream response after an idle gap");
  assert.equal(init?.next, undefined, "revalidate-based caching can return day-old data");
});

test("coordinates build a labelled approximate-location snapshot", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify(payload), { status: 200 })) as typeof fetch;
  const air = await fetchLiveAir({ lat: 28.61, lon: 77.21 });
  assert.equal(air.cityId, "here");
  assert.equal(air.locationLabel, "Your location (approx.)");
});
