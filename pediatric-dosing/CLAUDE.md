# pediatric-dosing — app spec

Weight-based dosing helper for common pediatric medications. See root
[`CLAUDE.md`](../CLAUDE.md) for repo-wide structure and working principles;
this file tracks the spec for this app specifically and should evolve as the
app does.

## Core concept

Given a child's weight, calculate the correct weight-based dose of a
medication and express it as a liquid volume of a standard commercial
concentration, since liquid formulations are what's actually administered.

- **Acetaminophen (Tylenol)** — the source document's dosing range is
  **10–15 mg/kg per dose**; this app treats **15 mg/kg as the default** dose
  but should acknowledge and support calculating at the lower end of the
  range too (see iterations below), using the standard **160 mg/5 mL**
  suspension (the current single US concentration for both infant and
  children's products). Source reference material for this medication lives
  in
  [`tylenol and motrin dosage guidelines.md`](tylenol%20and%20motrin%20dosage%20guidelines.md).
  Do not invent or guess clinical values not present in that document — the
  10–15 mg/kg range, frequency, daily max, and safety notes should all be
  sourced from the document as-is.
- **Ibuprofen (Motrin)** — future medication, same document already has the
  reference dosing data for it (5–10 mg/kg/dose, 100 mg/5 mL children's
  suspension). Not in scope until the iteration below.

The app is single-medication-at-a-time: one set of guidelines, one dosing
table, one calculator, with medication selection arriving once ibuprofen is
added (see iterations).

## Iterations

### Iteration 1 — Tylenol reference content (done)

- Read the acetaminophen section of
  [`tylenol and motrin dosage guidelines.md`](tylenol%20and%20motrin%20dosage%20guidelines.md)
  and render it as simplified, semantic HTML: dosing rule, frequency/max
  daily dose, and the key safety reminders (hepatotoxicity risk, accounting
  for combination products).
- Render the standard dosing table (weight → dose in mg → volume in mL,
  15 mg/kg using 160 mg/5 mL suspension) from the same document. The table
  stays fixed at 15 mg/kg — it's a reference chart, not the calculator — but
  the surrounding guidelines text should acknowledge the 10–15 mg/kg range
  rather than presenting 15 mg/kg as the only correct dose.
- Static/reference only — no calculator input yet.
- Addition to the root [`index.html`](../index.html) landing page table is
  **intentionally deferred until iteration 2** is done (user's call — the app
  isn't useful as a standalone destination until the calculator exists).
  Prompt again once iteration 2 is confirmed working.

### Iteration 2 — weight-based calculator (current focus)

- Single text input accepting weight with an inline unit — a number
  immediately or space-separated from `kg`/`k`, or `lb`/`lbs`/`#` for pounds
  (e.g. `9.7kg`, `9 k`, `20lbs`, `20#`). A bare number with no unit is
  invalid — kg and lb values look identical unitless, so guessing would
  risk a silent mis-dose. Once parsed, the field is rewritten to a
  normalized `value unit` form (e.g. `20 lb`) on blur/enter, same pattern
  as the date-field commit convention in `dose-counter/app.js`.
- A dose-per-kg toggle, **defaulting to 15 mg/kg**, with an option to switch
  to **10 mg/kg** (the low end of the source document's range) — the
  calculator should not be hardcoded to 15 mg/kg only.
- Compute the selected mg/kg dose in mg, convert to volume of 160 mg/5 mL
  suspension in mL.
- Display both in a result panel: **mL is primary** (larger/first — this is
  what's actually measured and given), **mg is secondary** (supporting
  detail).

### Future work (not yet started)

- Independent app-level stylesheet to refine look and feel, layered on
  Bootstrap + `shared/style.css` per root principle 3.
- A "copy dosing table" action that formats the table in a way suitable for
  pasting into patient instructions in a medical record. Possible
  refinements to that copyable table, not yet scoped:
  - Tailor it to patient preference of pounds (lb) as the weight unit,
    rather than always showing kg.
  - Round doses/volumes to avoid decimal mL amounts (e.g. caregiver-friendly
    whole or half-mL increments), trading a bit of dosing precision for a
    number that's easier to measure and communicate.
- Add ibuprofen support: same guidelines-simplification + dosing-table +
  calculator pattern as Tylenol, plus UI to switch between the two
  medications. When this lands, revisit whether medication-config or
  weight-conversion logic should move to `shared/` (root principle 5) if a
  clean reuse opportunity exists — don't force it prematurely.
</content>
