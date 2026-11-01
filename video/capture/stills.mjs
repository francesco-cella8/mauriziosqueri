// Fotografie statiche: il muro di pagine e i biglietti da visita.
// Uso: node video/capture/stills.mjs   (con npm run dev attivo)

import fs from "node:fs";
import path from "node:path";
import { CACHE, SITE, launch } from "./lib.mjs";

const OUT = path.join(CACHE, "stills");
fs.mkdirSync(OUT, { recursive: true });

const consent = () => {
  localStorage.setItem(
    "squeri-consent",
    JSON.stringify({ v: 1, fonts: true, maps: false, t: new Date().toISOString() })
  );
};

async function fontsLoaded(page) {
  for (let i = 0; i < 60; i += 1) {
    const ok = await page.evaluate(() => {
      const faces = [...document.fonts];
      const loaded = (family) => faces.some((f) => f.family.replace(/"/g, "") === family && f.status === "loaded");
      return loaded("Newsreader") && loaded("Plus Jakarta Sans");
    });
    if (ok) return;
    await page.waitForTimeout(200);
  }
}

async function shootPage(browser, { url, name, viewport, dpr, mobile, stops }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr,
    isMobile: !!mobile,
    hasTouch: !!mobile,
    locale: "it-IT",
  });
  await context.addInitScript(consent);
  const page = await context.newPage();
  await page.goto(`${SITE}${url}`, { waitUntil: "load" });
  await fontsLoaded(page);
  await page.waitForTimeout(4600);
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important} .wa{display:none!important}" });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  // Un primo passaggio fa partire tutte le entrate animate.
  for (let y = 0; y < height; y += Math.round(viewport.height * 0.6)) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(140);
  }
  let index = 0;
  for (const stop of stops) {
    const y = await page.evaluate((s) => {
      if (typeof s === "number") return s;
      const el = document.querySelector(s.sel);
      return el.getBoundingClientRect().top + window.scrollY + (s.dy || 0);
    }, stop);
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(1300);
    index += 1;
    await page.screenshot({ path: path.join(OUT, `${name}-${index}.jpg`), type: "jpeg", quality: 90 });
  }
  await context.close();
}

const DESK = { viewport: { width: 1440, height: 900 }, dpr: 1.25 };
const PHONE = { viewport: { width: 390, height: 844 }, dpr: 2, mobile: true };

const pages = [
  {
    url: "/",
    name: "home",
    ...DESK,
    stops: [
      0,
      { sel: "#servizi", dy: -20 },
      { sel: "#specializzazioni", dy: -40 },
      { sel: "#novita", dy: -60 },
      { sel: "#metodo", dy: -40 },
      { sel: ".who", dy: -20 },
      { sel: ".moments", dy: -40 },
      { sel: ".scene", dy: -10 },
      { sel: "#studio", dy: -40 },
      { sel: "#persone", dy: -60 },
      { sel: "#contatti", dy: -60 },
      { sel: "#normativa", dy: -40 },
      { sel: ".credentials", dy: -60 },
      { sel: "#domande", dy: -60 },
    ],
  },
  { url: "/servizi/agricoltura.html", name: "agricoltura", ...DESK, stops: [0, 640] },
  { url: "/servizi/forestale.html", name: "forestale", ...DESK, stops: [0, 640] },
  { url: "/servizi/appalti.html", name: "appalti", ...DESK, stops: [0, 640] },
  { url: "/servizi/bandi.html", name: "bandi", ...DESK, stops: [0, 640] },
  { url: "/privacy.html", name: "privacy", ...DESK, stops: [0] },
  { url: "/cookie.html", name: "cookie", ...DESK, stops: [0] },
  { url: "/note-legali.html", name: "note", ...DESK, stops: [0] },
  {
    url: "/",
    name: "phone",
    ...PHONE,
    stops: [
      0,
      { sel: "#servizi", dy: -10 },
      { sel: "#specializzazioni", dy: -20 },
      { sel: "#novita", dy: -20 },
      { sel: "#metodo", dy: -20 },
      { sel: ".scene", dy: -40 },
      { sel: "#persone", dy: -20 },
      { sel: ".credentials", dy: -20 },
    ],
  },
];

const browser = await launch();
for (const job of pages) {
  await shootPage(browser, job);
  console.log("pagina", job.name);
}

// Biglietti: fronte e retro, ad alta risoluzione.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 4 });
  const page = await context.newPage();
  await page.goto(`${SITE}/biglietti.html`, { waitUntil: "load" });
  await fontsLoaded(page);
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: ".slot .card{box-shadow:none!important}" });
  await page.locator("#preview-front .card").screenshot({ path: path.join(OUT, "card-front.png") });
  await page.locator("#preview-back .card").screenshot({ path: path.join(OUT, "card-back.png") });
  await context.close();
  console.log("biglietti");
}
await browser.close();
