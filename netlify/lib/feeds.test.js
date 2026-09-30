import assert from "node:assert/strict";
import test from "node:test";
import { parseFeedDate, parseRssItems, preferHttps, relevant } from "./feeds.js";

const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Prova</title>
    <item>
      <title><![CDATA[Risoluzione n. 34 &amp; codici tributo]]></title>
      <link>http://www.gazzettaufficiale.it/eli/id/2026/09/29/26G00188/SG</link>
      <description>Misure fiscali sul versamento.</description>
      <pubDate>Tue, 29 Sep 2026 18:28:44 GMT</pubDate>
    </item>
    <item>
      <title>Circolare numero 104 del 29-09-2026</title>
      <description>Assegno di accompagnamento alla pensione.</description>
      <link>https://www.inps.it/it/it/inps-comunica/atti/circolare-104.html</link>
      <pubdate>29/09/2026</pubdate>
    </item>
    <item>
      <title>Blog</title>
      <link>https://esempio.it/notizia</link>
      <pubDate>Tue, 29 Sep 2026 18:28:44 GMT</pubDate>
    </item>
  </channel>
</rss>`;

test("legge titolo, data e link di un feed", () => {
  const items = parseRssItems(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Risoluzione n. 34 & codici tributo");
  assert.equal(items[0].href.startsWith("https://"), true);
  assert.equal(Number.isNaN(items[1].time), false);
  assert.equal(parseFeedDate("29/09/2026") > parseFeedDate("28/09/2026"), true);
});

test("tiene i tributi e lascia fuori pensioni, concorsi e titoli di Stato", () => {
  assert.equal(relevant("wide", "DECRETO-LEGGE", "Misure fiscali sul versamento IVA"), true);
  assert.equal(relevant("wide", "DECRETO-LEGGE", "Disposizioni in materia di società e trasferimento d'azienda"), true);
  assert.equal(relevant("wide", "Circolare numero 90", "Codice tributo per i contributi alla gestione separata"), true);
  assert.equal(
    relevant(
      "wide",
      "Circolare numero 104",
      "Assegno di accompagnamento alla pensione, decreto legislativo n. 148/2015, anzianità contributiva"
    ),
    false
  );
  assert.equal(relevant("wide", "COMMISSARIO STRAORDINARIO", "Attivazione dei poteri sostitutivi"), false);
  assert.equal(relevant("wide", "IVASS", "Schemi per il bilancio delle imprese di assicurazione"), false);
  assert.equal(relevant("desk", "Selezione pubblica per l'assunzione di funzionari", "Concorso"), false);
  assert.equal(relevant("desk", "Working Paper settembre 2026", "DF/WP 24/2026"), false);
  assert.equal(relevant("wide", "Titoli di Stato", "Programma trimestrale di emissione"), false);
  assert.equal(preferHttps("https://www.finanze.gov.it:443/it/rss.xml").includes(":443"), false);
});