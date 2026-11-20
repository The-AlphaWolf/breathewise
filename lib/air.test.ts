import assert from "node:assert/strict";
import { test } from "node:test";
import { formatIst, isStale, minutesAgo } from "./air.ts";
import { DEMO_SCENARIOS } from "./demo.ts";
import { findBetterWindow } from "./window.ts";

test("formats the model timestamp as IST without shifting it", () => {
  assert.equal(formatIst("2026-11-20T08:00"), "20 Nov, 08:00 IST");
  assert.equal(formatIst("2026-01-05T23:45"), "5 Jan, 23:45 IST");
});

test("minutesAgo and staleness (> 3 h) use IST source time", () => {
  const now = Date.parse("2026-11-20T06:30:00Z"); // 12:00 IST
  assert.equal(minutesAgo("2026-11-20T11:00", now), 60);
  assert.equal(isStale("2026-11-20T09:00", now), false); // 3 h exactly
  assert.equal(isStale("2026-11-20T08:59", now), true);
});

test("demo fixtures: hourly series drive the window logic", () => {
  const w = (id: "severe" | "moderate" | "improving") => {
    const s = DEMO_SCENARIOS[id].snapshot;
    return findBetterWindow(s.hourly, s.usAqi);
  };
  assert.equal(w("severe"), null);
  assert.ok(w("moderate"));
  assert.ok(w("improving"));
});
