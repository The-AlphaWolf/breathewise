# BreatheWise — Challenge 6: Urban Air Quality Assistant

**Live demo:** https://breathewise-three.vercel.app/

## Chosen vertical and persona

Urban air quality for families and communities. Persona: Priya, a working parent in Delhi NCR with a school-age child, an 11 km commute, scooter and metro access, and a modest budget. On a severe-smog morning she needs realistic decisions about the school run, commute, cooking, waste and indoor time.

## What it does

A one-page, mobile-first assistant. You pick a city and a few routine facts (no account, address or diagnosis). It shows labelled air context and a ranked plan of three actions: lower-exposure choices, lower-emission routines and indoor-air hacks. Each action says what it changes (exposure, emissions, indoor air) separately. A Gemini-backed explanation tailors the "why" to your household.

## How it works

```
context form + air data (live Open-Meteo or labelled demo fixture)
   → rules engine (lib/rules.ts) → approved actions
   → Gemini call (app/api/plan) with approved actions + question as untrusted text
   → validator (lib/ai.ts) → UI
   on any AI failure → the deterministic plan stays, labelled
```

The plan is computed in the browser by the same pure code the server uses to validate model output, so toggling a choice updates the plan instantly and the AI can never add actions the rules did not approve.

## Decision logic

- `lib/actions.ts`: 14 typed actions (id, do / why / fallback / assumption, impact lines, gates, cost, scope).
- `lib/aqi.ts`: US AQI → level 0–5. **Extra caution** raises the effective level one step.
- `lib/rules.ts`: filter by level gates and context flags (e.g. `mustDrive` excludes the transit swap, `ownsPurifier` swaps the cleaner-room action for the purifier action); at high levels one exposure action leads; then routine-matching actions, then cost fit when budget is low; stable tie-break by catalogue order. The top 3 always include one indoor and one lower-emissions action; the rest go under "More options". If AQI is unavailable the planner assumes a cautious default.
- `lib/window.ts`: best 2-hour window in the next 12 hours of the hourly forecast, shown only if at least 20% lower than now, otherwise "no clearly better window".
- Safety gate: no outdoor-activity or window-airing suggestion at effective level Unhealthy or worse.

## GenAI safety controls

- One structured call (`generateText` + `Output.object`, Gemini via `@ai-sdk/google`); no tool loop.
- The model sees only city, AQI category, better window, household flags, approved actions and the question (inside a JSON string, marked untrusted). No name, address, coordinates or child details.
- Server-side validation (`validateAiOutput`): zod schema, 3 distinct ids that are all approved, at least one indoor and one emissions action, per-action ids inside the ranking, length caps, and no URLs, HTML or markdown links. Any failure returns an error and the UI falls back to the rules-based plan.
- Request body ≤ 4 KB, question ≤ 300 characters, 10 s model timeout, low temperature, in-memory per-IP rate limit (10 requests/min per server instance).

## Data sources, labels, attribution

- Live: [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (CAMS ENSEMBLE, CC BY 4.0). Labelled "area-level model forecast", "US AQI", never the Indian National AQI and never a station reading. Source time is shown in IST with freshness; older than 3 hours shows a stale banner.
- Demo mode: three fixed fixtures (severe, moderate, improving) with hourly series, behind an explicit toggle and persistent banner. A provider failure shows an error and an offer to switch; it never silently swaps to demo data.
- Cities are a preset list (Delhi NCR, Lucknow, Kanpur, Patna, Kolkata, Mumbai) validated against an allow-list.

## Impact methodology

Impact is qualitative by design. Exposure, household-emissions and indoor-air effects are separate lines per action; transit and carpooling claim emissions benefits only. No numeric emission or health claims are made.

## Security and privacy

Keys are server-side only (`.env.local`, names listed in `.env.example`). Zod validates every request, upstream response and model response. City allow-list; rate limit, body-size limit and timeout on `/api/plan`. No profile or question is stored or logged. Security headers (CSP with same-origin connections, `nosniff`, referrer policy) are set in `next.config.ts`.

## Accessibility

Header outside `main`, one `h1`, labelled form controls with native fieldsets, `aria-pressed` on question chips, `aria-live` only for user-triggered results, `role="alert"` for errors, status never by colour alone, 44 px minimum targets, visible focus, reduced-motion guard. Checked at 375 px width with no horizontal scroll.

## Testing

```bash
npm ci
npm test          # node:test, no extra dependencies
npm run typecheck
npm run build
```

Covered: AQI boundaries and extra caution, rules gating/ranking and the top-3 invariant over every context × level × window combination, better-window logic, timestamp/freshness, demo fixtures, and the AI validator (unknown ids, duplicates, coverage, length caps, URL/HTML rejection, injection question).

Manual checks: demo banner visible, provider-down error path, AI-unavailable fallback (run without a key), keyboard-only run-through.

## Setup

Node ≥ 22.18.

```bash
cp .env.example .env.local   # add GOOGLE_GENERATIVE_AI_API_KEY (Google AI Studio)
npm ci
npm run dev
```

Without a key everything works except the AI explanation, which falls back to the rules-based plan.

## Assumptions and limitations

- Air data is an area-level model forecast, not a station reading; street-level air differs. CPCB station data is not used.
- The model id (`gemini-3.1-flash-lite`) is a constant in `app/api/plan/route.ts`.
- The rate limiter is per server instance and resets on restart.
- Validator blocks links and markup but does not fact-check numbers in model prose; the system prompt forbids new numbers and cards are always rendered from the approved catalogue.
- English only; general information, not medical advice. Official local alerts take precedence.
