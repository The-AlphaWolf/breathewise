"use client";

import { useMemo, useState } from "react";
import { actionById } from "../lib/actions.ts";
import { airUrl, type Coords } from "../lib/air.ts";
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
import { useAiAnswer } from "./use-ai-answer.ts";
import { useLiveAir } from "./use-live-air.ts";

const DEFAULT_CONTEXT: HouseholdContext = {
  extraCaution: true, schoolRun: true, hasTransit: true, mustDrive: false,
  biomassCooking: false, lowBudget: true, ownsPurifier: false,
};

export function BreatheWisePlanner() {
  const [cityId, setCityId] = useState("delhi-ncr");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("live");
  const [demoId, setDemoId] = useState<DemoId>("severe");
  const [ctx, setCtx] = useState<HouseholdContext>(DEFAULT_CONTEXT);
  const [questionText, setQuestionText] = useState("");
  const [questionId, setQuestionId] = useState<QuestionId | null>(null);

  const liveAir = useLiveAir(mode === "live", airUrl(cityId, coords));
  const air = mode === "demo" ? DEMO_SCENARIOS[demoId].snapshot : liveAir.snapshot;
  const level = air === null ? null : aqiLevel(air.usAqi);
  const betterWindow = useMemo(() => (air === null ? null : findBetterWindow(air.hourly, air.usAqi)), [air]);
  const plan = useMemo(() => planActions(ctx, level, betterWindow), [ctx, level, betterWindow]);

  const source =
    mode === "demo" ? { mode, scenarioId: demoId }
    : cityId === "here" && coords !== null ? { mode: "here", lat: coords.lat, lon: coords.lon }
    : { mode, cityId };
  const ai = useAiAnswer(JSON.stringify([source, air?.sourceTimestamp ?? null, ctx, questionText]));
  const currentAi = ai.current;

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

  const askView: AskView =
    currentAi === null ? { status: "idle" }
    : currentAi.status === "loading" ? { status: "loading" }
    : currentAi.status === "ok" ? { status: "ok", summary: currentAi.ai.summary, answer: currentAi.ai.answer }
    : {
        status: "unavailable",
        message: currentAi.message,
        fallback: questionId !== null ? fallbackAnswer(questionId, ctx, betterWindow) : null,
      };
  const shareMessage = air === null
    ? null
    : buildCommunityMessage(air.locationLabel, level === null ? "unavailable" : LEVEL_LABELS[level], [...plan.top, ...plan.more]);

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
            air={air} loading={mode === "live" && liveAir.loading} error={mode === "live" ? liveAir.error : null}
            now={liveAir.now} betterWindow={betterWindow}
            onRefresh={liveAir.refresh} onUseDemo={() => setMode("demo")}
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
            {mode === "live" && liveAir.loading ? "Your plan appears once the air data loads." : "Switch to demo data to see a sample plan."}
          </p>
        )}

        {shareMessage !== null ? <CommunityShare message={shareMessage} /> : null}
        <EmissionsEstimate />

        <AskPanel
          text={questionText} questionId={questionId}
          onQuestion={(text, id) => { setQuestionText(text); setQuestionId(id); }}
          onAsk={() => { if (air !== null) void ai.ask({ source, context: ctx, question: questionText }); }} view={askView}
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
