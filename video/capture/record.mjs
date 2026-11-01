// Registra le clip del sito usate nel video.
// Uso: node video/capture/record.mjs [nome...]   (senza nomi registra tutto)
// Serve il sito in locale: npm run dev (porta 5173).

import fs from "node:fs";
import path from "node:path";
import { Recorder, SITE, CLIPS, ease, launch } from "./lib.mjs";
import { baselineBriefings } from "../../netlify/lib/baseline.js";

const DESK = { viewport: { width: 1440, height: 810 }, dpr: 2 };
const PHONE = { viewport: { width: 390, height: 844 }, dpr: 3, mobile: true, pointer: "touch" };

// Il resoconto arriva come da Netlify, senza la fascia «Anteprima».
async function briefingRoute(context) {
  await context.route("**/api/briefing", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ briefings: baselineBriefings }),
    })
  );
}

// Il modulo risponde quando lo decide la clip, per far vedere «Invio in corso».
function formRoute(gate) {
  return async (context) => {
    await briefingRoute(context);
    await context.route(`${SITE}/`, async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      gate.request = route;
    });
  };
}

const clips = {
  // Il sipario del sito, l'eroe, un clic su «Agricoltura».
  async intro(browser) {
    const r = new Recorder({ name: "intro", ...DESK, routes: briefingRoute });
    await r.open(browser, `${SITE}/`);
    r.mark("start");
    await r.hold(3.9);
    r.mark("hero");
    const cta = await r.center(".hero-actions .btn");
    const chip = await r.center('.hero-chips a[href="#agricoltura"]');
    await r.showPointer(1500, 860);
    await r.moveTo(cta.x + 150, cta.y + 8, 1.1, ease.outCubic);
    await r.hold(0.45);
    await r.moveTo(chip.x + 6, chip.y + 4, 0.95, ease.inOutCubic);
    await r.hold(0.3);
    await r.click("chip");
    await r.hold(2.6);
    await r.moveTo(r.mouse.x + 80, r.mouse.y - 60, 0.8, ease.inOutSine);
    await r.hold(0.4);
    return r.finish();
  },

  // Dall'eroe ai servizi: le schede entrano, una si apre.
  async services(browser) {
    const r = new Recorder({ name: "services", ...DESK, routes: briefingRoute });
    await r.open(browser, `${SITE}/`, { settle: 4.5 });
    const top = await r.docTop("#servizi");
    await r.hold(0.2);
    await r.scrollTo(top - 30, 2.2, ease.inOutCubic);
    const row = await r.center("#contabilita summary");
    await r.showPointer(row.x + 260, row.y + 230);
    await r.moveTo(row.box.x + row.box.width - 34, row.y, 0.9, ease.outCubic);
    await r.hold(0.25);
    await r.click("open");
    await r.hold(0.9);
    const focus = await r.docTop("#specializzazioni");
    await r.scrollTo(focus - 60, 2.4, ease.inOutCubic, async (p) => {
      r.mouse = { x: r.mouse.x - 2 * p, y: r.mouse.y };
    });
    await r.hold(0.6);
    return r.finish();
  },

  // Il resoconto fiscale: dalla sezione Novità al pannello aperto.
  async novita(browser) {
    const r = new Recorder({ name: "novita", ...DESK, routes: briefingRoute });
    await r.open(browser, `${SITE}/`, { settle: 4.5 });
    const top = await r.docTop("#novita");
    await r.setScroll(top - 520);
    await r.advance(0.3);
    await r.scrollTo(top - 90, 1.8, ease.inOutCubic);
    await r.hold(0.4);
    const btn = await r.center(".bulletin-copy .btn");
    await r.showPointer(btn.x + 420, btn.y + 260);
    await r.moveTo(btn.x + 10, btn.y + 4, 1.0, ease.outCubic);
    await r.hold(0.25);
    await r.click("open");
    await r.hold(1.3);
    const max = await r.page.evaluate(() => {
      const panel = document.querySelector(".briefing-panel");
      return panel.scrollHeight - panel.clientHeight;
    });
    const span = Math.min(max, 820);
    await r.moveTo(r.mouse.x + 140, r.mouse.y + 40, 0.5, ease.inOutSine);
    await r.run(2.6, async (p) => {
      const y = span * ease.inOutCubic(p);
      await r.page.evaluate((v) => {
        document.querySelector(".briefing-panel").scrollTop = v;
      }, y);
      await r.applyPointer();
    });
    await r.hold(0.6);
    return r.finish();
  },

  // Metodo, persone e luoghi: uno scorrimento lungo con soste.
  async journey(browser) {
    const r = new Recorder({ name: "journey", ...DESK, routes: briefingRoute });
    await r.open(browser, `${SITE}/`, { settle: 4.5 });
    const metodo = await r.docTop("#metodo");
    const who = await r.docTop(".who");
    const scene = await r.docTop(".scene");
    const studio = await r.docTop("#studio");
    await r.setScroll(metodo - 260);
    await r.advance(0.2);
    r.mark("metodo");
    await r.scrollTo(metodo + 40, 1.6, ease.inOutCubic);
    await r.scrollTo(metodo + 700, 2.6, ease.inOutSine);
    r.mark("who");
    await r.scrollTo(who - 40, 1.4, ease.inOutCubic);
    await r.hold(0.5);
    r.mark("scene");
    await r.scrollTo(scene - 60, 2.2, ease.inOutCubic);
    await r.scrollTo(scene + 120, 1.6, ease.inOutSine);
    r.mark("studio");
    await r.scrollTo(studio + 260, 2.4, ease.inOutCubic);
    await r.hold(0.5);
    return r.finish();
  },

  // Il modulo: compilazione, invio, conferma.
  async contact(browser) {
    const gate = {};
    const r = new Recorder({ name: "contact", ...DESK, routes: formRoute(gate) });
    await r.open(browser, `${SITE}/`, { settle: 4.5 });
    const formTop = await r.docTop("#richiesta");
    await r.setScroll(formTop - 150);
    await r.advance(1.2);
    r.mark("start");
    await r.setScroll(formTop - 110);
    const name = await r.center('#richiesta [name="nome"]');
    const sede = await r.center('#richiesta [name="sede"]');
    r.markers.focusTop = { x: name.x, y: (name.y + sede.y) / 2 };
    const pick = await r.center("#servizio");
    r.markers.focusMid = { x: pick.x, y: pick.y - 60 };
    await r.showPointer(name.x + 240, name.y + 300);
    await r.moveTo(name.box.x + 60, name.y, 0.8, ease.outCubic);
    await r.click("nome");
    await r.hold(0.15);
    await r.type("Giulia Bianchi", 20, "type-nome");
    const email = await r.center('#richiesta [name="email"]');
    await r.moveTo(email.box.x + 60, email.y, 0.45, ease.inOutCubic);
    await r.click("email");
    await r.type("giulia@aziendabianchi.it", 26, "type-email");
    await r.page.selectOption('#richiesta [name="sede"]', { index: 1 });
    await r.page.selectOption('#richiesta [name="attivita"]', "Azienda agricola");
    const svc = await r.center("#servizio");
    await r.moveTo(svc.box.x + 80, svc.y, 0.5, ease.inOutCubic);
    await r.click("servizio");
    await r.page.selectOption("#servizio", "bandi");
    await r.hold(0.3);
    const msg = await r.center('#richiesta [name="messaggio"]');
    await r.scrollTo(formTop + 120, 0.7, ease.inOutCubic);
    const msg2 = await r.center('#richiesta [name="messaggio"]');
    const send0 = await r.center('#richiesta [type="submit"]');
    r.markers.focusLow = { x: msg2.x, y: (msg2.y + send0.y) / 2 };
    await r.moveTo(msg2.box.x + 70, msg2.box.y + 30, 0.45, ease.inOutCubic);
    await r.click("messaggio");
    await r.type("Vorrei partecipare al nuovo bando regionale per le aziende agricole.", 34, "type-msg");
    const send = await r.center('#richiesta [type="submit"]');
    await r.moveTo(send.x, send.y + 2, 0.6, ease.inOutCubic);
    await r.hold(0.2);
    await r.click("send");
    await r.hold(0.7);
    r.mark("sent");
    await gate.request?.fulfill({ status: 200, contentType: "text/plain", body: "ok" });
    await r.page.waitForTimeout(300);
    const panelTop = await r.docTop("#request");
    await r.scrollTo(panelTop - 180, 0.9, ease.inOutCubic);
    await r.hold(1.2);
    void msg;
    return r.finish();
  },

  // Prima visita: barra dei consensi, preferenze, caratteri che arrivano.
  async consent(browser) {
    const r = new Recorder({ name: "consent", ...DESK, consent: null, routes: briefingRoute });
    await r.open(browser, `${SITE}/`, { settle: 4.2 });
    r.mark("start");
    await r.hold(0.5);
    const choose = await r.center('[data-consent="choose"]');
    await r.showPointer(choose.x + 300, choose.y - 260);
    await r.moveTo(choose.x, choose.y + 2, 0.9, ease.outCubic);
    await r.click("choose");
    await r.hold(0.8);
    const fonts = await r.center('.consent-dialog input[name="fonts"]');
    await r.moveTo(fonts.x, fonts.y, 0.6, ease.inOutCubic);
    await r.click("box-fonts");
    await r.hold(0.25);
    const maps = await r.center('.consent-dialog input[name="maps"]');
    await r.moveTo(maps.x, maps.y, 0.45, ease.inOutCubic);
    await r.click("box-maps");
    await r.hold(0.3);
    const save = await r.center('.consent-dialog [data-choice="save"]');
    await r.moveTo(save.x, save.y, 0.55, ease.inOutCubic);
    await r.hold(0.15);
    await r.click("save");
    await r.page.waitForTimeout(1500);
    await r.hold(0.2);
    r.mark("swap");
    await r.moveTo(r.mouse.x + 220, r.mouse.y + 160, 0.9, ease.inOutSine);
    await r.hold(0.8);
    return r.finish();
  },

  // Mobile: sipario, eroe, menu, poi «Agricoltura» come su desktop (stesso istante).
  async "m-intro"(browser) {
    const r = new Recorder({ name: "m-intro", ...PHONE, routes: briefingRoute });
    await r.open(browser, `${SITE}/`);
    await r.hold(3.9);
    r.mark("hero");
    await r.holdUntil(4.3);
    const btn = await r.center(".menu-btn");
    await r.showPointer(btn.x - 4, btn.y + 2);
    await r.click("menu");
    await r.holdUntil(5.5);
    await r.click("close");
    await r.holdUntil(6.0);
    const chip = await r.center('.hero-chips a[href="#agricoltura"]');
    r.mouse = { x: chip.x, y: chip.y };
    await r.holdUntil(6.68);
    await r.click("chip");
    await r.hold(3.8);
    return r.finish();
  },

  // Mobile: servizi, una scheda aperta, i luoghi.
  async "m-scroll"(browser) {
    const r = new Recorder({ name: "m-scroll", ...PHONE, routes: briefingRoute });
    await r.open(browser, `${SITE}/`, { settle: 4.5 });
    const top = await r.docTop("#servizi");
    await r.scrollTo(top - 20, 1.8, ease.inOutCubic);
    await r.hold(0.3);
    const row = await r.center("#locazioni summary");
    await r.showPointer(row.x + 40, row.y);
    await r.click("open");
    await r.hold(0.8);
    const focus = await r.docTop("#specializzazioni");
    await r.scrollTo(focus - 40, 2.0, ease.inOutCubic);
    const scene = await r.docTop(".scene");
    await r.scrollTo(scene - 40, 2.4, ease.inOutCubic);
    await r.hold(0.5);
    return r.finish();
  },

  // Mobile: novità.
  async "m-novita"(browser) {
    const r = new Recorder({ name: "m-novita", ...PHONE, routes: briefingRoute });
    await r.open(browser, `${SITE}/`, { settle: 4.5 });
    const top = await r.docTop("#novita");
    await r.setScroll(top - 400);
    await r.advance(0.2);
    await r.scrollTo(top - 70, 1.6, ease.inOutCubic);
    await r.hold(0.3);
    const btn = await r.center(".bulletin-copy .btn");
    await r.showPointer(btn.x, btn.y);
    await r.click("open");
    await r.hold(1.0);
    await r.run(2.2, async (p) => {
      await r.page.evaluate((v) => {
        document.querySelector(".briefing-panel").scrollTop = v;
      }, 900 * ease.inOutCubic(p));
    });
    await r.hold(0.4);
    return r.finish();
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(clips);
fs.mkdirSync(CLIPS, { recursive: true });
const browser = await launch();
for (const name of names) {
  if (!clips[name]) throw new Error(`Clip sconosciuta: ${name}`);
  const t0 = Date.now();
  const manifest = await clips[name](browser);
  console.log(`${name}: ${manifest.frames} fotogrammi in ${Math.round((Date.now() - t0) / 1000)} s`);
}
await browser.close();
const index = fs
  .readdirSync(CLIPS)
  .filter((dir) => fs.existsSync(path.join(CLIPS, dir, "clip.json")))
  .map((dir) => JSON.parse(fs.readFileSync(path.join(CLIPS, dir, "clip.json"), "utf8")));
fs.writeFileSync(path.join(CLIPS, "index.json"), JSON.stringify(index, null, 2));
