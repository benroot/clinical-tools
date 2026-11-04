/* -------------------------------------------------------------
   BMI Calculator — Alpine component
   Relies on bmi.js (pure parsing, math and formatting) being
   loaded first. See CLAUDE.md in this folder for the spec.
   ------------------------------------------------------------- */

// A calculated weight/height uses the same unit system (metric or
// imperial) as the measurement the user entered.
const WEIGHT_UNIT_FOR_HEIGHT_UNIT = { ftin: "lb", in: "lb", cm: "kg", m: "kg" };
const HEIGHT_UNIT_FOR_WEIGHT_UNIT = { lb: "ftin", kg: "cm" };

/**
 * Visible/announced text for a field's current unit.
 * @param {string} unit
 * @param {Object<string, string>} labels
 */
function unitStatusText(unit, labels) {
  return unit ? `Unit: ${labels[unit]}` : "Unit: not set";
}

/**
 * Alpine component for the BMI Calculator page.
 * Exposed on window so the inline x-data="bmiCalculator()" call
 * in index.html can find it.
 */
function bmiCalculator() {
  return {
    weightInput: "",
    weightUnit: "",
    weightError: "",
    heightInput: "",
    heightUnit: "",
    heightError: "",
    bmiInput: "",
    bmiError: "",
    baselineError: "",
    baseline: null,

    targetMode: "weight",
    targetInput: "",
    targetUnit: "",
    targetError: "",
    target: null,

    status: "",
    copyStatus: "",

    get weightUnitText() {
      return unitStatusText(this.weightUnit, WEIGHT_UNIT_LABELS);
    },

    get heightUnitText() {
      return unitStatusText(this.heightUnit, HEIGHT_UNIT_LABELS);
    },

    get targetUnitText() {
      return unitStatusText(this.targetUnit, WEIGHT_UNIT_LABELS);
    },

    get baselineWeight() {
      return formatWeight(this.baseline.kg);
    },

    get baselineHeight() {
      return formatHeight(this.baseline.cm);
    },

    get baselineBmi() {
      return formatNumber(this.baseline.bmi);
    },

    get baselineCategory() {
      return whoCategory(this.baseline.bmi);
    },

    /**
     * The target holds only the goal the user entered; the other
     * value is derived from the current baseline height, so it
     * follows any baseline recalculation.
     * @returns {{mode: string, kg: number, bmi: number}|null}
     */
    get resolvedTarget() {
      if (!this.baseline || !this.target) return null;
      const { mode, kg, bmi } = this.target;
      return mode === "bmi"
        ? { mode, bmi, kg: weightAtBmi(bmi, this.baseline.cm) }
        : { mode, kg, bmi: bmiFromWeightAndHeight(kg, this.baseline.cm) };
    },

    get targetWeight() {
      return formatWeight(this.resolvedTarget.kg);
    },

    get targetBmi() {
      return formatNumber(this.resolvedTarget.bmi);
    },

    get targetCategory() {
      return whoCategory(this.resolvedTarget.bmi);
    },

    get targetChange() {
      return formatChange(this.baseline.kg, this.resolvedTarget.kg);
    },

    get lossRows() {
      if (!this.baseline) return [];
      return weightLossRows(this.baseline.kg, this.baseline.cm).map((row) => ({
        percent: `${row.percent}%`,
        kg: formatNumber(row.kg),
        lb: formatNumber(row.kg / KG_PER_LB),
        bmi: formatNumber(row.bmi),
        category: row.category,
      }));
    },

    get categoryRows() {
      if (!this.baseline) return [];
      return categoryThresholdRows(this.baseline.cm).map((row) => ({
        bmi: formatNumber(row.bmi),
        kg: formatNumber(row.kg),
        lb: formatNumber(row.kg / KG_PER_LB),
        category: row.category,
      }));
    },

    /**
     * A typed suffix wins over the dropdown: whenever the field
     * holds a readable value with its own unit, the dropdown
     * follows it so the two never disagree.
     */
    syncWeightUnit() {
      this.weightError = "";
      const result = parseWeight(this.weightInput, this.weightUnit);
      if (result.ok && result.typed) this.weightUnit = result.unit;
    },

    syncHeightUnit() {
      this.heightError = "";
      const result = parseHeight(this.heightInput, this.heightUnit);
      if (result.ok && result.typed) this.heightUnit = result.unit;
    },

    syncTargetUnit() {
      this.targetError = "";
      const result = parseWeight(this.targetInput, this.targetUnit);
      if (result.ok && result.typed) this.targetUnit = result.unit;
    },

    /**
     * Sets a polite live-region message, clearing it first so the
     * same message (e.g. "Copied" twice) is announced again.
     */
    announce(property, message) {
      this[property] = "";
      setTimeout(() => {
        this[property] = message;
      }, 100);
    },

    calculateBaseline() {
      this.weightError = "";
      this.heightError = "";
      this.bmiError = "";
      this.baselineError = "";

      // The first Calculate takes any two fields. After that, weight
      // and height are always the inputs and BMI (locked) is always
      // recalculated from them, until Start over.
      const recalculating = this.baseline !== null;
      const hasWeight = this.weightInput.trim() !== "";
      const hasHeight = this.heightInput.trim() !== "";
      const hasBmi = !recalculating && this.bmiInput.trim() !== "";
      const filledCount = [hasWeight, hasHeight, hasBmi].filter(Boolean).length;

      if (recalculating && filledCount < 2) {
        this.baselineError = "Fill in weight and height.";
        return;
      }
      if (filledCount < 2) {
        this.baselineError = "Fill in any two of weight, height and BMI.";
        return;
      }
      if (filledCount === 3) {
        this.baselineError = "Leave one field empty and I'll calculate it. Or use Start over.";
        return;
      }

      const known = {};
      let enteredWeightUnit = null;
      let enteredHeightUnit = null;
      if (hasWeight) {
        const result = parseWeight(this.weightInput, this.weightUnit);
        if (result.ok) {
          known.kg = result.kg;
          enteredWeightUnit = result.unit;
        } else {
          this.weightError = result.error;
        }
      }
      if (hasHeight) {
        const result = parseHeight(this.heightInput, this.heightUnit);
        if (result.ok) {
          known.cm = result.cm;
          enteredHeightUnit = result.unit;
        } else {
          this.heightError = result.error;
        }
      }
      if (hasBmi) {
        const result = parseBmi(this.bmiInput);
        if (result.ok) known.bmi = result.bmi;
        else this.bmiError = result.error;
      }

      const firstInvalid =
        (this.weightError && this.$refs.weightInput) ||
        (this.heightError && this.$refs.heightInput) ||
        (this.bmiError && this.$refs.bmiInput);
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      this.baseline = solveBaseline(known);

      // Fill a calculated weight or height in the same unit system
      // (metric/imperial) as the measurement the user entered.
      if (!hasWeight) {
        this.weightUnit = WEIGHT_UNIT_FOR_HEIGHT_UNIT[enteredHeightUnit];
        this.weightInput = formatWeightAs(this.baseline.kg, this.weightUnit);
      }
      if (!hasHeight) {
        this.heightUnit = HEIGHT_UNIT_FOR_WEIGHT_UNIT[enteredWeightUnit];
        this.heightInput = formatHeightAs(this.baseline.cm, this.heightUnit);
      }
      if (!hasBmi) {
        this.bmiInput = formatNumber(this.baseline.bmi);
      }

      // Default the goal weight to the baseline's unit, unless the user
      // has already started a goal of their own.
      if (!this.targetInput.trim()) this.targetUnit = this.weightUnit;

      this.announce(
        "status",
        `Baseline calculated. BMI ${this.baselineBmi}, ${this.baselineCategory}.`,
      );
      this.$nextTick(() => this.$refs.baselineResultsHeading.focus());
    },

    /**
     * Switching between weight and BMI targets starts the target
     * fresh, with the goal weight unit back on the baseline's unit.
     */
    changeTargetMode() {
      this.targetInput = "";
      this.targetUnit = this.baseline ? this.weightUnit : "";
      this.targetError = "";
      this.target = null;
    },

    calculateTarget() {
      if (!this.baseline) return;
      this.targetError = "";

      if (!this.targetInput.trim()) {
        this.targetError =
          this.targetMode === "bmi" ? "Enter a goal BMI." : "Enter a goal weight.";
        return;
      }

      if (this.targetMode === "bmi") {
        const result = parseBmi(this.targetInput);
        if (!result.ok) {
          this.targetError = result.error;
          return;
        }
        this.target = { mode: "bmi", bmi: result.bmi };
      } else {
        const result = parseWeight(this.targetInput, this.targetUnit);
        if (!result.ok) {
          this.targetError = result.error;
          return;
        }
        this.target = { mode: "weight", kg: result.kg };
      }

      this.announce(
        "status",
        `Target calculated. ${this.targetWeight}, BMI ${this.targetBmi}, ` +
          `${this.targetCategory}. Change ${this.targetChange}.`,
      );
    },

    async copyResults() {
      if (!this.baseline) return;
      try {
        await navigator.clipboard.writeText(buildResultsText(this.baseline, this.resolvedTarget));
        this.announce("copyStatus", "Copied");
      } catch {
        this.announce("copyStatus", "Couldn't copy. Your browser blocked clipboard access.");
      }
    },

    startOver() {
      Object.assign(this, {
        weightInput: "",
        weightUnit: "",
        weightError: "",
        heightInput: "",
        heightUnit: "",
        heightError: "",
        bmiInput: "",
        bmiError: "",
        baselineError: "",
        baseline: null,
        targetMode: "weight",
        targetInput: "",
        targetUnit: "",
        targetError: "",
        target: null,
        status: "",
        copyStatus: "",
      });
      this.$nextTick(() => this.$refs.weightInput.focus());
    },
  };
}
