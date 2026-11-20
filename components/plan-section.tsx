"use client";

import type { Action } from "../lib/actions.ts";

type Props = {
  readonly top: readonly Action[];
  readonly more: readonly Action[];
  /** Model-written "why for you" lines by action id (validated server-side). */
  readonly whyForYou: ReadonlyMap<string, string>;
};

function PlanCard({ action, why }: { readonly action: Action; readonly why: string | undefined }) {
  const { exposure, emissions, indoor } = action.impact;
  return (
    <article className="recommendation-card">
      <div className="recommendation-topline">
        <span className="impact-badge">
          {[exposure && "Exposure", emissions && "Emissions", indoor && "Indoor air"].filter(Boolean).join(" · ")}
        </span>
        {action.scope === "community" ? <span className="impact-badge">Community</span> : null}
      </div>
      <h3>{action.title}</h3>
      <p><strong>Do:</strong> {action.do}</p>
      <p><strong>Why:</strong> {action.why}</p>
      {why !== undefined ? <p className="why-for-you"><strong>For your household:</strong> {why}</p> : null}
      <ul className="impact-list">
        {exposure ? <li><strong>Exposure:</strong> {exposure}</li> : null}
        {emissions ? <li><strong>Emissions:</strong> {emissions}</li> : null}
        {indoor ? <li><strong>Indoor air:</strong> {indoor}</li> : null}
      </ul>
      <p><strong>Fallback:</strong> {action.fallback}</p>
      <p className="caveat"><strong>Assumption:</strong> {action.assumption}</p>
    </article>
  );
}

export function PlanSection({ top, more, whyForYou }: Props) {
  return (
    <section className="plan-section" aria-labelledby="plan-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">3 · Today’s plan</p>
          <h2 id="plan-title">Three ranked actions for your household</h2>
        </div>
        <p>General information only — not medical advice.</p>
      </div>
      <ol className="recommendation-grid">
        {top.map((action) => (
          <li key={action.id}><PlanCard action={action} why={whyForYou.get(action.id)} /></li>
        ))}
      </ol>
      {more.length > 0 ? (
        <details className="more-options">
          <summary>More options ({more.length})</summary>
          <ul>
            {more.map((a) => (
              <li key={a.id}><strong>{a.title}.</strong> {a.do}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
