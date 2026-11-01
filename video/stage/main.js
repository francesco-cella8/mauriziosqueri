import { W, H, PORTRAIT, gsap, cues, footages, loadClips, loadImages, clipInfo } from "./lib.js";
import { buildScenes, scenes, setClipFocus, T } from "./scenes.js";

gsap.config({ force3D: false, nullTargetWarn: false });
gsap.ticker.lagSmoothing(0);

const stage = document.getElementById("stage");
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;
document.documentElement.dataset.format = PORTRAIT ? "portrait" : "landscape";

async function fontsReady() {
  const faces = [
    'italic 500 40px "Newsreader"',
    '500 40px "Newsreader"',
    '800 40px "Plus Jakarta Sans"',
    '700 40px "Plus Jakarta Sans"',
    '600 40px "Plus Jakarta Sans"',
    '500 40px "Plus Jakarta Sans"',
  ];
  await Promise.all(faces.map((face) => document.fonts.load(face, "Aaàèìòù,.")));
  await document.fonts.ready;
}

function applyVisibility(t) {
  for (const s of scenes) {
    const on = t >= s.start && t < s.end;
    s.el.style.visibility = on ? "visible" : "hidden";
  }
}

async function init() {
  await fontsReady();
  await loadClips();
  const contact = clipInfo("contact").markers;
  if (contact.focusTop && contact.focusLow) {
    setClipFocus({ top: contact.focusTop, mid: contact.focusMid || contact.focusTop, low: contact.focusLow });
  }
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });
  buildScenes(tl, stage);
  await loadImages(stage);
  // Prima passata: GSAP registra i valori di partenza nell'ordine naturale.
  for (let t = 0; t <= T.end + 1; t += 1 / 30) tl.seek(t, false);
  tl.seek(0, false);
  window.__duration = T.end;
  window.__cues = [...cues].sort((a, b) => a.time - b.time);
  window.__seek = async (t) => {
    tl.seek(t, false);
    applyVisibility(t);
    await Promise.all(footages.map((footage) => footage.update(t)));
  };
  await window.__seek(0);
  window.__ready = true;
}

init().catch((error) => {
  window.__error = String(error && error.stack ? error.stack : error);
  console.error(error);
});
