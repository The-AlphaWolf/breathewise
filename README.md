# BreatheWise — Challenge 6: Urban Air Quality Assistant

**Live demo:** https://breathewise-three.vercel.app/

## Chosen vertical and persona

Urban air quality for families and communities. Persona: Priya, a working parent in Delhi NCR with a school-age child, an 11 km commute, scooter and metro access, and a modest budget. On a severe-smog morning she needs realistic decisions about the school run, commute, cooking, waste and indoor time.

## What it does

A one-page, mobile-first assistant. You pick a city and a few routine facts (no account, address or diagnosis). It shows labelled air context and a ranked plan of three actions: lower-exposure choices, lower-emission routines and indoor-air hacks. Each action says what it changes (exposure, emissions, indoor air) separately. A Gemini-backed explanation tailors the "why" to your household. Extras: a ready-to-send community message built from the approved community actions, an opt-in "My current location" option, and an illustrative per-trip emissions estimate with its factors shown.

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
- Request body ≤ 4 KB, question ≤ 300 characters, 12 s model timeout, low temperature, in-memory per-IP rate limit (10 requests/min per server instance).

## Data sources, labels, attribution

- Live: [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (CAMS ENSEMBLE, CC BY 4.0). Labelled "area-level model forecast", "US AQI", never the Indian National AQI and never a station reading. Source time is shown in IST with freshness (source time and fetch time, ticking each minute); the page auto-refreshes every 5 minutes while the tab is visible and catches up when a stale tab returns, keeping the last forecast on screen with a warning if a refresh fails. The upstream call is never served from Next's stale-while-revalidate data cache (it returned day-old data after idle gaps); the CDN caches the route response for 5 minutes and browsers always revalidate. The CAMS model itself updates roughly hourly, so the value can legitimately stay the same between refreshes; older than 3 hours shows a stale banner.
- Demo mode: three fixed fixtures (severe, moderate, improving) with hourly series, behind an explicit toggle and persistent banner. A provider failure shows an error and an offer to switch; it never silently swaps to demo data.
- "My current location" is opt-in browser geolocation. Coordinates are validated to an India bounding box, rounded to 2 decimals (~1 km), used for one Open-Meteo request, never stored, and never sent to the model (it only sees "Your location (approx.)").
- Cities are a preset list (Delhi NCR, Lucknow, Kanpur, Patna, Kolkata, Mumbai) validated against an allow-list.

## Impact methodology

Impact is qualitative by design, with one clearly labelled exception: an optional illustrative estimator multiplies km × avoided trips × a visible factor (0.12 kg CO₂/km petrol car, 0.04 kg CO₂/km two-wheeler), rounded from ICCT India fleet averages ([two-wheelers](https://theicct.org/sites/default/files/publications/fuel-consumption-2w-india-aug2021.pdf), [passenger cars](https://theicct.org/publications/fuel-consumption-lvs-india-dec21)). Tailpipe CO₂ only; no particulate, life-cycle or traffic effects. It is never presented as a health or exposure benefit.

Otherwise impact is qualitative. Exposure, household-emissions and indoor-air effects are separate lines per action; transit and carpooling claim emissions benefits only. No numeric emission or health claims are made.

## Security and privacy

Keys are server-side only (`.env.local`, names listed in `.env.example`). Zod validates every request, upstream response and model response. City allow-list; rate limit, body-size limit and timeout on `/api/plan`. No profile or question is stored or logged. Security headers (CSP with same-origin connections, `nosniff`, referrer policy, permissions policy limiting geolocation to this site) are set in `next.config.ts`.

## Themes

Two themes with a Light | Dark control in the header (both options always visible, the active one highlighted): **Light** (warm paper, one teal accent) and **Dark** (graphite, off-white primary action, one sky-blue accent). Both are deliberately quiet: flat surfaces and hairlines instead of gradients and shadows, 500-weight headings, sentence-case labels, quiet text badges instead of pills, small radii, tabular figures and Instrument Sans (self-hosted via `next/font`). Shape and type tokens are shared in `:root`; each theme only defines colours (`:root[data-theme="light" | "dark"]` in `app/globals.css`). The first visit follows the OS light/dark preference; the choice is saved in `localStorage` (the app still works if storage is blocked) and a small inline script applies it before first paint to avoid a flash. The logo is a flat inline SVG (a breath wave plus a reading dot, in the accent colour) in `components/logo.tsx`, and the same drawing is the favicon (`app/icon.svg`, which switches colour with the OS theme). `lib/craft.test.ts` guards the finish: spacing on the 4 px grid, no dead CSS selectors, no emoji, and no trailing periods on headings or buttons. `lib/themes.test.ts` parses the real CSS and fails the build if either theme drops below WCAG contrast (4.5:1 for text, 3:1 for focus rings) on any text/background pair, or if the stylesheet uses a token that a theme does not define.

## Accessibility

Header outside `main`, one `h1`, labelled form controls with native fieldsets, `aria-pressed` on question chips, `aria-live` only for user-triggered results, `role="alert"` for errors, status never by colour alone, 44 px minimum targets, visible focus, reduced-motion guard. Checked at 375 px width with no horizontal scroll.

## Testing

```bash
npm ci
npm test          # node:test, no extra dependencies
npm run lint      # Biome (recommended rules)
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every push and pull request.

Covered: AQI boundaries and extra caution, rules gating/ranking and the top-3 invariant over every context × level × window combination, better-window logic, timestamp/freshness, demo fixtures, coordinate validation, the emissions estimator, the community message, and the AI validator (unknown ids, duplicates, coverage, length caps, URL/HTML rejection, injection question).

Manual checks: demo banner visible, location permission prompt (browser-dependent), provider-down error path, AI-unavailable fallback (run without a key), keyboard-only run-through.

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
