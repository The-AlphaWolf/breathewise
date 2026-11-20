import assert from "node:assert/strict";
import { test } from "node:test";
import { findBetterWindow } from "./window.ts";

const series = (values: (number | null)[]) =>
  values.map((usAqi, i) => ({ time: `2026-11-20T${String(8 + i).padStart(2, "0")}:00`, usAqi }));

test("finds the lowest 2-hour window after now", () => {
  const w = findBetterWindow(series([300, 290, 250, 180, 170, 260]), 300);
  assert.ok(w);
  assert.equal(w.start, "2026-11-20T11:00");
  assert.equal(w.end, "2026-11-20T13:00");
  assert.equal(w.avgAqi, 175);
});

test("no window when the gain is under 20%", () => {
  assert.equal(findBetterWindow(series([300, 290, 250, 245, 240, 260]), 300), null);
});

test("never returns a window that includes the current hour", () => {
  assert.equal(findBetterWindow(series([100, 400, 400, 400]), 400)?.start ?? null, null);
});

test("handles nulls, short series and missing current AQI", () => {
  assert.equal(findBetterWindow(series([300, null, null, 100]), 300), null);
  assert.equal(findBetterWindow(series([300, 100]), 300), null);
  assert.equal(findBetterWindow([], 300), null);
  assert.equal(findBetterWindow(series([300, 100, 100]), null), null);
});
