# date-apps

A small collection of single-purpose date-calculation utility apps, sharing a
common code scaffold.

## Structure

- Each top-level folder is a standalone app (its own `index.html` + `app.js`).
- `shared/` holds code reused across every app:
  - `date-utils.js` — pure date-math functions (no DOM, no Alpine). Load this
    before an app's own `app.js`.
  - `style.css` — small scaffold-level CSS layered on top of Bootstrap.
- Apps currently in this repo:
  - `date-calculator/` — apply a day/week/month/year offset to a date.
  - `pregnancy-calculator/` — estimate a due date from LMP (Naegele's Rule).

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
