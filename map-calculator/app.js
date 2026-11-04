/* -------------------------------------------------------------
   Mean Arterial Pressure — Alpine component
   MAP = (2 × diastolic + systolic) / 3, i.e. 2/3 diastolic plus
   1/3 systolic. Units are mmHg throughout.
   ------------------------------------------------------------- */

// Two whole or decimal numbers separated by a slash, e.g. "120/60".
const BLOOD_PRESSURE_PATTERN = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/;

/**
 * Parses a blood pressure string like "120/60" into systolic and
 * diastolic values. Returns null if the format doesn't match or
 * either value is zero.
 * @param {string} rawValue
 * @returns {{systolic: number, diastolic: number}|null}
 */
function parseBloodPressure(rawValue) {
  const match = BLOOD_PRESSURE_PATTERN.exec((rawValue || "").trim());
  if (!match) return null;

  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (systolic <= 0 || diastolic <= 0) return null;

  return { systolic, diastolic };
}

/**
 * Alpine component for the MAP calculator page.
 * Exposed on window so the inline x-data="mapCalculator()" call
 * in index.html can find it.
 */
function mapCalculator() {
  return {
    bloodPressureInput: "",
    errorMessage: "",
    systolic: "",
    diastolic: "",
    mapDisplay: "",
    note: "",

    get hasResult() {
      return this.mapDisplay !== "" && this.errorMessage === "";
    },

    calculate() {
      this.errorMessage = "";
      this.systolic = "";
      this.diastolic = "";
      this.mapDisplay = "";
      this.note = "";

      if (!this.bloodPressureInput.trim()) {
        // Nothing to calculate yet; not an error state.
        return;
      }

      const bp = parseBloodPressure(this.bloodPressureInput);
      if (!bp) {
        this.errorMessage = "Enter blood pressure as systolic/diastolic, like 120/60.";
        return;
      }

      const map = (2 * bp.diastolic + bp.systolic) / 3;

      this.systolic = String(bp.systolic);
      this.diastolic = String(bp.diastolic);
      this.mapDisplay = `${Math.round(map)} mmHg`;
      if (bp.diastolic > bp.systolic) {
        this.note = "Diastolic is higher than systolic — check that the values weren't entered in reverse.";
      }
    },
  };
}
