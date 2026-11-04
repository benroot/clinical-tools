/* -------------------------------------------------------------
   BMI Calculator — pure parsing and math (no DOM, no Alpine)
   Weights are kg and heights are cm internally, at full precision.
   Rounding happens only in the format* helpers. Load before app.js.
   See CLAUDE.md in this folder for the spec.
   ------------------------------------------------------------- */

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const MINUS_SIGN = "−";

const HEIGHT_UNIT_LABELS = { ftin: "ft/in", in: "in", cm: "cm", m: "m" };
const WEIGHT_UNIT_LABELS = { kg: "kg", lb: "lb" };

const NUM = "(\\d+(?:\\.\\d+)?)";
const FEET = "(?:'|ft|foot|feet)";
const INCHES = "(?:\"|in|inch|inches)";

const HEIGHT_PATTERNS = [
  { unit: "ftin", pattern: new RegExp(`^${NUM} ?${FEET}(?: ?${NUM}(?: ?${INCHES})?)?$`) },
  { unit: "in", pattern: new RegExp(`^${NUM} ?${INCHES}$`) },
  { unit: "cm", pattern: new RegExp(`^${NUM} ?(?:cm|centimeters?|centimetres?)$`) },
  { unit: "m", pattern: new RegExp(`^${NUM} ?(?:m|meters?|metres?)$`) },
];

const WEIGHT_PATTERNS = [
  { unit: "kg", pattern: new RegExp(`^${NUM} ?(?:kg|kgs|kilos?|kilograms?)$`) },
  { unit: "lb", pattern: new RegExp(`^${NUM} ?(?:lb|lbs|pounds?)$`) },
];

const BMI_PATTERN = new RegExp(`^(?:bmi ?)?${NUM}$`);
const BARE_NUMBER_PATTERN = new RegExp(`^${NUM}$`);
// "5 10" with ft/in chosen from the dropdown: feet then inches.
const BARE_FEET_INCHES_PATTERN = new RegExp(`^${NUM} ${NUM}$`);

const ERRORS = {
  notPositive: "Enter a number greater than 0",
  comma: "Use a period for decimals",
  heightUnit: "Add a unit (ft/in, in, cm or m)",
  weightUnit: "Add a unit (kg or lb)",
  heightUnreadable: "Couldn't read this. Try 5 ft 10 in or 178 cm",
  weightUnreadable: "Couldn't read this. Try 180 lb or 82 kg",
  bmiUnreadable: "Couldn't read this. Try 27.5",
};

/**
 * Lowercases, unifies curly quotes/primes with straight ones,
 * collapses whitespace and drops one trailing period.
 * @param {string} rawValue
 * @returns {string}
 */
function normalizeEntry(rawValue) {
  return (rawValue || "")
    .toLowerCase()
    .replace(/[′’‘]/g, "'")
    .replace(/[″”“]/g, '"')
    .replace(/''/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "")
    .trim();
}

/**
 * Errors shared by every field, checked before the unit patterns.
 * @param {string} text - already normalized
 * @returns {string|null}
 */
function commonEntryError(text) {
  if (/\d,\d/.test(text)) return ERRORS.comma;
  if (/^[-−]/.test(text)) return ERRORS.notPositive;
  return null;
}

function heightToCm(unit, first, second) {
  switch (unit) {
    case "ftin": return (first * 12 + (second || 0)) * CM_PER_IN;
    case "in": return first * CM_PER_IN;
    case "cm": return first;
    case "m": return first * 100;
  }
  return NaN;
}

function weightToKg(unit, value) {
  return unit === "lb" ? value * KG_PER_LB : value;
}

/**
 * Parses a height like "5'10\"", "70 in", "178 cm" or "1.78 m".
 * A typed unit wins over selectedUnit; a bare number uses
 * selectedUnit, or fails if there is none.
 * @param {string} rawValue
 * @param {string} [selectedUnit] - "ftin" | "in" | "cm" | "m" | ""
 * @returns {{ok: true, cm: number, unit: string, typed: boolean}|{ok: false, error: string}}
 */
function parseHeight(rawValue, selectedUnit) {
  const text = normalizeEntry(rawValue);
  const commonError = commonEntryError(text);
  if (commonError) return { ok: false, error: commonError };

  let unit = null;
  let typed = true;
  let match = null;
  for (const candidate of HEIGHT_PATTERNS) {
    match = candidate.pattern.exec(text);
    if (match) {
      unit = candidate.unit;
      break;
    }
  }

  if (!match) {
    typed = false;
    match = BARE_NUMBER_PATTERN.exec(text) ||
      (selectedUnit === "ftin" ? BARE_FEET_INCHES_PATTERN.exec(text) : null);
    if (!match) return { ok: false, error: ERRORS.heightUnreadable };
    if (Number(match[1]) === 0 && !match[2]) return { ok: false, error: ERRORS.notPositive };
    if (!selectedUnit) return { ok: false, error: ERRORS.heightUnit };
    unit = selectedUnit;
  }

  const second = match[2] === undefined ? 0 : Number(match[2]);
  const cm = heightToCm(unit, Number(match[1]), second);
  if (!(cm > 0)) return { ok: false, error: ERRORS.notPositive };
  return { ok: true, cm, unit, typed };
}

/**
 * Parses a weight like "180 lb", "82kg" or "82 kilos". Same unit
 * rules as parseHeight().
 * @param {string} rawValue
 * @param {string} [selectedUnit] - "kg" | "lb" | ""
 * @returns {{ok: true, kg: number, unit: string, typed: boolean}|{ok: false, error: string}}
 */
function parseWeight(rawValue, selectedUnit) {
  const text = normalizeEntry(rawValue);
  const commonError = commonEntryError(text);
  if (commonError) return { ok: false, error: commonError };

  let unit = null;
  let typed = true;
  let match = null;
  for (const candidate of WEIGHT_PATTERNS) {
    match = candidate.pattern.exec(text);
    if (match) {
      unit = candidate.unit;
      break;
    }
  }

  if (!match) {
    typed = false;
    match = BARE_NUMBER_PATTERN.exec(text);
    if (!match) return { ok: false, error: ERRORS.weightUnreadable };
    if (Number(match[1]) === 0) return { ok: false, error: ERRORS.notPositive };
    if (!selectedUnit) return { ok: false, error: ERRORS.weightUnit };
    unit = selectedUnit;
  }

  const kg = weightToKg(unit, Number(match[1]));
  if (!(kg > 0)) return { ok: false, error: ERRORS.notPositive };
  return { ok: true, kg, unit, typed };
}

/**
 * Parses a BMI like "27.5" or "BMI 27.5".
 * @param {string} rawValue
 * @returns {{ok: true, bmi: number}|{ok: false, error: string}}
 */
function parseBmi(rawValue) {
  const text = normalizeEntry(rawValue);
  const commonError = commonEntryError(text);
  if (commonError) return { ok: false, error: commonError };

  const match = BMI_PATTERN.exec(text);
  if (!match) return { ok: false, error: ERRORS.bmiUnreadable };

  const bmi = Number(match[1]);
  if (!(bmi > 0)) return { ok: false, error: ERRORS.notPositive };
  return { ok: true, bmi };
}

/* ---------- Math ---------- */

function bmiFromWeightAndHeight(kg, cm) {
  const m = cm / 100;
  return kg / (m * m);
}

function weightAtBmi(bmi, cm) {
  const m = cm / 100;
  return bmi * m * m;
}

function heightFromWeightAndBmi(kg, bmi) {
  return Math.sqrt(kg / bmi) * 100;
}

/**
 * Given any two of kg, cm and bmi (the third undefined), returns
 * all three.
 * @param {{kg?: number, cm?: number, bmi?: number}} known
 * @returns {{kg: number, cm: number, bmi: number}}
 */
function solveBaseline({ kg, cm, bmi }) {
  if (bmi === undefined) return { kg, cm, bmi: bmiFromWeightAndHeight(kg, cm) };
  if (cm === undefined) return { kg, cm: heightFromWeightAndBmi(kg, bmi), bmi };
  return { kg: weightAtBmi(bmi, cm), cm, bmi };
}

/** Rounds half away from zero to 1 decimal. */
function round1(value) {
  return Math.sign(value) * Math.round(Math.abs(value) * 10) / 10;
}

/**
 * WHO adult category, judged on the displayed (1-decimal) BMI so a
 * label never disagrees with the number beside it.
 * @param {number} bmi
 * @returns {string}
 */
function whoCategory(bmi) {
  const shown = round1(bmi);
  if (shown < 18.5) return "Underweight";
  if (shown < 25) return "Normal";
  if (shown < 30) return "Overweight";
  return "Obese";
}

function weightLossRows(kg, cm) {
  return [5, 10, 15, 20].map((percent) => {
    const rowKg = kg * (1 - percent / 100);
    const bmi = bmiFromWeightAndHeight(rowKg, cm);
    return { percent, kg: rowKg, bmi, category: whoCategory(bmi) };
  });
}

function categoryThresholdRows(cm) {
  return [18.5, 25, 30].map((bmi) => ({
    bmi,
    kg: weightAtBmi(bmi, cm),
    category: whoCategory(bmi),
  }));
}

/* ---------- Formatting ---------- */

function formatNumber(value) {
  return round1(value).toFixed(1);
}

function formatKg(kg) {
  return `${formatNumber(kg)} kg`;
}

function formatLb(kg) {
  return `${formatNumber(kg / KG_PER_LB)} lb`;
}

function formatWeight(kg) {
  return `${formatKg(kg)} / ${formatLb(kg)}`;
}

/** e.g. 177.8 -> "5 ft 10.0 in". Rounds total inches first so it never shows 12.0 in. */
function formatFeetInches(cm) {
  const totalInches = round1(cm / CM_PER_IN);
  const feet = Math.floor(totalInches / 12);
  const inches = round1(totalInches - feet * 12);
  return `${feet} ft ${inches.toFixed(1)} in`;
}

function formatHeight(cm) {
  return `${formatNumber(cm)} cm / ${formatFeetInches(cm)}`;
}

function formatBmi(bmi) {
  return `${formatNumber(bmi)} (${whoCategory(bmi)})`;
}

/** A height written back into the input in the user's chosen unit. */
function formatHeightAs(cm, unit) {
  switch (unit) {
    case "ftin": return formatFeetInches(cm);
    case "in": return `${formatNumber(cm / CM_PER_IN)} in`;
    case "m": return `${(cm / 100).toFixed(2)} m`;
    default: return `${formatNumber(cm)} cm`;
  }
}

/** A weight written back into the input in the user's chosen unit. */
function formatWeightAs(kg, unit) {
  return unit === "lb" ? formatLb(kg) : formatKg(kg);
}

function formatSigned(value, suffix) {
  const rounded = round1(value);
  const sign = rounded > 0 ? "+" : rounded < 0 ? MINUS_SIGN : "";
  return `${sign}${Math.abs(rounded).toFixed(1)}${suffix}`;
}

/** e.g. "−12.3 kg / −27.1 lb (−8.4%)", percent of the baseline weight. */
function formatChange(baselineKg, targetKg) {
  const diff = targetKg - baselineKg;
  return `${formatSigned(diff, " kg")} / ${formatSigned(diff / KG_PER_LB, " lb")} ` +
    `(${formatSigned((diff / baselineKg) * 100, "%")})`;
}

/**
 * Plain-text summary for the clipboard.
 * @param {{kg: number, cm: number, bmi: number}} baseline
 * @param {{mode: string, kg: number, bmi: number}|null} target
 * @returns {string}
 */
function buildResultsText(baseline, target) {
  const lines = [
    "BMI results",
    "",
    "Baseline",
    `  Weight: ${formatWeight(baseline.kg)}`,
    `  Height: ${formatHeight(baseline.cm)}`,
    `  BMI: ${formatBmi(baseline.bmi)}`,
  ];

  if (target) {
    lines.push(
      "",
      `Target (by ${target.mode === "bmi" ? "BMI" : "weight"})`,
      `  Weight: ${formatWeight(target.kg)}`,
      `  BMI: ${formatBmi(target.bmi)}`,
      `  Change: ${formatChange(baseline.kg, target.kg)}`,
    );
  }

  lines.push("", "Weight loss thresholds");
  for (const row of weightLossRows(baseline.kg, baseline.cm)) {
    lines.push(`  ${row.percent}% loss: ${formatWeight(row.kg)}, BMI ${formatBmi(row.bmi)}`);
  }

  lines.push("", "BMI category thresholds");
  for (const row of categoryThresholdRows(baseline.cm)) {
    lines.push(`  BMI ${formatBmi(row.bmi)}: ${formatWeight(row.kg)}`);
  }

  return lines.join("\n");
}
