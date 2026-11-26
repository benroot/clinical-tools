# Opioid Equivalence Calculator

Module-level notes for the opioid dose-equivalence calculator. This file is subordinate to the project-level CLAUDE.md, which governs development and implementation strategy. Where the two conflict, the project-level file wins.

## Purpose

Given a dose of one opioid by one route, show the equianalgesic dose of every other opioid/route in the data set. Example question: "Person took 40 mcg IV fentanyl and it was effective. What IV hydromorphone dose is equivalent?" (Answer: 0.6 mg.)

## Source data

Reference: morphine 10 mg IV = morphine 30 mg oral. A dash means there is no entry for that route (not "zero").

| Opioid | IV (mg) | Oral (mg) |
|---|---|---|
| Morphine | 10 | 30 |
| Hydromorphone | 1.5 | 7.5 |
| Oxycodone | — | 20 |
| Hydrocodone | — | 30 |
| Oxymorphone | 1 | 10 |
| Fentanyl | 0.1 (100 mcg) | — |

## Data structure

Each route stores one value, `equianalgesic_mg`: the mg of that drug equal to one reference unit of analgesia (the 10 mg IV / 30 mg oral morphine dose). Missing routes are omitted, not null.

```json
{
  "reference": { "opioid": "morphine", "note": "10 mg IV = 30 mg oral" },
  "opioids": {
    "morphine": {
      "display": "Morphine",
      "routes": { "iv": { "equianalgesic_mg": 10 }, "oral": { "equianalgesic_mg": 30 } }
    },
    "hydromorphone": {
      "display": "Hydromorphone",
      "routes": { "iv": { "equianalgesic_mg": 1.5 }, "oral": { "equianalgesic_mg": 7.5 } }
    },
    "oxycodone": {
      "display": "Oxycodone",
      "routes": { "oral": { "equianalgesic_mg": 20 } }
    },
    "hydrocodone": {
      "display": "Hydrocodone",
      "routes": { "oral": { "equianalgesic_mg": 30 } }
    },
    "oxymorphone": {
      "display": "Oxymorphone",
      "routes": { "iv": { "equianalgesic_mg": 1 }, "oral": { "equianalgesic_mg": 10 } }
    },
    "fentanyl": {
      "display": "Fentanyl",
      "routes": { "iv": { "equianalgesic_mg": 0.1, "display_unit": "mcg", "display_value": 100 } }
    }
  }
}
```

## Calculation

Terminology: `current` is the opioid/route/dose the user enters. `target` is each opioid/route being converted to.

```
units      = current_mg / E_current
target_mg  = units * E_target
           = current_mg * (E_target / E_current)
```

1. Normalise the input to mg (fentanyl is entered in mcg: divide by 1000).
2. Look up `E_current` for the chosen opioid and route.
3. For every opioid/route in the data, look up `E_target` and compute `target_mg`.
4. Format each result using the target's `display_unit` if present (fentanyl shows mcg), otherwise mg.

Worked examples:
- 5 mg oral oxycodone → IV morphine: 5 × (10 / 20) = 2.5 mg
- 40 mcg IV fentanyl → IV hydromorphone: 0.04 × (1.5 / 0.1) = 0.6 mg
- 10 mg oral hydromorphone → oral morphine: 10 × (30 / 7.5) = 40 mg

Adding a new opioid means adding one entry; no pairwise conversion table is needed.

## Inputs and outputs

Inputs:
1. Current opioid: dropdown
2. Dose: number, in mg (mcg for fentanyl)
3. Route: dropdown (only routes that exist for the chosen opioid)

Output: a table with one row per opioid and an IV column then a PO column (column order follows `ROUTE_LABELS` in `opioids.js`). A route with no data shows "—" (with visually-hidden "no data" for screen readers), matching the source table's convention. Routes are labeled IV / PO in both the table and the route dropdown.

## Implementation

- `opioids.js` — the data above as a JS constant (`OPIOID_DATA`, not a `.json` file, so the app works when opened from disk where `fetch()` is blocked) plus pure functions: `routesFor`, `doseUnit`, `parseDose`, `equivalentDoses`, `formatDose`. No DOM, no Alpine. Load before `app.js`.
- `app.js` — the Alpine component. Results update live as the dose is typed; changing the opioid keeps the route if it exists, otherwise picks the first available.
- A visible warning at the top of the page says the data isn't yet verified and no cross-tolerance reduction is applied. Remove it once verified.

## Decisions (formerly open items)

- **Identity row:** the entered opioid/route stays in its normal cell, marked "(entered)" and highlighted, so every table has the same rows and doubles as an input check.
- **Rounding:** mg to at most 2 decimals with trailing zeros dropped (0.6, 2.5, 0.17); mcg to whole numbers. A result that rounds to 0 shows "< 0.01 mg" / "< 1 mcg". Rounding to real product increments is deferred until a verified list of strengths exists.
- **Number type:** plain floats at full precision, rounded only for display. The error (~1e-16 mg) is far below display rounding; the three worked examples above come out exact.

## Out of scope for now

- Parsing free-text input.
- Cross-tolerance dose reduction when switching opioids. This calculator gives straight equianalgesic equivalence only.
- Verification against an authoritative clinical source. This must happen before any clinical use.
