/* -------------------------------------------------------------
   Dose Counter — Alpine component
   Iteration 1: total doses from course length + frequency.
   Iteration 3 relies on shared/date-utils.js being loaded first for
   resolveDateField and formatDate.
   See CLAUDE.md in this folder for the full spec and iteration plan.
   ------------------------------------------------------------- */

const FREQUENCY_DOSES_PER_DAY = {
  qd: 1,
  bid: 2,
  tid: 3,
  qid: 4,
};

const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Alpine component for the Dose Counter page.
 * Exposed on window so the inline x-data="doseCounter()" call in
 * index.html can find it.
 */
function doseCounter() {
  return {
    daysInput: "",
    frequency: "bid",
    errorMessage: "",
    totalDoses: null,
    firstDoseDateInput: "",
    firstDoseDateError: "",
    firstDoseDate: null,
    firstDayDoseCount: 1,
    todayDoseCount: 0,
    scheduleError: "",
    scheduleRemainingSummary: "",
    finalDoseSummary: "",

    get hasResult() {
      return this.totalDoses !== null && this.errorMessage === "";
    },

    /**
     * Iteration 3b: which numbered dose slots exist in a day for the
     * selected frequency, e.g. [1, 2, 3] for tid.
     */
    get doseNumberOptions() {
      const dosesPerDay = FREQUENCY_DOSES_PER_DAY[this.frequency];
      return Array.from({ length: dosesPerDay }, (_, i) => i + 1);
    },

    doseCountLabel(n) {
      return `${n} dose${n === 1 ? "" : "s"}`;
    },

    get firstDayDoseCountLabel() {
      const dateLabel = this.firstDoseDate ? formatDate(this.firstDoseDate) : "that day";
      return `How many doses were given on ${dateLabel}`;
    },

    /**
     * Iteration 3c: whether today's dose count needs asking at all —
     * skipped when the first dispense date is today, since 3b already
     * covers that day's count.
     */
    get showTodayDoseCount() {
      return Boolean(this.firstDoseDate) && daysBetween(this.firstDoseDate, new Date()) > 0;
    },

    get todayDoseOptions() {
      const dosesPerDay = FREQUENCY_DOSES_PER_DAY[this.frequency];
      return Array.from({ length: dosesPerDay + 1 }, (_, i) => i);
    },

    calculate() {
      this.errorMessage = "";
      this.totalDoses = null;

      const dosesPerDay = FREQUENCY_DOSES_PER_DAY[this.frequency];
      if (this.firstDayDoseCount > dosesPerDay) {
        this.firstDayDoseCount = dosesPerDay;
      }
      if (this.todayDoseCount > dosesPerDay) {
        this.todayDoseCount = dosesPerDay;
      }

      const raw = this.daysInput.trim();
      if (raw) {
        const days = Number(raw);
        if (!Number.isInteger(days) || days <= 0) {
          this.errorMessage = "Enter the number of days as a whole number greater than 0.";
        } else {
          this.totalDoses = days * dosesPerDay;
        }
      }

      this.computeSchedule();
    },

    /**
     * Iteration 3a: live validation as the first-dispense date field
     * is typed. Accepts a literal MM/DD/YYYY date or an offset (e.g.
     * "t-5"), per resolveDateField, and rejects future dates since a
     * first dose can't have happened yet.
     */
    parseFirstDoseDate() {
      this.firstDoseDateError = "";
      this.firstDoseDate = null;

      const raw = this.firstDoseDateInput.trim();
      if (!raw) return;

      const resolved = resolveDateField(this.firstDoseDateInput);
      if (!resolved) {
        this.firstDoseDateError = "Enter the date of the first dose as MM/DD/YYYY.";
        return;
      }

      const today = new Date();
      if (resolved > today) {
        this.firstDoseDateError = "The date of the first dose can't be in the future.";
        return;
      }

      this.firstDoseDate = resolved;
      this.computeSchedule();
    },

    /**
     * Commits the first-dose-date field on blur or Enter: if the
     * field holds an offset like "t-5", rewrites it to the literal
     * resolved date so the field always settles on a real date once
     * the user is done editing it.
     */
    commitFirstDoseDate() {
      this.parseFirstDoseDate();
      if (this.firstDoseDate) {
        this.firstDoseDateInput = formatDate(this.firstDoseDate);
      }
    },

    /**
     * Core schedule math, shared by computeSchedule() (summary text)
     * and scheduleRows (the day-by-day table). Day 1 gets day1Count
     * doses (always 1 for qd); every day after gets a full
     * doses-per-day, including the final day, which may end up short
     * if day 1 was short.
     */
    getScheduleDetails() {
      if (!this.hasResult || !this.firstDoseDate) return null;

      const dosesPerDay = FREQUENCY_DOSES_PER_DAY[this.frequency];
      const day1Count = this.frequency === "qd" ? 1 : this.firstDayDoseCount;
      const elapsedDays = daysBetween(this.firstDoseDate, new Date());
      const given =
        elapsedDays <= 0
          ? day1Count
          : day1Count + (elapsedDays - 1) * dosesPerDay + this.todayDoseCount;

      const remainingAfterDay1 = this.totalDoses - day1Count;
      let finalDayOffset = 0;
      let dosesOnFinalDay = this.totalDoses;
      if (remainingAfterDay1 > 0) {
        const fullDays = Math.ceil(remainingAfterDay1 / dosesPerDay);
        finalDayOffset = fullDays;
        dosesOnFinalDay = remainingAfterDay1 - (fullDays - 1) * dosesPerDay;
      }

      return { dosesPerDay, day1Count, elapsedDays, given, finalDayOffset, dosesOnFinalDay };
    },

    /**
     * Iteration 3c/3d: derives doses given (and doses remaining) from
     * the first-dispense schedule rather than a typed count, and
     * separately projects the date of the final dose.
     */
    computeSchedule() {
      this.scheduleError = "";
      this.scheduleRemainingSummary = "";
      this.finalDoseSummary = "";

      const details = this.getScheduleDetails();
      if (!details) return;
      const { given, finalDayOffset, dosesOnFinalDay } = details;

      if (given > this.totalDoses) {
        this.scheduleError =
          "The schedule implies more doses given than the total course — check the entries above.";
      } else {
        const remaining = this.totalDoses - given;
        this.scheduleRemainingSummary = `${remaining} dose${remaining === 1 ? "" : "s"} remaining to prescribe.`;
      }

      const finalDoseDate = applyOffset(this.firstDoseDate, { unit: "t", amount: finalDayOffset });
      this.finalDoseSummary =
        `Final dose: ${formatDate(finalDoseDate)} (${dosesOnFinalDay} dose${dosesOnFinalDay === 1 ? "" : "s"} that day).`;
    },

    /**
     * Day-by-day table version of the same schedule: one row per
     * calendar date from the first dispense through the final dose,
     * one column per dose slot. Each cell is "given" (already
     * administered), "remaining" (still needs to be given, today or
     * later), or "na" (not part of the course — either a day-1 slot
     * that was never given and is now in the past, or a slot past the
     * final day's shorter requirement).
     */
    get scheduleRows() {
      const details = this.getScheduleDetails();
      if (!details || details.given > this.totalDoses) return [];

      const { dosesPerDay, day1Count, elapsedDays, finalDayOffset, dosesOnFinalDay } = details;
      const rows = [];

      for (let d = 0; d <= finalDayOffset; d++) {
        const date = applyOffset(this.firstDoseDate, { unit: "t", amount: d });
        const isPast = d < elapsedDays;
        const slotsRequiredThisDay = d === finalDayOffset ? dosesOnFinalDay : dosesPerDay;

        const cells = [];
        if (d === 0) {
          // Day 1: dosing started partway through the day, so the
          // given doses are the LAST day1Count slots (chronologically
          // latest) — earlier slots were skipped before dosing began
          // and are permanently not applicable, not "remaining".
          const givenFromIndex = slotsRequiredThisDay - day1Count;
          for (let c = 1; c <= dosesPerDay; c++) {
            cells.push(c > slotsRequiredThisDay || c <= givenFromIndex ? "na" : "given");
          }
        } else {
          let givenCountThisDay;
          if (isPast) {
            givenCountThisDay = dosesPerDay;
          } else if (d === elapsedDays) {
            givenCountThisDay = this.todayDoseCount;
          } else {
            givenCountThisDay = 0;
          }

          for (let c = 1; c <= dosesPerDay; c++) {
            if (c > slotsRequiredThisDay) {
              cells.push("na");
            } else if (c <= givenCountThisDay) {
              cells.push("given");
            } else {
              cells.push(isPast ? "na" : "remaining");
            }
          }
        }

        rows.push({
          key: d,
          dateLabel: `${formatDate(date)} ${DAY_ABBREVIATIONS[date.getDay()]}` + (d === elapsedDays ? " (today)" : ""),
          cells,
        });
      }

      return rows;
    },

    cellLabel(state) {
      if (state === "given") return "Given";
      if (state === "remaining") return "Remaining";
      return "—";
    },

    cellClass(state) {
      if (state === "given") return "table-success";
      if (state === "remaining") return "table-warning";
      return "";
    },
  };
}
