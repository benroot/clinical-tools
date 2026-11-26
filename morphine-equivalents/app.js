/* -------------------------------------------------------------
   Opioid Equivalence — Alpine component
   Relies on opioids.js (data and pure math/formatting) being loaded
   first. See CLAUDE.md in this folder for the spec.
   ------------------------------------------------------------- */

/**
 * Alpine component for the Opioid Equivalence page.
 * Exposed on window so the inline x-data="opioidEquivalence()" call
 * in index.html can find it.
 */
function opioidEquivalence() {
  return {
    opioidOptions: Object.entries(OPIOID_DATA.opioids).map(([key, opioid]) => ({
      key,
      display: opioid.display,
    })),
    routeColumns: Object.values(ROUTE_LABELS),
    opioid: OPIOID_DATA.reference.opioid,
    route: routesFor(OPIOID_DATA.reference.opioid)[0],
    doseInput: "",
    errorMessage: "",
    rows: [],

    get routeOptions() {
      return routesFor(this.opioid).map((key) => ({ key, label: ROUTE_LABELS[key] }));
    },

    get unit() {
      return doseUnit(this.opioid, this.route);
    },

    get hasResult() {
      return this.rows.length > 0;
    },

    /** Keeps the route valid for the newly chosen opioid. */
    changeOpioid() {
      if (!routesFor(this.opioid).includes(this.route)) {
        this.route = routesFor(this.opioid)[0];
      }
      this.calculate();
    },

    calculate() {
      this.errorMessage = "";
      this.rows = [];

      if (!this.doseInput.trim()) {
        // Nothing to calculate yet; not an error state.
        return;
      }

      const result = parseDose(this.doseInput);
      if (!result.ok) {
        this.errorMessage = result.error;
        return;
      }

      // Cells in ROUTE_LABELS (column) order; dose is null where the
      // opioid has no data for that route.
      this.rows = equivalentDoses(this.opioid, this.route, result.value).map((row) => ({
        key: row.opioid,
        display: row.display,
        cells: Object.keys(ROUTE_LABELS).map((route) => {
          const cell = row.routes[route];
          return {
            route,
            dose: cell ? formatDose(cell.mg, cell.unit) : null,
            isEntered: cell ? cell.isEntered : false,
          };
        }),
      }));
    },
  };
}
