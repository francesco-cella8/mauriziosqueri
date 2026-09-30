import { briefings } from "./briefing-data.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function groupItems(items) {
  const groups = [];
  items.forEach((item) => {
    const current = groups.find((group) => group.area === item.area);
    if (current) current.items.push(item);
    else groups.push({ area: item.area, items: [item] });
  });
  return groups;
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
  const groups = groupItems(report.items);
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
          ${groups
            .map(
              (group) => `<section>
                <h3>${escapeHtml(group.area)}</h3>
                ${group.items
                  .map(
                    (item) => `<article class="briefing-item">
                      <p>${escapeHtml(item.audience)}</p>
                      <h4>${escapeHtml(item.title)}</h4>
                      <p>${escapeHtml(item.recap)}</p>
                      <div class="briefing-links">${renderLinks(item.links)}</div>
                    </article>`
                  )
                  .join("")}
              </section>`
            )
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

  function paint() {
    const report = reports.find((entry) => entry.id === currentId) || reports[0];
    body.innerHTML = renderReport(report, reports, preview);
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
    if (location.hash === "#novita") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
    lastFocus?.focus?.();
  }

  paint();

  document.querySelectorAll("[data-open-briefing]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "briefing-title");
    button.addEventListener("click", () => open(button));
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

  if (location.hash === "#novita") open(document.querySelector("[data-open-briefing]"));

  fetch("/api/briefing", { signal: AbortSignal.timeout(4000) })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!usable(data?.briefings)) return;
      reports = data.briefings;
      preview = false;
      if (!reports.some((entry) => entry.id === currentId)) currentId = reports[0].id;
      if (!root.hidden) paint();
    })
    .catch(() => {
      // Senza Netlify, o prima del primo controllo, resta l'anteprima.
    });
}
