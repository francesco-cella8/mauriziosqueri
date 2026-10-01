import { getStore } from "@netlify/blobs";
import { baselineBriefings } from "./baseline.js";
import { citationUrls, collectDocuments, confirmUrls, messageText } from "./feeds.js";
import {
  LOOKBACK_MS,
  buildReport,
  canonicalUrl,
  dateId,
  knownLinks,
  knownTitles,
  longLabel,
  needsAnotherPass,
  parseModelJson,
  reviewDraft,
  romeParts,
  shouldRun,
} from "./shape.js";

const STORE = "novita";
const LOCK_MS = 15 * 60 * 1000;

const SYSTEM = `Sei il redattore del resoconto fiscale dello studio del dott. Maurizio Squeri, tributarista.
Lo studio segue contabilità e fisco delle imprese, locazioni, pratiche camerali, aziende agricole e forestali, appalti, portali per le gare, bandi regionali e dichiarazioni dei privati, oltre ai tributi.
Rispondi solo con un oggetto JSON, senza testo intorno e senza markdown.
Non inventare norme, date o URL.`;

function prompt({ titles, documents, search, fromLabel, toLabel, year }) {
  const already = titles.length ? titles.map((title) => `- ${title}`).join("\n") : "- nessuna";
  const docs = documents.length
    ? documents
        .map((doc, index) => `${index + 1}. ${doc.label} | ${doc.date} | ${doc.title} | ${doc.summary || "senza sommario"} | ${doc.href}`)
        .join("\n")
    : "- nessuno";
  const extra = search.length
    ? `Cerca ancora, una volta per fonte e solo in questa finestra, qui:
${search.map((source) => `- ${source.label} (${source.domain})`).join("\n")}

Usa la ricerca solo se trovi un atto nuovo della finestra. Non usarla per riscrivere il calendario fiscale.`
    : "Non hai altre fonti: usa solo i documenti elencati.";
  return `Finestra utile: dal ${fromLabel} al ${toLabel}.

Una novità è un atto di questa finestra: risoluzione, circolare, provvedimento, decreto, messaggio o interpello.
Nel recap riporta solo fatti presenti nel testo del documento: il caso, chi è toccato, che cosa versa o comunica, il termine e il codice tributo scritto nel testo, copiato com'è.
Se l'atto istituisce più codici, scrivi a che cosa serve ciascuno. Non limitarli a un elenco.
Se è un interpello, inseriscilo: racconta la conclusione dell'Agenzia, non la tesi di chi ha fatto la domanda, e precisa che vale per quel caso. Audience è "Per lo studio". Area è "Dichiarazioni" se riguarda una comunicazione o una dichiarazione, "Società" se riguarda partecipazioni o società.
I codici F24 che lo studio usa per un cliente sono "Per lo studio e per i clienti".
Assegna "rilevanza":
- altissima, se cambia un versamento o un adempimento per molti clienti
- alta, se cambia un caso che lo studio incontra spesso
- media, se il parere è riusabile ma il caso è circoscritto
- bassa, se serve solo per un settore o un ente nominato
Se dal testo non si capisce che cosa fare, non inserire la scheda.

Non è una novità, e non va inserita:
- il versamento mensile di ritenute, IVA, contributi o INPS
- una scadenza che cade comunque ogni mese o ogni trimestre
- una regola già in vigore prima del ${year}, anche se la ricordi per quest'anno
- una pagina che dice «confermate», «scadenze ordinarie» o «già previsto»

Se l'atto vale solo per gli iscritti a un ente o a una convenzione nominata, audience è "Per lo studio".
I contributi e i codici INPS vanno in "Lavoro e ritenute". I codici e le liquidazioni IVA vanno in "IVA".

Documenti già letti dai feed ufficiali. Copiane l'URL così com'è:
${docs}

${extra}

Segnalazioni già pubblicate, da non ripetere nemmeno con un titolo diverso:
${already}

Se il titolo del documento è solo un numero di circolare o di messaggio, scrivi un titolo che dica che cosa cambia.
Restituisci fino a otto novità distinte, le più rilevanti. Se non ce ne sono, status è "invariato" e items è [].
Nel recap generale, due o tre frasi: prima che cosa fare, poi i pareri, poi ciò che vale solo per un cliente preciso. Non fare un elenco di titoli.

{
  "status": "novita oppure invariato",
  "recap": "due o tre frasi in italiano",
  "items": [
    {
      "title": "stringa",
      "area": "Scadenze oppure Dichiarazioni oppure IVA oppure Lavoro e ritenute oppure Società oppure Controlli",
      "audience": "Per lo studio oppure Per i clienti oppure Per lo studio e per i clienti",
      "rilevanza": "altissima oppure alta oppure media oppure bassa",
      "recap": "che cosa cambia, per chi, e la data se c'è",
      "links": [{ "label": "nome della fonte", "href": "url https della pagina" }]
    }
  ]
}

Ogni href è uno degli URL sopra${search.length ? " oppure una pagina trovata dalla ricerca" : ""}. Mai la home del sito. Non inventare URL.`;
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

export function resolveModel() {
  const base = String(process.env.NOVITA_BASE_URL || "").trim().replace(/\/$/, "");
  if (base) {
    return {
      url: `${base}/chat/completions`,
      key: process.env.NOVITA_API_KEY || "locale",
      model: process.env.NOVITA_MODEL || "llama3.1",
      search: false,
    };
  }
  const key = process.env.OPENROUTER_API_KEY || "";
  if (!key) return null;
  return {
    url: "https://openrouter.ai/api/v1/chat/completions",
    key,
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
    search: true,
  };
}

async function askModel({ titles, documents, search, fromLabel, toLabel, year, model, notes = [] }) {
  const body = {
    model: model.model,
    temperature: 0.1,
    max_tokens: 2200,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${prompt({ titles, documents, search, fromLabel, toLabel, year })}${
          notes.length
            ? `\n\nLa bozza precedente non è pubblicabile:\n${notes.map((note) => `- ${note}`).join("\n")}\nRiscrivi solo il JSON, correggendo questi punti.`
            : ""
        }`,
      },
    ],
  };
  if (model.search && search.length) {
    body.tools = [
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
    ];
  }

  const headers = {
    Authorization: `Bearer ${model.key}`,
    "Content-Type": "application/json",
  };
  if (model.search) {
    headers["HTTP-Referer"] = process.env.URL || "https://netlify.app";
    headers["X-Title"] = "Studio Squeri";
  }

  const response = await fetch(model.url, {
    method: "POST",
    signal: AbortSignal.timeout(180000),
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Modello ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = messageText(data?.choices?.[0]?.message?.content);
  if (!content) throw new Error("Il modello non ha restituito un resoconto");
  return { raw: parseModelJson(content), data };
}

async function assembleReport({ now, history, start, model }) {
  const today = romeParts(now);
  const packet = await collectDocuments(start);
  const seen = new Set(packet.urls);

  async function compose(notes) {
    const { raw, data } = await askModel({
      titles: history.flatMap((report) => (report.items || []).map((item) => item.title)),
      documents: packet.documents,
      search: model.search && packet.documents.length === 0 ? packet.search : [],
      fromLabel: longLabel(romeParts(new Date(start))),
      toLabel: longLabel(today),
      year: today.year,
      model,
      notes,
    });
    const allowed = new Set(seen);
    citationUrls(data).forEach((href) => allowed.add(href));
    const missing = urlsInReport(raw).filter((href) => {
      try {
        return !allowed.has(canonicalUrl(href));
      } catch {
        return false;
      }
    });
    (await confirmUrls(missing)).forEach((href) => allowed.add(href));
    return buildReport(raw, {
      known: knownTitles(history),
      knownHrefs: knownLinks(history),
      seen: allowed,
      sources: packet.checked,
      now,
      previousLabel: history.find((item) => item.id !== dateId(today))?.dateLabel || "",
    });
  }

  const first = await compose([]);
  const firstNotes = reviewDraft(first, packet.documents);
  if (!firstNotes.length) return { report: first, documents: packet.documents.length, notes: [] };
  const second = await compose(firstNotes);
  const secondNotes = reviewDraft(second, packet.documents);
  const report = secondNotes.length < firstNotes.length ? second : first;
  const notes = secondNotes.length < firstNotes.length ? secondNotes : firstNotes;
  return { report, documents: packet.documents.length, notes };
}

export async function draftReport({ now = new Date(), history = [] } = {}) {
  const model = resolveModel();
  if (!model) {
    const error = new Error("Manca OPENROUTER_API_KEY oppure NOVITA_BASE_URL");
    error.code = "missing-key";
    throw error;
  }
  const drafted = await assembleReport({
    now,
    history: history.length ? history : baselineBriefings,
    start: now.getTime() - LOOKBACK_MS,
    model,
  });
  return { ...drafted, model: model.model, search: model.search };
}

function windowStart(_archive, now) {
  return now.getTime() - LOOKBACK_MS;
}

function withBaseline(history) {
  const ids = new Set((history || []).map((item) => item.id));
  return [...(history || []), ...baselineBriefings.filter((item) => !ids.has(item.id))];
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
    const history = withBaseline(archive.briefings || []);
    const { report, documents } = await assembleReport({
      now,
      history,
      start: windowStart(archive, now),
      model: {
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
        search: true,
      },
    });
    const next = {
      lastRun: now.toISOString(),
      briefings: [report, ...history.filter((item) => item.id !== report.id)].slice(0, 12),
    };
    await store.setJSON("archivio", next);
    return { status: "saved", id: report.id, items: report.items.length, documents };
  } finally {
    await store.delete("lock");
  }
}
