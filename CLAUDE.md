# clinical-tools

A small collection of single-purpose clinical calculator apps, sharing a
common code scaffold.

## Structure

- Each top-level folder is a standalone app (its own `index.html` + `app.js`).
- A top-level `index.html` at the repo root acts as a landing page: a table
  listing each app with a short description and a link to that app's own
  `index.html`. Keep this table in sync whenever an app is added, removed, or
  its purpose changes.
- `shared/` holds code reused across every app:
  - `date-utils.js` — pure date-math functions (no DOM, no Alpine). Load this
    before an app's own `app.js`.
  - `style.css` — small scaffold-level CSS layered on top of Bootstrap.
    It defines the page layout every app relies on: each page puts all its
    content in `<main class="app-shell">` (followed only by the disclaimer
    footer), which centers it at `--app-max-width` and adds a responsive
    side gutter, `--app-gutter` (`clamp(1rem, 5vw, 2rem)`: 16px on phones
    up to 32px), so content never touches the screen edge. Don't place
    content outside `.app-shell` or add per-app side margins.
  - `disclaimer.js` — defines `<app-disclaimer>`, the standard
    "educational and reference use only" footer. **Every page** (each app
    and the landing page) places `<app-disclaimer></app-disclaimer>` right
    after `</main>` and loads this script; edit the wording only here.
- Icons live in the repo root (`favicon.ico`, `favicon.svg`,
  `apple-touch-icon.png`, `icon-*.png`) with `manifest.webmanifest` for
  Android. **Every page**, including each new app, copies the same
  "Icons" block of `<link>` tags into its `<head>` right after `<title>`,
  with paths prefixed `../` in app folders. Keep these as static tags, not
  JS-injected: iOS, Android and browsers read icons from the initial HTML.
- Apps currently in this repo:
  - `date-calculator/` — apply a day/week/month/year offset to a date.
  - `pregnancy-calculator/` — estimate a due date from LMP (Naegele's Rule).
  - `dose-counter/` — figure out how many pills remain to prescribe for a
    course of medication, given doses already administered.
  - `pediatric-dosing/` — weight-based dosing for common pediatric
    medications (currently acetaminophen).
  - `map-calculator/` — mean arterial pressure from a systolic/diastolic
    blood pressure (2/3 diastolic + 1/3 systolic).
  - `bmi-calculator/` — BMI from any two of weight, height and BMI, plus a
    target "what if" and weight loss / BMI category threshold tables.
  - `morphine-equivalents/` — opioid equianalgesic conversion: one dose of
    one opioid/route to the equivalent dose of every other.

## Working principles

1. **Develop incrementally.** Favor the smallest change that delivers working
   functionality over a large batch of changes. Get something correct and
   minimal working before layering on more.
2. **Functionality before presentation.** Get behavior/logic right first;
   defer visual/styling polish until the underlying feature works.
3. **Keep the stack simple.** CSS via Bootstrap (CDN, currently 5.3) plus
   `shared/style.css` for scaffold-level overrides; JS via Alpine.js (CDN) for
   reactivity. Don't introduce build tooling, bundlers, or heavier frameworks
   for these apps.
4. **Semantic HTML, no clutter.** Markup should read cleanly on its own —
   avoid inline styles and inline scripts. Alpine directives
   (`x-data`, `x-model`, `@click`, etc.) in markup are fine; presentational
   classes and one-off `<script>` blocks are not.
5. **Shared code lives in `shared/`.** New date-math logic belongs in
   `shared/date-utils.js` if more than one app could use it, not duplicated
   per-app.
6. **Cross-pollinate refactors.** If a change in one app's structure, a11y
   pattern, or utility function would improve another app, call it out and
   consider applying it there too — don't let the apps drift apart
   unnecessarily.

## Working with the user

- Before starting a refactor, confirm your understanding of the intended
  change first. Scale the amount of up-front planning/detail to the size of
  the refactor — small, single-file tweaks need little discussion; anything
  touching `shared/` or multiple apps warrants a clear plan agreed on before
  editing, to avoid costly rework.
