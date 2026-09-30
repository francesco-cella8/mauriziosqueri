import { getStore } from "@netlify/blobs";
import { citationUrls, collectDocuments, confirmUrls, messageText } from "./feeds.js";
import {
  INTERVAL_MS,
  buildReport,
  canonicalUrl,
  dateId,
  knownLinks,
  knownTitles,
  longLabel,
  needsAnotherPass,
  parseModelJson,
  romeParts,
  shouldRun,
} from "./shape.js";

const STORE = "novita";
const LOCK_MS = 15 * 60 * 1000;

const SYSTEM = `Sei il redattore del resoconto fiscale dello studio di Maurizio Squeri, tributarista.
Lo studio segue contabilità, bilanci, adempimenti, IVA, società e azienda, oltre ai tributi.
Rispondi solo con un oggetto JSON, senza testo intorno e senza markdown.
Non inventare norme, date o URL.`;

function prompt({ titles, documents, search, fromLabel, toLabel, year }) {
  const already = titles.length ? titles.map((title) => `- ${title}`).join("\n") : "- nessuna";
  const docs = documents.length
    ? documents
        .map((doc, index) => `${index + 1}. ${doc.label} | ${doc.date} | ${doc.title} | ${doc.summary || "senza sommario"} | ${doc.href}`)
        .join("\n")
    : "- nessuno";
  const extra = search.map((source) => `- ${source.label} (${source.domain})`).join("\n");
  return `Finestra utile: dal ${fromLabel} al ${toLabel}.

Temi: scadenze e versamenti, dichiarazioni, IVA, ritenute, contributi che cambiano un adempimento, società e azienda, controlli e cartelle.
Lascia fuori concorsi, assunzioni, pensioni, titoli di Stato e pagine che non cambiano un adempimento dello studio o di un cliente.
Una guida stabile o una regola già in vigore prima del ${year} non è una novità.

Documenti già letti dai feed ufficiali. Puoi usarne solo questi, copiando l'URL così com'è:
${docs}

Cerca ancora, una volta per fonte e solo in questa finestra, qui:
${extra}

Segnalazioni già pubblicate, da non ripetere nemmeno con un titolo diverso:
${already}

Se il titolo del documento è solo un numero di circolare o di messaggio, scrivi un titolo che dica che cosa cambia.
Restituisci fino a cinque novità distinte. Se non ce ne sono, status è "invariato" e items è [].

{
  "status": "novita oppure invariato",
  "recap": "due o tre frasi in italiano",
  "items": [
    {
      "title": "stringa",
      "area": "Scadenze oppure Dichiarazioni oppure IVA oppure Lavoro e ritenute oppure Società oppure Controlli",
      "audience": "Per lo studio oppure Per i clienti oppure Per lo studio e per i clienti",
      "recap": "che cosa cambia, per chi, e la data se c'è",
      "links": [{ "label": "nome della fonte", "href": "url https della pagina" }]
    }
  ]
}

Ogni href è uno degli URL sopra oppure una pagina trovata dalla ricerca. Mai la home del sito. Non inventare URL.`;
}

function urlsInReport(raw) {
  const hrefs = [];
  for (const item of raw?.items || []) {
    for (const link of item?.links || []) {
      if (link?.href) hrefs.push(link.href);
    }
  }
  return hrefs;
}

async function askOpenRouter({ titles, documents, search, fromLabel, toLabel, year }) {
  const key = process.env.OPENROUTER_API_KEY;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(180000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.URL || "https://netlify.app",
      "X-Title": "Studio Squeri",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
      temperature: 0.1,
      max_tokens: 2200,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt({ titles, documents, search, fromLabel, toLabel, year }) },
      ],
      tools: [
        {
          type: "openrouter:web_search",
          parameters: {
            engine: "exa",
            max_results: 5,
            max_uses: search.length,
            max_total_results: search.length * 4,
            search_context_size: "medium",
            allowed_domains: search.map((source) => source.domain),
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = messageText(data?.choices?.[0]?.message?.content);
  if (!content) throw new Error("OpenRouter non ha restituito un resoconto");
  return { raw: parseModelJson(content), data };
}

function windowStart(archive, now) {
  const nowMs = now.getTime();
  const last = Date.parse(archive?.lastRun || "");
  if (needsAnotherPass(archive, now) || Number.isNaN(last)) return nowMs - 7 * 24 * 60 * 60 * 1000;
  return Math.max(last - 12 * 60 * 60 * 1000, nowMs - 14 * 24 * 60 * 60 * 1000);
}

export async function runUpdate(now = new Date()) {
  if (!process.env.OPENROUTER_API_KEY) return { status: "missing-key" };

  const store = getStore(STORE);
  const archive = (await store.get("archivio", { type: "json" })) || { briefings: [], lastRun: null };
  if (!shouldRun(archive, now.getTime()) && !needsAnotherPass(archive, now)) return { status: "wait" };

  const lock = await store.get("lock");
  if (lock && now.getTime() - Date.parse(lock) < LOCK_MS) return { status: "locked" };
  await store.set("lock", now.toISOString());

  try {
    const today = romeParts(now);
    const history = archive.briefings || [];
    const start = windowStart(archive, now);
    const packet = await collectDocuments(start);
    const { raw, data } = await askOpenRouter({
      titles: history.flatMap((report) => (report.items || []).map((item) => item.title)),
      documents: packet.documents,
      search: packet.search,
      fromLabel: longLabel(romeParts(from)),
      toLabel: longLabel(today),
      year: today.year,
    });

    const seen = new Set(packet.urls);
    citationUrls(data).forEach((href) => seen.add(href));
    const missing = urlsInReport(raw).filter((href) => {
      try {
        return !seen.has(canonicalUrl(href));
      } catch {
        return false;
      }
    });
    (await confirmUrls(missing)).forEach((href) => seen.add(href));

    const report = buildReport(raw, {
      known: knownTitles(history),
      knownHrefs: knownLinks(history),
      seen,
      sources: packet.checked,
      now,
      previousLabel: history.find((item) => item.id !== dateId(today))?.dateLabel || "",
    });
    const next = {
      lastRun: now.toISOString(),
      briefings: [report, ...history.filter((item) => item.id !== report.id)].slice(0, 8),
    };
    await store.setJSON("archivio", next);
    return { status: "saved", id: report.id, items: report.items.length, documents: packet.documents.length };
  } finally {
    await store.delete("lock");
  }
}
