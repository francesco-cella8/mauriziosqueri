const sources = [
  { label: "Agenzia delle Entrate", href: "https://www.agenziaentrate.gov.it/portale/" },
  { label: "FiscoOggi", href: "https://www.fiscooggi.it/" },
  { label: "Gazzetta Ufficiale", href: "https://www.gazzettaufficiale.it/" },
  { label: "Dipartimento delle Finanze", href: "https://www.finanze.gov.it/it/" },
  { label: "MEF", href: "https://www.mef.gov.it/" },
  { label: "INPS", href: "https://www.inps.it/" },
  { label: "Agenzia delle Entrate-Riscossione", href: "https://www.agenziaentrateriscossione.gov.it/" },
];

/** Quadro letto sugli atti ufficiali dal 1 agosto al 1 ottobre 2026, senza modello. */
export const baselineBriefings = [
  {
    id: "quadro-agosto-ottobre-2026",
    dateLabel: "Dal 1 agosto al 1 ottobre 2026",
    shortLabel: "Due mesi",
    nextLabel: "4 ottobre 2026",
    status: "novita",
    recap:
      "Prima i codici da usare in studio: la dichiarazione IVA omessa e il ravvedimento di successioni e donazioni. Poi i pareri su società, DURF e comunicazioni. In fondo solo ciò che serve se c’è quel cliente: pesca, servizi digitali, colocation, enti bilaterali.",
    omitted: null,
    items: [
      {
        id: "risoluzione-34-iva-omessa",
        area: "IVA",
        audience: "Per lo studio e per i clienti",
        rilevanza: "altissima",
        title: "Dichiarazione IVA omessa: i codici per pagare la liquidazione",
        recap:
          "Con la risoluzione n. 34/E del 30 settembre 2026, se manca la dichiarazione IVA annuale l’Agenzia può liquidare l’imposta e comunicarla. Il contribuente ha sessanta giorni per segnalare errori. Sull’F24 precompilato l’importo complessivo si versa con il codice 9005, in Erario, con il codice atto e l’anno indicati nella comunicazione. Se si paga solo una quota, 95AA è l’imposta, 95BB gli interessi e 95CC le sanzioni.",
        links: [
          {
            label: "Risoluzione n. 34/E del 30 settembre 2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289077/Risoluzione_34E/2b1e7e0b-ff99-25c3-edd4-c36593649f15",
          },
        ],
      },
      {
        id: "risoluzione-30-successioni",
        area: "Dichiarazioni",
        audience: "Per lo studio e per i clienti",
        rilevanza: "alta",
        title: "Successioni e donazioni: codici F24 per il ravvedimento",
        recap:
          "La risoluzione n. 30/E del 16 settembre 2026 istituisce i codici F24 per ravvedimento e riliquidazione dell’imposta di successione, dell’imposta sulle donazioni e delle tasse ipotecarie e catastali. In Erario si indicano codice ufficio, codice atto e anno dell’atto. Per l’erede, il codice fiscale del defunto va nel campo del coobbligato con il codice identificativo 08. La tabella dei singoli codici è nel PDF.",
        links: [
          {
            label: "Risoluzione n. 30/E del 16 settembre 2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289077/RIS_n_30_del_16_09_2026/d68b296a-7dfd-a1fe-e714-8085e07d1a36",
          },
        ],
      },
      {
        id: "durf-versamenti-f24",
        area: "Controlli",
        audience: "Per lo studio e per i clienti",
        rilevanza: "alta",
        title: "DURF: anche gli avvisi pagati con F24 contano nel 10 per cento",
        recap:
          "Nella risposta n. 174 del 16 settembre 2026 l’Agenzia dice che, per il requisito del DURF, i versamenti F24 delle comunicazioni di irregolarità e degli avvisi da controllo automatizzato entrano nel 10 per cento dei versamenti registrati nel conto fiscale. Vale per il caso chiesto dall’istante: sono i pagamenti che dimostrano di avere messo in regola la posizione.",
        links: [
          {
            label: "Risposta n. 174 del 16 settembre 2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289089/Risposta+n.+174_2026/bce7d1e2-7904-fd95-4e23-0ebf62682266",
          },
        ],
      },
      {
        id: "stp-sta-trasparenza",
        area: "Società",
        audience: "Per lo studio",
        rilevanza: "alta",
        title: "STP e STA in società semplice: la deroga sugli utili dei professionisti",
        recap:
          "Il principio di diritto n. 3 del 23 settembre 2026 applica la deroga dell’articolo 5, comma 3, lettera c), del TUIR alle quote di utile dei soci professionisti delle STP e delle STA costituite come società semplice. Non vale per ogni società che esercita un’attività professionale.",
        links: [
          {
            label: "Principio di diritto n. 3/2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289085/Principio+di+diritto+3_2026/944b0c84-4f36-a294-2b31-67b83bcf4db6",
          },
        ],
      },
      {
        id: "conferimento-societa-semplice",
        area: "Società",
        audience: "Per lo studio",
        rilevanza: "alta",
        title: "Conferimento di quote in una società semplice: niente realizzo controllato",
        recap:
          "Nella risposta n. 176 del 21 settembre 2026 l’Agenzia esclude, per il conferimento descritto nell’istanza, il realizzo controllato dell’articolo 177 del TUIR. La società semplice non ha l’obbligo di bilancio che misuri quel valore. Si usa il valore normale dell’articolo 9 del TUIR. È la conclusione su quel conferimento.",
        links: [
          {
            label: "Risposta n. 176 del 21 settembre 2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289089/Risposta+n.+176_2026/7850ca08-e8c9-b1b6-27ec-ae41d013b56d",
          },
        ],
      },
      {
        id: "interpello-spese-sanitarie",
        area: "Dichiarazioni",
        audience: "Per lo studio",
        rilevanza: "media",
        title: "Spese sanitarie di un ente bilaterale: niente comunicazione",
        recap:
          "Nella risposta n. 178 del 30 settembre 2026 l’Agenzia conclude che, per l’ente che ha fatto la domanda, le spese sanitarie rimborsate restano a carico dei lavoratori: il contributo aziendale non è un beneficio fiscale e la quota del lavoratore non è deducibile. Quell’ente non deve inviare la comunicazione dell’articolo 78, comma 25-bis, della legge n. 413/1991. Non è una regola per ogni ente bilaterale.",
        links: [
          {
            label: "Risposta n. 178 del 30 settembre 2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289089/Risposta+n.+178_2026/35fb5eea-40dd-a8f3-8d22-750f5391b5aa",
          },
        ],
      },
      {
        id: "imposta-servizi-digitali",
        area: "Dichiarazioni",
        audience: "Per lo studio",
        rilevanza: "media",
        title: "Imposta sui servizi digitali: l’integrativa si può inviare",
        recap:
          "Il principio di diritto n. 2 del 22 settembre 2026 ammette la dichiarazione integrativa dell’imposta sui servizi digitali, alle condizioni dell’articolo 8 del d.P.R. 322/1998. Il credito che ne esce non si compensa in F24: si chiede a rimborso oppure si riporta al periodo successivo.",
        links: [
          {
            label: "Principio di diritto n. 2/2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289089/Risposta+con+principi+di+diritto+n.+2_2026/ca4f175b-fcae-a486-e9a2-519a07f1f77c",
          },
        ],
      },
      {
        id: "colocation-iva",
        area: "IVA",
        audience: "Per lo studio",
        rilevanza: "media",
        title: "Colocation con private cage: il servizio è in Italia",
        recap:
          "Nella risposta n. 175 del 17 settembre 2026 l’Agenzia qualifica la colocation con private cage in un data center italiano come servizio relativo a un bene immobile. Ai fini IVA la prestazione è territorialmente rilevante in Italia. Vale per il contratto descritto nell’istanza.",
        links: [
          {
            label: "Risposta n. 175 del 17 settembre 2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289089/Risposta+n.+175_2026/1c1b0fc5-f648-cc5b-11e8-707ccb632f0c",
          },
        ],
      },
      {
        id: "credito-carburante-pesca",
        area: "Scadenze",
        audience: "Per lo studio",
        rilevanza: "bassa",
        title: "Pesca: credito carburante con il codice 7080",
        recap:
          "La risoluzione n. 32/E del 22 settembre 2026 istituisce il codice 7080. Serve solo alle imprese di pesca, per il gasolio e la benzina acquistati a marzo, aprile e maggio 2026, fino al 20 per cento della spesa e nei limiti del contributo. In F24, sezione Erario, si compensa nella colonna degli importi a credito. L’anno è quello della spesa indicato nel cassetto fiscale.",
        links: [
          {
            label: "Risoluzione n. 32/E del 22 settembre 2026",
            href: "https://www.agenziaentrate.gov.it/portale/documents/20143/10289077/RIS_n_32_del_22_09_2026/e72ebc4c-d866-f07b-9ad3-9bd712457370",
          },
        ],
      },
      {
        id: "codici-enti-bilaterali",
        area: "Lavoro e ritenute",
        audience: "Per lo studio",
        rilevanza: "bassa",
        title: "Contributi a enti e fondi: cinque codici, solo se il cliente è iscritto",
        recap:
          "Se in studio c’è un cliente iscritto a uno di questi enti, il contributo si versa con il codice della circolare. SANL per il fondo SANILAV, EBON per EBICON, EIMP per EBIP, CARE per INNOVACARE, EBOP per ENBITALIA OPN. Le circolari contengono le istruzioni contabili. Non riguardano gli altri clienti.",
        links: [
          {
            label: "Circolare INPS n. 102, SANL",
            href: "https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.09.circolare-numero-102-del-25-09-2026_16376.html",
          },
          {
            label: "Circolare INPS n. 103, EBON",
            href: "https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.09.circolare-numero-103-del-25-09-2026_16377.html",
          },
          {
            label: "Circolare INPS n. 94, EIMP",
            href: "https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.09.circolare-numero-94-del-10-09-2026_15365.html",
          },
          {
            label: "Circolare INPS n. 95, CARE",
            href: "https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.09.circolare-numero-95-del-10-09-2026_15366.html",
          },
          {
            label: "Circolare INPS n. 96, EBOP",
            href: "https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.09.circolare-numero-96-del-10-09-2026_15367.html",
          },
        ],
      },
    ],
    sources,
  },
];
