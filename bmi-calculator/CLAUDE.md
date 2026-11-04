# bmi-calculator — app spec

Calculates BMI from any two of weight, height and BMI, then lets the user
try a target ("what if") next to weight loss and BMI category thresholds.
See root [`CLAUDE.md`](../CLAUDE.md) for repo-wide structure and working
principles; this file tracks the spec for this app specifically and should
evolve as the app does. Built from the "BMI Calculator: Build Brief (v6)".

## Files

- `bmi.js` — pure parsing, math and formatting (no DOM, no Alpine). Load
  before `app.js`.
- `app.js` — the Alpine component (UI state, focus, announcements only).

## Screen order (single column)

1. Baseline
2. Target
3. Weight loss thresholds
4. BMI category thresholds
5. Copy results / Start over

Sections 2–4 are visible but disabled, with text saying why, until the
baseline is calculated. No local storage, no accounts. Audience is mostly
adults.

## 1. Baseline

- Fields: Weight, Height, BMI, each with a visible label. Fill any two and
  press Calculate (Enter submits).
- Fewer than two filled: "Fill in any two of weight, height and BMI."
  All three filled: "Leave one field empty and I'll calculate it. Or use
  Start over."
- On success all three fields become read-only and the empty one shows the
  computed value (in its dropdown unit, or kg/cm if none was picked). There
  is no unlock; **Start over** is the only reset.
- Focus moves to the "Baseline results" heading and a polite live region
  announces the result.

### Units

- Weight and height each have a unit dropdown starting at "Unit". A bare
  number with no unit picked doesn't calculate ("Add a unit (kg or lb)" /
  "Add a unit (ft/in, in, cm or m)").
- A typed suffix wins, and the dropdown updates to match as you type.
- The current unit always shows as visible text ("Unit: lb") in a polite
  live region.
- BMI needs no unit; `27.5` and `BMI 27.5` both work.

### Parsing (`parseHeight`, `parseWeight`, `parseBmi`)

Case-insensitive, extra spaces ignored, one trailing period allowed, curly
quotes/primes equal straight quotes, period decimals only.

| Field  | Input | Result |
|--------|-------|--------|
| Height | `5 ft 10 in`, `5ft10in`, `5 feet 10 inches`, `5'10"`, `5′10″`, `5’10”` | 177.8 cm |
| Height | `5 ft 10` | 177.8 cm (bare trailing inches after feet) |
| Height | `5'`, `5 ft` | 152.4 cm |
| Height | `5.8 ft` | 176.8 cm (decimal feet) |
| Height | `70 in`, `70 inches` | 177.8 cm |
| Height | `178 cm`, `178 centimeters` | 178.0 cm |
| Height | `1.78 m`, `1.78 meters` | 178.0 cm |
| Height | `70` | "Add a unit (ft/in, in, cm or m)" |
| Height | `1,78 m` | "Use a period for decimals" |
| Weight | `180 lb`, `180lbs`, `180 pounds` | 81.6 kg |
| Weight | `82 kg`, `82kg`, `82 kilos`, `82 kilograms` | 82.0 kg |
| Weight | `180` | "Add a unit (kg or lb)" |
| Any    | `0`, `-5 kg` | "Enter a number greater than 0" |
| Any    | `abc` | "Couldn't read this. Try …" with an example |

With ft/in picked in the dropdown, a bare `5 10` reads as 5 ft 10 in. Not
supported: stone, comma decimals. No plausibility limits.

### Math

- Full precision internally; rounded to 1 decimal for display only (meters
  written back into the height field use 2).
- BMI = kg / m². Weight at a BMI = BMI × m². Height from weight + BMI =
  √(kg / BMI).
- Weight always displays in kg and lb, height in cm and ft/in.
- WHO labels follow the **displayed** BMI: under 18.5 Underweight, 18.5–24.9
  Normal, 25.0–29.9 Overweight, 30.0+ Obese (24.96 shows as 25.0,
  Overweight).

## 2. Target

- Weight / BMI mode toggle; switching modes clears the target.
- Weight mode: goal weight (unit required, own dropdown, independent of the
  baseline unit) → BMI and WHO label.
- BMI mode: goal BMI → weight in kg and lb, and WHO label.
- Both show change from baseline, e.g. "−12.3 kg / −27.1 lb (−8.4%)"
  (percent of baseline weight, explicit sign).
- Own Calculate button; can be recalculated freely.

## 3. Weight loss thresholds

Rows at 5/10/15/20% below baseline weight. Columns: Loss %, Weight (kg),
Weight (lb), BMI, WHO label.

## 4. BMI category thresholds

Rows at BMI 18.5, 25, 30 (always all three). Columns: BMI, Weight (kg),
Weight (lb), WHO label. Kept separate from table 3.

## 5. Copy results and Start over

- Copy results (experimental): plain text from `buildResultsText()` —
  baseline, target if set, both tables. "Copied" announced politely.
- Start over clears everything and focuses the weight field.

## Accessibility

- Visible labels; errors as text tied to their field via
  `aria-describedby` / `aria-invalid`; WHO label as text beside every BMI.
- Real tables with headers, kept as tables on narrow screens (scroll inside
  `.table-responsive` rather than reflowing).
- Touch targets ≥ 44px (from `shared/style.css`). Works at 320px and 200%
  zoom. No sticky result summary.

## Testing

No saved test suite. Parsing and math were checked against the table above
by evaluating `bmi.js` in Node.

## Possible follow-ups

- `pediatric-dosing/app.js` has its own `parseWeightInput` (accepts `k` and
  `#`). If a third app needs unit parsing, consider merging into `shared/`.
