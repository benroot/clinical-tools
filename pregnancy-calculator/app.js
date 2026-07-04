/* -------------------------------------------------------------
   Pregnancy Due Date Calculator — Alpine component
   Relies on shared/date-utils.js being loaded first for formatDate,
   parseDate, applyOffset, daysBetween, parseWeeksAndDays,
   formatWeeksAndDays.

   Clinical basis: Naegele's Rule estimates the due date as the last
   menstrual period (LMP) plus 280 days (40 weeks), assuming a
   standard 28-day cycle. This is a widely used estimate; a care
   provider may adjust it based on ultrasound dating or a known
   cycle length.

   See CLAUDE.md in this folder for the full spec and iteration plan.
   ------------------------------------------------------------- */

const DAYS_IN_FULL_TERM_PREGNANCY = 280; // 40 weeks from LMP

// Day-count ranges (inclusive, days since LMP) for each trimester.
// Boundaries land on whole-week marks: trimester 1 covers GA weeks
// 0-13, trimester 2 covers weeks 14-27, trimester 3 covers weeks
// 28-40 (ending at the EDD).
const TRIMESTER_DAY_RANGES = [
  { label: "First trimester (0-13w)", startDay: 0, endDay: 13 * 7 + 6 },
  { label: "Second trimester (14-28w)", startDay: 14 * 7, endDay: 27 * 7 + 6 },
  { label: "Third trimester (28w-40w)", startDay: 28 * 7, endDay: DAYS_IN_FULL_TERM_PREGNANCY },
];

/**
 * Resolves the single establishing input into an LMP date. Accepts,
 * in order: a weeks+days gestational age (e.g. "18w3d", relative to
 * today), or a literal MM/DD/YYYY date — interpreted as the LMP if
 * it's today or earlier, or as the EDD (and backed out to an LMP) if
 * it's in the future.
 *
 * A past/today date is always treated as LMP, even though a past
 * date could in rare cases represent the EDD of an already-concluded
 * pregnancy. That case is out of scope for now (see CLAUDE.md).
 *
 * @param {string} rawValue
 * @param {Date} today
 * @returns {Date|null}
 */
function resolveLmpFromInput(rawValue, today) {
  const raw = (rawValue || "").trim();
  if (!raw) return null;

  const ga = parseWeeksAndDays(raw);
  if (ga) {
    const gaDays = ga.weeks * 7 + ga.days;
    return applyOffset(today, { unit: "t", amount: -gaDays });
  }

  const date = parseDate(raw);
  if (date) {
    if (date > today) {
      return applyOffset(date, { unit: "t", amount: -DAYS_IN_FULL_TERM_PREGNANCY });
    }
    return date;
  }

  return null;
}

/**
 * Alpine component for the Pregnancy Due Date Calculator page.
 * Exposed on window so the inline x-data="pregnancyCalculator()"
 * call in index.html can find it.
 */
function pregnancyCalculator() {
  return {
    rawInput: "",
    errorMessage: "",
    lmpDisplay: "",
    gaDisplay: "",
    eddDisplay: "",
    trimesters: [],

    get hasResult() {
      return this.eddDisplay !== "" && this.errorMessage === "";
    },

    calculate() {
      this.errorMessage = "";
      this.lmpDisplay = "";
      this.gaDisplay = "";
      this.eddDisplay = "";
      this.trimesters = [];

      if (!this.rawInput.trim()) return;

      const today = new Date();
      const lmp = resolveLmpFromInput(this.rawInput, today);
      if (!lmp) {
        this.errorMessage =
          "Enter the LMP or due date as MM/DD/YYYY, or the current gestational age like 18w3d.";
        return;
      }
      if (lmp > today) {
        this.errorMessage = "The last menstrual period can't be in the future.";
        return;
      }

      const edd = applyOffset(lmp, { unit: "t", amount: DAYS_IN_FULL_TERM_PREGNANCY });
      const gaDaysToday = daysBetween(lmp, today);

      this.lmpDisplay = formatDate(lmp);
      this.eddDisplay = formatDate(edd);
      this.gaDisplay = formatWeeksAndDays(gaDaysToday);

      this.trimesters = TRIMESTER_DAY_RANGES.map((range) => ({
        label: range.label,
        rangeLabel:
          `${formatDate(applyOffset(lmp, { unit: "t", amount: range.startDay }))} ` +
          `to ${formatDate(applyOffset(lmp, { unit: "t", amount: range.endDay }))}`,
      }));
    },
  };
}
