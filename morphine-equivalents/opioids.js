/* -------------------------------------------------------------
   Opioid Equivalence — data and pure functions (no DOM, no Alpine)
   Load before app.js. See CLAUDE.md in this folder for the spec.

   The data lives here as a JS constant rather than a .json file so
   the app still works when opened straight from disk (file://),
   where fetch() of a local file is blocked.
   ------------------------------------------------------------- */

/**
 * equianalgesic_mg: mg of that drug equal to one reference unit of
 * analgesia (morphine 10 mg IV = 30 mg oral). Missing routes are
 * omitted, not null. display_unit (optional) is the unit that
 * opioid/route is entered and shown in.
 */
const OPIOID_DATA = {
  reference: { opioid: "morphine", note: "10 mg IV = 30 mg oral" },
  opioids: {
    morphine: {
      display: "Morphine",
      routes: { iv: { equianalgesic_mg: 10 }, oral: { equianalgesic_mg: 30 } },
    },
    hydromorphone: {
      display: "Hydromorphone",
      routes: { iv: { equianalgesic_mg: 1.5 }, oral: { equianalgesic_mg: 7.5 } },
    },
    oxycodone: {
      display: "Oxycodone",
      routes: { oral: { equianalgesic_mg: 20 } },
    },
    hydrocodone: {
      display: "Hydrocodone",
      routes: { oral: { equianalgesic_mg: 30 } },
    },
    oxymorphone: {
      display: "Oxymorphone",
      routes: { iv: { equianalgesic_mg: 1 }, oral: { equianalgesic_mg: 10 } },
    },
    fentanyl: {
      display: "Fentanyl",
      routes: { iv: { equianalgesic_mg: 0.1, display_unit: "mcg", display_value: 100 } },
    },
  },
};

const ROUTE_LABELS = { iv: "IV", oral: "Oral" };
const MG_PER_UNIT = { mg: 1, mcg: 0.001 };

const DOSE_PATTERN = /^\d+(?:\.\d+)?$/;

/**
 * Route keys available for an opioid, in data order.
 * @param {string} opioidKey
 * @returns {string[]}
 */
function routesFor(opioidKey) {
  return Object.keys(OPIOID_DATA.opioids[opioidKey].routes);
}

/**
 * The unit a dose of this opioid/route is entered and shown in.
 * @returns {"mg"|"mcg"}
 */
function doseUnit(opioidKey, route) {
  return OPIOID_DATA.opioids[opioidKey].routes[route].display_unit || "mg";
}

/**
 * Parses a dose like "40" or "2.5" (in the route's own unit).
 * @param {string} rawValue
 * @returns {{ok: true, value: number}|{ok: false, error: string}}
 */
function parseDose(rawValue) {
  const text = (rawValue || "").trim();
  if (/\d,\d/.test(text)) return { ok: false, error: "Use a period for decimals." };
  if (!DOSE_PATTERN.test(text)) return { ok: false, error: "Enter the dose as a number, like 10 or 2.5." };
  const value = Number(text);
  if (!(value > 0)) return { ok: false, error: "Enter a dose greater than 0." };
  return { ok: true, value };
}

/**
 * Converts a dose of one opioid/route into every opioid/route in
 * the data: target_mg = current_mg * (E_target / E_current).
 * Full float precision; rounding happens only in formatDose().
 * @param {string} opioidKey
 * @param {string} route
 * @param {number} dose - in doseUnit(opioidKey, route)
 * @returns {Array<{opioid: string, display: string, route: string,
 *   routeLabel: string, mg: number, unit: string, isEntered: boolean}>}
 */
function equivalentDoses(opioidKey, route, dose) {
  const currentMg = dose * MG_PER_UNIT[doseUnit(opioidKey, route)];
  const currentE = OPIOID_DATA.opioids[opioidKey].routes[route].equianalgesic_mg;

  const rows = [];
  for (const [targetKey, target] of Object.entries(OPIOID_DATA.opioids)) {
    for (const [targetRoute, entry] of Object.entries(target.routes)) {
      rows.push({
        opioid: targetKey,
        display: target.display,
        route: targetRoute,
        routeLabel: ROUTE_LABELS[targetRoute],
        mg: currentMg * (entry.equianalgesic_mg / currentE),
        unit: entry.display_unit || "mg",
        isEntered: targetKey === opioidKey && targetRoute === route,
      });
    }
  }
  return rows;
}

/**
 * Formats a dose for display: mg to at most 2 decimals (trailing
 * zeros dropped), mcg to whole numbers. A dose too small to show
 * reads "< 0.01 mg" / "< 1 mcg" rather than 0.
 * @param {number} mg
 * @param {"mg"|"mcg"} unit
 * @returns {string}
 */
function formatDose(mg, unit) {
  const value = mg / MG_PER_UNIT[unit];
  const decimals = unit === "mcg" ? 0 : 2;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  if (rounded === 0) return `< ${1 / factor} ${unit}`;
  return `${rounded} ${unit}`;
}
