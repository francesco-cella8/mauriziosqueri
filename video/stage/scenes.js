// Le scene del video, in ordine. Tempi assoluti in secondi, a 120 BPM (una battuta = 2 s).

import {
  PORTRAIT,
  W,
  H,
  L,
  gsap,
  h,
  place,
  icon,
  cue,
  titleBlock,
  revealTitle,
  hideTitle,
  backdrop,
  drawPaths,
  browser,
  phone,
  setDevice,
  Footage,
  marker,
  still,
} from "./lib.js";

export const T = {
  intro: 0,
  identity: 10,
  services: 16,
  ai: 22,
  aiSite: 27,
  journey: 32,
  form: 36,
  privacy: 42,
  mobile: 46,
  wall: 52,
  outro: 56,
  end: 65.5,
};

export const scenes = [];

function scene(stage, start, end, { paper = false, z = 1 } = {}) {
  const el = h("div", { class: `scene${paper ? " on-paper" : ""}` });
  el.style.zIndex = String(z);
  stage.append(el);
  scenes.push({ el, start, end });
  return el;
}

// Inquadra il punto (px, py) della pagina nel punto (cx, cy) dello stage.
function frameOn(px, py, cx, cy, scale) {
  return { x: cx - scale * (px - 720), y: cy - scale * (py + 56 - 433), scale };
}

function floatDevice(tl, el, t, dur, { ry = 1.6, rx = 0.8, dy = 8 } = {}) {
  const half = dur / 2;
  tl.to(el, { rotationY: `+=${ry}`, rotationX: `-=${rx}`, y: `-=${dy}`, duration: half, ease: "sine.inOut" }, t);
  tl.to(el, { rotationY: `-=${ry}`, rotationX: `+=${rx}`, y: `+=${dy}`, duration: half, ease: "sine.inOut" }, t + half);
}

function callout(parent, text, iconName, { light = false } = {}) {
  const el = h("div", { class: `callout${light ? " light" : ""}` }, icon(iconName), h("span", { text }));
  parent.append(el);
  gsap.set(el, { autoAlpha: 0 });
  return el;
}

function popIn(tl, el, t, { from = { y: 26, scale: 0.86 }, dur = 0.7, ease = "back.out(1.7)" } = {}) {
  tl.fromTo(el, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0, duration: dur, ease }, t);
}

function popOut(tl, el, t, { dur = 0.4 } = {}) {
  tl.to(el, { autoAlpha: 0, y: -16, scale: 0.94, duration: dur, ease: "power2.in" }, t);
}

function ringWipe(tl, stage, el, t, cx, cy, { dur = 1.0, color = "rgba(217,203,184,0.9)" } = {}) {
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 40;
  tl.fromTo(
    el,
    { clipPath: `circle(0px at ${cx}px ${cy}px)` },
    { clipPath: `circle(${R}px at ${cx}px ${cy}px)`, duration: dur, ease: "power3.inOut" },
    t
  );
  tl.set(el, { clipPath: "none" }, t + dur + 0.01);
  const ring = h("div", { class: "ring" });
  ring.style.borderWidth = "3px";
  ring.style.borderColor = color;
  place(ring, { x: cx, y: cy, w: 2, h: 2 });
  ring.style.zIndex = el.style.zIndex;
  stage.append(ring);
  scenes.push({ el: ring, start: t, end: t + dur + 0.05 });
  tl.fromTo(
    ring,
    { width: 0, height: 0, xPercent: -50, yPercent: -50, autoAlpha: 1 },
    { width: R * 2, height: R * 2, duration: dur, ease: "power3.inOut" },
    t
  );
  tl.to(ring, { autoAlpha: 0, duration: 0.25, ease: "none" }, t + dur - 0.25);
  cue(t, "whoosh", { dur });
}

// 1 — Il sipario del sito, poi il browser che si stacca dallo schermo.
function sIntro(tl, stage) {
  const end = T.identity + 0.6;
  const el = scene(stage, T.intro, end, { z: 1 });
  const bg = backdrop(el, "navy");
  tl.fromTo(bg.holder, { x: 0, y: 0, rotation: 0 }, { x: L(-70, -40), y: L(-40, -90), rotation: 3, duration: end, ease: "none" }, 0);

  const dev = PORTRAIT ? phone() : browser({ dark: true });
  el.append(dev.el);
  const foot = new Footage(PORTRAIT ? "m-intro" : "intro", dev.img).play(0, 0).visible(0, end);
  foot.cueMarkers([["chip", PORTRAIT ? "tap" : "click"]]);
  if (PORTRAIT) foot.cueMarkers([["menu", "tap"], ["close", "tap"]]);

  const full = PORTRAIT
    ? { x: 540, y: 960, scale: 1080 / 390, rotationX: 0, rotationY: 0 }
    : { x: 960, y: 540 - 28 * (1920 / 1440), scale: 1920 / 1440, rotationX: 0, rotationY: 0 };
  const float = PORTRAIT
    ? { x: 540, y: 1225, scale: 1.45, rotationX: 4, rotationY: -8 }
    : { x: 1288, y: 556, scale: 0.75, rotationX: 5, rotationY: -15 };
  setDevice(dev.el, { ...full, borderRadius: 0 });
  tl.to(dev.el, { ...float, borderRadius: PORTRAIT ? 70 : 22, duration: 1.3, ease: "power3.inOut" }, 2.72);
  if (PORTRAIT) {
    tl.fromTo(dev.el.querySelector(".phone-screen"), { borderRadius: 0 }, { borderRadius: 54, duration: 1.3, ease: "power3.inOut" }, 2.72);
  }
  cue(2.72, "whoosh", { dur: 1.3 });
  cue(4.0, "drop");
  floatDevice(tl, dev.el, 4.02, 2.5, { ry: 2.2, dy: 10 });

  // Al clic su «Agricoltura» la camera si avvicina.
  const push = PORTRAIT
    ? { x: 540, y: 1215, scale: 1.52, rotationX: 2, rotationY: -4 }
    : { x: 1262, y: 545, scale: 0.82, rotationX: 3, rotationY: -9 };
  tl.to(dev.el, { ...push, duration: 1.7, ease: "power3.inOut" }, 6.55);
  floatDevice(tl, dev.el, 8.25, 1.6, { ry: 1.2, dy: 6 });

  const t1 = titleBlock(el, {
    kicker: "studiosqueri.net",
    lines: ["Il nuovo sito", "*dello Studio Squeri.*"],
    x: L(120, 90),
    y: L(372, 210),
    size: L(76, 94),
    width: L(720, 900),
  });
  revealTitle(tl, 3.86, t1);
  hideTitle(tl, 6.3, t1);

  const t2 = titleBlock(el, {
    kicker: L("Navigazione", "Navigazione"),
    lines: ["Ogni ambito,", L("*a un clic.*", "*a un tocco.*")],
    dek: L("Nove ambiti, ognuno<br>raggiungibile subito.", null),
    x: L(120, 90),
    y: L(340, 210),
    size: L(84, 98),
    width: L(640, 900),
  });
  revealTitle(tl, 6.86, t2);
  hideTitle(tl, 9.42, t2);

  // La luce che passa sul vetro durante l'arretramento.
  const sheen = h("div", { class: "abs" });
  place(sheen, { x: 0, y: 0, w: W * 0.5, h: H * 1.6 });
  sheen.style.background = "linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.13) 45%, rgba(255,255,255,0) 60%)";
  el.append(sheen);
  tl.fromTo(sheen, { x: -W * 0.7, y: -H * 0.3, rotation: 8, autoAlpha: 1 }, { x: W * 1.2, duration: 1.6, ease: "power2.inOut" }, 3.0);
  tl.set(sheen, { autoAlpha: 0 }, 4.7);
}

// 2 — Identità visiva: caratteri, colori, marmo.
function sIdentity(tl, stage) {
  const start = T.identity - 0.42;
  const end = T.services + 0.5;
  const el = scene(stage, start, end, { paper: true, z: 2 });
  const bg = backdrop(el, "paper", { veinOpacity: 0.8 });
  drawPaths(tl, bg.veins.paths, start, { dur: 3.2, stagger: 0.09 });
  tl.fromTo(bg.veins.svg, { opacity: 0 }, { opacity: 0.8, duration: 1.6, ease: "power1.in" }, start + 0.2);
  tl.fromTo(bg.holder, { x: 0, y: 0, rotation: -2 }, { x: L(60, 30), y: L(-30, -80), rotation: 1, duration: end - start, ease: "none" }, start);
  ringWipe(tl, stage, el, start, L(1170, 540), L(545, 1150), { dur: 1.0 });

  const title = titleBlock(el, {
    kicker: "Identità visiva",
    lines: ["Un'identità", "*su misura.*"],
    dek: L("Caratteri, colori e marmo<br>pensati per lo studio.", null),
    x: L(120, 90),
    y: L(330, 210),
    size: L(96, 104),
    width: L(640, 900),
    paper: true,
  });
  revealTitle(tl, T.identity + 0.05, title);
  hideTitle(tl, T.services - 0.7, title);

  // Campionario dei caratteri.
  const spec = h("div", { class: "specimen" });
  place(spec, L({ x: 820, y: 150, w: 980, h: 360 }, { x: 90, y: 560, w: 900, h: 420 }));
  const half = (fontCss, sample, name, role) => {
    const aa = h("div", { text: sample });
    Object.assign(aa.style, {
      font: fontCss,
      lineHeight: "1",
      color: "var(--ink)",
      letterSpacing: "-0.04em",
    });
    const nm = h("div", { text: name });
    Object.assign(nm.style, { fontWeight: "800", fontSize: L("26px", "27px"), letterSpacing: "-0.02em", marginTop: "18px" });
    const rl = h("div", { text: role });
    Object.assign(rl.style, { fontWeight: "500", fontSize: L("20px", "21px"), color: "var(--muted)", marginTop: "4px" });
    const box = h("div", {}, aa, nm, rl);
    Object.assign(box.style, { position: "absolute", top: L("44px", "54px") });
    return { box, aa };
  };
  const serif = half(`italic 500 ${L(190, 200)}px Newsreader`, "Aa", "Newsreader", "Titoli e accenti");
  serif.aa.style.color = "var(--gold-deep)";
  const sans = half(`800 ${L(176, 186)}px "Plus Jakarta Sans"`, "Aa", "Plus Jakarta Sans", "Testi e interfaccia");
  serif.box.style.left = L("56px", "50px");
  sans.box.style.left = L("530px", "480px");
  const divider = h("div");
  Object.assign(divider.style, { position: "absolute", left: L("490px", "450px"), top: "44px", bottom: "44px", width: "1px", background: "rgba(36,48,57,0.12)" });
  spec.append(serif.box, divider, sans.box);
  el.append(spec);
  popIn(tl, spec, T.identity + 0.32, { from: { y: 70, scale: 0.94 }, dur: 1.0, ease: "expo.out" });
  tl.fromTo([serif.aa, sans.aa], { yPercent: 30, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: "expo.out", stagger: 0.18 }, T.identity + 0.5);
  tl.fromTo(divider, { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: "power3.out" }, T.identity + 0.6);
  cue(T.identity + 0.5, "tick");
  cue(T.identity + 0.68, "tick");

  // Palette.
  const colors = [
    ["Blu notte", "#3C4C5A", "#3c4c5a", "#fff"],
    ["Inchiostro", "#243039", "#243039", "#fff"],
    ["Oro", "#D9CBB8", "linear-gradient(160deg,#e6dbcc,#cdbca4)", "#243039"],
    ["Carta", "#F6F3EE", "#f6f3ee", "#243039"],
  ];
  const sw = L({ w: 230, h: 300, x0: 820, y0: 548, gx: 250, gy: 0, cols: 4 }, { w: 440, h: 290, x0: 90, y0: 1020, gx: 460, gy: 310, cols: 2 });
  colors.forEach(([name, hex, fill, ink], index) => {
    const box = h("div", { class: "swatch" });
    const chip = h("div", { class: "chip" });
    chip.style.background = fill;
    const nm = h("div", { class: "name", text: name });
    const hx = h("div", { class: "hex", text: hex });
    const meta = h("div", { class: "meta" }, nm, hx);
    meta.style.color = ink;
    box.append(chip, meta);
    const col = index % sw.cols;
    const row = Math.floor(index / sw.cols);
    place(box, { x: sw.x0 + col * sw.gx, y: sw.y0 + row * sw.gy, w: sw.w, h: sw.h });
    el.append(box);
    const t = T.identity + 1.0 + index * 0.25;
    popIn(tl, box, t, { from: { y: 90, rotation: index % 2 ? -5 : 5, scale: 0.9 }, dur: 0.9, ease: "back.out(1.5)" });
    const counter = { n: 0 };
    tl.fromTo(
      counter,
      { n: 0 },
      {
        n: hex.length,
        duration: 0.45,
        ease: "none",
        onUpdate: () => {
          hx.textContent = hex.slice(0, Math.round(counter.n));
        },
      },
      t + 0.25
    );
    cue(t, "pop", { pitch: index });
    tl.to(box, { y: `-=${8 + index * 3}`, duration: 2.6, ease: "sine.inOut" }, t + 1);
    tl.to(box, { autoAlpha: 0, y: L(-140, -120), rotation: index % 2 ? 4 : -4, duration: 0.55, ease: "power3.in" }, T.services - 0.62 + index * 0.05);
  });
  tl.to(spec, { autoAlpha: 0, y: -120, duration: 0.6, ease: "power3.in" }, T.services - 0.75);
}

// 3 — Servizi: lo scroll e una scheda che si apre.
function sServices(tl, stage) {
  const start = T.services - 0.45;
  const end = T.ai + 0.35;
  const el = scene(stage, start, end, { paper: true, z: 3 });
  const bg = backdrop(el, "paper", { veinOpacity: 0.8 });
  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: "none" }, start);
  tl.fromTo(bg.holder, { x: L(60, 30), y: L(-30, -80) }, { x: L(-40, -30), y: L(-90, -160), duration: end - start, ease: "none" }, start);

  const dev = browser();
  el.append(dev.el);
  const clipStart = T.services - 0.3;
  const foot = new Footage("services", dev.img).play(clipStart, 0).visible(start, end);
  foot.cueMarkers([["open", "click"]]);
  const rest = L({ x: 1262, y: 556, scale: 0.74, rotationX: 4, rotationY: -13 }, { x: 540, y: 1215, scale: 0.94, rotationX: 4, rotationY: -5 });
  setDevice(dev.el, { ...rest, x: L(2700, 540), y: L(556, 2600), rotationY: L(-40, -6), rotationX: L(4, 30) });
  tl.to(dev.el, { ...rest, duration: 1.1, ease: "power4.out" }, start + 0.05);
  cue(start + 0.05, "whoosh", { dur: 0.9 });
  floatDevice(tl, dev.el, start + 1.2, 2.6, { ry: 1.8, dy: 8 });
  const clickT = clipStart + marker("services", "open");
  tl.to(dev.el, { scale: rest.scale * L(1.07, 1.05), x: L(1230, 540), duration: 2.2, ease: "power2.inOut" }, start + 3.85);

  const title = titleBlock(el, {
    kicker: "Servizi",
    lines: ["Nove ambiti,", "*uno studio.*"],
    x: L(120, 90),
    y: L(176, 210),
    size: L(88, 98),
    width: L(640, 900),
    paper: true,
  });
  revealTitle(tl, T.services, title);
  hideTitle(tl, T.ai - 0.6, title);

  const names = ["Contabilità", "Locazioni", "Camerali", "Agricoltura", "Forestale", "Appalti", "Portali", "Bandi", "Privati"];
  const special = new Set(["Agricoltura", "Forestale", "Appalti", "Portali", "Bandi"]);
  const grid = L({ x0: 120, y0: 470, cols: 2, gx: 270, gy: 84 }, { x0: 90, y0: 540, cols: 3, gx: 304, gy: 78 });
  const pills = [];
  names.forEach((name, index) => {
    const pill = h("div", { class: "pill light" }, h("span", { class: "dot" }), h("span", { text: name }));
    pill.style.position = "absolute";
    pill.style.fontSize = L("23px", "24px");
    if (PORTRAIT) pill.style.padding = "13px 22px";
    place(pill, { x: grid.x0 + (index % grid.cols) * grid.gx, y: grid.y0 + Math.floor(index / grid.cols) * grid.gy });
    el.append(pill);
    pills.push({ pill, name });
    const t = T.services + 0.55 + index * 0.075;
    popIn(tl, pill, t, { from: { y: 30, scale: 0.8 }, dur: 0.6 });
  });
  cue(T.services + 0.55, "ripple", { count: 9, gap: 0.075 });

  // Le aree di specializzazione si accendono quando il sito ci arriva.
  const hl = clipStart + 5.6;
  pills.forEach(({ pill, name }, index) => {
    if (special.has(name)) {
      tl.to(pill, { backgroundColor: "#3c4c5a", color: "#fff", duration: 0.35, ease: "power2.out" }, hl + index * 0.06);
      tl.to(pill.querySelector(".dot"), { backgroundColor: "#d9cbb8", duration: 0.35 }, hl + index * 0.06);
    } else {
      tl.to(pill, { autoAlpha: 0.45, duration: 0.35 }, hl);
    }
    tl.to(pill, { autoAlpha: 0, y: -20, duration: 0.35, ease: "power2.in" }, T.ai - 0.62 + index * 0.02);
  });
  cue(hl, "shimmer");

  const c1 = callout(el, "Dettagli al clic", "plus", { light: false });
  place(c1, L({ x: 1270, y: 820 }, { x: 520, y: 1470 }));
  popIn(tl, c1, clickT + 0.15);
  popOut(tl, c1, clickT + 1.6);
  const c2 = callout(el, "Aree di specializzazione", "layers", { light: false });
  place(c2, L({ x: 1090, y: 860 }, { x: 250, y: 1470 }));
  popIn(tl, c2, hl + 0.25);
  popOut(tl, c2, T.ai - 0.5);
  cue(clickT + 0.15, "pop", { pitch: 2 });
  cue(hl + 0.25, "pop", { pitch: 4 });
}

// 4 — Novità fiscali: fonti ufficiali, AI, resoconto.
function sAi(tl, stage) {
  const start = T.ai - 0.42;
  const end = T.aiSite + 0.4;
  const el = scene(stage, start, end, { z: 4 });
  const bg = backdrop(el, "navy");
  tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "power4.inOut" }, start);
  tl.set(el, { clipPath: "none" }, start + 0.77);
  const edge = h("div", { class: "abs" });
  place(edge, { x: 0, y: 0, w: W, h: 3 });
  edge.style.background = "linear-gradient(90deg, transparent, #d9cbb8 20%, #d9cbb8 80%, transparent)";
  stage.append(edge);
  scenes.push({ el: edge, start, end: start + 0.8 });
  edge.style.zIndex = "4";
  tl.fromTo(edge, { y: H, autoAlpha: 1 }, { y: -4, duration: 0.75, ease: "power4.inOut" }, start);
  cue(start, "sweep", { dur: 0.75 });
  tl.fromTo(bg.holder, { x: 0, y: 0 }, { x: L(-50, -30), y: L(-30, -70), duration: end - start, ease: "none" }, start);

  const title = titleBlock(el, {
    kicker: "Novità fiscali",
    lines: ["Le novità fiscali,", "*in automatico.*"],
    x: L(120, 90),
    y: L(108, 210),
    size: L(80, 92),
    width: L(1100, 900),
  });
  revealTitle(tl, T.ai + 0.1, title);

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  el.append(svg);

  const sources = ["Agenzia delle Entrate", "Gazzetta Ufficiale", "MEF", "Dipartimento delle Finanze", "INPS"];
  const node = L({ x: 940, y: 668, r: 106 }, { x: 540, y: 1085, r: 100 });
  const pills = [];
  sources.forEach((name, index) => {
    const pill = h("div", { class: "pill glass" }, h("span", { class: "dot" }), h("span", { text: name }));
    pill.style.position = "absolute";
    pill.style.fontSize = L("23px", "24px");
    el.append(pill);
    pills.push(pill);
  });
  // Misure reali delle pillole per agganciare le linee.
  const sizes = pills.map((pill) => ({ w: pill.offsetWidth, h: pill.offsetHeight }));
  const anchors = [];
  if (!PORTRAIT) {
    let y = 446;
    pills.forEach((pill, index) => {
      place(pill, { x: 120, y });
      anchors.push({ x: 120 + sizes[index].w + 8, y: y + sizes[index].h / 2 });
      y += sizes[index].h + 18;
    });
  } else {
    const rows = [[0, 1], [2, 3], [4]];
    let y = 600;
    rows.forEach((row) => {
      const total = row.reduce((sum, i) => sum + sizes[i].w, 0) + (row.length - 1) * 16;
      let x = 540 - total / 2;
      row.forEach((i) => {
        place(pills[i], { x, y });
        anchors[i] = { x: x + sizes[i].w / 2, y: y + sizes[i].h + 6 };
        x += sizes[i].w + 16;
      });
      y += sizes[0].h + 18;
    });
  }
  pills.forEach((pill, index) => {
    const t = T.ai + 0.5 + index * 0.16;
    popIn(tl, pill, t, { from: { x: L(-60, 0), y: L(0, 30), scale: 0.9 }, dur: 0.7, ease: "expo.out" });
    cue(t, "tick", { pitch: index });
  });

  const paths = anchors.map((a) => {
    const path = document.createElementNS(ns, "path");
    let d;
    if (!PORTRAIT) {
      const ex = node.x - node.r - 6;
      d = `M${a.x} ${a.y} C ${a.x + 170} ${a.y}, ${ex - 160} ${node.y}, ${ex} ${node.y}`;
    } else {
      const ey = node.y - node.r - 6;
      d = `M${a.x} ${a.y} C ${a.x} ${a.y + 120}, ${node.x} ${ey - 140}, ${node.x} ${ey}`;
    }
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(217,203,184,0.55)");
    path.setAttribute("stroke-width", "2");
    svg.append(path);
    return path;
  });
  drawPaths(tl, paths, T.ai + 1.0, { dur: 0.9, stagger: 0.08, ease: "power2.inOut" });

  // Nodo centrale.
  const nodeEl = h("div", { class: "node" });
  place(nodeEl, { x: node.x - node.r, y: node.y - node.r, w: node.r * 2, h: node.r * 2 });
  nodeEl.style.background = "radial-gradient(circle at 40% 35%, #56687a, #2c3946 70%)";
  nodeEl.style.boxShadow = "0 0 0 1px rgba(217,203,184,0.5), 0 0 80px rgba(217,203,184,0.25), 0 30px 60px -20px rgba(0,0,0,0.6)";
  const ai = h("div", { html: `${"<span>AI</span>"}` });
  Object.assign(ai.style, { fontWeight: "800", fontSize: "70px", letterSpacing: "-0.04em", color: "#e8dccb", lineHeight: "1" });
  const spark = h("div", { html: '<svg viewBox="0 0 24 24" fill="currentColor" width="34" height="34"><path d="M12 2.5c.5 4.4 2.9 6.9 7.5 7.5-4.6.6-7 3.1-7.5 7.5-.5-4.4-2.9-6.9-7.5-7.5 4.6-.6 7-3.1 7.5-7.5z"/></svg>' });
  Object.assign(spark.style, { position: "absolute", right: "38px", top: "34px", color: "#d9cbb8" });
  nodeEl.append(ai, spark);
  const ring = document.createElementNS(ns, "circle");
  ring.setAttribute("cx", String(node.x));
  ring.setAttribute("cy", String(node.y));
  ring.setAttribute("r", String(node.r + 22));
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "rgba(217,203,184,0.6)");
  ring.setAttribute("stroke-width", "2");
  ring.setAttribute("stroke-dasharray", "4 14");
  svg.append(ring);
  const ring2 = document.createElementNS(ns, "circle");
  ring2.setAttribute("cx", String(node.x));
  ring2.setAttribute("cy", String(node.y));
  ring2.setAttribute("r", String(node.r + 50));
  ring2.setAttribute("fill", "none");
  ring2.setAttribute("stroke", "rgba(217,203,184,0.22)");
  ring2.setAttribute("stroke-width", "1.5");
  svg.append(ring2);
  el.append(nodeEl);
  const nodeIn = T.ai + 1.65;
  popIn(tl, nodeEl, nodeIn, { from: { scale: 0.3 }, dur: 0.9, ease: "back.out(1.8)" });
  tl.fromTo([ring, ring2], { autoAlpha: 0, scale: 0.6, svgOrigin: `${node.x} ${node.y}` }, { autoAlpha: 1, scale: 1, svgOrigin: `${node.x} ${node.y}`, duration: 0.9, ease: "expo.out", stagger: 0.1 }, nodeIn + 0.1);
  tl.fromTo(ring, { rotation: 0, svgOrigin: `${node.x} ${node.y}` }, { rotation: 120, svgOrigin: `${node.x} ${node.y}`, duration: end - nodeIn, ease: "none" }, nodeIn);
  tl.to(nodeEl, { scale: 1.06, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 5, repeatDelay: 0.25 }, nodeIn + 1.0);
  cue(nodeIn, "hit");

  // Particelle che viaggiano dalle fonti al nodo.
  const dots = [];
  paths.forEach((path, index) => {
    for (let k = 0; k < 2; k += 1) {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("r", "5");
      c.setAttribute("fill", "#e8dccb");
      c.style.filter = "drop-shadow(0 0 6px rgba(232,220,203,0.9))";
      svg.append(c);
      dots.push({ c, path, offset: index * 0.17 + k * 0.5 });
    }
  });
  const flow = { p: 0 };
  const flowStart = T.ai + 1.8;
  tl.fromTo(
    flow,
    { p: 0 },
    {
      p: 1,
      duration: end - flowStart,
      ease: "none",
      onUpdate: () => {
        const time = flow.p * (end - flowStart);
        for (const d of dots) {
          const len = d.path.getTotalLength();
          const u = (time * 0.62 + d.offset) % 1;
          const pt = d.path.getPointAtLength(u * len);
          d.c.setAttribute("cx", String(pt.x));
          d.c.setAttribute("cy", String(pt.y));
          const fade = Math.min(1, u * 6, (1 - u) * 6);
          d.c.setAttribute("opacity", String(fade * Math.min(1, time * 2)));
        }
      },
    },
    flowStart
  );

  // Il resoconto che esce dal nodo.
  const card = h("div", { class: "card-ui" });
  const cardBox = L({ x: 1230, y: 420, w: 570, h: 500 }, { x: 90, y: 1270, w: 900, h: 450 });
  place(card, cardBox);
  card.style.padding = L("34px 34px", "36px 40px");
  const kick = h("div", { text: "Novità" });
  Object.assign(kick.style, { fontWeight: "700", fontSize: "17px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-deep)" });
  const date = h("div", { text: "Dal 1 agosto al 1 ottobre 2026" });
  Object.assign(date.style, { fontWeight: "800", fontSize: L("29px", "33px"), letterSpacing: "-0.03em", marginTop: "10px" });
  const count = h("div", { text: "10 novità · per lo studio e per i clienti" });
  Object.assign(count.style, { fontWeight: "600", fontSize: "17px", color: "var(--muted)", marginTop: "6px", letterSpacing: "0.02em" });
  card.append(kick, date, count);
  const items = [
    ["Altissima", "Dichiarazione IVA omessa: i codici per pagare la liquidazione"],
    ["Alta", "Successioni e donazioni: codici F24 per il ravvedimento"],
    ["Alta", "DURF: anche gli avvisi pagati con F24 contano nel 10 per cento"],
  ];
  const rows = items.map(([level, text], index) => {
    const badge = h("span", { text: level.toUpperCase() });
    Object.assign(badge.style, {
      flex: "none",
      fontWeight: "800",
      fontSize: "13px",
      letterSpacing: "0.12em",
      padding: "7px 12px",
      borderRadius: "999px",
      background: index === 0 ? "#243039" : "#e6dccd",
      color: index === 0 ? "#fff" : "#4d4134",
    });
    const tt = h("span", { text });
    Object.assign(tt.style, { fontWeight: "700", fontSize: L("19px", "22px"), lineHeight: "1.3", letterSpacing: "-0.01em" });
    const row = h("div", {}, badge, tt);
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: L("16px 18px", "17px 20px"),
      marginTop: index === 0 ? "22px" : "12px",
      borderRadius: "18px",
      background: "#faf8f5",
      border: "1px solid rgba(36,48,57,0.08)",
    });
    card.append(row);
    return row;
  });
  el.append(card);

  const out = document.createElementNS(ns, "path");
  const od = PORTRAIT
    ? `M${node.x} ${node.y + node.r + 6} L ${node.x} ${cardBox.y - 8}`
    : `M${node.x + node.r + 6} ${node.y} C ${node.x + node.r + 80} ${node.y}, ${cardBox.x - 80} ${node.y}, ${cardBox.x - 8} ${node.y}`;
  out.setAttribute("d", od);
  out.setAttribute("fill", "none");
  out.setAttribute("stroke", "rgba(217,203,184,0.8)");
  out.setAttribute("stroke-width", "2.5");
  svg.append(out);
  const cardIn = T.ai + 2.55;
  drawPaths(tl, [out], cardIn - 0.3, { dur: 0.45, ease: "power2.out" });
  popIn(tl, card, cardIn, { from: { x: L(60, 0), y: L(0, 60), scale: 0.95 }, dur: 0.9, ease: "expo.out" });
  rows.forEach((row, index) => {
    tl.fromTo(row, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" }, cardIn + 0.3 + index * 0.17);
    cue(cardIn + 0.3 + index * 0.17, "pop", { pitch: 3 + index });
  });

  // Tre passaggi.
  const steps = [
    ["01", "Ogni mattina legge i canali ufficiali"],
    ["02", "Ogni tre giorni l'AI scrive il resoconto"],
    ["03", "Ogni link viene verificato"],
  ];
  const stepPos = L(
    [
      { x: 120, y: 958 },
      { x: 700, y: 958 },
      { x: 1260, y: 958 },
    ],
    [
      { x: 90, y: 492 },
      { x: 90, y: 492 },
      { x: 90, y: 492 },
    ]
  );
  steps.forEach(([n, text], index) => {
    const row = h("div", { class: "step-row" }, h("span", { class: "n", text: n }), h("span", { class: "t", text }));
    place(row, stepPos[index]);
    if (PORTRAIT) {
      row.querySelector(".n").style.fontSize = "28px";
      row.querySelector(".t").style.fontSize = "25px";
    } else {
      row.querySelector(".t").style.fontSize = "23px";
    }
    el.append(row);
    const times = [T.ai + 1.05, nodeIn + 0.35, cardIn + 0.7];
    const t = times[index];
    tl.fromTo(row, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out" }, t);
    if (PORTRAIT && index < 2) tl.to(row, { autoAlpha: 0, y: -12, duration: 0.3, ease: "power2.in" }, times[index + 1] - 0.3);
  });

  // Uscita: tutto si allontana mentre arriva il sito.
  const outT = T.aiSite - 0.45;
  hideTitle(tl, outT - 0.1, title);
  tl.to([...pills, nodeEl, svg, ...el.querySelectorAll(".step-row")], { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, outT);
  tl.to(card, { scale: L(1.25, 1.18), autoAlpha: 0, duration: 0.6, ease: "power3.in" }, outT);
}

// 4b — Il resoconto dentro il sito.
function sAiSite(tl, stage) {
  const start = T.aiSite - 0.4;
  const end = T.journey + 0.45;
  const el = scene(stage, start, end, { z: 5 });
  const bg = backdrop(el, "navy");
  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "none" }, start);
  tl.fromTo(bg.holder, { x: L(-50, -30), y: L(-30, -70) }, { x: L(-120, -60), y: L(-60, -140), duration: end - start, ease: "none" }, start);

  const dev = browser({ dark: true });
  el.append(dev.el);
  const c0 = 1.0;
  const speed = 1.2;
  const foot = new Footage("novita", dev.img).play(start, c0, { speed }).visible(start, end);
  foot.cueMarkers([["open", "click"]]);
  const openT = start + (marker("novita", "open") - c0) / speed;
  const rest = L({ x: 1255, y: 560, scale: 0.78, rotationX: 4, rotationY: -12 }, { x: 540, y: 1130, scale: 0.96, rotationX: 4, rotationY: -5 });
  setDevice(dev.el, { ...rest, scale: rest.scale * 1.5, autoAlpha: 0 });
  tl.to(dev.el, { ...rest, autoAlpha: 1, duration: 1.0, ease: "expo.out" }, start);
  tl.to(dev.el, { scale: rest.scale * L(1.12, 1.1), x: L(1215, 540), rotationY: L(-7, -2), duration: 2.4, ease: "power2.inOut" }, openT + 0.2);
  floatDevice(tl, dev.el, start + 1.0, 1.8, { ry: 1.4, dy: 6 });

  const title = titleBlock(el, {
    kicker: "Resoconto",
    lines: ["Atti ufficiali,", "*già in ordine.*"],
    dek: L("Ordinati per rilevanza,<br>con il link alla fonte.", null),
    x: L(120, 90),
    y: L(320, 210),
    size: L(80, 98),
    width: L(620, 900),
  });
  revealTitle(tl, T.aiSite + 0.05, title);
  hideTitle(tl, T.journey - 0.55, title);

  const c1 = callout(el, "Rilevanza in evidenza", "spark", { light: true });
  place(c1, L({ x: 1180, y: 830 }, { x: 90, y: 1520 }));
  popIn(tl, c1, openT + 0.7);
  popOut(tl, c1, T.journey - 0.5);
  const c2 = callout(el, "Fonti ufficiali", "link", { light: true });
  place(c2, L({ x: 1500, y: 905 }, { x: 560, y: 1520 }));
  popIn(tl, c2, openT + 1.4);
  popOut(tl, c2, T.journey - 0.45);
  cue(openT + 0.7, "pop", { pitch: 2 });
  cue(openT + 1.4, "pop", { pitch: 4 });
}

// 5 — Scroll e animazioni.
function sJourney(tl, stage) {
  const start = T.journey - 0.42;
  const end = T.form + 0.45;
  const el = scene(stage, start, end, { paper: true, z: 6 });
  const bg = backdrop(el, "paper");
  tl.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: "power4.inOut" }, start);
  cue(start, "whoosh", { dur: 0.7 });
  tl.fromTo(bg.holder, { x: 0, y: 0 }, { x: L(-60, -30), y: L(-50, -90), duration: end - start, ease: "none" }, start);

  const dev = browser();
  el.append(dev.el);
  const m = (k) => marker("journey", k);
  const foot = new Footage("journey", dev.img)
    .play(start, m("metodo") + 0.2, { speed: 1.75, c1: m("who") - 0.3 })
    .play(T.journey + 1.85, m("scene") + 0.2, { speed: 1.35 })
    .visible(start, end);
  void foot;
  const rest = L({ x: 840, y: 548, scale: 0.72, rotationX: 9, rotationY: 20, rotation: -1 }, { x: 540, y: 1180, scale: 0.98, rotationX: 9, rotationY: 10, rotation: -1 });
  setDevice(dev.el, { ...rest, rotationY: rest.rotationY + 14, scale: rest.scale * 0.92 });
  tl.to(dev.el, { ...rest, duration: 1.4, ease: "power3.out" }, start + 0.2);
  tl.to(dev.el, { rotationY: rest.rotationY - 8, rotationX: rest.rotationX - 3, scale: rest.scale * 1.06, duration: 2.6, ease: "sine.inOut" }, start + 1.6);
  // Un piccolo stacco a tempo tra le due parti.
  const flash = h("div", { class: "flash" });
  el.append(flash);
  tl.fromTo(flash, { opacity: 0 }, { opacity: 0.9, duration: 0.06, ease: "none" }, T.journey + 1.82);
  tl.to(flash, { opacity: 0, duration: 0.35, ease: "power2.out" }, T.journey + 1.88);
  cue(T.journey + 1.85, "cut");

  const title = titleBlock(el, {
    kicker: "Movimento",
    lines: ["Animazioni", "*fluide.*"],
    dek: L("Entrate, parallasse<br>e linee che si disegnano<br>allo scroll.", null),
    x: L(1450, 90),
    y: L(330, 210),
    size: L(76, 98),
    width: L(440, 900),
    paper: true,
  });
  revealTitle(tl, T.journey + 0.1, title);
  hideTitle(tl, T.form - 0.5, title);
}

// 6 — Il modulo di richiesta.
function sForm(tl, stage) {
  const start = T.form - 0.42;
  const end = T.privacy + 0.45;
  const el = scene(stage, start, end, { paper: true, z: 7 });
  const bg = backdrop(el, "paper", { veinOpacity: 0.7 });
  tl.fromTo(el, { xPercent: 100 }, { xPercent: 0, duration: 0.7, ease: "power4.inOut" }, start);
  cue(start, "whoosh", { dur: 0.7 });
  tl.fromTo(bg.holder, { x: 0, y: 0 }, { x: L(-50, -30), y: L(40, 60), duration: end - start, ease: "none" }, start);

  const dev = browser();
  el.append(dev.el);
  const m = (k) => marker("contact", k);
  const t0 = start + 0.1;
  // Le parti lente (scrittura) vanno più veloci, i clic restano a velocità reale.
  const foot = new Footage("contact", dev.img);
  const plan = [
    [m("start"), m("type-nome") - 0.05, 1.5],
    [m("type-nome") - 0.05, m("email") - 0.1, 2.0],
    [m("email") - 0.1, m("servizio") - 0.15, 2.2],
    [m("servizio") - 0.15, m("messaggio") - 0.1, 2.1],
    [m("messaggio") - 0.1, m("send") - 0.35, 3.4],
    [m("send") - 0.35, m("sent") + 0.05, 1.0],
    [m("sent") + 0.05, m("sent") + 2.4, 1.5],
  ];
  let t = t0;
  for (const [a, b, speed] of plan) {
    foot.play(t, a, { speed, c1: b });
    t += (b - a) / speed;
  }
  foot.visible(start, end);
  foot.cueMarkers([["nome", "click"], ["email", "click"], ["servizio", "click"], ["messaggio", "click"], ["send", "click"]]);
  foot.cueMarkers([["type-nome:keys", "key"], ["type-email:keys", "key"], ["type-msg:keys", "key"]]);
  const sentT = foot.timeOf(m("sent"));
  if (sentT !== null) cue(sentT + 0.05, "success");

  // La camera segue i campi del modulo (coordinate della pagina registrata).
  const focus = clipFocus();
  const scale = L(1.12, 1.02);
  const at = (c, fx, fy, cx = L(1240, 540), cy = L(560, 1060)) => ({ c, ...frameOn(fx, fy, cx, cy, scale) });
  const shots = [
    at(m("start"), focus.top.x, focus.top.y),
    at(m("servizio"), focus.mid.x, focus.mid.y),
    at(m("messaggio") + 0.2, focus.low.x, focus.low.y),
    at(m("sent") + 0.3, focus.low.x, 300),
  ];
  setDevice(dev.el, { ...shots[0], x: shots[0].x + L(200, 0), y: shots[0].y + L(0, 200), rotationY: L(-10, 0), rotationX: 0, autoAlpha: 1 });
  tl.to(dev.el, { x: shots[0].x, y: shots[0].y, rotationY: L(-4, 0), duration: 1.1, ease: "power3.out" }, start + 0.1);
  for (let i = 1; i < shots.length; i += 1) {
    const ts = foot.timeOf(shots[i].c);
    if (ts === null) continue;
    tl.to(dev.el, { x: shots[i].x, y: shots[i].y, duration: 0.9, ease: "power3.inOut" }, ts - 0.45);
  }

  const title = titleBlock(el, {
    kicker: "Contatti",
    lines: ["Una richiesta,", "*in pochi secondi.*"],
    dek: L("Arriva allo studio.<br>La risposta, via email.", null),
    x: L(120, 90),
    y: L(330, 210),
    size: L(80, 96),
    width: L(600, 900),
    paper: true,
  });
  // Pannello chiaro dietro al titolo, per leggerlo sopra il browser.
  if (!PORTRAIT) {
    const veil = h("div", { class: "abs" });
    place(veil, { x: 0, y: 0, w: 900, h: H });
    veil.style.background = "linear-gradient(90deg, rgba(246,243,238,0.97) 0%, rgba(246,243,238,0.93) 55%, rgba(246,243,238,0) 100%)";
    el.insertBefore(veil, title.box);
    tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, start + 0.3);
  } else {
    const veil = h("div", { class: "abs" });
    place(veil, { x: 0, y: 0, w: W, h: 620 });
    veil.style.background = "linear-gradient(180deg, rgba(246,243,238,0.98) 0%, rgba(246,243,238,0.94) 70%, rgba(246,243,238,0) 100%)";
    el.insertBefore(veil, title.box);
  }
  revealTitle(tl, T.form + 0.05, title);
  hideTitle(tl, T.privacy - 0.5, title);

  if (sentT !== null) {
    const c1 = callout(el, "Richiesta inviata allo studio", "mail");
    place(c1, L({ x: 1080, y: 900 }, { x: 170, y: 1500 }));
    popIn(tl, c1, sentT + 0.35);
    popOut(tl, c1, T.privacy - 0.4);
  }
}

// Punti di interesse del modulo nella clip «contact» (coordinate CSS della pagina).
let FOCUS = null;
export function setClipFocus(value) {
  FOCUS = value;
}
function clipFocus() {
  return (
    FOCUS || {
      top: { x: 1000, y: 330 },
      mid: { x: 1000, y: 470 },
      low: { x: 1000, y: 420 },
    }
  );
}

// 7 — Privacy.
function sPrivacy(tl, stage) {
  const start = T.privacy - 0.42;
  const end = T.mobile + 0.5;
  const el = scene(stage, start, end, { paper: true, z: 8 });
  const bg = backdrop(el, "paper", { veinOpacity: 0.7 });
  tl.fromTo(el, { clipPath: `inset(0% 0% 0% 100%)` }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "power4.inOut" }, start);
  tl.set(el, { clipPath: "none" }, start + 0.77);
  cue(start, "sweep", { dur: 0.75 });
  tl.fromTo(bg.holder, { x: 0 }, { x: L(-70, -40), y: L(-20, -60), duration: end - start, ease: "none" }, start);

  const dev = browser();
  el.append(dev.el);
  const m = (k) => marker("consent", k);
  const foot = new Footage("consent", dev.img)
    .play(start + 0.1, m("start") + 0.2, { speed: 1.35, c1: m("save") + 0.05 })
    .visible(start, end);
  const saveT = foot.timeOf(m("save") + 0.05);
  foot.play(saveT + 0.02, m("swap") - 0.1, { speed: 1.0 });
  foot.cueMarkers([["choose", "click"], ["box-fonts", "click"], ["box-maps", "click"]]);
  cue(saveT, "click");
  cue(saveT + 0.05, "success");

  const rest = L({ x: 1250, y: 560, scale: 0.76, rotationX: 3, rotationY: -10 }, { x: 540, y: 1250, scale: 0.94, rotationX: 3, rotationY: -4 });
  setDevice(dev.el, { ...rest, y: rest.y + 120, autoAlpha: 0 });
  tl.to(dev.el, { ...rest, autoAlpha: 1, duration: 1.0, ease: "expo.out" }, start + 0.15);
  const chooseT = foot.timeOf(m("choose"));
  tl.to(dev.el, { scale: rest.scale * L(1.18, 1.22), x: L(1190, 540), y: L(520, 1230), rotationY: L(-5, -2), duration: 1.2, ease: "power3.inOut" }, chooseT - 0.1);
  tl.to(dev.el, { scale: rest.scale, x: rest.x, y: rest.y, rotationY: rest.rotationY, duration: 0.9, ease: "power3.inOut" }, saveT + 0.1);

  const title = titleBlock(el, {
    kicker: "Privacy",
    lines: ["Privacy,", "*prima di tutto.*"],
    x: L(120, 90),
    y: L(250, 210),
    size: L(82, 98),
    width: L(600, 900),
    paper: true,
  });
  revealTitle(tl, T.privacy + 0.05, title);
  hideTitle(tl, T.mobile - 0.5, title);
  const points = [
    ["Caratteri e mappe solo con il consenso", "shield"],
    ["Richieste cancellate dopo 24 mesi", "clock"],
  ];
  points.forEach(([text, ic], index) => {
    const c = callout(el, text, ic, { light: true });
    c.style.fontSize = L("22px", "25px");
    place(c, L({ x: 120, y: 560 + index * 86 }, { x: 90, y: 530 + index * 84 }));
    popIn(tl, c, T.privacy + 0.75 + index * 0.35, { from: { x: -40, scale: 0.92 }, dur: 0.8, ease: "expo.out" });
    popOut(tl, c, T.mobile - 0.45 + index * 0.05);
    cue(T.privacy + 0.75 + index * 0.35, "pop", { pitch: 2 + index });
  });
}

// 8 — Su ogni schermo.
function sMobile(tl, stage) {
  const start = T.mobile - 0.45;
  const end = T.wall + 0.5;
  const el = scene(stage, start, end, { z: 9 });
  const bg = backdrop(el, "navy");
  ringWipe(tl, stage, el, start, W / 2, H / 2, { dur: 0.95 });
  tl.fromTo(bg.holder, { x: 0, y: 0 }, { x: L(-60, -30), y: L(-40, -80), duration: end - start, ease: "none" }, start);

  const specs = PORTRAIT
    ? [
        { clip: "m-novita", c0: 1.2, x: 250, y: 1190, scale: 1.0, ry: 14, z: 1, d: 0.12 },
        { clip: "m-intro", c0: 6.0, x: 830, y: 1190, scale: 1.0, ry: -14, z: 1, d: 0.24 },
        { clip: "m-scroll", c0: 0.0, x: 540, y: 1150, scale: 1.3, ry: 0, z: 3, d: 0 },
      ]
    : [
        { clip: "m-novita", c0: 1.2, x: 860, y: 566, scale: 0.86, ry: 16, z: 1, d: 0.12 },
        { clip: "m-intro", c0: 6.0, x: 1650, y: 566, scale: 0.86, ry: -16, z: 1, d: 0.24 },
        { clip: "m-scroll", c0: 0.0, x: 1255, y: 548, scale: 1.0, ry: -4, z: 3, d: 0 },
      ];
  for (const spec of specs) {
    const dev = phone();
    dev.el.style.zIndex = String(spec.z);
    el.append(dev.el);
    const foot = new Footage(spec.clip, dev.img).play(start + 0.2, spec.c0).visible(start, end);
    if (spec.clip === "m-scroll") foot.cueMarkers([["open", "tap"]]);
    const rest = { x: spec.x, y: spec.y, scale: spec.scale, rotationY: spec.ry, rotationX: 6 };
    setDevice(dev.el, { ...rest, y: spec.y + H * 0.75, rotationX: 30 });
    tl.to(dev.el, { ...rest, duration: 1.2, ease: "expo.out" }, start + 0.25 + spec.d);
    floatDevice(tl, dev.el, start + 1.5 + spec.d, 3.4, { ry: 2.4, dy: 14 });
    tl.to(dev.el, { y: `-=${H * 0.25}`, autoAlpha: 0, scale: spec.scale * 1.1, duration: 0.55, ease: "power3.in" }, T.wall - 0.5 + spec.d * 0.5);
  }
  cue(start + 0.25, "rise");

  const title = titleBlock(el, {
    kicker: "Responsive",
    lines: ["Perfetto", "*su ogni schermo.*"],
    dek: L("Dallo smartphone al desktop,<br>lo stesso ordine.", null),
    x: L(120, 90),
    y: L(330, 210),
    size: L(80, 98),
    width: L(560, 900),
  });
  revealTitle(tl, T.mobile + 0.15, title);
  hideTitle(tl, T.wall - 0.55, title);
}

// 9 — Tutte le pagine.
function sWall(tl, stage) {
  const start = T.wall - 0.4;
  const end = T.outro + 0.5;
  const el = scene(stage, start, end, { z: 10 });
  const bg = h("div", { class: "layer" });
  bg.style.background = "radial-gradient(70% 70% at 50% 45%, #3a4957 0%, #24303a 70%, #1b242c 100%)";
  el.append(bg);
  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "none" }, start);

  const plane = h("div", { class: "abs" });
  const cols = 6;
  const tileW = 520;
  const tileH = 325;
  const gap = 34;
  const shots = [
    "home-1", "home-2", "agricoltura-1", "home-3", "home-4", "forestale-1",
    "home-5", "bandi-1", "home-6", "appalti-1", "home-7", "home-8",
    "privacy-1", "home-9", "agricoltura-2", "home-10", "cookie-1", "home-11",
    "appalti-2", "home-12", "note-1", "home-13", "bandi-2", "home-14",
    "forestale-2", "home-2", "home-4", "agricoltura-1", "home-8", "home-1",
  ];
  const rows = Math.ceil(shots.length / cols);
  const planeW = cols * tileW + (cols - 1) * gap;
  const planeH = rows * tileH + (rows - 1) * gap;
  place(plane, { x: W / 2 - planeW / 2, y: H / 2 - planeH / 2, w: planeW, h: planeH });
  plane.style.transformStyle = "preserve-3d";
  const columns = [];
  for (let c = 0; c < cols; c += 1) {
    const col = h("div", { class: "abs" });
    place(col, { x: c * (tileW + gap), y: 0, w: tileW, h: planeH });
    plane.append(col);
    columns.push(col);
  }
  shots.forEach((name, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const tile = h("div", { class: "tile" }, h("img", { src: still(`${name}.jpg`), alt: "" }));
    place(tile, { x: 0, y: row * (tileH + gap), w: tileW, h: tileH });
    columns[col].append(tile);
  });
  el.append(plane);
  gsap.set(plane, { transformPerspective: 2600, rotationX: 46, rotationZ: -22, scale: L(1.05, 1.5), transformOrigin: "50% 50%" });
  tl.fromTo(plane, { scale: L(1.6, 2.2), autoAlpha: 0 }, { scale: L(1.05, 1.5), autoAlpha: 1, duration: 1.4, ease: "expo.out" }, start + 0.05);
  tl.to(plane, { scale: L(0.98, 1.4), duration: end - start - 1.4, ease: "none" }, start + 1.45);
  columns.forEach((col, c) => {
    const dir = c % 2 ? 1 : -1;
    tl.fromTo(col, { y: dir * 160 }, { y: dir * -160, duration: end - start, ease: "none" }, start);
  });
  cue(start + 0.05, "whoosh", { dur: 1.2 });

  const shade = h("div", { class: "layer" });
  shade.style.background = "radial-gradient(52% 40% at 50% 50%, rgba(27,36,44,0.88) 0%, rgba(27,36,44,0.55) 55%, rgba(27,36,44,0) 100%)";
  el.append(shade);
  tl.fromTo(shade, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, T.wall + 0.2);

  const title = titleBlock(el, {
    kicker: "Il progetto",
    lines: ["Otto pagine,", "*un solo stile.*"],
    x: L(360, 90),
    y: L(395, 760),
    size: L(104, 104),
    width: L(1200, 900),
    align: "center",
  });
  revealTitle(tl, T.wall + 0.35, title);
  hideTitle(tl, T.outro - 0.5, title);
}

// 10 — Chiusura: il biglietto da visita e il sito.
function sOutro(tl, stage) {
  const start = T.outro - 0.45;
  const end = T.end + 1;
  const el = scene(stage, start, end, { paper: true, z: 11 });
  const bg = backdrop(el, "paper", { veinOpacity: 0.85 });
  drawPaths(tl, bg.veins.paths, start, { dur: 3.6, stagger: 0.1 });
  tl.fromTo(bg.veins.svg, { opacity: 0 }, { opacity: 0.85, duration: 1.8, ease: "power1.in" }, start + 0.2);
  ringWipe(tl, stage, el, start, W / 2, H / 2, { dur: 1.0 });
  tl.fromTo(bg.holder, { x: 0, y: 0, rotation: -1 }, { x: L(-40, -20), y: L(-30, -70), rotation: 1, duration: end - start, ease: "none" }, start);

  const cardW = L(820, 900);
  const cardH = Math.round((cardW * 55) / 85);
  const card = h("div", { class: "bizcard" });
  const front = h("div", { class: "face" }, h("img", { src: still("card-front.png"), alt: "" }));
  const back = h("div", { class: "face back-face" }, h("img", { src: still("card-back.png"), alt: "" }));
  card.append(front, back);
  place(card, { x: 0, y: 0, w: cardW, h: cardH });
  el.append(card);
  const cx = W / 2;
  const cy = L(450, 760);
  gsap.set(card, { xPercent: -50, yPercent: -50, x: cx, y: cy + 260, transformPerspective: 2200, rotationX: 55, rotationY: -30, scale: 0.7, autoAlpha: 0 });
  tl.to(card, { autoAlpha: 1, duration: 0.3 }, T.outro);
  tl.to(card, { y: cy, rotationX: 10, rotationY: -16, rotation: -2, scale: 1, duration: 1.4, ease: "expo.out" }, T.outro);
  cue(T.outro, "hit");
  tl.to(card, { rotationY: -10, rotationX: 6, duration: 1.0, ease: "sine.inOut" }, T.outro + 1.4);
  const flipT = T.outro + 2.4;
  tl.to(card, { rotationY: 170, rotationX: 6, rotation: 1, duration: 1.2, ease: "power3.inOut" }, flipT);
  cue(flipT, "whoosh", { dur: 1.0 });
  tl.to(card, { rotationY: 180, rotationX: 0, rotation: 0, y: L(330, 700), scale: L(0.8, 0.9), duration: 1.2, ease: "power3.inOut" }, flipT + 1.25);

  const lineT = flipT + 1.6;
  const url = h("div", { text: "studiosqueri.net" });
  Object.assign(url.style, { fontWeight: "800", fontSize: L("78px", "84px"), letterSpacing: "-0.045em", color: "var(--ink)", textAlign: "center", width: `${W}px` });
  const slogan = h("div", { text: "Contabilità e adempimenti." });
  Object.assign(slogan.style, { fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: "500", fontSize: L("40px", "44px"), letterSpacing: "-0.02em", color: "var(--gold-deep)", textAlign: "center", width: `${W}px`, marginTop: "6px" });
  const credit = h("div", { text: "Sito realizzato da 3C Servizi Digital" });
  Object.assign(credit.style, { fontWeight: "700", fontSize: L("19px", "22px"), letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted)", textAlign: "center", width: `${W}px`, marginTop: L("46px", "60px") });
  const block = h("div", { class: "abs" }, h("div", { class: "mask" }, url), h("div", { class: "mask" }, slogan), credit);
  place(block, { x: 0, y: L(640, 1130) });
  el.append(block);
  tl.fromTo(url, { yPercent: 110 }, { yPercent: 0, duration: 1.0, ease: "expo.out" }, lineT);
  tl.fromTo(slogan, { yPercent: 110 }, { yPercent: 0, duration: 1.0, ease: "expo.out" }, lineT + 0.15);
  tl.fromTo(credit, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" }, lineT + 0.6);
  cue(lineT, "chime");
  tl.to(card, { y: `-=${8}`, rotationY: 184, duration: 1.6, ease: "sine.inOut" }, flipT + 2.5);
  tl.to(card, { y: `+=${10}`, rotationY: 177, rotationX: 2, duration: T.end - (flipT + 4.1), ease: "sine.inOut" }, flipT + 4.1);
}

export function buildScenes(tl, stage) {
  sIntro(tl, stage);
  sIdentity(tl, stage);
  sServices(tl, stage);
  sAi(tl, stage);
  sAiSite(tl, stage);
  sJourney(tl, stage);
  sForm(tl, stage);
  sPrivacy(tl, stage);
  sMobile(tl, stage);
  sWall(tl, stage);
  sOutro(tl, stage);
}

