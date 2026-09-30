const MONTHS = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export const INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export const AREAS = ["Scadenze", "Dichiarazioni", "IVA", "Lavoro e ritenute", "Società", "Controlli"];

export const AUDIENCES = ["Per lo studio", "Per i clienti", "Per lo studio e per i clienti"];

export const ALLOWED_HOSTS = [
  "agenziaentrate.gov.it",
  "fiscooggi.it",
  "gazzettaufficiale.it",
  "mef.gov.it",
  "normattiva.it",
  "inps.it",
  "agenziaentrateriscossione.gov.it",
];

export const DEFAULT_SOURCES = [
  { label: "Agenzia delle Entrate", href: "https://www.agenziaentrate.gov.it/portale/" },
  { label: "FiscoOggi", href: "https://www.fiscooggi.it/" },
  { label: "Gazzetta Ufficiale", href: "https://www.gazzettaufficiale.it/" },
  { label: "MEF", href: "https://www.mef.gov.it/" },
  { label: "Normattiva", href: "https://www.normattiva.it/" },
  { label: "INPS", href: "https://www.inps.it/" },
];

export function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clean(value, max) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function romeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type).value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function addDays(parts, days) {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

export function dateId(parts) {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function longLabel(parts) {
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

export function shortLabel(parts) {
  return `${parts.day} ${MONTHS[parts.month - 1]}`;
}

export function hostAllowed(href) {
  try {
    const host = new URL(href).hostname.toLowerCase().replace(/^www\./, "");
    return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function shouldRun(archive, now) {
  if (!archive?.lastRun) return true;
  const then = Date.parse(archive.lastRun);
  if (Number.isNaN(then)) return true;
  return now - then >= INTERVAL_MS;
}

export function knownTitles(briefings) {
  return new Set(
    (briefings || [])
      .flatMap((report) => report.items || [])
      .map((item) => normalize(item.title))
      .filter(Boolean)
  );
}

export function parseModelJson(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Risposta senza JSON");
    return JSON.parse(match[0]);
  }
}

function linksFrom(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const links = [];
  for (const link of value) {
    const href = clean(link?.href, 400);
    const label = clean(link?.label, 80);
    if (!label || !hostAllowed(href) || seen.has(href)) continue;
    seen.add(href);
    links.push({ label, href });
    if (links.length === 3) break;
  }
  return links;
}

export function buildReport(raw, { known, now = new Date(), previousLabel = "" } = {}) {
  const today = romeParts(now);
  const next = addDays(today, 3);
  const parsed = raw && typeof raw === "object" ? raw : {};
  const wantedNew = parsed.status === "novita";
  const incoming = Array.isArray(parsed.items) ? parsed.items : [];
  let omitted = 0;
  const items = [];
  const seen = new Set();

  if (wantedNew) {
    for (const item of incoming) {
      const title = clean(item?.title, 140);
      const key = normalize(title);
      if (!title || !key) continue;
      if (known?.has(key) || seen.has(key)) {
        omitted += 1;
        continue;
      }
      const links = linksFrom(item?.links);
      if (!links.length) continue;
      seen.add(key);
      const area = AREAS.includes(item?.area) ? item.area : "Controlli";
      const audience = AUDIENCES.includes(item?.audience) ? item.audience : "Per lo studio e per i clienti";
      items.push({
        id: `${dateId(today)}-${key.replace(/ /g, "-").slice(0, 48)}`,
        area,
        audience,
        title,
        recap: clean(item?.recap, 500),
        links,
      });
      if (items.length === 5) break;
    }
  }

  const sources = linksFrom(parsed.sources);
  const report = {
    id: dateId(today),
    dateLabel: longLabel(today),
    shortLabel: shortLabel(today),
    nextLabel: longLabel(next),
    status: items.length ? "novita" : "invariato",
    recap: clean(parsed.recap, 600),
    omitted: null,
    items,
    sources: sources.length ? sources : DEFAULT_SOURCES,
  };

  if (!report.recap) {
    report.recap = items.length
      ? "Ci sono segnalazioni nuove rispetto al controllo precedente."
      : "Nessuna novità. Le fonti controllate non aggiungono segnalazioni diverse da quelle già uscite.";
  }

  if (omitted > 0) {
    report.omitted = {
      count: omitted,
      since: previousLabel || "un resoconto precedente",
    };
    if (!items.length) {
      report.recap = `Nessuna novità. ${omitted === 1 ? "Una segnalazione già uscita non è stata ripetuta" : `${omitted} segnalazioni già uscite non sono state ripetute`}.`;
    }
  }

  return report;
}
