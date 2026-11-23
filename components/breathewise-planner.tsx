"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { actionById } from "../lib/actions.ts";
import type { AiOutput } from "../lib/ai.ts";
import { type AirSnapshot, airSnapshotSchema } from "../lib/air.ts";
import { aqiLevel, LEVEL_LABELS } from "../lib/aqi.ts";
import { DEMO_SCENARIOS, type DemoId } from "../lib/demo.ts";
import { parseCoords } from "../lib/geo.ts";
import { fallbackAnswer, type QuestionId } from "../lib/questions.ts";
import { type HouseholdContext, planActions } from "../lib/rules.ts";
import { buildCommunityMessage } from "../lib/share.ts";
import { findBetterWindow } from "../lib/window.ts";
import { AirCard } from "./air-card.tsx";
import { AskPanel, type AskView } from "./ask-panel.tsx";
import { type Mode, ContextForm } from "./context-form.tsx";
import { CommunityShare, EmissionsEstimate } from "./extras.tsx";
import { BrandMark } from "./logo.tsx";
import { PlanSection } from "./plan-section.tsx";
import { ThemeToggle } from "./theme-toggle.tsx";

const DEFAULT_CONTEXT: HouseholdContext = {
  extraCaution: true, schoolRun: true, hasTransit: true, mustDrive: false,
  biomassCooking: false, lowBudget: true, ownsPurifier: false,
};
const AI_TIMEOUT_MS = 15_000;
// Matches the server cache (5 min); the model itself updates roughly hourly.
const AUTO_REFRESH_MS = 300_000;

type AiState =
  | { readonly key: string; readonly status: "loading" }
  | { readonly key: string; readonly status: "ok"; readonly ai: AiOutput }
  | { readonly key: string; readonly status: "unavailable"; readonly message: string };

type Coords = { readonly lat: number; readonly lon: number };

async function loadLive(cityId: string, coords: Coords | null, signal: AbortSignal): Promise<AirSnapshot> {
  const url = cityId === "here" && coords !== null
    ? `/api/air-quality?lat=${coords.lat}&lon=${coords.lon}`
    : `/api/air-quality?city=${encodeURIComponent(cityId)}`;
  const response = await fetch(url, { signal });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (payload as { error?: unknown } | null)?.error;
    throw new Error(typeof message === "string" ? message : "The modelled air-quality outlook is temporarily unavailable.");
  }
  const parsed = airSnapshotSchema.safeParse(payload);
  if (!parsed.success) throw new Error("The air-quality response was not in the expected format.");
  return parsed.data;
}

export function BreatheWisePlanner() {
  const [cityId, setCityId] = useState("delhi-ncr");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("live");
  const [demoId, setDemoId] = useState<DemoId>("severe");
  const [ctx, setCtx] = useState<HouseholdContext>(DEFAULT_CONTEXT);
  const [live, setLive] = useState<{ readonly key: string; readonly snapshot: AirSnapshot } | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionId, setQuestionId] = useState<QuestionId | null>(null);
  const [aiState, setAiState] = useState<AiState | null>(null);
  const aiAbort = useRef<AbortController | null>(null);
  const lastFetched = useRef<number | null>(null);
  const targetKey = cityId === "here" && coords !== null ? `here:${coords.lat},${coords.lon}` : cityId;

  // Fetch (and refetch) live data. The previous snapshot stays on screen while a refresh runs.
  useEffect(() => {
    if (mode !== "live") return;
    const controller = new AbortController();
    setLoading(true);
    setLiveError(null);
    loadLive(cityId, coords, controller.signal)
      .then((snapshot) => {
        lastFetched.current = Date.now();
        setLive({ key: targetKey, snapshot });
        setNow(Date.now());
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLiveError(error instanceof Error ? error.message : "The modelled air-quality outlook is temporarily unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // coords is covered by targetKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cityId, targetKey, reload]);

  // Tick once a minute so "N min ago" and the stale banner stay accurate.
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, []);

  // Auto-refresh while the tab is visible, and catch up when a stale tab becomes visible again.
  useEffect(() => {
    if (mode !== "live") return;
    const refresh = () => { if (document.visibilityState === "visible") setReload((n) => n + 1); };
    const onVisible = () => {
      const last = lastFetched.current;
      if (document.visibilityState === "visible" && last !== null && Date.now() - last > AUTO_REFRESH_MS) {
        setReload((n) => n + 1);
      }
    };
    const timer = setInterval(refresh, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode]);

  const air = mode === "demo" ? DEMO_SCENARIOS[demoId].snapshot : live?.key === targetKey ? live.snapshot : null;
  const level = air === null ? null : aqiLevel(air.usAqi);
  const window = useMemo(() => (air === null ? null : findBetterWindow(air.hourly, air.usAqi)), [air]);
  const plan = useMemo(() => planActions(ctx, level, window), [ctx, level, window]);

  // An AI answer belongs to one exact (source, data time, household, question) combination.
  const currentKey = JSON.stringify([mode, mode === "demo" ? demoId : cityId, coords, air?.sourceTimestamp ?? null, ctx, questionText]);
  const currentAi = aiState !== null && aiState.key === currentKey ? aiState : null;

  const shownTop = useMemo(() => {
    if (currentAi?.status !== "ok") return { top: plan.top, more: plan.more };
    const all = [...plan.top, ...plan.more];
    const top = currentAi.ai.rankedActionIds.map((id) => actionById.get(id)).filter((a) => a !== undefined);
    return { top, more: all.filter((a) => !top.includes(a)) };
  }, [plan, currentAi]);
  const whyForYou = useMemo(
    () => new Map(currentAi?.status === "ok" ? currentAi.ai.perAction.map((p) => [p.id, p.whyForYou]) : []),
    [currentAi],
  );

  function chooseCity(id: string) {
    setGeoError(null);
    if (id !== "here") {
      setCityId(id);
      return;
    }
    if (!("geolocation" in navigator)) {
      setGeoError("Location is not available in this browser. Choose a city instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = parseCoords(position.coords.latitude, position.coords.longitude);
        if (point === null) {
          setGeoError("Your location is outside the supported area (India). Choose a city instead.");
          return;
        }
        setCoords(point);
        setCityId("here");
      },
      () => setGeoError("Location permission was not granted. Choose a city instead."),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  async function ask() {
    if (air === null) return;
    aiAbort.current?.abort();
    const controller = new AbortController();
    aiAbort.current = controller;
    const key = currentKey;
    setAiState({ key, status: "loading" });

    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          source:
            mode === "demo" ? { mode, scenarioId: demoId }
            : cityId === "here" && coords !== null ? { mode: "here", lat: coords.lat, lon: coords.lon }
            : { mode, cityId },
          context: ctx,
          question: questionText,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ai?: AiOutput; error?: string } | null;
      if (!response.ok || payload?.ai === undefined) throw new Error(payload?.error ?? "AI explanation is unavailable.");
      setAiState({ key, status: "ok", ai: payload.ai });
    } catch (error) {
      if (aiAbort.current !== controller) return;
      setAiState({
        key,
        status: "unavailable",
        message: (error instanceof Error && !controller.signal.aborted ? error.message : "AI explanation timed out.") +
          " Showing the rules-based plan instead.",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const askView: AskView =
    currentAi === null ? { status: "idle" }
    : currentAi.status === "loading" ? { status: "loading" }
    : currentAi.status === "ok" ? { status: "ok", summary: currentAi.ai.summary, answer: currentAi.ai.answer }
    : {
        status: "unavailable",
        message: currentAi.message,
        fallback: questionId !== null ? fallbackAnswer(questionId, ctx, window) : null,
      };

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#main" aria-label="BreatheWise home">
          <BrandMark />
          <span>BreatheWise</span>
        </a>
        <div className="header-tools">
          <span className="challenge-label">Challenge 6 · Urban Air Quality Assistant</span>
          <ThemeToggle />
        </div>
      </header>
      <main className="app-shell" id="main">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Today’s clean-air plan</p>
          <h1 id="hero-title">Small choices, clearer context</h1>
          <p>
            A household plan for a smoggy day: lower-exposure and lower-emission choices matched to your city
            and routine, with what each one changes.
          </p>
        </section>

        <ContextForm
          cityId={cityId} onCity={chooseCity} geoError={geoError} mode={mode} onMode={setMode}
          demoId={demoId} onDemo={setDemoId} ctx={ctx} onCtx={setCtx}
        />

        <section className="dashboard-grid" aria-label="Air context and trust">
          <AirCard
            air={air} loading={mode === "live" && loading} error={mode === "live" ? liveError : null}
            now={now} window={window}
            onRefresh={() => setReload((n) => n + 1)} onUseDemo={() => setMode("demo")}
          />
          <article className="trust-card">
            <p className="eyebrow">Truth and safety contract</p>
            <h2>Never blur the data</h2>
            <ul>
              <li>Model forecasts and demo fixtures are labelled differently and never mixed up.</li>
              <li>Exposure and household-emissions effects are explained separately.</li>
              <li>This is general information, not medical advice. Official local alerts take precedence.</li>
            </ul>
          </article>
        </section>

        {air !== null ? (
          <PlanSection top={shownTop.top} more={shownTop.more} whyForYou={whyForYou} />
        ) : (
          <p className="section-intro" role="status">
            {mode === "live" && loading ? "Your plan appears once the air data loads." : "Switch to demo data to see a sample plan."}
          </p>
        )}

        {air !== null ? (
          <CommunityShare
            message={buildCommunityMessage(
              air.locationLabel,
              level === null ? "unavailable" : LEVEL_LABELS[level],
              [...plan.top, ...plan.more],
            )}
          />
        ) : null}
        <EmissionsEstimate />

        <AskPanel
          text={questionText} questionId={questionId}
          onQuestion={(text, id) => { setQuestionText(text); setQuestionId(id); }}
          onAsk={() => void ask()} view={askView}
        />
      </main>
      <footer className="site-footer">
        <p>
          Air-quality data: <a href="https://open-meteo.com/">Open-Meteo.com</a>, CAMS ENSEMBLE (CC BY 4.0).
          BreatheWise is not a medical tool; follow official local alerts.
        </p>
      </footer>
    </>
  );
}
