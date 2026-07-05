/* -------------------------------------------------------------
   Dose Counter — Alpine component
   Iteration 1: total doses from course length + frequency.
   See CLAUDE.md in this folder for the full spec and iteration plan.
   ------------------------------------------------------------- */

const FREQUENCY_DOSES_PER_DAY = {
  qd: 1,
  bid: 2,
  tid: 3,
  qid: 4,
};

/**
 * Alpine component for the Dose Counter page.
 * Exposed on window so the inline x-data="doseCounter()" call in
 * index.html can find it.
 */
function doseCounter() {
  return {
    daysInput: "",
    frequency: "qd",
    errorMessage: "",
    totalDoses: null,
    givenInput: "",
    givenError: "",
    remainingSummary: "",

    get hasResult() {
      return this.totalDoses !== null && this.errorMessage === "";
    },

    calculate() {
      this.errorMessage = "";
      this.totalDoses = null;

      const raw = this.daysInput.trim();
      if (raw) {
        const days = Number(raw);
        if (!Number.isInteger(days) || days <= 0) {
          this.errorMessage = "Enter the number of days as a whole number greater than 0.";
        } else {
          const dosesPerDay = FREQUENCY_DOSES_PER_DAY[this.frequency];
          this.totalDoses = days * dosesPerDay;
        }
      }

      this.calculateRemaining();
    },

    /**
     * Iteration 2: given the total doses from calculate(), subtracts
     * the doses already administered to find doses remaining to
     * prescribe.
     */
    calculateRemaining() {
      this.givenError = "";
      this.remainingSummary = "";

      if (!this.hasResult) return;

      const raw = this.givenInput.trim();
      if (!raw) return;

      const given = Number(raw);
      if (!Number.isInteger(given) || given < 0) {
        this.givenError = "Enter the number of doses already given as a whole number, 0 or greater.";
        return;
      }
      if (given > this.totalDoses) {
        this.givenError = "Doses already given can't exceed the total doses needed.";
        return;
      }

      const remaining = this.totalDoses - given;
      this.remainingSummary = `${remaining} dose${remaining === 1 ? "" : "s"} remaining to prescribe.`;
    },
  };
}
