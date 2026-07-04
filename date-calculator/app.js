/* -------------------------------------------------------------
   Date Calculator — Alpine component
   Relies on shared/date-utils.js being loaded first for formatDate,
   parseDate, parseOffset, applyOffset, resolveDateField.
   ------------------------------------------------------------- */

/**
 * Alpine component for the Date Calculator page.
 * Exposed on window so the inline x-data="dateCalculator()" call
 * in index.html can find it.
 */
function dateCalculator() {
  return {
    baseDateInput: formatDate(new Date()),
    offsetInput: "",
    resultDate: "",
    errorMessage: "",

    get hasResult() {
      return this.resultDate !== "" && this.errorMessage === "";
    },

    get offsetSummary() {
      const offset = parseOffset(this.offsetInput);
      if (!offset) return "";
      const unitLabel = OFFSET_UNIT_LABELS[offset.unit];
      const count = Math.abs(offset.amount);
      const plural = count === 1 ? "" : "s";
      const direction = offset.amount < 0 ? "before" : "after";
      return `${count} ${unitLabel}${plural} ${direction} the entered date`;
    },

    /**
     * Live preview only. Reads the base-date field as typed but
     * never writes back to it, so the user's cursor and in-progress
     * offset text (like "t+" before the digits land) are never
     * disturbed mid-keystroke.
     */
    calculate() {
      this.errorMessage = "";
      this.resultDate = "";

      const baseDate = resolveDateField(this.baseDateInput);
      if (!baseDate) {
        this.errorMessage =
          "Enter the starting date as MM/DD/YYYY, or an offset like t+5 from today.";
        return;
      }

      if (!this.offsetInput.trim()) {
        // Nothing to calculate yet; not an error state.
        return;
      }

      const offset = parseOffset(this.offsetInput);
      if (!offset) {
        this.errorMessage =
          "Enter an offset like t+5 (days), w-2 (weeks), m+3 (months), or y-1 (years).";
        return;
      }

      const result = applyOffset(baseDate, offset);
      this.resultDate = formatDate(result);
    },

    /**
     * Commits the base-date field: called on blur or Enter, never
     * on every keystroke. If the field holds an offset like "t+5",
     * rewrites it to the literal resolved date (e.g. "07/09/2026")
     * so the field always settles on a real date once the user is
     * done editing it.
     */
    commitBaseDate() {
      const resolved = resolveDateField(this.baseDateInput);
      if (resolved) {
        this.baseDateInput = formatDate(resolved);
      }
      this.calculate();
    },
  };
}
