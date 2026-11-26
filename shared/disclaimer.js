/* -------------------------------------------------------------
   Shared disclaimer footer
   Defines <app-disclaimer>, which renders the standard "educational
   use only" footer. Every page (each app and the landing page)
   places <app-disclaimer></app-disclaimer> right after its </main>
   and loads this script, so the wording lives in one place.
   ------------------------------------------------------------- */

class AppDisclaimer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="app-disclaimer">
        <p>
          For educational and reference use only. Not a substitute for
          clinical judgment. Verify every result independently before
          using it in patient care.
        </p>
      </footer>`;
  }
}

customElements.define("app-disclaimer", AppDisclaimer);
