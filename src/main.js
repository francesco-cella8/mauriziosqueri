import "./consent.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { santoCallsOpen } from "./santo-hours.js";

if (document.querySelector("[data-briefing-stage]")) {
  import("./briefing.js").then(({ mountBriefing }) => {
    mountBriefing({ beforeOpen: closeMenu });
  });
}

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const STUDIO = {
  email: "squeri.m@studiosqueri.com",
};

const servizioLabel = {
  contabilita: "Contabilità e assistenza fiscale alle imprese",
  locazioni: "Contratti di locazione e affitto",
  camerali: "Pratiche camerali e Registro Imprese",
  agricoltura: "Aziende agricole e società agricole",
  forestale: "Settore forestale e Registro Imprese Legno",
  appalti: "Appalti pubblici e privati",
  portali: "Portali per gare e acquisti della PA",
  bandi: "Bandi e contributi regionali",
  privati: "Dichiarazioni dei redditi e servizi ai privati",
  altro: "Altro",
};

const header = document.querySelector(".header");
const menu = document.querySelector("#menu");
const menuBtn = document.querySelector(".menu-btn");
const form = document.querySelector("#richiesta");
const requestPanel = document.querySelector("#request");
const formError = document.querySelector("#formError");
const year = document.querySelector("#year");

if (year) year.textContent = String(new Date().getFullYear());

function watchHeader() {
  if (!header) return;
  const mark = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  if (!("IntersectionObserver" in window)) {
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    return;
  }
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:9px;pointer-events:none;";
  document.body.prepend(sentinel);
  mark();
  const observer = new IntersectionObserver(
    ([entry]) => header.classList.toggle("is-scrolled", !entry.isIntersecting),
    { threshold: 0 }
  );
  observer.observe(sentinel);
}

watchHeader();

function motionOff() {
  return document.documentElement.classList.contains("reduce");
}

function closeMenu() {
  if (!menu || !menuBtn) return;
  gsap.killTweensOf(menu);
  gsap.killTweensOf(menu.querySelectorAll("a"));
  menu.hidden = true;
  gsap.set(menu, { clearProps: "all" });
  gsap.set(menu.querySelectorAll("a"), { clearProps: "all" });
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.querySelector(".sr-only").textContent = "Apri il menu";
  document.body.classList.remove("menu-open");
}

menuBtn?.addEventListener("click", () => {
  if (!menu) return;
  const willOpen = menu.hidden;
  if (!willOpen) {
    closeMenu();
    return;
  }

  menu.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
  menuBtn.querySelector(".sr-only").textContent = "Chiudi il menu";
  document.body.classList.add("menu-open");

  if (!motionOff()) {
    gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "power2.out" });
    gsap.from(menu.querySelectorAll("a"), {
      autoAlpha: 0,
      y: 20,
      duration: 0.55,
      stagger: 0.06,
      delay: 0.06,
      ease: "power3.out",
      onComplete() {
        gsap.set(this.targets(), { clearProps: "opacity,visibility,transform" });
      },
    });
  }

  menu.querySelector("a")?.focus();
});

menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu && !menu.hidden) {
    closeMenu();
    menuBtn.focus();
  }
});

const navLinks = [...document.querySelectorAll(".nav a")];
const observed = navLinks
  .map((link) => {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#")) return null;
    return document.querySelector(href);
  })
  .filter(Boolean);

const sectionWatch = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = `#${entry.target.id}`;
      navLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === id));
    });
  },
  { rootMargin: "-45% 0px -48% 0px" }
);

observed.forEach((section) => sectionWatch.observe(section));

document.querySelectorAll("[data-servizio]").forEach((link) => {
  link.addEventListener("click", () => {
    const select = document.querySelector("#servizio");
    if (select) select.value = link.dataset.servizio;
  });
});

const requested = new URLSearchParams(location.search).get("servizio");
const serviceSelect = document.querySelector("#servizio");
if (requested && serviceSelect?.querySelector(`option[value="${CSS.escape(requested)}"]`)) {
  serviceSelect.value = requested;
}

let chipFrame = 0;
function syncChips() {
  if (chipFrame) return;
  chipFrame = requestAnimationFrame(() => {
    chipFrame = 0;
    const openId = document.querySelector("details.svc[open]")?.id || "";
    document.querySelectorAll(".hero-chips a").forEach((chip) => {
      const on = (chip.getAttribute("href") || "") === `#${openId}`;
      chip.classList.toggle("is-active", on);
      if (on) chip.setAttribute("aria-current", "location");
      else chip.removeAttribute("aria-current");
    });
  });
}

let pickTimer = 0;
function markPicked(node) {
  document.querySelectorAll(".svc.is-picked").forEach((el) => el.classList.remove("is-picked"));
  if (motionOff()) return;
  node.classList.add("is-picked");
  window.clearTimeout(pickTimer);
  pickTimer = window.setTimeout(() => node.classList.remove("is-picked"), 1100);
}

function scrollToService(node, behavior) {
  const offset = (header?.getBoundingClientRect().height || 0) + 12;
  const top = node.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: motionOff() ? "auto" : behavior });
}

let pickGen = 0;
function showService(node, { scroll = false, pulse = false, focus = false, behavior = "smooth" } = {}) {
  if (!(node instanceof HTMLDetailsElement)) return;
  const gen = ++pickGen;
  node.open = true;
  syncChips();
  const reveal = () => {
    if (gen !== pickGen) return;
    markPicked(node);
  };
  if (pulse) reveal();
  if (!scroll && !focus) return;
  requestAnimationFrame(() => {
    if (gen !== pickGen) return;
    if (scroll) scrollToService(node, behavior);
    if (focus) node.querySelector("summary")?.focus({ preventScroll: true });
    if (pulse && behavior === "smooth" && !motionOff()) {
      window.addEventListener("scrollend", reveal, { once: true });
    }
  });
}

document.querySelectorAll("details.svc").forEach((node) => {
  node.addEventListener("toggle", syncChips);
});

function openHashedService() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  const node = id ? document.getElementById(id) : null;
  if (node instanceof HTMLDetailsElement) showService(node, { scroll: true, behavior: "auto" });
  else syncChips();
}

openHashedService();
window.addEventListener("hashchange", openHashedService);
window.addEventListener("popstate", () => {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  const node = id ? document.getElementById(id) : null;
  if (node instanceof HTMLDetailsElement) node.open = true;
  syncChips();
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = decodeURIComponent((link.getAttribute("href") || "").slice(1));
    const node = id ? document.getElementById(id) : null;
    if (!(node instanceof HTMLDetailsElement)) return;
    if (!link.closest(".hero-chips")) {
      node.open = true;
      return;
    }
    event.preventDefault();
    if (location.hash !== `#${id}`) history.pushState({ ambiti: id }, "", `#${id}`);
    showService(node, { scroll: true, pulse: true, focus: true, behavior: "smooth" });
  });
});

function wireChannel(key, href, text) {
  const value = STUDIO[key];
  if (!value) return;
  const block = document.querySelector(`[data-channel="${key}"]`);
  if (!block) return;
  const anchor = block.querySelector("a");
  anchor.href = href(value);
  anchor.textContent = text(value);
  block.hidden = false;
}

wireChannel("email", (value) => `mailto:${value}`, (value) => value);

function mountSantoCallNotice() {
  const dialog = document.createElement("dialog");
  dialog.className = "consent-dialog hours-dialog";
  dialog.setAttribute("aria-labelledby", "hours-title");
  dialog.innerHTML = `
    <div class="consent-dialog-panel">
      <p class="consent-kicker">Santo Stefano d'Aveto</p>
      <h2 id="hours-title" class="consent-title" tabindex="-1">Serve un appuntamento</h2>
      <p class="consent-dialog-copy">L'ufficio risponde al telefono dal lunedì al venerdì, dalle 8:30 alle 12:30. Fuori da questi orari serve un appuntamento.</p>
      <div class="consent-actions">
        <a class="btn" href="/#contatti">Richiedi un appuntamento</a>
        <button class="btn btn-ghost" type="button" data-hours-call>Chiama comunque</button>
      </div>
    </div>
  `;
  document.body.append(dialog);

  const callAnyway = dialog.querySelector("[data-hours-call]");
  dialog.querySelector('a[href="/#contatti"]')?.addEventListener("click", () => dialog.close());
  callAnyway?.addEventListener("click", () => {
    const href = dialog.dataset.href || "";
    dialog.close();
    if (href) window.location.href = href;
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-santo-call]");
    if (!(link instanceof HTMLAnchorElement) || santoCallsOpen()) return;
    event.preventDefault();
    dialog.dataset.href = link.href;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("#hours-title")?.focus();
  });
}

mountSantoCallNotice();

function setFieldError(field) {
  if (field.validity.valueMissing) {
    field.setCustomValidity("Compila questo campo.");
  } else if (field.validity.typeMismatch) {
    field.setCustomValidity("Inserisci un indirizzo email valido.");
  } else if (field.validity.tooShort) {
    field.setCustomValidity("Aggiungi qualche parola in più.");
  } else if (field.validity.tooLong) {
    field.setCustomValidity("Accorcia questo testo.");
  } else {
    field.setCustomValidity("");
  }
}

form?.querySelectorAll("input, textarea, select").forEach((field) => {
  field.addEventListener("invalid", () => setFieldError(field));
  field.addEventListener("input", () => field.setCustomValidity(""));
  field.addEventListener("change", () => field.setCustomValidity(""));
});

function showSent() {
  form.hidden = true;
  requestPanel.hidden = false;
  if (!motionOff()) {
    gsap.fromTo(
      requestPanel,
      { autoAlpha: 0, y: 16 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "opacity,visibility,transform",
      }
    );
  }
  requestPanel.focus();
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.hidden = true;
  let invalid = false;
  form.querySelectorAll("input, textarea, select").forEach((field) => {
    setFieldError(field);
    if (!field.checkValidity()) invalid = true;
  });
  if (invalid) {
    form.reportValidity();
    return;
  }

  const submitBtn = form.querySelector('[type="submit"]');
  const label = submitBtn.querySelector("span");
  submitBtn.disabled = true;
  label.textContent = "Invio in corso";
  form.setAttribute("aria-busy", "true");

  try {
    const body = new URLSearchParams(new FormData(form));
    const code = body.get("servizio");
    if (code) body.set("servizio", servizioLabel[code] || code);
    for (const key of ["nome", "messaggio", "telefono"]) {
      const value = body.get(key);
      if (typeof value === "string") body.set(key, value.trim());
    }
    for (const key of ["telefono", "sede", "attivita"]) {
      if (!String(body.get(key) || "").trim()) body.delete(key);
    }
    body.set("form-name", "richiesta");
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) throw new Error(String(response.status));
    showSent();
  } catch {
    formError.hidden = false;
    formError.textContent =
      "Non è partita. Riprova tra un momento, oppure scrivi a uno degli indirizzi dello studio.";
    submitBtn.disabled = false;
    label.textContent = "Invia la richiesta";
    form.removeAttribute("aria-busy");
  }
});

document.querySelector("#newRequest")?.addEventListener("click", () => {
  form.reset();
  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = false;
  submitBtn.querySelector("span").textContent = "Invia la richiesta";
  form.removeAttribute("aria-busy");
  requestPanel.hidden = true;
  form.hidden = false;
  form.querySelector("[name='nome']")?.focus();
});

function finishIntro(curtain) {
  document.documentElement.classList.add("is-in");
  curtain?.remove();
  gsap.set(".hero-reveal, .header", { clearProps: "all" });
  ScrollTrigger.refresh();
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  const node = id ? document.getElementById(id) : null;
  if (!(node instanceof HTMLDetailsElement)) return;
  requestAnimationFrame(() => scrollToService(node, "auto"));
}

function playIntro() {
  const curtain = document.querySelector(".curtain");
  const failsafe = window.setTimeout(() => finishIntro(curtain), 6000);

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
  });

  tl.fromTo(".curtain-mark", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 })
    .fromTo(".curtain-kicker", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
    .fromTo(".curtain-word", { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.15")
    .fromTo(".curtain-name", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.35")
    .fromTo(".curtain-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "power2.out" }, "-=0.2")
    .fromTo(".curtain-places", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, "-=0.15")
    .fromTo(".curtain-ring span", { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 1.1, ease: "power2.out" }, 0)
    .to(".curtain", { yPercent: -100, duration: 0.72, ease: "power3.inOut", delay: 0.16 })
    .fromTo(
      ".hero-reveal",
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05, ease: "power2.out" },
      "-=0.06"
    )
    .from(".header", { autoAlpha: 0, y: -8, duration: 0.4, ease: "power2.out" }, "<");

  tl.eventCallback("onComplete", () => {
    window.clearTimeout(failsafe);
    finishIntro(curtain);
  });
}

const reduce = document.documentElement.classList.contains("reduce");

if (reduce || !document.querySelector(".curtain")) {
  document.querySelector(".curtain")?.remove();
  document.documentElement.classList.add("is-in");
} else {
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fontsReady, new Promise((resolve) => window.setTimeout(resolve, 900))]).then(playIntro);
}

function fitRail() {
  const timeline = document.querySelector(".timeline");
  if (!timeline) return;
  const rail = timeline.querySelector(".timeline-rail");
  const marks = timeline.querySelectorAll(".step-mark");
  if (!rail || marks.length < 2) return;
  const parent = timeline.getBoundingClientRect();
  const first = marks[0].getBoundingClientRect();
  const last = marks[marks.length - 1].getBoundingClientRect();
  const firstMid = first.top + first.height / 2;
  const lastMid = last.top + last.height / 2;
  rail.style.top = `${firstMid - parent.top}px`;
  rail.style.height = `${Math.max(0, lastMid - firstMid)}px`;
  rail.style.left = `${first.left + first.width / 2 - parent.left}px`;
}

let railFrame = 0;
function scheduleRail() {
  if (railFrame) return;
  railFrame = requestAnimationFrame(() => {
    railFrame = 0;
    fitRail();
  });
}

if (document.querySelector(".timeline")) {
  fitRail();
  window.addEventListener("resize", scheduleRail);
  ScrollTrigger.addEventListener("refreshInit", fitRail);
  document.fonts?.ready?.then(fitRail);
}

const motion = gsap.matchMedia();

motion.add("(prefers-reduced-motion: no-preference)", () => {
  if (!document.querySelector(".hero, .timeline, .scene, .faq-list, [data-count]")) return;

  gsap.from(".bulletin-panel", {
    autoAlpha: 0,
    y: 36,
    duration: 0.9,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".bulletin",
      start: "top 88%",
      once: true,
    },
  });

  const bar = document.querySelector(".progress span");
  const setBar = bar ? gsap.quickSetter(bar, "scaleX") : null;
  const setShiftY = gsap.quickSetter(".marble-shift", "y", "px");
  let marbleRange = window.innerHeight * 0.1;

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onRefresh(self) {
      marbleRange = window.innerHeight * 0.1;
      setShiftY(-marbleRange * self.progress);
      if (setBar) setBar(self.progress);
    },
    onUpdate(self) {
      if (setBar) setBar(self.progress);
      setShiftY(-marbleRange * self.progress);
    },
  });

  gsap.to(".hero-glow", {
    y: 28,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
    },
  });

  function revealGroup(parentSelector, childSelector, vars = {}) {
    gsap.utils.toArray(parentSelector).forEach((parent) => {
      const items = childSelector ? parent.querySelectorAll(childSelector) : [parent];
      if (!items.length) return;

      gsap.from(items, {
        autoAlpha: 0,
        y: 14,
        duration: 0.55,
        stagger: vars.stagger ?? 0.045,
        ease: "power2.out",
        scrollTrigger: {
          trigger: parent,
          start: "top 88%",
          once: true,
        },
        onComplete() {
          gsap.set(this.targets(), { clearProps: "opacity,visibility,transform" });
        },
      });
    });
  }

  revealGroup(".services-head", ":scope > *");
  revealGroup(".service-board", ".svc", { stagger: 0.05 });
  revealGroup(".section-head", ":scope > *");
  revealGroup(".who .wrap, .moments .wrap", ":scope > .eyebrow, :scope > h2");
  revealGroup(".who-list", "li", { stagger: 0.05 });
  revealGroup(".moment-list", "li", { stagger: 0.05 });

  gsap.from(".timeline .step", {
    autoAlpha: 0,
    duration: 0.55,
    stagger: 0.08,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".timeline",
      start: "top 80%",
      once: true,
    },
    onComplete() {
      gsap.set(this.targets(), { clearProps: "opacity,visibility" });
    },
  });

  gsap.fromTo(
    ".timeline-rail span",
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".timeline",
        start: "top 72%",
        end: "bottom 62%",
        scrub: 0.35,
      },
    }
  );

  gsap.fromTo(
    ".scene-rule",
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".scene",
        start: "top 70%",
        end: "center 55%",
        scrub: 0.4,
      },
    }
  );

  gsap.to(".scene-place-a", {
    y: -26,
    ease: "none",
    scrollTrigger: {
      trigger: ".scene",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });

  gsap.to(".scene-place-b", {
    y: 20,
    ease: "none",
    scrollTrigger: {
      trigger: ".scene",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    },
  });
  revealGroup(".faq-grid > div:first-child", ":scope > *");
  revealGroup(".faq-list", "details", { stagger: 0.04 });
  revealGroup(".laws .wrap", ":scope > .eyebrow, :scope > h2, :scope > .dek");
  revealGroup(".law-groups", ":scope > li", { stagger: 0.04 });
  revealGroup(".laws-note");
  revealGroup(".credentials .wrap", ":scope > .eyebrow, :scope > h2");
  revealGroup(".cred-list", "li", { stagger: 0.05 });
  revealGroup(".studio-copy", ":scope > *:not([hidden])", { stagger: 0.04 });
  revealGroup(".roster-head", ":scope > *");
  revealGroup(".roster-groups", "li", { stagger: 0.04 });
  revealGroup(".ask-copy", ":scope > *");
  revealGroup(".contact");
  revealGroup(".map-block");

  document.querySelectorAll("[data-count]").forEach((node) => {
    const target = Number(node.dataset.count);
    const counter = { value: 0 };
    gsap.to(counter, {
      value: target,
      duration: 1.4,
      ease: "power2.out",
      scrollTrigger: {
        trigger: node,
        start: "top 85%",
      },
      onUpdate: () => {
        const next = String(Math.round(counter.value));
        if (node.textContent !== next) node.textContent = next;
      },
    });
  });
});

const desktopRule = window.matchMedia("(min-width: 960px)");

desktopRule.addEventListener("change", () => {
  fitRail();
  ScrollTrigger.refresh();
});

function mountSatelliteMaps() {
  const tileSize = 256;

  function project(lat, lng, zoom) {
    const scale = 2 ** zoom;
    const x = ((lng + 180) / 360) * scale;
    const sine = Math.sin((lat * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale;
    return { x, y };
  }

  function unproject(x, y, zoom) {
    const scale = 2 ** zoom;
    const lng = (x / scale) * 360 - 180;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI;
    return { lat, lng };
  }

  document.querySelectorAll("[data-satellite]").forEach((frame) => {
    if (frame.dataset.satelliteReady) return;
    frame.dataset.satelliteReady = "1";
    const address = {
      lat: Number(frame.dataset.lat),
      lng: Number(frame.dataset.lng),
    };
    if (!Number.isFinite(address.lat) || !Number.isFinite(address.lng)) return;

    const view = { ...address, zoom: Number(frame.dataset.zoom) || 17 };
    const layer = document.createElement("div");
    layer.className = "sat-layer";
    const pin = document.createElement("span");
    pin.className = "sat-pin";
    pin.setAttribute("aria-hidden", "true");
    frame.prepend(pin);
    frame.prepend(layer);

    const tiles = new Map();
    let drag = null;
    let paint = 0;

    function render() {
      if (paint) return;
      paint = requestAnimationFrame(() => {
        paint = 0;
        draw();
      });
    }

    function draw() {
      const zoom = view.zoom;
      const size = frame.getBoundingClientRect();
      if (size.width < 2 || size.height < 2) return;
      const center = project(view.lat, view.lng, zoom);
      const originX = size.width / 2 - center.x * tileSize;
      const originY = size.height / 2 - center.y * tileSize;
      const minX = Math.floor(-originX / tileSize) - 1;
      const maxX = Math.ceil((size.width - originX) / tileSize) + 1;
      const minY = Math.floor(-originY / tileSize) - 1;
      const maxY = Math.ceil((size.height - originY) / tileSize) + 1;
      const limit = 2 ** zoom;
      const needed = new Set();

      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          if (y < 0 || y >= limit) continue;
          const wrapped = ((x % limit) + limit) % limit;
          const id = `${zoom}/${y}/${wrapped}`;
          needed.add(id);
          let image = tiles.get(id);
          if (!image) {
            image = document.createElement("img");
            image.alt = "";
            image.draggable = false;
            image.decoding = "async";
            image.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${wrapped}`;
            layer.append(image);
            tiles.set(id, image);
          }
          image.style.transform = `translate(${originX + x * tileSize}px, ${originY + y * tileSize}px)`;
        }
      }

      tiles.forEach((image, id) => {
        if (needed.has(id)) return;
        image.remove();
        tiles.delete(id);
      });

      const point = project(address.lat, address.lng, zoom);
      pin.style.left = `${size.width / 2 + (point.x - center.x) * tileSize}px`;
      pin.style.top = `${size.height / 2 + (point.y - center.y) * tileSize}px`;
    }

    layer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.pointerType === "touch") return;
      layer.setPointerCapture(event.pointerId);
      layer.classList.add("is-dragging");
      drag = { x: event.clientX, y: event.clientY, lat: view.lat, lng: view.lng };
    });

    layer.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const start = project(drag.lat, drag.lng, view.zoom);
      const next = unproject(
        start.x - (event.clientX - drag.x) / tileSize,
        start.y - (event.clientY - drag.y) / tileSize,
        view.zoom
      );
      view.lat = next.lat;
      view.lng = next.lng;
      render();
    });

    function endDrag(event) {
      if (!drag) return;
      drag = null;
      layer.classList.remove("is-dragging");
      if (layer.hasPointerCapture(event.pointerId)) layer.releasePointerCapture(event.pointerId);
    }

    layer.addEventListener("pointerup", endDrag);
    layer.addEventListener("pointercancel", endDrag);

    frame.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const next = Math.min(18, Math.max(14, view.zoom + (event.deltaY < 0 ? 1 : -1)));
        if (next === view.zoom) return;
        tiles.forEach((image) => image.remove());
        tiles.clear();
        view.zoom = next;
        render();
      },
      { passive: false }
    );

    const watch = new ResizeObserver(render);
    watch.observe(frame);
    if ("IntersectionObserver" in window) {
      const seen = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          render();
          seen.disconnect();
        },
        { rootMargin: "200px" }
      );
      seen.observe(frame);
    } else {
      render();
    }
  });
}

function applyMapConsent(on) {
  document.querySelectorAll("[data-satellite]").forEach((frame) => {
    const gate = frame.querySelector(".map-gate");
    if (gate) gate.hidden = on;
  });
  if (on) mountSatelliteMaps();
}

document.addEventListener("squeri-consent", (event) => {
  applyMapConsent(Boolean(event.detail?.maps));
});

applyMapConsent(Boolean(window.SqueriConsent?.read()?.maps));
