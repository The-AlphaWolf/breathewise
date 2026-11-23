"use client";

import { MAX_QUESTION_LENGTH } from "../lib/ai.ts";
import { QUESTIONS, type QuestionId } from "../lib/questions.ts";

export type AskView =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ok"; readonly summary: string; readonly answer: string }
  | { readonly status: "unavailable"; readonly message: string; readonly fallback: string | null };

type Props = {
  readonly text: string;
  readonly questionId: QuestionId | null;
  readonly onQuestion: (text: string, id: QuestionId | null) => void;
  readonly onAsk: () => void;
  readonly view: AskView;
};

export function AskPanel({ text, questionId, onQuestion, onAsk, view }: Props) {
  const busy = view.status === "loading";
  return (
    <section className="assistant-section" aria-labelledby="assistant-title">
      <div>
        <p className="eyebrow">4 · Ask BreatheWise</p>
        <h2 id="assistant-title">Get an AI explanation</h2>
        <p>
          The AI can only reorder and explain the actions your rules-based plan already approved. If it is
          unavailable or fails a check, you keep the plan above.
        </p>
        <p className="caveat">
          Sent to the model: city, air level, your choices above and the question text. No name, address or
          coordinates.
        </p>
      </div>
      <div className="assistant-panel">
        <div className="question-list" role="group" aria-label="Suggested questions">
          {QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              aria-pressed={questionId === q.id}
              className={questionId === q.id ? "question-button selected" : "question-button"}
              onClick={() => onQuestion(q.text, q.id)}
            >
              {q.text}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="question">Or ask your own question (optional)</label>
          <textarea
            id="question"
            rows={3}
            maxLength={MAX_QUESTION_LENGTH}
            aria-describedby="question-count"
            value={text}
            onChange={(e) => onQuestion(e.target.value, null)}
          />
          <p className="field-hint" id="question-count">{text.length}/{MAX_QUESTION_LENGTH}</p>
        </div>
        <button className="ai-button" type="button" disabled={busy} onClick={onAsk}>
          {busy ? "Preparing explanation…" : "Explain my plan"}
        </button>
        <div className="answer-box" aria-live="polite">
          {view.status === "idle" ? <p>Choose a question or just press “Explain my plan”.</p> : null}
          {view.status === "loading" ? <p>Preparing explanation…</p> : null}
          {view.status === "ok" ? (
            <>
              <p className="answer-label">AI explanation (checked against your plan)</p>
              <p>{view.summary}</p>
              {view.answer !== "" ? <p>{view.answer}</p> : null}
            </>
          ) : null}
          {view.status === "unavailable" ? (
            <>
              <p className="model-error" role="alert">{view.message}</p>
              {view.fallback !== null ? (
                <>
                  <p className="answer-label">Rules-based answer</p>
                  <p>{view.fallback}</p>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
