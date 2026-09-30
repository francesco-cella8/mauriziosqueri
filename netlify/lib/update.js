import { getStore } from "@netlify/blobs";
import { buildReport, knownTitles, parseModelJson, shouldRun } from "./shape.js";

const STORE = "novita";
const LOCK_MS = 15 * 60 * 1000;

const SYSTEM = `Sei il redattore del resoconto fiscale dello studio di Maurizio Squeri, tributarista.
Cerchi novità degli ultimi tre giorni utili allo studio e ai suoi clienti.
Rispondi solo con un oggetto JSON, senza testo intorno e senza markdown.`;

function prompt(titles) {
  const already = titles.length ? titles.map((title) => `- ${title}`).join("\n") : "- nessuna";
  return `Controlla solo queste fonti: Agenzia delle Entrate, FiscoOggi, Gazzetta Ufficiale, MEF, Normattiva, INPS, Agenzia delle Entrate-Riscossione.

Temi utili: scadenze e versamenti, dichiarazioni, IVA, ritenute e lavoro, società e azienda, controlli e cartelle.

Segnalazioni già pubblicate, da non ripetere nemmeno con un titolo diverso:
${already}

Restituisci questo JSON:
{
  "status": "novita oppure invariato",
  "recap": "due o tre frasi in italiano",
  "items": [
    {
      "title": "stringa",
      "area": "Scadenze oppure Dichiarazioni oppure IVA oppure Lavoro e ritenute oppure Società oppure Controlli",
      "audience": "Per lo studio oppure Per i clienti oppure Per lo studio e per i clienti",
      "recap": "che cosa cambia, per chi, e la data se c'è",
      "links": [{ "label": "nome della fonte", "href": "url https della pagina trovata" }]
    }
  ],
  "sources": [{ "label": "nome", "href": "url https della fonte controllata" }]
}

Se non c'è nulla di nuovo, status è "invariato", items è [] e sources elenca le pagine controllate.
Ogni href deve uscire dalla ricerca. Non inventare URL.`;
}

async function askOpenRouter(titles) {
  const key = process.env.OPENROUTER_API_KEY;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(110000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.URL || "https://netlify.app",
      "X-Title": "Studio Squeri",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt(titles) },
      ],
      tools: [
        {
          type: "openrouter:web_search",
          parameters: {
            engine: "exa",
            max_results: 5,
            max_uses: 4,
            max_total_results: 12,
            search_context_size: "low",
            allowed_domains: [
              "agenziaentrate.gov.it",
              "fiscooggi.it",
              "gazzettaufficiale.it",
              "mef.gov.it",
              "normattiva.it",
              "inps.it",
              "agenziaentrateriscossione.gov.it",
            ],
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
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter non ha restituito un resoconto");
  return parseModelJson(content);
}

export async function runUpdate(now = new Date()) {
  if (!process.env.OPENROUTER_API_KEY) return { status: "missing-key" };

  const store = getStore(STORE);
  const archive = (await store.get("archivio", { type: "json" })) || { briefings: [], lastRun: null };
  if (!shouldRun(archive, now.getTime())) return { status: "wait" };

  const lock = await store.get("lock");
  if (lock && now.getTime() - Date.parse(lock) < LOCK_MS) return { status: "locked" };
  await store.set("lock", now.toISOString());

  try {
    const titles = (archive.briefings || []).flatMap((report) => (report.items || []).map((item) => item.title));
    const raw = await askOpenRouter(titles);
    const previous = archive.briefings?.[0];
    const report = buildReport(raw, {
      known: knownTitles(archive.briefings),
      now,
      previousLabel: previous?.dateLabel || "",
    });
    const next = {
      lastRun: now.toISOString(),
      briefings: [report, ...(archive.briefings || [])].slice(0, 8),
    };
    await store.setJSON("archivio", next);
    return { status: "saved", id: report.id, items: report.items.length };
  } finally {
    await store.delete("lock");
  }
}
