// Miniatura di YouTube (16:9) e copertina del Reel (9:16): una scena ferma, testo grande.

import { W, H, PORTRAIT, L, gsap, h, place, backdrop, browser, phone, setDevice, loadClips, clipInfo, loadImages, eyebrow, headline } from "./lib.js";

const stage = document.getElementById("stage");
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;

async function init() {
  await Promise.all(
    ['italic 500 40px "Newsreader"', '800 40px "Plus Jakarta Sans"', '700 40px "Plus Jakarta Sans"'].map((f) =>
      document.fonts.load(f, "Aaàè")
    )
  );
  await loadClips();
  const el = h("div", { class: "layer" });
  stage.append(el);
  const bg = backdrop(el, "navy", { veinScale: L(2.0, 2.6), veinOpacity: 0.5 });
  gsap.set(bg.holder, { x: L(-60, -40), y: L(-40, -90), rotation: 3 });

  const glow = h("div", { class: "glow" });
  place(glow, L({ x: 980, y: 120, w: 900, h: 840 }, { x: 140, y: 820, w: 800, h: 900 }));
  glow.style.background = "radial-gradient(circle, rgba(217,203,184,0.32), transparent 65%)";
  el.append(glow);

  const dev = PORTRAIT ? phone() : browser({ dark: true });
  el.append(dev.el);
  const info = clipInfo(PORTRAIT ? "m-intro" : "intro");
  const frame = PORTRAIT ? 246 : 300;
  dev.img.src = `/clips/${info.name}/${String(frame).padStart(5, "0")}.jpg`;
  setDevice(
    dev.el,
    PORTRAIT
      ? { x: 565, y: 1345, scale: 1.3, rotationX: 6, rotationY: -12, rotation: 3 }
      : { x: 1330, y: 590, scale: 0.72, rotationX: 6, rotationY: -18, rotation: 0 }
  );

  const box = h("div", { class: "abs" });
  place(box, L({ x: 96, y: 250, w: 900 }, { x: 80, y: 190, w: 940 }));
  const eb = eyebrow("studiosqueri.net");
  eb.el.style.fontSize = L("30px", "34px");
  eb.el.style.marginBottom = "34px";
  const hl = headline(["Il nuovo sito", "*Studio Squeri.*"], { size: L(150, 150) });
  hl.el.style.lineHeight = "0.98";
  box.append(eb.el, hl.el);
  const tag = h("div", { text: "Design · Animazioni · AI · Privacy" });
  Object.assign(tag.style, {
    marginTop: L("40px", "44px"),
    display: "inline-block",
    padding: L("16px 28px", "18px 30px"),
    borderRadius: "999px",
    background: "linear-gradient(180deg,#ece2d4,#d6c7b1)",
    color: "#243039",
    fontWeight: "800",
    fontSize: L("30px", "34px"),
    letterSpacing: "-0.01em",
  });
  box.append(tag);
  el.append(box);

  await loadImages(stage);
  window.__ready = true;
}

init().catch((error) => {
  window.__error = String(error && error.stack ? error.stack : error);
});
