import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { GET } from "./route.ts";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const upstream = {
  current: { time: "2026-11-23T10:30", pm2_5: 100, pm10: 110, us_aqi: 189 },
  hourly: { time: ["2026-11-23T10:00"], us_aqi: [189] },
};

test("success is cached by the CDN for 5 min but never reused blindly by browsers", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify(upstream), { status: 200 })) as typeof fetch;
  const res = await GET(new Request("http://localhost/api/air-quality?city=delhi-ncr"));
  assert.equal(res.status, 200);
  const cache = res.headers.get("cache-control") ?? "";
  assert.match(cache, /max-age=0/);
  assert.match(cache, /s-maxage=300/);
});

test("unknown city and out-of-area coordinates are rejected before any upstream call", async () => {
  globalThis.fetch = (async () => { throw new Error("upstream must not be called"); }) as typeof fetch;
  assert.equal((await GET(new Request("http://localhost/api/air-quality?city=nope"))).status, 400);
  assert.equal((await GET(new Request("http://localhost/api/air-quality?lat=51.5&lon=-0.12"))).status, 400);
});
