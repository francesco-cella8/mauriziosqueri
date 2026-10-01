import { canonicalUrl, hostAllowed } from "./shape.js";

const UA = "StudioSqueri/1.0 (resoconto fonti ufficiali)";

// FiscoOggi ha un RSS, ma le condizioni d'uso vietano di ripubblicarne i titoli sul sito.
// Quel sito si consulta solo con la ricerca, e nel resoconto entra il link all'articolo.

const FEEDS = [
  {
    label: "Agenzia delle Entrate",
    href: "https://www.agenziaentrate.gov.it/portale/",
    domain: "agenziaentrate.gov.it",
    url: "https://www.agenziaentrate.gov.it/portale/c/portal/rss/entrate?idrss=79b071d0-a537-4a3d-86cc-7a7d5a36f2a9",
    kind: "desk",
  },
  {
    label: "Agenzia delle Entrate",
    href: "https://www.agenziaentrate.gov.it/portale/",
    domain: "agenziaentrate.gov.it",
    url: "https://www.agenziaentrate.gov.it/portale/c/portal/rss/entrate?idrss=0753fcb1-1a42-4f8c-f40d-02793c6aefb4",
    kind: "desk",
  },
  {
    label: "Gazzetta Ufficiale",
    href: "https://www.gazzettaufficiale.it/",
    domain: "gazzettaufficiale.it",
    url: "https://www.gazzettaufficiale.it/rss/SG",
    kind: "wide",
  },
  {
    label: "Dipartimento delle Finanze",
    href: "https://www.finanze.gov.it/it/",
    domain: "finanze.gov.it",
    url: "https://www.finanze.gov.it/opencms/it/rss.xml",
    kind: "desk",
  },
  {
    label: "MEF",
    href: "https://www.mef.gov.it/",
    domain: "mef.gov.it",
    url: "https://www.mef.gov.it/rss/rss.asp?t=4",
    kind: "wide",
  },
  {
    label: "INPS",
    href: "https://www.inps.it/",
    domain: "inps.it",
    url: "https://www.inps.it/it/it.rss.circolari.xml",
    kind: "wide",
  },
  {
    label: "INPS",
    href: "https://www.inps.it/",
    domain: "inps.it",
    url: "https://www.inps.it/it/it.rss.messaggi.xml",
    kind: "wide",
  },
];

const SEARCH_SOURCES = [
  { label: "FiscoOggi", href: "https://www.fiscooggi.it/", domain: "fiscooggi.it" },
  {
    label: "Agenzia delle Entrate-Riscossione",
    href: "https://www.agenziaentrateriscossione.gov.it/",
    domain: "agenziaentrateriscossione.gov.it",
  },
];

const SOURCE_ORDER = [
  "Agenzia delle Entrate",
  "FiscoOggi",
  "Gazzetta Ufficiale",
  "Dipartimento delle Finanze",
  "MEF",
  "INPS",
  "Agenzia delle Entrate-Riscossione",
];

const NOISE =
  /concors|assunzion|selezione pubblica|gara d.appalto|avviso di mobilit|commissario|liquidatore|working paper/i;

const TAX =
  /imposta|\btribut|fiscal|fisco|\biva\b|irpef|ires|irap|\bimu\b|\btari\b|\bf24\b|\blipe\b|ritenut|\bcontributi\b|\bcontribuzione\b|accis|\bbollo\b|addizional|forfett|fattur|dichiaraz|versament|cartell|riscoss|succession|donazion|plusvalen|adempiment|concordato|ravvediment|agevolaz|superbonus|split payment|esterometro|cedolar|criptoattivit|partita iva|codice tributo|gestione separata/i;

const STUDIO_TOPIC = /societ|aziend|bilanc|agricol|forestal|locazion|registro delle imprese/i;

export function relevant(kind, title, summary) {
  const text = `${title} ${summary}`;
  if (NOISE.test(text)) return false;
  if (/graduatoria|ricerca e sviluppo|accordi per l.innovazione|mancato funzionamento/i.test(text)) return false;
  if (/^report\b/i.test(title)) return false;
  if (kind !== "wide") return true;
  if (TAX.test(text)) return true;
  const isAct = /^(decreto-legge|decreto legislativo|legge)\b/i.test(title);
  return isAct && STUDIO_TOPIC.test(text);
}

export function parseFeedDate(value) {
  const text = String(value || "").trim();
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const day = slash[1].padStart(2, "0");
    const month = slash[2].padStart(2, "0");
    return Date.parse(`${slash[3]}-${month}-${day}T12:00:00+02:00`);
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function decode(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(block, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(re);
  return match ? decode(match[1]) : "";
}

export function preferHttps(href) {
  const url = new URL(String(href || "").trim());
  url.protocol = "https:";
  if (url.port === "443" || url.port === "80") url.port = "";
  return url.toString();
}

export function parseRssItems(xml) {
  const blocks = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const items = [];
  for (const block of blocks) {
    const title = tagText(block, "title");
    const rawLink = tagText(block, "link") || block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] || "";
    const summary = tagText(block, "description") || tagText(block, "content:encoded");
    const time = parseFeedDate(tagText(block, "pubDate") || tagText(block, "pubdate") || tagText(block, "dc:date"));
    if (!title || !rawLink || Number.isNaN(time)) continue;
    let href = "";
    try {
      href = preferHttps(rawLink);
    } catch {
      continue;
    }
    if (!hostAllowed(href)) continue;
    items.push({ title: title.slice(0, 240), href, summary: summary.slice(0, 500), time });
  }
  return items;
}

function dayLabel(time) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(time));
}

async function readFeed(feed, startMs) {
  const response = await fetch(feed.url, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
  });
  if (!response.ok) throw new Error(`${feed.label} ${response.status}`);
  const xml = await response.text();
  return parseRssItems(xml)
    .filter((item) => item.time >= startMs && relevant(feed.kind, item.title, item.summary))
    .sort((a, b) => b.time - a.time)
    .slice(0, 15)
    .map((item) => ({
      label: feed.label,
      title: item.title,
      href: item.href,
      date: dayLabel(item.time),
      summary: item.summary,
      time: item.time,
    }));
}

export async function collectDocuments(startMs) {
  const results = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        return { feed, documents: await readFeed(feed, startMs) };
      } catch (error) {
        console.error(error instanceof Error ? error.message : feed.label);
        return { feed, documents: null };
      }
    })
  );

  const failedDomains = new Set();
  for (const domain of new Set(FEEDS.map((feed) => feed.domain))) {
    const group = results.filter((result) => result.feed.domain === domain);
    if (group.some((result) => !result.documents)) failedDomains.add(domain);
  }

  const search = [
    ...SEARCH_SOURCES,
    ...FEEDS.filter((feed) => failedDomains.has(feed.domain)).map((feed) => ({
      label: feed.label,
      href: feed.href,
      domain: feed.domain,
    })),
  ];
  const seenSearch = new Set();
  const uniqueSearch = search.filter((source) => {
    if (seenSearch.has(source.domain)) return false;
    seenSearch.add(source.domain);
    return true;
  });

  const seenHref = new Set();
  const documents = [];
  for (const result of results) {
    for (const document of result.documents || []) {
      const key = canonicalUrl(document.href);
      if (seenHref.has(key)) continue;
      seenHref.add(key);
      documents.push(document);
    }
  }
  documents.sort((a, b) => b.time - a.time);
  await readActs(documents);

  const labels = new Set([...results.filter((result) => result.documents).map((result) => result.feed.label), ...uniqueSearch.map((source) => source.label)]);
  const checked = SOURCE_ORDER.filter((label) => labels.has(label)).map((label) => {
    const source = [...FEEDS, ...SEARCH_SOURCES].find((item) => item.label === label);
    return { label, href: source.href };
  });

  return {
    documents: documents.slice(0, 28),
    search: uniqueSearch,
    checked,
    urls: seenHref,
  };
}

export function citationUrls(data) {
  const copy = data && typeof data === "object" ? JSON.parse(JSON.stringify(data)) : {};
  const message = copy?.choices?.[0]?.message;
  if (message && "content" in message) delete message.content;
  return harvestUrls(copy);
}

function harvestUrls(value, found = new Set()) {
  if (typeof value === "string") {
    for (const match of value.match(/https?:\/\/[^\s"'<>\\]+/g) || []) {
      const href = match.replace(/[),.;\]]+$/, "");
      try {
        if (hostAllowed(href)) found.add(canonicalUrl(href));
      } catch {
        // Un frammento che sembra un URL non entra tra le pagine ammesse.
      }
    }
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => harvestUrls(item, found));
    return found;
  }
  if (value && typeof value === "object") Object.values(value).forEach((item) => harvestUrls(item, found));
  return found;
}

function needsReading(document) {
  const summary = document.summary || "";
  if (/Vai al menu principale/.test(summary)) return true;
  if (summary.length >= 220 && /codice tributo|imposta da versare|omessa presentazione/i.test(summary)) return false;
  return summary.length < 220;
}

function actText(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (/Vai al menu principale|Pensione e Previdenza Pensione/.test(text)) return "";
  if (text.length < 80) return "";
  const opening = text.slice(0, 420);
  const codeAt = text.search(/codice tributo:\s*[•\s]*[“"']?\d{4}|[“"']9005[”"']/i);
  const codes = codeAt > 0 ? text.slice(Math.max(0, codeAt - 40), codeAt + 1100) : "";
  const conclusionAt = text.search(/si ritiene che|deve concludersi/i);
  const conclusion = conclusionAt > 0 ? text.slice(Math.max(0, conclusionAt - 220), conclusionAt + 380) : "";
  return [opening, codes, conclusion]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2200);
}

async function readActs(documents) {
  const targets = documents.filter((document) => needsReading(document)).slice(0, 6);
  await Promise.all(
    targets.map(async (document) => {
      try {
        const response = await fetch(preferHttps(document.href), {
          signal: AbortSignal.timeout(20000),
          headers: { "User-Agent": UA, Accept: "application/pdf,text/html,*/*" },
        });
        if (!response.ok) return;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 200 || buffer.length > 5_000_000) return;
        const type = response.headers.get("content-type") || "";
        let text = "";
        if (type.includes("pdf") || buffer.subarray(0, 5).toString() === "%PDF-") {
          const { extractText } = await import("unpdf");
          const extracted = await extractText(new Uint8Array(buffer), { mergePages: true });
          text = extracted.text;
        } else {
          text = buffer
            .toString("utf8")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ");
        }
        const act = actText(text);
        if (act) document.summary = act;
      } catch {
        // Resta il sommario del feed se l'atto non si apre.
      }
    })
  );
}

export async function confirmUrls(hrefs) {
  const unique = [...new Set(hrefs)].slice(0, 12);
  const checks = await Promise.all(
    unique.map(async (href) => {
      try {
        const response = await fetch(preferHttps(href), {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": UA, Accept: "text/html,application/pdf,*/*" },
        });
        await response.body?.cancel();
        return response.status >= 200 && response.status < 400 ? canonicalUrl(href) : "";
      } catch {
        return "";
      }
    })
  );
  return checks.filter(Boolean);
}

export function messageText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part?.text || part?.content || "").join("\n");
  return "";
}
