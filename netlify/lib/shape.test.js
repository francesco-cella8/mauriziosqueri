import assert from "node:assert/strict";
import test from "node:test";
import { buildReport, hostAllowed, shouldRun } from "./shape.js";

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
