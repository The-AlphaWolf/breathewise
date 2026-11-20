import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { aiOutputSchema, buildPrompt, MAX_QUESTION_LENGTH, SYSTEM_PROMPT, validateAiOutput } from "../../../lib/ai.ts";
import { type AirSnapshot } from "../../../lib/air.ts";
import { AirError, fetchLiveAir } from "../../../lib/air-server.ts";
import { aqiLevel, LEVEL_LABELS } from "../../../lib/aqi.ts";
import { CITY_IDS } from "../../../lib/cities.ts";
import { DEMO_IDS, DEMO_SCENARIOS } from "../../../lib/demo.ts";
import { rateLimited } from "../../../lib/rate-limit.ts";
import { contextSchema, planActions } from "../../../lib/rules.ts";
import { findBetterWindow } from "../../../lib/window.ts";

export const runtime = "nodejs";
export const maxDuration = 30; // seconds; the model call itself is capped at 12 s

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const MAX_BODY_BYTES = 4_096;
const MODEL_TIMEOUT_MS = 12_000;

const requestSchema = z.object({
  source: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("live"), cityId: z.enum(CITY_IDS) }),
    z.object({ mode: z.literal("demo"), scenarioId: z.enum(DEMO_IDS as [string, ...string[]]) }),
  ]),
  context: contextSchema,
  question: z.string().trim().max(MAX_QUESTION_LENGTH).default(""),
});

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return fail(429, "Too many requests. Please wait a minute.");

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return fail(413, "Request too large.");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail(400, "Invalid request.");
  }
  const body = requestSchema.safeParse(json);
  if (!body.success) return fail(400, "Invalid request.");
  const { source, context, question } = body.data;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return fail(503, "AI explanation is not configured.");

  let air: AirSnapshot;
  try {
    air = source.mode === "live"
      ? await fetchLiveAir(source.cityId)
      : DEMO_SCENARIOS[source.scenarioId as keyof typeof DEMO_SCENARIOS].snapshot;
  } catch (error) {
    return fail(error instanceof AirError ? error.status : 503, "Air data is unavailable.");
  }

  const level = aqiLevel(air.usAqi);
  const window = findBetterWindow(air.hourly, air.usAqi);
  const plan = planActions(context, level, window);
  const approved = new Set([...plan.top, ...plan.more].map((a) => a.id));

  const started = Date.now();
  try {
    const { output } = await generateText({
      model: google(GEMINI_MODEL),
      output: Output.object({ schema: aiOutputSchema }),
      temperature: 0.2,
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt({
        cityLabel: air.locationLabel,
        levelLabel: level === null ? "unavailable" : LEVEL_LABELS[level],
        window,
        ctx: context,
        plan,
        question,
      }),
    });

    const checked = validateAiOutput(output, approved);
    if (!checked.ok) return fail(502, "AI explanation did not pass validation.");
    return Response.json({ ai: checked.value });
  } catch (error) {
    console.error("[plan] model call failed after", Date.now() - started, "ms:", error instanceof Error ? error.message : "unknown error");
    return fail(502, "AI explanation is temporarily unavailable.");
  }
}
