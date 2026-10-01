/* Memoria della scelta e caricamento anticipato dei font.
   La barra e le preferenze stanno in src/consent.js. */
(() => {
  const KEY = "squeri-consent";
  const VERSION = 1;
  const MAX_AGE = 183 * 24 * 60 * 60 * 1000;
  const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;1,6..72,500&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap";

  let memory = null;

  function valid(parsed) {
    if (!parsed || parsed.v !== VERSION) return false;
    if (parsed.fonts !== true && parsed.fonts !== false) return false;
    if (parsed.maps !== true && parsed.maps !== false) return false;
    const time = Date.parse(parsed.t);
    if (!time || Date.now() - time > MAX_AGE) return false;
    return true;
  }

  function read() {
    if (memory) return memory;
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!valid(parsed)) return null;
      memory = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  function write(choice) {
    const value = {
      v: VERSION,
      fonts: choice.fonts === true,
      maps: choice.maps === true,
      t: new Date().toISOString(),
    };
    memory = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* La scelta resta valida solo in questa scheda. */
    }
    return value;
  }

  function enableFonts() {
    if (document.querySelector('link[data-fonts="squeri"]')) return;
    const google = document.createElement("link");
    google.rel = "preconnect";
    google.href = "https://fonts.googleapis.com";
    google.dataset.fonts = "squeri";
    const gstatic = document.createElement("link");
    gstatic.rel = "preconnect";
    gstatic.href = "https://fonts.gstatic.com";
    gstatic.crossOrigin = "anonymous";
    gstatic.dataset.fonts = "squeri";
    const sheet = document.createElement("link");
    sheet.rel = "stylesheet";
    sheet.href = FONT_HREF;
    sheet.dataset.fonts = "squeri";
    document.head.append(google, gstatic, sheet);
  }

  const saved = read();
  if (saved?.fonts) enableFonts();

  window.SqueriConsent = { read, write, enableFonts };
})();
