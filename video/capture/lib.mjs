// Registra il sito vero, un fotogramma alla volta.
// Il tempo della pagina è finto (page.clock): GSAP, timer e requestAnimationFrame
// avanzano solo quando lo diciamo noi, così ogni clip è fluida e ripetibile.
// Le transizioni e le animazioni CSS avanzano a mano con le Web Animations API.

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

export const SITE = process.env.SITE_URL || "http://localhost:5173";
export const CACHE = fileURLToPath(new URL("../.cache/", import.meta.url));
export const CLIPS = path.join(CACHE, "clips");

export const ease = {
  linear: (t) => t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inCubic: (t) => t * t * t,
};

const lerp = (a, b, t) => a + (b - a) * t;

// Script iniettato prima di ogni altro script della pagina.
function pageInit({ consent, pointer }) {
  try {
    if (consent) {
      localStorage.setItem(
        "squeri-consent",
        JSON.stringify({ v: 1, fonts: !!consent.fonts, maps: !!consent.maps, t: new Date().toISOString() })
      );
    } else {
      localStorage.removeItem("squeri-consent");
    }
  } catch {}

  const css = document.createElement("style");
  css.textContent = "html{scroll-behavior:auto!important}";
  if (document.documentElement) {
    document.documentElement.append(css);
  } else {
    new MutationObserver((list, observer) => {
      if (!document.documentElement) return;
      document.documentElement.append(css);
      observer.disconnect();
    }).observe(document, { childList: true });
  }

  // Scroll morbido nel tempo finto: window.scrollTo({behavior:"smooth"}) del sito
  // diventa un'animazione guidata da requestAnimationFrame.
  const nativeScrollTo = window.scrollTo.bind(window);
  window.__nativeScrollTo = nativeScrollTo;
  window.__smooth = false;
  window.addEventListener(
    "scrollend",
    (event) => {
      if (window.__smooth && event.isTrusted) event.stopImmediatePropagation();
    },
    true
  );
  window.scrollTo = function (a, b) {
    let top;
    let behavior;
    if (a && typeof a === "object") {
      top = a.top;
      behavior = a.behavior;
    } else {
      top = b;
    }
    if (top === undefined) top = window.scrollY;
    if (behavior !== "smooth") {
      nativeScrollTo({ top, left: 0, behavior: "instant" });
      return;
    }
    const from = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const to = Math.max(0, Math.min(max, top));
    const dist = Math.abs(to - from);
    const duration = Math.min(1500, 520 + dist * 0.42);
    const start = performance.now();
    window.__smooth = true;
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / duration);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      nativeScrollTo({ top: from + (to - from) * e, left: 0, behavior: "instant" });
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        window.__smooth = false;
        document.dispatchEvent(new Event("scrollend", { bubbles: true }));
      }
    };
    requestAnimationFrame(step);
  };

  // Avanza a mano transizioni e animazioni CSS.
  window.__stepAnims = (dt) => {
    for (const anim of document.getAnimations()) {
      if (anim.__vt === undefined) {
        anim.__vt = 0;
        try {
          anim.pause();
          anim.currentTime = 0;
        } catch {}
      } else {
        anim.__vt += dt;
        try {
          anim.currentTime = anim.__vt;
        } catch {}
      }
    }
  };

  // Puntatore disegnato nella pagina (mouse su desktop, dito su mobile).
  window.__cur = (() => {
    let root = null;
    let arrow = null;
    let hand = null;
    let ring = null;
    let x = -200;
    let y = -200;
    let visible = false;
    let pressed = 0;
    let clickAt = -1e9;
    const ARROW = `<svg width="30" height="30" viewBox="0 0 30 30" style="display:block;width:30px;height:30px;max-width:none"><path d="M6 3.2v20.6l5.1-4.9 3.3 7.6 3.6-1.6-3.3-7.4h7.1z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const HAND = `<svg width="30" height="30" viewBox="0 0 30 30" style="display:block;width:30px;height:30px;max-width:none"><path d="M11.2 14.3V5.6a1.9 1.9 0 0 1 3.8 0v7.1l.2-.9a1.8 1.8 0 0 1 3.5.3v1.2a1.8 1.8 0 0 1 3.5.4v1a1.7 1.7 0 0 1 3.3.6v5.1c0 4-2.6 7-6.6 7h-2.1c-2.6 0-4.3-1-5.6-3.1l-3.7-6.2a1.8 1.8 0 0 1 2.9-2.2z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    function ensure() {
      if (root) return;
      root = document.createElement("div");
      root.setAttribute("aria-hidden", "true");
      root.style.cssText =
        "position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;will-change:transform;";
      ring = document.createElement("div");
      if (pointer === "touch") {
        ring.style.cssText =
          "position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid rgba(36,48,57,.35);box-shadow:0 4px 18px rgba(0,0,0,.18);opacity:0;";
      } else {
        ring.style.cssText =
          "position:absolute;left:-24px;top:-24px;width:48px;height:48px;border-radius:50%;border:2.5px solid rgba(217,203,184,.95);background:rgba(217,203,184,.18);opacity:0;";
      }
      arrow = document.createElement("div");
      arrow.innerHTML = ARROW;
      arrow.style.cssText =
        "position:absolute;left:-6px;top:-3px;width:30px;height:30px;transform-origin:6px 3px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.28));";
      hand = document.createElement("div");
      hand.innerHTML = HAND;
      hand.style.cssText =
        "position:absolute;left:-12px;top:-5px;width:30px;height:30px;display:none;transform-origin:12px 5px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.28));";
      root.append(ring, arrow, hand);
      document.documentElement.append(root);
    }
    function wantsHand() {
      const el = document.elementFromPoint(x, y);
      for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
        const c = getComputedStyle(node).cursor;
        if (c === "pointer") return true;
        if (c && c !== "auto") return false;
      }
      return false;
    }
    return {
      set(nx, ny) {
        ensure();
        x = nx;
        y = ny;
      },
      show(on = true) {
        ensure();
        visible = on;
      },
      click() {
        clickAt = performance.now();
      },
      press(on) {
        pressed = on ? 1 : 0;
      },
      frame() {
        if (!root) return;
        root.style.transform = `translate(${x}px, ${y}px)`;
        root.style.opacity = visible ? "1" : "0";
        const k = (performance.now() - clickAt) / 1000;
        if (pointer === "touch") {
          arrow.style.display = "none";
          hand.style.display = "none";
          const press = k < 0.12 ? k / 0.12 : Math.max(0, 1 - (k - 0.12) / 0.32);
          const hold = pressed ? 1 : press;
          ring.style.opacity = String(Math.min(1, hold) * 0.95);
          ring.style.transform = `scale(${0.75 + 0.25 * Math.min(1, hold)})`;
          return;
        }
        const handOn = wantsHand();
        arrow.style.display = handOn ? "none" : "block";
        hand.style.display = handOn ? "block" : "none";
        const squash = pressed ? 0.88 : k < 0.14 ? 1 - 0.12 * Math.sin((k / 0.14) * Math.PI) : 1;
        arrow.style.transform = `scale(${squash})`;
        hand.style.transform = `scale(${squash})`;
        if (k >= 0 && k < 0.55) {
          const p = k / 0.55;
          ring.style.opacity = String((1 - p) * 0.9);
          ring.style.transform = `scale(${0.35 + p * 1.25})`;
        } else {
          ring.style.opacity = "0";
        }
      },
    };
  })();
}

export async function launch() {
  return chromium.launch({ args: ["--hide-scrollbars", "--font-render-hinting=none"] });
}

export class Recorder {
  constructor(opts) {
    this.opts = {
      fps: 60,
      dpr: 2,
      quality: 92,
      mobile: false,
      pointer: "mouse",
      consent: { fonts: true, maps: false },
      startAt: "2026-11-02T09:40:00+01:00",
      ...opts,
    };
    this.frame = 0;
    this.clockMs = 0;
    this.markers = {};
    this.mouse = { x: -200, y: -200 };
    this.scrollY = 0;
    this.dir = path.join(CLIPS, this.opts.name);
  }

  async open(browser, url, { settle = 0 } = {}) {
    const o = this.opts;
    this.context = await browser.newContext({
      viewport: o.viewport,
      deviceScaleFactor: o.dpr,
      isMobile: o.mobile,
      hasTouch: o.mobile,
      locale: "it-IT",
      timezoneId: "Europe/Rome",
      reducedMotion: "no-preference",
      colorScheme: "light",
      userAgent: o.mobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
        : undefined,
    });
    await this.context.addInitScript(pageInit, { consent: o.consent, pointer: o.pointer });
    if (o.routes) await o.routes(this.context, this);
    this.page = await this.context.newPage();
    const t0 = Date.parse(o.startAt);
    await this.page.clock.install({ time: t0 });
    await this.page.clock.pauseAt(t0 + 1000);
    this.cdp = await this.context.newCDPSession(this.page);
    await this.page.goto(url, { waitUntil: "load" });
    await this.page.evaluate(() => document.fonts.ready);
    if (o.consent?.fonts) await this.waitFonts();
    await this.page.waitForTimeout(400);
    if (settle) await this.advance(settle);
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
    return this.page;
  }

  async waitFonts() {
    for (let i = 0; i < 100; i += 1) {
      const ok = await this.page.evaluate(() => {
        const faces = [...document.fonts];
        const loaded = (family) =>
          faces.some((face) => face.family.replace(/"/g, "") === family && face.status === "loaded");
        return loaded("Newsreader") && loaded("Plus Jakarta Sans");
      });
      if (ok) return true;
      await this.page.waitForTimeout(200);
    }
    console.warn("  ! caratteri non confermati");
    return false;
  }

  // Avanza il tempo finto senza registrare.
  async advance(seconds) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i += 1) {
      await this.page.clock.runFor(17);
      await this.page.evaluate(() => window.__stepAnims(17));
    }
    await this.page.waitForTimeout(150);
  }

  mark(name) {
    this.markers[name] = this.frame;
  }

  async applyPointer() {
    const { x, y } = this.mouse;
    await this.page.evaluate(([px, py]) => window.__cur.set(px, py), [x, y]);
    if (this.opts.pointer === "mouse" && this.mouseVisible) await this.page.mouse.move(x, y);
  }

  async shoot() {
    const fps = this.opts.fps;
    this.frame += 1;
    const target = Math.round((this.frame * 1000) / fps);
    const dt = target - this.clockMs;
    await this.page.clock.runFor(dt);
    this.clockMs = target;
    const [sx, sy] = await this.page.evaluate((d) => {
      window.__stepAnims(d);
      window.__cur.frame();
      const vv = window.visualViewport;
      return vv ? [vv.pageLeft, vv.pageTop] : [window.scrollX, window.scrollY];
    }, dt);
    const { viewport, dpr, quality } = this.opts;
    // Il ritaglio è in coordinate del documento: segue lo scroll.
    const { data } = await this.cdp.send("Page.captureScreenshot", {
      format: "jpeg",
      quality,
      optimizeForSpeed: true,
      captureBeyondViewport: false,
      clip: { x: sx, y: sy, width: viewport.width, height: viewport.height, scale: dpr },
    });
    fs.writeFileSync(path.join(this.dir, `${String(this.frame).padStart(5, "0")}.jpg`), Buffer.from(data, "base64"));
  }

  // Esegue fn(p) prima di ogni fotogramma per `seconds` secondi.
  async run(seconds, fn) {
    const n = Math.max(1, Math.round(seconds * this.opts.fps));
    for (let i = 1; i <= n; i += 1) {
      if (fn) await fn(i / n, i);
      await this.shoot();
    }
  }

  async hold(seconds) {
    await this.run(seconds, () => this.applyPointer());
  }

  get seconds() {
    return this.frame / this.opts.fps;
  }

  async holdUntil(seconds) {
    const left = seconds - this.seconds;
    if (left > 0.5 / this.opts.fps) await this.hold(left);
  }

  async setScroll(y) {
    this.scrollY = y;
    await this.page.evaluate((v) => window.__nativeScrollTo({ top: v, left: 0, behavior: "instant" }), y);
  }

  async scrollTo(y, seconds, easing = ease.inOutCubic, extra) {
    const from = await this.page.evaluate(() => window.scrollY);
    await this.run(seconds, async (p) => {
      await this.setScroll(Math.round(lerp(from, y, easing(p)) * 100) / 100);
      if (extra) await extra(p);
      await this.applyPointer();
    });
  }

  async showPointer(x, y) {
    this.mouse = { x, y };
    this.mouseVisible = true;
    await this.page.evaluate(([px, py]) => {
      window.__cur.set(px, py);
      window.__cur.show(true);
    }, [x, y]);
    if (this.opts.pointer === "mouse") await this.page.mouse.move(x, y);
  }

  async hidePointer() {
    this.mouseVisible = false;
    await this.page.evaluate(() => window.__cur.show(false));
  }

  // Movimento del puntatore su una curva leggera, con easing.
  async moveTo(x, y, seconds, easing = ease.inOutCubic, extra) {
    const from = { ...this.mouse };
    const dx = x - from.x;
    const dy = y - from.y;
    const bend = 0.12;
    const cx = from.x + dx * 0.5 - dy * bend;
    const cy = from.y + dy * 0.5 + dx * bend;
    await this.run(seconds, async (p) => {
      const t = easing(p);
      const u = 1 - t;
      this.mouse = {
        x: u * u * from.x + 2 * u * t * cx + t * t * x,
        y: u * u * from.y + 2 * u * t * cy + t * t * y,
      };
      if (extra) await extra(p);
      await this.applyPointer();
    });
  }

  async center(selector) {
    const box = await this.page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`Elemento non visibile: ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  async docTop(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el.getBoundingClientRect().top + window.scrollY;
    }, selector);
  }

  async click(label) {
    if (label) this.mark(label);
    const { x, y } = this.mouse;
    await this.page.evaluate(() => {
      window.__cur.press(true);
      window.__cur.click();
    });
    if (this.opts.pointer === "touch") {
      await this.shoot();
      await this.page.touchscreen.tap(x, y);
      await this.page.evaluate(() => window.__cur.press(false));
      return;
    }
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.shoot();
    await this.shoot();
    await this.page.mouse.up();
    await this.page.evaluate(() => window.__cur.press(false));
  }

  async type(text, cps = 22, label) {
    if (label) this.mark(label);
    const perChar = 1 / cps;
    let acc = 0;
    const keys = [];
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      keys.push(this.frame);
      acc += perChar * (ch === " " ? 0.7 : 1) * (0.75 + 0.5 * Math.abs(Math.sin(keys.length * 12.9898)));
      while (acc >= 1 / this.opts.fps) {
        await this.applyPointer();
        await this.shoot();
        acc -= 1 / this.opts.fps;
      }
    }
    this.markers[`${label || "type"}:keys`] = keys;
  }

  async finish() {
    const o = this.opts;
    const manifest = {
      name: o.name,
      fps: o.fps,
      frames: this.frame,
      width: o.viewport.width * o.dpr,
      height: o.viewport.height * o.dpr,
      viewport: o.viewport,
      dpr: o.dpr,
      markers: this.markers,
    };
    fs.writeFileSync(path.join(this.dir, "clip.json"), JSON.stringify(manifest, null, 2));
    await this.context.close();
    return manifest;
  }
}
