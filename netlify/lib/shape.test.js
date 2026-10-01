import assert from "node:assert/strict";
import test from "node:test";
import { actCodes, buildReport, canonicalUrl, hostAllowed, isCurrent, isRoutine, needsAnotherPass, reviewDraft, shouldRun, specificPage } from "./shape.js";

test("un controllo recente non riparte", () => {
  const now = Date.parse("2026-10-02T05:00:00.000Z");
  assert.equal(shouldRun({ lastRun: "2026-10-01T05:00:00.000Z" }, now), false);
  assert.equal(shouldRun({ lastRun: "2026-09-28T05:00:00.000Z" }, now), true);
  assert.equal(shouldRun({ lastRun: null }, now), true);
});

test("scarta i link fuori dalle fonti e le segnalazioni già uscite", () => {
  const report = buildReport(
    {
      status: "novita",
      recap: "Due segnalazioni, una già nota.",
      items: [
        {
          title: "Secondo acconto",
          area: "Scadenze",
          audience: "Per i clienti",
          recap: "Già uscita.",
          links: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/" }],
        },
        {
          title: "Nuova scadenza IMU",
          area: "Scadenze",
          audience: "Per i clienti",
          recap: "Versamento entro il 16.",
          links: [{ label: "Blog", href: "https://esempio.it/notizia" }],
        },
        {
          title: "LIPE del terzo trimestre",
          area: "IVA",
          audience: "Per lo studio",
          recap: "La comunicazione si trasmette entro novembre.",
          links: [{ label: "FiscoOggi", href: "https://www.fiscooggi.it/imposta" }],
        },
      ],
      sources: [{ label: "FiscoOggi", href: "https://www.fiscooggi.it/" }],
    },
    {
      known: new Set(["secondo acconto"]),
      now: new Date("2026-10-03T08:00:00.000Z"),
      previousLabel: "30 settembre 2026",
    }
  );

  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].title, "LIPE del terzo trimestre");
  assert.equal(report.omitted.count, 1);
  assert.equal(report.omitted.since, "30 settembre 2026");
  assert.equal(report.status, "novita");
  assert.equal(hostAllowed("https://www1.agenziaentrate.gov.it/servizi/scadenzario/main.php"), true);
  assert.equal(hostAllowed("https://esempio.it/notizia"), false);
});

test("se resta solo materiale già noto, il resoconto dice che non c'è nulla di nuovo", () => {
  const report = buildReport(
    {
      status: "novita",
      recap: "Trovata una segnalazione.",
      items: [
        {
          title: "Secondo acconto",
          area: "Scadenze",
          audience: "Per i clienti",
          recap: "Già uscita.",
          links: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/" }],
        },
      ],
      sources: [],
    },
    { known: new Set(["secondo acconto"]), previousLabel: "30 settembre 2026" }
  );

  assert.equal(report.status, "invariato");
  assert.equal(report.items.length, 0);
  assert.match(report.recap, /Nessuna novità/);
  assert.equal(report.sources.length > 0, true);
});

test("una home non è una pagina di novità", () => {
  const report = buildReport(
    {
      status: "novita",
      recap: "Manca il documento.",
      items: [
        {
          title: "Comunicato senza pagina",
          area: "Controlli",
          audience: "Per i clienti",
          recap: "Il testo non indica un documento.",
          links: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/" }],
        },
      ],
    },
    { now: new Date("2026-10-03T08:00:00.000Z") }
  );

  assert.equal(specificPage("https://www.agenziaentrate.gov.it/portale/"), false);
  assert.equal(report.items.length, 0);
  assert.equal(report.status, "invariato");
});

test("tiene solo gli URL raccolti e non ripete una pagina già uscita", () => {
  const href = "https://www.fiscooggi.it/portale/rubrica/lipe";
  const key = canonicalUrl(href);
  const report = buildReport(
    {
      status: "novita",
      recap: "Due pagine, una già uscita.",
      items: [
        {
          title: "Pagina già pubblicata",
          area: "IVA",
          audience: "Per lo studio",
          recap: "Stesso documento.",
          links: [{ label: "FiscoOggi", href }],
        },
        {
          title: "Url non raccolto",
          area: "IVA",
          audience: "Per lo studio",
          recap: "Non risulta tra le pagine lette.",
          links: [{ label: "FiscoOggi", href: "https://www.fiscooggi.it/portale/rubrica/altra" }],
        },
      ],
    },
    {
      knownHrefs: new Set([key]),
      seen: new Set([key]),
      now: new Date("2026-10-03T08:00:00.000Z"),
      previousLabel: "30 settembre 2026",
    }
  );

  assert.equal(report.items.length, 0);
  assert.equal(report.omitted.count, 1);
});

test("il calendario ordinario e le regole solo confermate non entrano nel resoconto", () => {
  const now = new Date("2026-09-30T18:00:00.000Z");
  const report = buildReport(
    {
      status: "novita",
      recap: "Sono confermate le scadenze ordinarie e c'è una risoluzione.",
      items: [
        {
          title: "Versamenti ritenute settembre 2026",
          area: "Lavoro e ritenute",
          audience: "Per lo studio e per i clienti",
          recap: "I sostituti devono effettuare entro settembre 2026 il versamento delle ritenute operate.",
          links: [{ label: "FiscoOggi", href: "https://www.fiscooggi.it/portale/rubrica/ritenute" }],
        },
        {
          title: "Comunicazioni sui controlli",
          area: "Controlli",
          audience: "Per i clienti",
          recap: "Aggiornamenti dal 2025 confermati nel 2026 sulle sanzioni ridotte e la rateizzazione.",
          links: [{ label: "FiscoOggi", href: "https://www.fiscooggi.it/portale/rubrica/controlli" }],
        },
        {
          title: "Codici tributo per le comunicazioni IVA",
          area: "Controlli",
          audience: "Per lo studio e per i clienti",
          recap: "Dal 30 settembre 2026 la risoluzione istituisce i codici tributo per l'articolo 54-bis.1 del d.P.R. 633/1972.",
          links: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/risoluzione-34" }],
        },
        {
          title: "Codici SANL e EBON",
          area: "Controlli",
          audience: "Per lo studio e per i clienti",
          recap: "Circolare INPS del 25 settembre 2026: codice tributo SANL per i contributi SANILAV.",
          links: [{ label: "INPS", href: "https://www.inps.it/it/it/circolare-102.html" }],
        },
      ],
    },
    { now }
  );

  assert.equal(report.items.length, 2);
  assert.equal(report.items[0].area, "IVA");
  assert.equal(report.items[1].area, "Lavoro e ritenute");
  assert.equal(report.items[1].audience, "Per lo studio");
  assert.equal(isRoutine(report.recap), false);
  assert.match(report.recap, /Codici tributo/);
});

test("le schede escono dalla più rilevante", () => {
  const report = buildReport(
    {
      status: "novita",
      recap: "Due atti del 2026.",
      items: [
        {
          title: "Codice di un ente",
          area: "Lavoro e ritenute",
          audience: "Per lo studio",
          rilevanza: "bassa",
          recap: "Circolare del 25 settembre 2026 per un ente nominato.",
          links: [{ label: "INPS", href: "https://www.inps.it/it/it/circolare-ente" }],
        },
        {
          title: "Codici della dichiarazione omessa",
          area: "IVA",
          audience: "Per lo studio e per i clienti",
          rilevanza: "altissima",
          recap: "Risoluzione del 30 settembre 2026, codice 9005.",
          links: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/risoluzione-34" }],
        },
      ],
    },
    { now: new Date("2026-10-01T08:00:00.000Z") }
  );
  assert.equal(report.items[0].rilevanza, "altissima");
  assert.equal(report.items[1].rilevanza, "bassa");
});

test("una bozza senza il codice dell'atto non è pubblicabile", () => {
  const documents = [
    {
      title: "Risoluzione codici tributo",
      href: "https://www.agenziaentrate.gov.it/portale/risoluzione-34",
      summary: "Si istituisce il codice tributo “9005” per le dichiarazioni IVA omesse.",
    },
  ];
  const notes = reviewDraft(
    {
      items: [
        {
          title: "Recuperi IVA",
          recap: "Ci sono nuovi codici per i versamenti.",
          links: [{ href: documents[0].href }],
        },
      ],
    },
    documents
  );
  assert.equal(actCodes(documents[0].summary)[0], "9005");
  assert.match(notes.join(" "), /9005/);
});

test("una regola del 2024 non conta come novità del 2026", () => {
  const now = new Date("2026-09-30T18:00:00.000Z");
  const report = buildReport(
    {
      status: "novita",
      recap: "Dal 1° settembre 2024 cambia la sanzione.",
      items: [
        {
          title: "Nuove sanzioni dal 1° settembre 2024",
          area: "Controlli",
          audience: "Per i clienti",
          recap: "La sanzione è del 25% dal 2024.",
          links: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/novita/sanzioni" }],
        },
        {
          title: "Scadenza del 30 settembre 2026",
          area: "Scadenze",
          audience: "Per i clienti",
          recap: "Il modello 730 si presenta entro il 30 settembre 2026.",
          links: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/novita/730" }],
        },
      ],
      sources: [{ label: "Agenzia", href: "https://www.agenziaentrate.gov.it/portale/novita" }],
    },
    { known: new Set(), now }
  );

  assert.equal(isCurrent("sanzione dal 2024", now), false);
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].title, "Scadenza del 30 settembre 2026");
  assert.equal(
    needsAnotherPass(
      {
        briefings: [
          {
            recap: "Dal 2024",
            items: [{ title: "Sanzioni 2024", recap: "Vecchia regola" }],
          },
        ],
      },
      now
    ),
    true
  );
});
