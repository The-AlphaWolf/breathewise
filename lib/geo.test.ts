import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCoords } from "./geo.ts";

test("rounds to 2 decimals (about 1 km)", () => {
  assert.deepEqual(parseCoords(28.6139, 77.209), { lat: 28.61, lon: 77.21 });
  assert.deepEqual(parseCoords("19.0760", "72.8777"), { lat: 19.08, lon: 72.88 });
});

test("rejects points outside India and invalid values", () => {
  assert.equal(parseCoords(51.5, -0.12), null);
  assert.equal(parseCoords(Number.NaN, 77), null);
  assert.equal(parseCoords(null, null), null);
  assert.equal(parseCoords("", ""), null);
  assert.equal(parseCoords("abc", "77"), null);
});
