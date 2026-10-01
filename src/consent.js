function whenReady(run) {
  if (document.documentElement.classList.contains("is-in")) {
    run();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!document.documentElement.classList.contains("is-in")) return;
    observer.disconnect();
    run();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

function hideBar(bar) {
  bar.hidden = true;
  document.documentElement.classList.remove("has-consent-bar");
}

function showBar(bar) {
  if (window.SqueriConsent.read()) return;
  bar.hidden = false;
  document.documentElement.classList.add("has-consent-bar");
}

function mountConsent() {
  const api = window.SqueriConsent;
  if (!api) return;

  const bar = document.createElement("div");
  bar.className = "consent-bar";
  bar.hidden = true;
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-labelledby", "consent-bar-title");
  bar.innerHTML = `
    <div class="consent-card">
      <div class="consent-card-body">
        <p class="consent-kicker">Privacy</p>
        <p class="consent-title" id="consent-bar-title">Caratteri e vista satellitare</p>
        <p class="consent-copy">
          I caratteri arrivano da Google e la vista satellitare delle sedi da Esri, solo se li accetti.
          Se rifiuti, le pagine restano consultabili: cambiano i caratteri e la vista resta chiusa.
          La scelta dura sei mesi e si cambia dal piè di pagina.
        </p>
      </div>
      <div class="consent-actions">
        <button class="btn" type="button" data-consent="accept">Accetta</button>
        <button class="btn consent-reject" type="button" data-consent="reject">Rifiuta</button>
        <button class="consent-choose" type="button" data-consent="choose">Scegli nel dettaglio</button>
      </div>
      <p class="consent-links">
        <a href="/cookie.html">Cookie</a>
        <a href="/privacy.html">Privacy</a>
      </p>
    </div>
  `;

  const dialog = document.createElement("dialog");
  dialog.className = "consent-dialog";
  dialog.setAttribute("aria-labelledby", "consent-title");
  dialog.innerHTML = `
    <div class="consent-dialog-panel">
      <div class="consent-head">
        <div>
          <p class="consent-kicker">Preferenze</p>
          <h2 id="consent-title" tabindex="-1">Cookie e servizi esterni</h2>
        </div>
        <button class="consent-dismiss" type="button" data-consent-dismiss>Chiudi</button>
      </div>
      <p class="consent-dialog-copy">
        I necessari ricordano questa scelta su questo browser. Caratteri e vista satellitare sono facoltativi e si possono rivedere quando vuoi.
      </p>
      <ul class="consent-choices">
        <li>
          <label>
            <input type="checkbox" checked disabled />
            <span>
              <strong>Necessari</strong>
              <small>Memoria della scelta, per sei mesi. Sempre attivi.</small>
            </span>
          </label>
        </li>
        <li>
          <label>
            <input name="fonts" type="checkbox" />
            <span>
              <strong>Caratteri</strong>
              <small>Newsreader e Plus Jakarta Sans, dai server di Google. Google riceve l'indirizzo IP e dati tecnici del browser.</small>
            </span>
          </label>
        </li>
        <li>
          <label>
            <input name="maps" type="checkbox" />
            <span>
              <strong>Vista satellitare</strong>
              <small>Immagini Esri delle due sedi. Esri riceve l'indirizzo IP e dati tecnici del browser.</small>
            </span>
          </label>
        </li>
      </ul>
      <div class="consent-actions">
        <button class="btn" type="button" data-choice="save">Salva</button>
        <button class="btn btn-ghost" type="button" data-choice="accept">Accetta tutto</button>
        <button class="btn btn-ghost" type="button" data-choice="reject">Solo necessari</button>
      </div>
      <p class="consent-dialog-links">
        <a href="/cookie.html">Informativa cookie</a>
        <a href="/privacy.html">Privacy</a>
      </p>
    </div>
  `;

  document.body.append(bar, dialog);

  const fontsInput = dialog.querySelector('input[name="fonts"]');
  const mapsInput = dialog.querySelector('input[name="maps"]');
  let returnFocus = null;

  function commit(choice) {
    const next = api.write(choice);
    hideBar(bar);
    const fontsLoaded = Boolean(document.querySelector('link[data-fonts="squeri"]'));
    const mapsLive = Boolean(document.querySelector("[data-satellite-ready]"));
    if ((!next.fonts && fontsLoaded) || (!next.maps && mapsLive)) {
      window.location.reload();
      return;
    }
    if (next.fonts) api.enableFonts();
    document.dispatchEvent(new CustomEvent("squeri-consent", { detail: next }));
  }

  function openDialog(trigger) {
    returnFocus = trigger instanceof HTMLElement ? trigger : null;
    const current = api.read();
    fontsInput.checked = Boolean(current?.fonts);
    mapsInput.checked = Boolean(current?.maps);
    dialog.showModal();
    dialog.querySelector("#consent-title")?.focus();
  }

  bar.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-consent]") : null;
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.dataset.consent === "accept") commit({ fonts: true, maps: true });
    else if (button.dataset.consent === "reject") commit({ fonts: false, maps: false });
    else openDialog(button);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("[data-consent-dismiss]")) {
      dialog.close();
      return;
    }
    const choice = target.closest("[data-choice]");
    if (!(choice instanceof HTMLButtonElement)) return;
    if (choice.dataset.choice === "accept") commit({ fonts: true, maps: true });
    else if (choice.dataset.choice === "reject") commit({ fonts: false, maps: false });
    else commit({ fonts: fontsInput.checked, maps: mapsInput.checked });
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    const back = returnFocus;
    returnFocus = null;
    if (back && document.contains(back) && !back.closest("[hidden]")) back.focus();
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest("dialog")) return;
    const open = target.closest("[data-consent-open]");
    if (open) {
      openDialog(open);
      return;
    }
    if (!target.closest("[data-load-map]")) return;
    const current = api.read();
    commit({ fonts: Boolean(current?.fonts), maps: true });
  });

  if (api.read()?.fonts) api.enableFonts();
  if (!api.read()) whenReady(() => showBar(bar));
}

mountConsent();
