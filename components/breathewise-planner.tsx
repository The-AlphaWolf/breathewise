"use client";

import { useEffect, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import {
  answerPreview,
  createPlan,
  demoQuestions,
  scenarios,
  type HouseholdProfile,
  type Recommendation,
  type ScenarioId,
} from "../lib/planner";
import type { ModelledAirResponse } from "../lib/air-quality";

type ToggleProps = {
  readonly checked: boolean;
  readonly id: string;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
};

function Toggle({ checked, id, label, onChange }: ToggleProps) {
  return (
    <label className="toggle-row" htmlFor={id}>
      <input
        checked={checked}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function RecommendationCard({ recommendation }: { readonly recommendation: Recommendation }) {
  return (
    <article className="recommendation-card">
      <div className="recommendation-topline">
        <span className="impact-badge">{recommendation.impactLabel}</span>
        <span aria-hidden="true" className="checkmark">✓</span>
      </div>
      <h3>{recommendation.title}</h3>
      <p><strong>Do:</strong> {recommendation.action}</p>
      <p><strong>Why it may help:</strong> {recommendation.reason}</p>
      <p><strong>Fallback:</strong> {recommendation.fallback}</p>
      <p className="caveat"><strong>Assumption:</strong> {recommendation.caveat}</p>
    </article>
  );
}

export function BreatheWisePlanner() {
  const agent = useEveAgent();
  const [scenarioId, setScenarioId] = useState<ScenarioId>("severe");
  const [extraCaution, setExtraCaution] = useState(true);
  const [hasTransit, setHasTransit] = useState(true);
  const [mustDrive, setMustDrive] = useState(false);
  const [lowCost, setLowCost] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [modelData, setModelData] = useState<ModelledAirResponse | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [assistantFallback, setAssistantFallback] = useState<string | null>(null);
  const assistantTimeout = useRef<number | null>(null);

  const profile: HouseholdProfile = {
    extraCaution,
    hasTransit,
    mustDrive,
    lowCost,
  };
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const planningScenario: ScenarioId =
    modelData === null
      ? scenario.id
      : modelData.usAqi !== null && modelData.usAqi > 150
        ? "severe"
        : modelData.usAqi !== null && modelData.usAqi > 50
          ? "moderate"
          : "improving";
  const plan = createPlan(profile, planningScenario);
  const preview = selectedQuestion === null
    ? null
    : answerPreview(selectedQuestion, profile, planningScenario);
  const latestAssistantMessage = [...agent.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const agentAnswer = latestAssistantMessage?.parts.find((part) => part.type === "text");
  const isAgentBusy = assistantFallback === null && (agent.status === "busy" || agent.status === "resuming");

  useEffect(() => {
    return () => {
      if (assistantTimeout.current !== null) {
        window.clearTimeout(assistantTimeout.current);
      }
    };
  }, []);

  async function loadModelledOutlook() {
    setIsLoadingModel(true);
    setModelError(null);

    try {
      const response = await fetch("/api/air-quality?city=delhi-ncr");
      const payload: unknown = await response.json();

      if (!response.ok || payload === null || typeof payload !== "object" || "error" in payload) {
        const message =
          payload !== null && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "The modelled air-quality outlook is temporarily unavailable.";
        throw new Error(message);
      }

      setModelData(payload as ModelledAirResponse);
    } catch (error) {
      setModelData(null);
      setModelError(
        error instanceof Error
          ? error.message
          : "The modelled air-quality outlook is temporarily unavailable.",
      );
    } finally {
      setIsLoadingModel(false);
    }
  }

  function requestAssistantExplanation() {
    if (selectedQuestion === null || isAgentBusy) return;

    setAssistantFallback(null);
    const context = {
      scenario: planningScenario,
      extraCaution: profile.extraCaution,
      hasTransit: profile.hasTransit,
      mustDrive: profile.mustDrive,
      lowCost: profile.lowCost,
      question: selectedQuestion,
      dataContext: modelData === null ? "demo" : "model",
    };

    if (assistantTimeout.current !== null) {
      window.clearTimeout(assistantTimeout.current);
    }

    assistantTimeout.current = window.setTimeout(() => {
      setAssistantFallback(
        "The model connection is not available, so BreatheWise is showing the approved safety-preview instead.",
      );
      void agent.cancel();
    }, 12_000);

    void agent
      .send(
        "Use the BreatheWise planning tool for this bounded follow-up. " +
          "Reply only with an approved explanation and its caveat. " +
          JSON.stringify(context),
        { clientContext: context },
      )
      .catch(() => {
        setAssistantFallback(
          "The model connection is not available, so BreatheWise is showing the approved safety-preview instead.",
        );
      });
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#today" aria-label="BreatheWise home">
          <span className="brand-mark" aria-hidden="true">◌</span>
          <span>BreatheWise</span>
        </a>
        <span className="challenge-label">Challenge 6 · Urban Air Quality Assistant</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Today’s clean-air plan</p>
        <h1 id="hero-title">Small choices, clearer context.</h1>
        <p>
          Build a realistic household plan for a smoggy day. This first slice uses
          labelled demo data and deterministic safety rules.
        </p>
      </section>

      <section className="setup-panel" aria-labelledby="setup-title">
        <div>
          <p className="eyebrow">1 · Your context</p>
          <h2 id="setup-title">Shape today’s plan</h2>
          <p className="section-intro">
            No address, diagnosis, or account is required for this demonstration.
          </p>
        </div>
        <div className="setup-controls">
          <fieldset className="scenario-picker">
            <legend>Demo air scenario</legend>
            <div className="choice-grid">
              {scenarios.map((item) => (
                <label className={item.id === scenario.id ? "choice active" : "choice"} key={item.id}>
                  <input
                    checked={item.id === scenario.id}
                    name="scenario"
                    onChange={() => setScenarioId(item.id)}
                    type="radio"
                    value={item.id}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="toggle-grid">
            <Toggle
              checked={extraCaution}
              id="extra-caution"
              label="Extra caution for this household"
              onChange={setExtraCaution}
            />
            <Toggle
              checked={hasTransit}
              id="has-transit"
              label="Transit or shared travel is available"
              onChange={setHasTransit}
            />
            <Toggle
              checked={mustDrive}
              id="must-drive"
              label="Driving is required today"
              onChange={setMustDrive}
            />
            <Toggle
              checked={lowCost}
              id="low-cost"
              label="Prefer free or low-cost actions"
              onChange={setLowCost}
            />
          </div>
        </div>
      </section>

      <section className="dashboard-grid" id="today" aria-label="Today’s air-quality plan">
        <article className="status-card">
          <div className={modelData === null ? "demo-banner" : "model-banner"}>
            {modelData === null
              ? "Demo data · not a live air-quality reading"
              : "Model forecast · not a nearby station reading"}
          </div>
          <p className="eyebrow">2 · Air context</p>
          <div className="status-heading">
            <div>
              <h2>{modelData?.category ?? scenario.severity}</h2>
              <p>
                {modelData === null
                  ? scenario.primaryPollutant + " is the focus in this scenario."
                  : "US AQI model forecast for " + modelData.locationLabel + "."}
              </p>
            </div>
            <span
              className={
                "severity-dot " +
                (modelData === null ? scenario.severity.toLowerCase() : planningScenario)
              }
              aria-hidden="true"
            />
          </div>
          <p className="status-summary">
            {modelData === null
              ? scenario.summary
              : "PM2.5: " + (modelData.pm25 ?? "unavailable") + " μg/m³ · PM10: " +
                (modelData.pm10 ?? "unavailable") + " μg/m³"}
          </p>
          <dl className="source-list">
            <div>
              <dt>Source type</dt>
              <dd>{modelData?.sourceType === "model" ? "Area-level model forecast" : "Demo fixture"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{modelData?.sourceName ?? scenario.sourceLabel}</dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd>{modelData?.sourceTimestamp ?? scenario.updatedAt}</dd>
            </div>
          </dl>
          <p className="caveat">{modelData?.caveat ?? scenario.caveat}</p>
          <button
            className="model-button"
            disabled={isLoadingModel}
            onClick={() => void loadModelledOutlook()}
            type="button"
          >
            {isLoadingModel ? "Checking modelled outlook…" : "Check Delhi modelled outlook"}
          </button>
          {modelError !== null ? <p className="model-error" role="alert">{modelError}</p> : null}
          {modelData !== null ? (
            <p className="model-note">
              The plan now uses the closest conservative rule set for this model forecast. It is not an official alert.
            </p>
          ) : null}
        </article>

        <article className="trust-card">
          <p className="eyebrow">Truth and safety contract</p>
          <h2>Never blur the data.</h2>
          <ul>
            <li>Station readings, model forecasts, and demo fixtures use different labels.</li>
            <li>Lower emissions and lower exposure are explained separately.</li>
            <li>Official local alerts take precedence over this plan.</li>
          </ul>
        </article>
      </section>

      <section className="plan-section" aria-labelledby="plan-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">3 · Today’s plan</p>
            <h2 id="plan-title">Three actions, matched to this scenario</h2>
          </div>
          <p>General information only — not medical advice.</p>
        </div>
        <div className="recommendation-grid">
          {plan.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      </section>

      <section className="assistant-section" aria-labelledby="assistant-title">
        <div>
          <p className="eyebrow">4 · Ask BreatheWise</p>
          <h2 id="assistant-title">Try a bounded follow-up</h2>
          <p>
            This safety-preview is rules-based. The Eve-powered explanation stream
            will be connected after the model runtime is configured.
          </p>
        </div>
        <div className="assistant-panel">
          <div className="question-list" aria-label="Suggested questions">
            {demoQuestions.map((question) => (
              <button
                className={selectedQuestion === question ? "question-button selected" : "question-button"}
                key={question}
                onClick={() => setSelectedQuestion(question)}
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
          <button
            className="ai-button"
            disabled={selectedQuestion === null || isAgentBusy}
            onClick={requestAssistantExplanation}
            type="button"
          >
            {isAgentBusy ? "Preparing explanation…" : "Get AI explanation"}
          </button>
          <div className="answer-box" aria-live="polite">
            <p className="answer-label">{agentAnswer === undefined ? "BreatheWise preview" : "BreatheWise explanation"}</p>
            <p>
              {agentAnswer?.text ??
                preview ??
                "Choose a question to see how the recommendation changes with the household context."}
            </p>
            {assistantFallback !== null || agent.error !== undefined ? (
              <p className="model-error" role="alert">
                {assistantFallback ??
                  "The assistant connection is unavailable, so the safety-preview remains in use."}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
