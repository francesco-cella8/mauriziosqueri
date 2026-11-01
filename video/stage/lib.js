// Strumenti comuni della composizione: formato, DOM, testi, dispositivi, clip.

export const params = new URLSearchParams(location.search);
export const PORTRAIT = params.get("format") === "portrait";
export const W = PORTRAIT ? 1080 : 1920;
export const H = PORTRAIT ? 1920 : 1080;
export const L = (landscape, portrait) => (PORTRAIT ? portrait : landscape);

export const gsap = window.gsap;

export const cues = [];
export function cue(time, type, extra = {}) {
  cues.push({ time: Math.round(time * 1000) / 1000, type, ...extra });
}

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "style" && typeof value === "object") Object.assign(el.style, value);
    else if (key === "html") el.innerHTML = value;
    else if (key === "text") el.textContent = value;
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function px(value) {
  return typeof value === "number" ? `${value}px` : value;
}

export function place(el, { x, y, w, h: height, z } = {}) {
  if (x !== undefined) el.style.left = px(x);
  if (y !== undefined) el.style.top = px(y);
  if (w !== undefined) el.style.width = px(w);
  if (height !== undefined) el.style.height = px(height);
  if (z !== undefined) el.style.zIndex = String(z);
  return el;
}

export const ICON = {
  lock: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>`,
  back: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>`,
  fwd: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7.5 4.5 13 10l-5.5 5.5"/></svg>`,
  reload: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.2h-3.2"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10" stroke-linecap="round"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6" stroke-linecap="round"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c.5 4.4 2.9 6.9 7.5 7.5-4.6.6-7 3.1-7.5 7.5-.5-4.4-2.9-6.9-7.5-7.5 4.6-.6 7-3.1 7.5-7.5z"/><path d="M19 15.5c.2 1.8 1.2 2.8 3 3-1.8.2-2.8 1.2-3 3-.2-1.8-1.2-2.8-3-3 1.8-.2 2.8-1.2 3-3z"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>`,
  type: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 21s-6.5-6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2" stroke-linecap="round"/></svg>`,
};

export function icon(name) {
  return h("span", { class: "ico", html: ICON[name] });
}

// Righe del titolo. La parte tra asterischi è in corsivo, colore oro.
export function headline(lines, { size = 88, width, align = "left", weight } = {}) {
  const el = h("div", { class: "headline", style: { fontSize: px(size), textAlign: align } });
  if (width) el.style.width = px(width);
  if (weight) el.style.fontWeight = String(weight);
  const inners = [];
  const words = [];
  for (const raw of lines) {
    const line = h("span", { class: "line" });
    const inner = h("span");
    const parts = raw.split(/(\*[^*]+\*)/).filter(Boolean);
    for (const part of parts) {
      const accent = part.startsWith("*");
      const text = accent ? part.slice(1, -1) : part;
      const holder = accent ? h("span", { class: "accent" }) : inner;
      for (const token of text.split(/(\s+)/)) {
        if (!token) continue;
        if (/^\s+$/.test(token)) {
          holder.append(document.createTextNode(" "));
          continue;
        }
        const word = h("span", { class: "word", text: token });
        holder.append(word);
        words.push(word);
      }
      if (accent) inner.append(holder);
    }
    line.append(inner);
    el.append(line);
    inners.push(inner);
  }
  return { el, lines: inners, words };
}

export function eyebrow(text) {
  const rule = h("span", { class: "rule" });
  const label = h("span", { text });
  const el = h("div", { class: "eyebrow" }, rule, label);
  return { el, rule, label };
}

// Blocco titolo completo con entrata e uscita.
export function titleBlock(parent, { kicker, lines, dek, x, y, size, width, align, paper }) {
  const box = h("div", { class: `abs${paper ? " on-paper" : ""}` });
  place(box, { x, y, w: width });
  box.style.textAlign = align || "left";
  let eb = null;
  if (kicker) {
    eb = eyebrow(kicker);
    if (align === "center") eb.el.style.justifyContent = "center";
    eb.el.style.marginBottom = px(Math.round((size || 88) * 0.36));
    box.append(eb.el);
  }
  const hl = headline(lines, { size, width, align });
  box.append(hl.el);
  let dekEl = null;
  if (dek) {
    dekEl = h("div", { class: "dek", html: dek });
    dekEl.style.marginTop = px(Math.round((size || 88) * 0.42));
    box.append(h("div", { class: "mask" }, dekEl));
  }
  parent.append(box);
  return { box, eb, hl, dekEl };
}

export function revealTitle(tl, t, block, { stagger = 0.06, dur = 1.0 } = {}) {
  const { eb, hl, dekEl } = block;
  if (eb) {
    tl.fromTo(eb.rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power3.out" }, t);
    tl.fromTo(eb.label, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, t + 0.1);
  }
  tl.fromTo(
    hl.words,
    { yPercent: 165, rotation: 4 },
    { yPercent: 0, rotation: 0, duration: dur, ease: "expo.out", stagger },
    t + 0.08
  );
  if (dekEl) {
    tl.fromTo(dekEl, { yPercent: 120 }, { yPercent: 0, duration: 0.9, ease: "expo.out" }, t + 0.35);
  }
}

export function hideTitle(tl, t, block, { stagger = 0.03, dur = 0.55 } = {}) {
  const { eb, hl, dekEl } = block;
  tl.to(hl.words, { yPercent: -165, duration: dur, ease: "power3.in", stagger }, t);
  if (eb) tl.to([eb.rule, eb.label], { autoAlpha: 0, duration: 0.35, ease: "power2.in" }, t);
  if (dekEl) tl.to(dekEl, { yPercent: -120, duration: 0.45, ease: "power3.in" }, t);
}

// Venature del marmo, le stesse del sito.
const VEINS = [
  ["M-160 180C180 60 420 300 720 150C1020 0 1220 280 1600 120", 54, 0.72, 0],
  ["M-120 220C240 340 500 40 780 210C1060 380 1280 80 1620 240", 16, 0.62, 1],
  ["M-180 460C140 560 400 280 740 470C1080 660 1260 340 1640 520", 36, 0.58, 2],
  ["M-80 700C260 560 520 900 840 720C1120 560 1340 920 1600 740", 10, 0.5, 3],
  ["M-200 920C120 1080 420 740 760 960C1080 1180 1240 780 1660 1020", 48, 0.55, 0],
  ["M-100 1100C220 980 480 1280 800 1120C1100 960 1320 1320 1580 1140", 18, 0.6, 4],
  ["M-140 1340C200 1480 460 1160 800 1380C1120 1600 1280 1220 1640 1460", 32, 0.5, 2],
  ["M-60 1560C280 1420 540 1760 860 1560C1140 1400 1360 1800 1600 1580", 12, 0.48, 3],
  ["M-180 1760C160 1920 440 1580 780 1800C1100 2020 1260 1640 1660 1860", 44, 0.5, 0],
  ["M-80 1980C240 1860 500 2160 820 1980C1120 1820 1340 2200 1580 2000", 16, 0.55, 1],
  ["M-120 2180C200 2060 480 2320 800 2160C1100 2020 1300 2340 1620 2160", 28, 0.46, 2],
  ["M220 260C360 460 300 680 420 900", 8, 0.42, 3],
  ["M980 640C1120 860 1040 1120 1180 1340", 9, 0.4, 1],
  ["M640 1500C760 1680 700 1900 860 2100", 8, 0.38, 4],
];

const VEIN_COLORS = {
  paper: ["#cfc6ba", "#7d8b98", "#b3bdc6", "#5e6e7c", "#96a3ae"],
  navy: ["#56687a", "#6f8293", "#4a5c6c", "#8496a6", "#5f7283"],
};

export function veins({ tone = "paper", scale = 1, opacity = 0.8 } = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 1440 2400");
  svg.setAttribute("width", "1440");
  svg.setAttribute("height", "2400");
  svg.classList.add("veins");
  svg.style.marginLeft = "-720px";
  svg.style.marginTop = "-1200px";
  svg.style.opacity = String(opacity);
  const g = document.createElementNS(ns, "g");
  g.setAttribute("fill", "none");
  g.setAttribute("stroke-linecap", "round");
  g.setAttribute("stroke-linejoin", "round");
  const paths = [];
  for (const [d, width, alpha, colorIndex] of VEINS) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", VEIN_COLORS[tone][colorIndex]);
    path.setAttribute("stroke-width", String(width));
    path.setAttribute("stroke-opacity", String(alpha));
    g.append(path);
    paths.push(path);
  }
  svg.append(g);
  gsap.set(svg, { scale });
  return { svg, paths };
}

export function drawPaths(tl, paths, t, { dur = 2.4, stagger = 0.12, ease = "power2.inOut" } = {}) {
  paths.forEach((path, index) => {
    const length = path.getTotalLength() + 40;
    path.style.strokeDasharray = `${length}`;
    tl.fromTo(
      path,
      { strokeDashoffset: length },
      { strokeDashoffset: 0, duration: dur, ease },
      t + index * stagger
    );
  });
}

export function backdrop(parent, tone, { veinScale = L(2.2, 2.6), veinOpacity, draw = false } = {}) {
  const wrap = h("div", { class: "layer" });
  const base = h("div", { class: tone === "navy" ? "bg-navy" : "bg-paper" });
  const v = veins({ tone, scale: veinScale, opacity: veinOpacity ?? (tone === "navy" ? 0.45 : 0.75) });
  const holder = h("div", { class: "layer" });
  holder.append(v.svg);
  const vignette = h("div", { class: `vignette${tone === "navy" ? "" : " soft"}` });
  wrap.append(base, holder, vignette);
  parent.append(wrap);
  return { wrap, base, holder, veins: v, draw };
}

// Browser con la barra dell'indirizzo. Misure interne = viewport registrata (1440×810).
export function browser({ url = "studiosqueri.net", dark = false } = {}) {
  const img = h("img", { alt: "", decoding: "sync" });
  const view = h("div", { class: "browser-view" }, img);
  const bar = h(
    "div",
    { class: "browser-bar" },
    h("span", { class: "browser-dots" }, h("i"), h("i"), h("i")),
    h("span", { class: "browser-arrows", html: ICON.back + ICON.fwd + ICON.reload }),
    h("span", { class: "browser-url", html: `${ICON.lock}<span>${url}</span>` })
  );
  const el = h("div", { class: `browser${dark ? " dark-shadow" : ""}` }, bar, view);
  el.style.transformOrigin = "50% 50%";
  return { el, view, img, bar, width: 1440, height: 866, barH: 56 };
}

export function phone() {
  const img = h("img", { alt: "", decoding: "sync" });
  const screen = h("div", { class: "phone-screen" }, img, h("div", { class: "phone-glare" }));
  const island = h("div", { class: "phone-island" });
  screen.append(island);
  const el = h("div", { class: "phone" }, screen);
  el.style.transformOrigin = "50% 50%";
  return { el, screen, img, width: 424, height: 878 };
}

// Posiziona un elemento centrato in (x, y) con scala e rotazioni.
export function setDevice(el, state) {
  gsap.set(el, { xPercent: -50, yPercent: -50, transformPerspective: 2600, ...state });
}

// Clip registrate: ogni istanza mostra un fotogramma in base al tempo del video.
let CLIPS = {};
export async function loadClips() {
  const res = await fetch("/clips/index.json");
  const list = await res.json();
  CLIPS = Object.fromEntries(list.map((clip) => [clip.name, clip]));
  return CLIPS;
}

export function clipInfo(name) {
  const info = CLIPS[name];
  if (!info) throw new Error(`Clip mancante: ${name}`);
  return info;
}

export function marker(name, key) {
  const info = clipInfo(name);
  const frame = info.markers[key];
  if (frame === undefined) throw new Error(`Marcatore mancante: ${name}.${key}`);
  return Array.isArray(frame) ? frame.map((f) => f / info.fps) : frame / info.fps;
}

export const footages = [];

export class Footage {
  constructor(name, img) {
    this.name = name;
    this.info = clipInfo(name);
    this.img = img;
    this.segments = [];
    this.current = 0;
    this.active = [-Infinity, Infinity];
    footages.push(this);
  }

  get duration() {
    return this.info.frames / this.info.fps;
  }

  // Dal tempo t0 del video la clip parte da c0, alla velocità data, fino a c1.
  play(t0, c0 = 0, { speed = 1, c1 = this.duration } = {}) {
    this.segments.push({ t0, c0, c1, speed });
    this.segments.sort((a, b) => a.t0 - b.t0);
    return this;
  }

  visible(from, to) {
    this.active = [from, to];
    return this;
  }

  clipTime(t) {
    if (!this.segments.length) return 0;
    let seg = this.segments[0];
    for (const s of this.segments) if (s.t0 <= t) seg = s;
    if (t < seg.t0) return seg.c0;
    return Math.min(seg.c1, seg.c0 + (t - seg.t0) * seg.speed);
  }

  // Tempo del video in cui la clip arriva al tempo c (primo segmento utile).
  timeOf(c) {
    for (const s of this.segments) {
      if (c >= s.c0 && c <= s.c1) return s.t0 + (c - s.c0) / s.speed;
    }
    return null;
  }

  frameAt(t) {
    const frame = Math.round(this.clipTime(t) * this.info.fps);
    return Math.max(1, Math.min(this.info.frames, frame));
  }

  async update(t) {
    if (t < this.active[0] || t > this.active[1]) return;
    const frame = this.frameAt(t);
    if (frame === this.current) return;
    this.current = frame;
    this.img.src = `/clips/${this.name}/${String(frame).padStart(5, "0")}.jpg`;
    try {
      await this.img.decode();
    } catch {
      await new Promise((resolve) => {
        if (this.img.complete) resolve();
        else this.img.onload = this.img.onerror = resolve;
      });
    }
  }

  // Suoni dei clic e dei tasti registrati nella clip.
  cueMarkers(entries) {
    for (const [key, type] of entries) {
      const value = marker(this.name, key);
      const times = Array.isArray(value) ? value : [value];
      for (const c of times) {
        const t = this.timeOf(c);
        if (t !== null && t >= this.active[0] && t <= this.active[1]) cue(t, type);
      }
    }
  }
}

export function still(name) {
  return `/stills/${name}`;
}

export async function loadImages(root) {
  const imgs = [...root.querySelectorAll("img")].filter((img) => img.getAttribute("src"));
  await Promise.all(
    imgs.map((img) =>
      img.decode().catch(
        () =>
          new Promise((resolve) => {
            if (img.complete) resolve();
            else img.onload = img.onerror = resolve;
          })
      )
    )
  );
}
