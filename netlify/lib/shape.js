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
export const LOOKBACK_MS = 10 * 24 * 60 * 60 * 1000;

export const AREAS = ["Scadenze", "Dichiarazioni", "IVA", "Lavoro e ritenute", "Società", "Controlli"];

export const AUDIENCES = ["Per lo studio", "Per i clienti", "Per lo studio e per i clienti"];

export const RELEVANCE = ["altissima", "alta", "media", "bassa"];

export const ALLOWED_HOSTS = [
  "agenziaentrate.gov.it",
  "fiscooggi.it",
  "gazzettaufficiale.it",
  "mef.gov.it",
  "finanze.gov.it",
  "finanze.it",
  "normattiva.it",
  "inps.it",
  "agenziaentrateriscossione.gov.it",
];

export const DEFAULT_SOURCES = [
  { label: "Agenzia delle Entrate", href: "https://www.agenziaentrate.gov.it/portale/" },
  { label: "FiscoOggi", href: "https://www.fiscooggi.it/" },
  { label: "Gazzetta Ufficiale", href: "https://www.gazzettaufficiale.it/" },
  { label: "Dipartimento delle Finanze", href: "https://www.finanze.gov.it/it/" },
  { label: "MEF", href: "https://www.mef.gov.it/" },
  { label: "INPS", href: "https://www.inps.it/" },
  { label: "Agenzia delle Entrate-Riscossione", href: "https://www.agenziaentrateriscossione.gov.it/" },
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

export function canonicalUrl(href) {
  const url = new URL(href);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return `${host}${path}${url.search}`;
}

export function specificPage(href) {
  try {
    const path = new URL(href).pathname.replace(/\/+$/, "");
    return Boolean(path && path !== "/portale" && path !== "/portale/home" && path !== "/it" && path !== "/it/it");
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

export function isCurrent(text, now = new Date()) {
  const year = romeParts(now).year;
  const years = [...String(text).matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  if (!years.length) return true;
  return years.includes(year);
}

export function isRoutine(text) {
  const value = normalize(text);
  if (!value) return true;
  if (
    /scadenze ordinarie|gia in vigore|si conferma|sono confermate|confermati nel|adempimenti periodici|versamento periodico|liquidazione periodica|calendario ordinario|resta invariata|restano invariate/.test(
      value
    )
  ) {
    return true;
  }
  if (/aggiornamenti dal 20\d\d/.test(value) && /conferm/.test(value)) return true;
  const namesAct = /risoluzione|circolare|provvedimento|decreto|messaggio|interpello|istituit|nuovi codici|nuovo codice/.test(value);
  if (/versamento delle ritenute|ritenute operate|iva intracomunitaria|acquisti intracomunitari/.test(value) && !namesAct) return true;
  if (/comunicazioni di irregolarita|avvisi bonari|sanzioni ridotte|rateizzazione fino a/.test(value) && !namesAct) return true;
  return false;
}

export function fitArea(area, text, links = []) {
  const value = normalize(text);
  const inps = links.some((link) => /inps\.it/.test(link?.href || ""));
  if (inps && /contribut|codice tributo|enti bilateral/.test(value)) return "Lavoro e ritenute";
  if (/54 bis|633|dichiarazione iva|omessa dichiarazione/.test(value) && /iva|tributo/.test(value)) return "IVA";
  return AREAS.includes(area) ? area : "Controlli";
}

export function actCodes(text) {
  const found = new Set();
  for (const match of String(text).matchAll(/[“"']([0-9]{4}|[0-9]{2}[A-Z]{2})[”"']|\bcodice tributo\s+([A-Z0-9]{3,5})\b/gi)) {
    const code = (match[1] || match[2] || "").toUpperCase();
    if (code && !/^20\d{2}$/.test(code)) found.add(code);
  }
  return [...found];
}

export function reviewDraft(report, documents = []) {
  const notes = [];
  const used = new Set();
  for (const item of report?.items || []) {
    const text = `${item.title} ${item.recap}`;
    if (isRoutine(text)) notes.push(`Togli «${item.title}»: non è un atto nuovo.`);
    const source = documents.find((document) =>
      (item.links || []).some((link) => {
        try {
          return canonicalUrl(link.href) === canonicalUrl(document.href);
        } catch {
          return false;
        }
      })
    );
    if (!source) continue;
    used.add(source.href);
    for (const code of actCodes(`${source.title} ${source.summary || ""}`)) {
      if (!text.toUpperCase().includes(code)) notes.push(`Nella scheda «${item.title}» manca il codice ${code}.`);
    }
    if (/interpello|risposta n/i.test(source.title) && /istante ritiene|ritiene di non rientrare/i.test(text)) {
      notes.push(`Nella scheda «${item.title}» c'è la tesi dell'istante, non la conclusione dell'Agenzia.`);
    }
    const sourceText = `${source.title} ${source.summary || ""}`;
    if (/9005/.test(sourceText) && /imposta/i.test(sourceText) && /interessi/i.test(sourceText) && /sanzioni/i.test(sourceText)) {
      if (!/9005/.test(text) || !/imposta/i.test(text) || !/interessi/i.test(text) || !/sanzioni/i.test(text)) {
        notes.push(`Nella scheda «${item.title}» distingui i codici: 9005 è l'importo complessivo, gli altri sono imposta, interessi e sanzioni.`);
      }
    }
  }
  for (const document of documents) {
    const codes = actCodes(`${document.title} ${document.summary || ""}`);
    if (used.has(document.href)) continue;
    if (/interpello|risposta n/i.test(document.title)) {
      notes.push("Manca la conclusione dell'interpello: scrivi se l'adempimento c'è o non c'è, e solo per il caso descritto.");
      continue;
    }
    if (!codes.length) continue;
    notes.push(`Manca una scheda con i codici ${codes.join(", ")}.`);
  }
  return notes;
}

export function fitAudience(audience, text) {
  const value = normalize(text);
  if (/\b(sanilav|ebicon|ebon|sanl)\b|ente bilaterale/.test(value)) return "Per lo studio";
  return AUDIENCES.includes(audience) ? audience : "Per lo studio e per i clienti";
}

export function needsAnotherPass(archive, now = new Date()) {
  const latest = archive?.briefings?.[0];
  if (!latest) return false;
  const text = [latest.recap, ...(latest.items || []).flatMap((item) => [item.title, item.recap])].join(" ");
  return !isCurrent(text, now);
}

export function knownTitles(briefings) {
  return new Set(
    (briefings || [])
      .flatMap((report) => report.items || [])
      .map((item) => normalize(item.title))
      .filter(Boolean)
  );
}

export function knownLinks(briefings) {
  const links = new Set();
  for (const report of briefings || []) {
    for (const item of report.items || []) {
      for (const link of item.links || []) {
        try {
          links.add(canonicalUrl(link.href));
        } catch {
          // Un vecchio link malformato non blocca il controllo.
        }
      }
    }
  }
  return links;
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

function linksFrom(value, seenUrls) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const links = [];
  for (const link of value) {
    const href = clean(link?.href, 400);
    const label = clean(link?.label, 80);
    if (!label || !hostAllowed(href) || !specificPage(href)) continue;
    let key = "";
    try {
      key = canonicalUrl(href);
    } catch {
      continue;
    }
    if ((seenUrls && !seenUrls.has(key)) || seen.has(key)) continue;
    seen.add(key);
    links.push({ label, href });
    if (links.length === 3) break;
  }
  return links;
}

export function buildReport(raw, { known, knownHrefs, seen, sources: checked, now = new Date(), previousLabel = "" } = {}) {
  const today = romeParts(now);
  const next = addDays(today, 3);
  const parsed = raw && typeof raw === "object" ? raw : {};
  const wantedNew = parsed.status === "novita";
  const incoming = Array.isArray(parsed.items) ? parsed.items : [];
  let omitted = 0;
  const items = [];
  const seenTitles = new Set();

  if (wantedNew) {
    for (const item of incoming) {
      const title = clean(item?.title, 140);
      const key = normalize(title);
      if (!title || !key) continue;
      if (known?.has(key) || seenTitles.has(key)) {
        omitted += 1;
        continue;
      }
      const recap = clean(item?.recap, 700);
      const reading = `${title} ${recap}`;
      if (!isCurrent(reading, now) || isRoutine(reading)) continue;
      const links = linksFrom(item?.links, seen);
      if (!links.length) continue;
      if (links.some((link) => knownHrefs?.has(canonicalUrl(link.href)))) {
        omitted += 1;
        continue;
      }
      seenTitles.add(key);
      const area = fitArea(item?.area, reading, links);
      const audience = fitAudience(item?.audience, reading);
      const rilevanza = RELEVANCE.includes(item?.rilevanza) ? item.rilevanza : "media";
      items.push({
        id: `${dateId(today)}-${key.replace(/ /g, "-").slice(0, 48)}`,
        area,
        audience,
        rilevanza,
        title,
        recap,
        links,
      });
    }
  }

  items.sort((left, right) => RELEVANCE.indexOf(left.rilevanza) - RELEVANCE.indexOf(right.rilevanza));
  items.splice(8);

  const provided = Array.isArray(checked) ? checked.filter((source) => source?.label && source?.href).slice(0, 8) : [];
  const sources = provided.length ? provided : linksFrom(parsed.sources);
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

  if (!items.length) {
    report.recap =
      "Nessuna novità degli ultimi giorni. Le pagine trovate descrivono regole già in vigore, non fatti nuovi, oppure ripetono segnalazioni già uscite.";
  } else if (!report.recap || !isCurrent(report.recap, now) || isRoutine(report.recap)) {
    report.recap =
      items.length === 1
        ? `${items[0].title}.`
        : `${items.length} segnalazioni nuove: ${items.map((item) => item.title).join("; ")}.`;
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
