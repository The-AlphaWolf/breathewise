import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIONS } from "./actions.ts";
import { buildCommunityMessage } from "./share.ts";

const community = ACTIONS.filter((a) => a.scope === "community");
const household = ACTIONS.filter((a) => a.scope === "household");

test("message uses only community-scope actions and the safety line", () => {
  const msg = buildCommunityMessage("Delhi NCR", "Very unhealthy", [...community, ...household]);
  assert.ok(msg);
  for (const a of community) assert.ok(msg.includes(a.title), a.id);
  for (const a of household) assert.ok(!msg.includes(a.title), a.id);
  assert.ok(msg.includes("Delhi NCR") && msg.includes("Very unhealthy"));
  assert.ok(msg.includes("Official local alerts take precedence"));
  assert.ok(msg.includes("model forecast"));
});

test("no community actions means no message", () => {
  assert.equal(buildCommunityMessage("Delhi NCR", "Good", household), null);
});

test("message is plain text with no links", () => {
  const msg = buildCommunityMessage("Patna", "Unhealthy", community) ?? "";
  assert.ok(!/https?:|<|>/.test(msg));
});
