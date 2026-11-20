"use client";

import { CITIES } from "../lib/cities.ts";
import { DEMO_IDS, DEMO_SCENARIOS, type DemoId } from "../lib/demo.ts";
import type { HouseholdContext } from "../lib/rules.ts";

export type Mode = "live" | "demo";

type Props = {
  readonly cityId: string;
  readonly onCity: (id: string) => void;
  readonly mode: Mode;
  readonly onMode: (mode: Mode) => void;
  readonly demoId: DemoId;
  readonly onDemo: (id: DemoId) => void;
  readonly ctx: HouseholdContext;
  readonly onCtx: (next: HouseholdContext) => void;
};

const TOGGLES: readonly { key: keyof HouseholdContext; label: string }[] = [
  { key: "extraCaution", label: "Extra caution for this household" },
  { key: "schoolRun", label: "We do a school run" },
  { key: "hasTransit", label: "Metro, bus or shared travel is available" },
  { key: "mustDrive", label: "Driving is required today" },
  { key: "biomassCooking", label: "We cook with firewood, dung cakes or coal" },
  { key: "lowBudget", label: "Prefer free or low-cost actions" },
  { key: "ownsPurifier", label: "We own an air purifier" },
];

export function ContextForm({ cityId, onCity, mode, onMode, demoId, onDemo, ctx, onCtx }: Props) {
  return (
    <section className="setup-panel" aria-labelledby="setup-title">
      <div>
        <p className="eyebrow">1 · Your context</p>
        <h2 id="setup-title">Shape today’s plan</h2>
        <p className="section-intro">No address, diagnosis or account is needed. Choices stay in this browser tab.</p>
      </div>
      <div className="setup-controls">
        <div className="field">
          <label htmlFor="city">City</label>
          <select id="city" value={cityId} disabled={mode === "demo"} onChange={(e) => onCity(e.target.value)}>
            {CITIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {mode === "demo" ? <p className="field-hint">Demo scenarios use Delhi NCR.</p> : null}
        </div>

        <fieldset>
          <legend>Air data</legend>
          <div className="choice-grid">
            {(["live", "demo"] as const).map((m) => (
              <label className={m === mode ? "choice active" : "choice"} key={m}>
                <input type="radio" name="mode" checked={m === mode} onChange={() => onMode(m)} />
                <span>{m === "live" ? "Live model forecast" : "Demo mode (fixed data)"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "demo" ? (
          <fieldset>
            <legend>Demo scenario</legend>
            <div className="choice-grid">
              {DEMO_IDS.map((id) => (
                <label className={id === demoId ? "choice active" : "choice"} key={id}>
                  <input type="radio" name="scenario" checked={id === demoId} onChange={() => onDemo(id)} />
                  <span>{DEMO_SCENARIOS[id].label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="toggle-grid">
          {TOGGLES.map(({ key, label }) => (
            <label className="toggle-row" key={key}>
              <input
                type="checkbox"
                checked={ctx[key]}
                onChange={(e) => onCtx({ ...ctx, [key]: e.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
