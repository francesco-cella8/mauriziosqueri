/** Resoconti di esempio. Il controllo automatico li sostituirà con lo stesso formato. */
export const briefings = [
  {
    id: "2026-09-30",
    dateLabel: "30 settembre 2026",
    shortLabel: "30 settembre",
    nextLabel: "3 ottobre 2026",
    status: "novita",
    recap:
      "Quattro segnalazioni nuove: il secondo acconto di novembre, l’invio di Redditi e IRAP, l’annotazione dell’IVA e le comunicazioni dell’Agenzia.",
    omitted: {
      count: 2,
      since: "24 settembre 2026",
    },
    items: [
      {
        id: "acconto-novembre-2026",
        area: "Scadenze",
        audience: "Per i clienti",
        title: "Secondo acconto entro il 30 novembre",
        recap:
          "IRPEF, IRES, IRAP e l’imposta sostitutiva dei forfettari si versano entro il 30 novembre, in unica soluzione. L’importo è quello che risulta dalla dichiarazione: il resoconto ricorda solo la data e chi deve versare.",
        links: [
          {
            label: "Scadenzario, Agenzia delle Entrate",
            href: "https://www1.agenziaentrate.gov.it/servizi/scadenzario/main.php",
          },
        ],
      },
      {
        id: "redditi-2-novembre-2026",
        area: "Dichiarazioni",
        audience: "Per lo studio",
        title: "Redditi, IRAP e 770 al 2 novembre",
        recap:
          "Il 31 ottobre cade di sabato e il 1° novembre è festivo. L’invio telematico di Redditi, IRAP e 770, insieme all’adesione al concordato preventivo biennale 2026-2027, si sposta a lunedì 2 novembre.",
        links: [
          {
            label: "Agenzia delle Entrate",
            href: "https://www.agenziaentrate.gov.it/portale/",
          },
          {
            label: "FiscoOggi",
            href: "https://www.fiscooggi.it/",
          },
        ],
      },
      {
        id: "iva-annotazione-biennale",
        area: "IVA",
        audience: "Per lo studio e per i clienti",
        title: "Annotazione degli acquisti entro il secondo anno",
        recap:
          "La detrazione dell’IVA sugli acquisti può essere esercitata, al più tardi, con la dichiarazione del secondo anno successivo a quello in cui il diritto è sorto. Una fattura ricevuta a cavallo d’anno si legge sulla data di ricezione, non su quella dell’operazione.",
        links: [
          {
            label: "D.P.R. 633/1972, Normattiva",
            href: "https://www.normattiva.it/eli/id/1972/11/11/072U0633/CONSOLIDATED",
          },
        ],
      },
      {
        id: "compliance-data-notifica",
        area: "Controlli",
        audience: "Per i clienti",
        title: "Una comunicazione si legge dalla data di notifica",
        recap:
          "Lettere di compliance, avvisi bonari e cartelle si portano in studio con la busta. Contano la data di notifica, l’annualità e il termine indicato per pagare o rispondere. Il testo della lettera decide il passo successivo.",
        links: [
          {
            label: "Agenzia delle Entrate — comunicazioni",
            href: "https://www.agenziaentrate.gov.it/portale/",
          },
          {
            label: "Agenzia delle Entrate-Riscossione",
            href: "https://www.agenziaentrateriscossione.gov.it/",
          },
        ],
      },
    ],
    sources: [
      { label: "Agenzia delle Entrate", href: "https://www.agenziaentrate.gov.it/portale/" },
      { label: "FiscoOggi", href: "https://www.fiscooggi.it/" },
      { label: "Gazzetta Ufficiale", href: "https://www.gazzettaufficiale.it/" },
      { label: "MEF", href: "https://www.mef.gov.it/" },
      { label: "Normattiva", href: "https://www.normattiva.it/" },
      { label: "INPS", href: "https://www.inps.it/" },
    ],
  },
  {
    id: "2026-09-27",
    dateLabel: "27 settembre 2026",
    shortLabel: "27 settembre",
    nextLabel: "30 settembre 2026",
    status: "invariato",
    recap:
      "Nessuna novità. Il controllo del 27 settembre ha riletto le stesse fonti del 24 settembre e non ha trovato segnalazioni diverse. Quelle già uscite non vengono riscritte.",
    omitted: null,
    items: [],
    sources: [
      { label: "Agenzia delle Entrate", href: "https://www.agenziaentrate.gov.it/portale/" },
      { label: "FiscoOggi", href: "https://www.fiscooggi.it/" },
      { label: "Gazzetta Ufficiale", href: "https://www.gazzettaufficiale.it/" },
      { label: "MEF", href: "https://www.mef.gov.it/" },
      { label: "Normattiva", href: "https://www.normattiva.it/" },
      { label: "INPS", href: "https://www.inps.it/" },
    ],
  },
  {
    id: "2026-09-24",
    dateLabel: "24 settembre 2026",
    shortLabel: "24 settembre",
    nextLabel: "27 settembre 2026",
    status: "novita",
    recap:
      "Due segnalazioni nuove: la LIPE del secondo trimestre e il valore dell’auto aziendale in uso promiscuo. Sono la base dei controlli successivi. Se un controllo le ritrova uguali, non le ripete.",
    omitted: null,
    items: [
      {
        id: "lipe-q2-2026",
        area: "IVA",
        audience: "Per lo studio",
        title: "LIPE del secondo trimestre",
        recap:
          "La comunicazione delle liquidazioni periodiche IVA del secondo trimestre si trasmette entro il 30 settembre, insieme al versamento dell’imposta di bollo sulle fatture elettroniche dello stesso trimestre.",
        links: [
          {
            label: "Agenzia delle Entrate",
            href: "https://www.agenziaentrate.gov.it/portale/",
          },
        ],
      },
      {
        id: "auto-uso-promiscuo",
        area: "Lavoro e ritenute",
        audience: "Per lo studio e per i clienti",
        title: "Auto aziendale: il valore si legge sull’anzianità del veicolo",
        recap:
          "Per l’auto concessa in uso promiscuo il fringe benefit non dipende più solo dal momento dell’assegnazione. Dal 1° gennaio dell’anno successivo al quinto di immatricolazione il valore convenzionale aumenta del 50 per cento. Gli accessori non presenti nelle tabelle ACI aggiungono un 5 per cento, al netto di quanto già trattenuto al dipendente.",
        links: [
          {
            label: "TUIR, Normattiva",
            href: "https://www.normattiva.it/eli/id/1986/12/31/086U0917/CONSOLIDATED",
          },
          {
            label: "FiscoOggi",
            href: "https://www.fiscooggi.it/",
          },
        ],
      },
    ],
    sources: [
      { label: "Agenzia delle Entrate", href: "https://www.agenziaentrate.gov.it/portale/" },
      { label: "FiscoOggi", href: "https://www.fiscooggi.it/" },
      { label: "Gazzetta Ufficiale", href: "https://www.gazzettaufficiale.it/" },
      { label: "Normattiva", href: "https://www.normattiva.it/" },
    ],
  },
];
