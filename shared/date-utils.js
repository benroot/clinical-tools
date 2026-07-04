/* -------------------------------------------------------------
   Shared date utilities
   Pure functions only — no DOM, no Alpine. Every app in this
   scaffold that needs date math should load this file before its
   own app.js and reuse these functions rather than reimplementing
   them.
   ------------------------------------------------------------- */

/**
 * Formats a Date object as MM/DD/YYYY.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Parses a MM/DD/YYYY string into a Date object (local time, no
 * timezone drift). Returns null if the string is not a valid date.
 * @param {string} value
 * @returns {Date|null}
 */
function parseDate(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((value || "").trim());
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Reject dates JS silently rolled over, e.g. 02/30/2026.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Parses an offset string like "t+5", "w-2", "m+3", "y-1" into its
 * unit and signed count. Sign is optional and defaults to +.
 * @param {string} value
 * @returns {{unit: string, amount: number}|null}
 */
function parseOffset(value) {
  const match = /^\s*([twmyTWMY])\s*([+-]?\d+)\s*$/.exec(value || "");
  if (!match) return null;
  return {
    unit: match[1].toLowerCase(),
    amount: Number(match[2]),
  };
}

const OFFSET_UNIT_LABELS = {
  t: "day",
  w: "week",
  m: "month",
  y: "year",
};

/**
 * Parses a whole weeks+days duration string like "18w3d" (non-negative
 * integers). The days part is optional — "12w" parses as 12w0d. Not
 * tied to any particular domain meaning — callers decide what the
 * duration represents.
 * @param {string} value
 * @returns {{weeks: number, days: number}|null}
 */
function parseWeeksAndDays(value) {
  const match = /^\s*(\d+)\s*[wW]\s*(?:(\d+)\s*[dD]\s*)?$/.exec(value || "");
  if (!match) return null;
  return { weeks: Number(match[1]), days: Number(match[2] || 0) };
}

/**
 * Formats a whole number of days as a "XwYd" weeks+days string.
 * @param {number} totalDays
 * @returns {string}
 */
function formatWeeksAndDays(totalDays) {
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return `${weeks}w${days}d`;
}

/**
 * Adds a parsed offset to a base date. Months are treated as a flat
 * 28 days (4 weeks) rather than calendar-month arithmetic, so every
 * unit is a simple day-count multiple. Years still use calendar-year
 * arithmetic (with day clamping for Feb 29 -> Feb 28) since "year"
 * has an unambiguous calendar meaning.
 * @param {Date} baseDate
 * @param {{unit: string, amount: number}} offset
 * @returns {Date}
 */
function applyOffset(baseDate, offset) {
  const result = new Date(baseDate.getTime());

  switch (offset.unit) {
    case "t": // days
      result.setDate(result.getDate() + offset.amount);
      return result;

    case "w": // weeks
      result.setDate(result.getDate() + offset.amount * 7);
      return result;

    case "m": // months, treated as a flat 28 days each
      result.setDate(result.getDate() + offset.amount * 28);
      return result;

    case "y": {
      // years, with day clamping (e.g. Feb 29 + 1 year -> Feb 28)
      const originalDay = result.getDate();

      result.setDate(1); // avoid month-overflow while shifting months
      result.setMonth(result.getMonth() + offset.amount * 12);

      const daysInTargetMonth = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0
      ).getDate();
      result.setDate(Math.min(originalDay, daysInTargetMonth));
      return result;
    }

    default:
      return result;
  }
}

/**
 * Resolves a date field's raw text into an actual Date, accepting
 * either a literal MM/DD/YYYY value or an offset (e.g. "t-30")
 * applied to a reference date (defaults to today). Used by every
 * "hard date OR offset" input across this app scaffold.
 * @param {string} rawValue
 * @param {Date} [referenceDate]
 * @returns {Date|null}
 */
function resolveDateField(rawValue, referenceDate) {
  const raw = (rawValue || "").trim();
  if (!raw) return null;

  const literalDate = parseDate(raw);
  if (literalDate) return literalDate;

  const offset = parseOffset(raw);
  if (offset) return applyOffset(referenceDate || new Date(), offset);

  return null;
}

/**
 * Whole number of days between two dates (b - a), ignoring time of
 * day. Positive when b is after a.
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const startOfB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((startOfB - startOfA) / msPerDay);
}
