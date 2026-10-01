import { briefings } from "./briefing-data.js";

const RELEVANCE = ["altissima", "alta", "media", "bassa"];
const RELEVANCE_LABEL = {
  altissima: "Altissima",
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function byRelevance(items) {
  return [...items].sort(
    (left, right) => RELEVANCE.indexOf(left.rilevanza || "media") - RELEVANCE.indexOf(right.rilevanza || "media")
  );
}

function renderLinks(links) {
  return links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
    )
    .join("");
}

function usable(list) {
  return (
    Array.isArray(list) &&
    list.length > 0 &&
    list.every(
      (item) => item?.id && item.dateLabel && item.recap && Array.isArray(item.items) && Array.isArray(item.sources)
    )
  );
}

function renderReport(report, reports, preview) {
  const ordered = byRelevance(report.items);
  const newsCount = report.items.length;
  const status =
    report.status === "invariato"
      ? "Niente di nuovo"
      : newsCount === 1
        ? "Una novità"
        : `${newsCount} novità`;

  const itemsMarkup =
    report.status === "invariato"
      ? `<div class="briefing-empty">
          <strong>Niente di nuovo.</strong>
          <p>${escapeHtml(report.recap)}</p>
        </div>`
      : `<p class="briefing-recap">${escapeHtml(report.recap)}</p>
        ${
          report.omitted
            ? `<p class="briefing-omit">Non ripetute: ${report.omitted.count} segnalazioni già presenti nel resoconto del ${escapeHtml(report.omitted.since)}.</p>`
            : ""
        }
        <div class="briefing-groups">
          ${ordered
            .map((item, index) => {
              const level = RELEVANCE.includes(item.rilevanza) ? item.rilevanza : "media";
              const number = String(index + 1).padStart(2, "0");
              return `<article class="briefing-item is-${level}">
                <div class="briefing-meta">
                  <span class="briefing-index" aria-hidden="true">${number}</span>
                  <span class="briefing-level is-${level}">${RELEVANCE_LABEL[level]}</span>
                  <span class="briefing-chip">${escapeHtml(item.area)}</span>
                  <span class="briefing-chip">${escapeHtml(item.audience)}</span>
                </div>
                <h4>${escapeHtml(item.title)}</h4>
                <p>${escapeHtml(item.recap)}</p>
                <div class="briefing-links">${renderLinks(item.links)}</div>
              </article>`;
            })
            .join("")}
        </div>`;

  const banner = preview
    ? `<p class="briefing-preview">Anteprima. I testi sono di esempio, in attesa del primo controllo.</p>`
    : "";
  const quiet = report.status === "invariato" ? " is-quiet" : "";

  return `${banner}
    <div class="briefing-layout">
      <aside class="briefing-rail">
        <p class="briefing-kicker">Resoconti</p>
        <div class="briefing-dates">
          ${reports
            .map(
              (entry) => `<button type="button" data-briefing="${escapeHtml(entry.id)}" aria-pressed="${entry.id === report.id ? "true" : "false"}">${escapeHtml(entry.shortLabel)}</button>`
            )
            .join("")}
        </div>
        <p class="briefing-next">Prossimo controllo <strong>${escapeHtml(report.nextLabel)}</strong></p>
      </aside>
      <div class="briefing-main">
        <div class="briefing-heading">
          <h2 id="briefing-title">${escapeHtml(report.dateLabel)}</h2>
          <p class="briefing-status${quiet}">${escapeHtml(status)}</p>
        </div>
        ${itemsMarkup}
        <section class="briefing-sources">
          <h3>Fonti verificate</h3>
          <ul>${report.sources
            .map(
              (source) =>
                `<li><a href="${escapeHtml(source.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`
            )
            .join("")}</ul>
        </section>
      </div>
    </div>`;
}

export function mountBriefing({ beforeOpen } = {}) {
  const root = document.createElement("div");
  root.className = "briefing";
  root.hidden = true;
  root.innerHTML = `<button class="briefing-backdrop" type="button" data-close-briefing aria-label="Chiudi le novità"></button>
    <div class="briefing-panel" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
      <div class="briefing-bar">
        <p>Novità</p>
        <button type="button" data-close-briefing>Chiudi</button>
      </div>
      <div class="briefing-body"></div>
    </div>`;
  document.body.append(root);

  const panel = root.querySelector(".briefing-panel");
  const body = root.querySelector(".briefing-body");
  const closeButton = root.querySelector(".briefing-bar button");
  let reports = briefings;
  let preview = true;
  let currentId = reports[0].id;
  let lastFocus = null;

  function paintHome(report) {
    const stage = document.querySelector("[data-briefing-stage]");
    if (!stage) return;
    const featured = byRelevance(report.items)
      .filter((item) => item.rilevanza === "altissima" || item.rilevanza === "alta")
      .slice(0, 3);
    const shown = featured.length ? featured : byRelevance(report.items).slice(0, 3);
    const count =
      report.status === "invariato"
        ? "Niente di nuovo"
        : report.items.length === 1
          ? "Una novità"
          : `${report.items.length} novità`;
    stage.innerHTML = `<div class="bulletin-copy">
        <p class="eyebrow">Novità</p>
        <p class="bulletin-note">Atti ufficiali, per lo studio e per i clienti.</p>
        <h2 id="novita-title">${escapeHtml(report.dateLabel)}</h2>
        <p class="bulletin-count">${escapeHtml(count)}</p>
        <p class="bulletin-lead">${escapeHtml(report.recap)}</p>
        <button class="btn" type="button" data-open-briefing>
          Leggi il resoconto
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
        </button>
      </div>
      <ol class="bulletin-list">
        ${shown
          .map((item) => {
            const level = RELEVANCE.includes(item.rilevanza) ? item.rilevanza : "media";
            return `<li>
              <button type="button" data-open-briefing>
                <span class="briefing-level is-${level}">${RELEVANCE_LABEL[level]}</span>
                <span class="bulletin-title">${escapeHtml(item.title)}</span>
                <span class="bulletin-go" aria-hidden="true">Apri</span>
              </button>
            </li>`;
          })
          .join("")}
      </ol>`;
  }

  function paint() {
    const report = reports.find((entry) => entry.id === currentId) || reports[0];
    body.innerHTML = renderReport(report, reports, preview);
    paintHome(report);
  }

  function pageParts() {
    return document.querySelectorAll("header, main, footer");
  }

  function open(trigger) {
    beforeOpen?.();
    lastFocus = trigger || document.activeElement;
    if (root.hidden) {
      root.hidden = false;
      document.body.classList.add("briefing-open");
      pageParts().forEach((part) => part.setAttribute("inert", ""));
      document.querySelectorAll("[data-open-briefing]").forEach((button) => {
        button.classList.add("is-active");
        button.setAttribute("aria-expanded", "true");
      });
    }
    paint();
    closeButton.focus();
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    document.body.classList.remove("briefing-open");
    pageParts().forEach((part) => part.removeAttribute("inert"));
    document.querySelectorAll("[data-open-briefing]").forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-expanded", "false");
    });
    lastFocus?.focus?.();
  }

  paint();

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-briefing]");
    if (!button || root.contains(button)) return;
    open(button);
  });

  root.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-briefing]");
    if (tab) {
      currentId = tab.dataset.briefing;
      paint();
      panel.scrollTop = 0;
      root.querySelector(`[data-briefing="${CSS.escape(currentId)}"]`)?.focus();
      return;
    }
    if (event.target.closest("[data-close-briefing]")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (root.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...panel.querySelectorAll("a[href], button:not([disabled])")].filter(
      (node) => node.offsetParent !== null
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  fetch("/api/briefing", { signal: AbortSignal.timeout(4000) })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!usable(data?.briefings)) return;
      const fresh = data.briefings.filter(
        (entry) => entry.id === briefings[0]?.id || (entry.items || []).some((item) => item.rilevanza)
      );
      const ids = new Set(fresh.map((entry) => entry.id));
      reports = [...fresh, ...briefings.filter((entry) => !ids.has(entry.id))];
      preview = false;
      const newest = fresh.find((entry) => entry.id !== briefings[0]?.id);
      currentId = newest?.id || reports[0].id;
      paint();
    })
    .catch(() => {
      // Senza Netlify, o prima del primo controllo, resta l'anteprima.
    });
}
