/* -------------------------------------------------------------
   Pregnancy Due Date Calculator — Alpine component
   Relies on shared/date-utils.js being loaded first for formatDate,
   parseDate, applyOffset, daysBetween, parseWeeksAndDays,
   formatWeeksAndDays, resolveDateField.

   Clinical basis: Naegele's Rule estimates the due date as the last
   menstrual period (LMP) plus 280 days (40 weeks), assuming a
   standard 28-day cycle. This is a widely used estimate; a care
   provider may adjust it based on ultrasound dating or a known
   cycle length.

   See CLAUDE.md in this folder for the full spec and iteration plan.
   ------------------------------------------------------------- */

const DAYS_IN_FULL_TERM_PREGNANCY = 280; // 40 weeks from LMP

// Not a hard cap — past this, today's GA is shown along with a note that
// this may be a prior, already-concluded pregnancy (e.g. someone looking
// up when a medication was started last time), rather than being blocked.
const PAST_TERM_NOTE_THRESHOLD_DAYS = 42 * 7; // 294

const FUTURE_LMP_NOTE =
  "This LMP is in the future. The dates below (and Step 2) are calculated " +
  "as if it starts as planned — useful for pregnancy planning around a " +
  "conception that hasn't happened yet.";

const PAST_TERM_NOTE =
  "This works out to more than 42 weeks along as of today. If you're " +
  "looking up dates from a pregnancy that has already concluded, the " +
  "dates below (and Step 2) are still calculated from this LMP.";

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
 * Resolves an LMP-mode input: a literal MM/DD/YYYY date, taken as-is.
 * @param {string} raw
 * @returns {Date|null}
 */
function resolveLmpFromLmpInput(raw) {
  return parseDate(raw);
}

/**
 * Resolves an EDD-mode input into an LMP by backing out 280 days
 * from the parsed due date.
 * @param {string} raw
 * @returns {Date|null}
 */
function resolveLmpFromEddInput(raw) {
  const edd = parseDate(raw);
  if (!edd) return null;
  return applyOffset(edd, { unit: "t", amount: -DAYS_IN_FULL_TERM_PREGNANCY });
}

/**
 * Parses a non-negative whole number from text (no sign, no decimal).
 * @param {string} raw
 * @returns {number|null}
 */
function parseNonNegativeInt(raw) {
  const trimmed = (raw || "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * Resolves a GA-mode input (separate weeks/days fields) into an LMP,
 * measured as of gaReferenceDate (defaults to today).
 * @param {string} weeksRaw
 * @param {string} daysRaw
 * @param {Date} today
 * @param {Date} [gaReferenceDate]
 * @returns {Date|null}
 */
function resolveLmpFromGaInput(weeksRaw, daysRaw, today, gaReferenceDate) {
  const weeks = parseNonNegativeInt(weeksRaw);
  const days = parseNonNegativeInt(daysRaw);
  if (weeks === null || days === null) return null;

  const gaDays = weeks * 7 + days;
  return applyOffset(gaReferenceDate || today, { unit: "t", amount: -gaDays });
}

/**
 * Alpine component for the Pregnancy Due Date Calculator page.
 * Exposed on window so the inline x-data="pregnancyCalculator()"
 * call in index.html can find it.
 */
function pregnancyCalculator() {
  return {
    mode: "ga",
    lmpDateInput: "",
    eddDateInput: "",
    gaWeeksInput: "8",
    gaDaysInput: "0",
    gaAsOfInput: "",
    errorMessage: "",
    timelineNote: "",
    lmp: null,
    lmpDisplay: "",
    gaDisplay: "",
    eddDisplay: "",
    trimesters: [],
    secondaryInput: "",
    secondaryError: "",
    secondaryResult: "",

    get hasResult() {
      return this.eddDisplay !== "" && this.errorMessage === "";
    },

    calculate() {
      this.errorMessage = "";
      this.timelineNote = "";
      this.lmp = null;
      this.lmpDisplay = "";
      this.gaDisplay = "";
      this.eddDisplay = "";
      this.trimesters = [];
      this.secondaryInput = "";
      this.secondaryError = "";
      this.secondaryResult = "";

      const today = new Date();
      let lmp = null;

      if (this.mode === "lmp") {
        const raw = this.lmpDateInput.trim();
        if (!raw) return;
        lmp = resolveLmpFromLmpInput(raw);
        if (!lmp) {
          this.errorMessage = "Enter the LMP as MM/DD/YYYY.";
          return;
        }
      } else if (this.mode === "edd") {
        const raw = this.eddDateInput.trim();
        if (!raw) return;
        lmp = resolveLmpFromEddInput(raw);
        if (!lmp) {
          this.errorMessage = "Enter the due date as MM/DD/YYYY.";
          return;
        }
      } else {
        const weeksRaw = this.gaWeeksInput.trim();
        const daysRaw = this.gaDaysInput.trim();
        if (!weeksRaw || !daysRaw) return;

        let gaReferenceDate = today;
        const rawGaAsOf = this.gaAsOfInput.trim();
        if (rawGaAsOf) {
          const asOfDate = parseDate(rawGaAsOf);
          if (!asOfDate) {
            this.errorMessage = "Enter the date this gestational age was measured as MM/DD/YYYY.";
            return;
          }
          if (asOfDate > today) {
            this.errorMessage = "The date this was measured can't be in the future.";
            return;
          }
          gaReferenceDate = asOfDate;
        }

        lmp = resolveLmpFromGaInput(weeksRaw, daysRaw, today, gaReferenceDate);
        if (!lmp) {
          this.errorMessage = "Enter the gestational age as whole numbers of weeks and days.";
          return;
        }
      }

      const gaDaysToday = daysBetween(lmp, today);
      let gaDisplay;
      if (gaDaysToday < 0) {
        this.timelineNote = FUTURE_LMP_NOTE;
        gaDisplay = `Not yet — starts in ${formatWeeksAndDays(-gaDaysToday)}`;
      } else {
        if (gaDaysToday > PAST_TERM_NOTE_THRESHOLD_DAYS) this.timelineNote = PAST_TERM_NOTE;
        gaDisplay = formatWeeksAndDays(gaDaysToday);
      }

      const edd = applyOffset(lmp, { unit: "t", amount: DAYS_IN_FULL_TERM_PREGNANCY });

      this.lmp = lmp;
      this.lmpDisplay = formatDate(lmp);
      this.eddDisplay = formatDate(edd);
      this.gaDisplay = gaDisplay;

      this.trimesters = TRIMESTER_DAY_RANGES.map((range) => ({
        label: range.label,
        rangeLabel:
          `${formatDate(applyOffset(lmp, { unit: "t", amount: range.startDay }))} ` +
          `to ${formatDate(applyOffset(lmp, { unit: "t", amount: range.endDay }))}`,
      }));
    },

    /**
     * Iteration 2: given the fixed LMP from calculate(), resolves a
     * second, independent input as either a target gestational age
     * (-> its calendar date) or a target calendar date (-> the
     * gestational age on that date).
     */
    calculateSecondary() {
      this.secondaryError = "";
      this.secondaryResult = "";

      const raw = this.secondaryInput.trim();
      if (!raw || !this.lmp) return;

      const ga = parseWeeksAndDays(raw);
      if (ga) {
        const gaDays = ga.weeks * 7 + ga.days;
        const date = applyOffset(this.lmp, { unit: "t", amount: gaDays });
        this.secondaryResult = `Gestational age ${formatWeeksAndDays(gaDays)} falls on ${formatDate(date)}.`;
        return;
      }

      const date = resolveDateField(raw);
      if (date) {
        if (date < this.lmp) {
          this.secondaryError = "That date is before the LMP, so gestational age isn't defined yet.";
          return;
        }
        const gaDays = daysBetween(this.lmp, date);
        this.secondaryResult = `Gestational age on ${formatDate(date)} is ${formatWeeksAndDays(gaDays)}.`;
        return;
      }

      this.secondaryError = "Enter a gestational age like 20w0d, or a date as MM/DD/YYYY.";
    },
  };
}
