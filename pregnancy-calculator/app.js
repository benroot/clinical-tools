/* -------------------------------------------------------------
   Pregnancy Due Date Calculator — Alpine component
   Relies on shared/date-utils.js being loaded first for formatDate,
   parseDate, parseOffset, applyOffset, resolveDateField, daysBetween.

   Clinical basis: Naegele's Rule estimates the due date as the last
   menstrual period (LMP) plus 280 days (40 weeks), assuming a
   standard 28-day cycle. This is a widely used estimate; a care
   provider may adjust it based on ultrasound dating or a known
   cycle length.
   ------------------------------------------------------------- */

const DAYS_IN_FULL_TERM_PREGNANCY = 280; // 40 weeks from LMP

const TRIMESTER_BOUNDARIES = [
  { endsAtWeek: 13, label: "First trimester" },
  { endsAtWeek: 27, label: "Second trimester" },
  { endsAtWeek: Infinity, label: "Third trimester" },
];

/**
 * Alpine component for the Pregnancy Due Date Calculator page.
 * Exposed on window so the inline x-data="pregnancyCalculator()"
 * call in index.html can find it.
 */
function pregnancyCalculator() {
  return {
    lmpInput: "",
    dueDate: "",
    gestationSummary: "",
    trimesterLabel: "",
    errorMessage: "",

    get hasResult() {
      return this.dueDate !== "" && this.errorMessage === "";
    },

    /**
     * Live preview only. Reads the LMP field as typed but never
     * writes back to it, so in-progress offset text (e.g. "w-" before
     * the digits land) is never disturbed mid-keystroke.
     */
    calculate() {
      this.errorMessage = "";
      this.dueDate = "";
      this.gestationSummary = "";
      this.trimesterLabel = "";

      const lmpDate = resolveDateField(this.lmpInput);
      if (!lmpDate) {
        if (this.lmpInput.trim()) {
          this.errorMessage =
            "Enter the LMP as MM/DD/YYYY, or an offset like w-6 (6 weeks ago) from today.";
        }
        return;
      }

      const today = new Date();
      if (lmpDate > today) {
        this.errorMessage = "The last menstrual period can't be in the future.";
        return;
      }

      const due = applyOffset(lmpDate, { unit: "t", amount: DAYS_IN_FULL_TERM_PREGNANCY });
      this.dueDate = formatDate(due);

      const daysPregnant = daysBetween(lmpDate, today);
      const weeks = Math.floor(daysPregnant / 7);
      const days = daysPregnant % 7;
      const weekLabel = weeks === 1 ? "week" : "weeks";
      const dayLabel = days === 1 ? "day" : "days";
      this.gestationSummary =
        days === 0
          ? `${weeks} ${weekLabel} pregnant today`
          : `${weeks} ${weekLabel}, ${days} ${dayLabel} pregnant today`;

      const boundary = TRIMESTER_BOUNDARIES.find((t) => weeks <= t.endsAtWeek);
      this.trimesterLabel = boundary ? boundary.label : "";
    },

    /**
     * Commits the LMP field: called on blur or Enter, never on every
     * keystroke. If the field holds an offset like "w-6", rewrites it
     * to the literal resolved date once the user is done editing it.
     */
    commitLmp() {
      const resolved = resolveDateField(this.lmpInput);
      if (resolved) {
        this.lmpInput = formatDate(resolved);
      }
      this.calculate();
    },
  };
}
