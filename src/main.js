import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const STUDIO = {
  email: "",
  phone: "",
};

const servizioLabel = {
  contabilita: "Elaborazione dati e tenuta della contabilità",
  bilanci: "Bilanci e adempimenti fiscali",
  societaria: "Consulenza societaria",
  azienda: "Acquisto o affitto d'azienda",
  tributaria: "Consulenza tributaria",
  altro: "Altro",
};

const header = document.querySelector(".header");
const menu = document.querySelector("#menu");
const menuBtn = document.querySelector(".menu-btn");
const form = document.querySelector("#richiesta");
const requestPanel = document.querySelector("#request");
const requestText = document.querySelector("#requestText");
const copyStatus = document.querySelector("#copyStatus");
const formError = document.querySelector("#formError");
const year = document.querySelector("#year");

year.textContent = String(new Date().getFullYear());

function onScroll() {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

function motionOff() {
  return document.documentElement.classList.contains("reduce");
}

function closeMenu() {
  gsap.killTweensOf(menu);
  gsap.killTweensOf(menu.querySelectorAll("a"));
  menu.hidden = true;
  gsap.set(menu, { clearProps: "all" });
  gsap.set(menu.querySelectorAll("a"), { clearProps: "all" });
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.querySelector(".sr-only").textContent = "Apri il menu";
  document.body.classList.remove("menu-open");
}

menuBtn.addEventListener("click", () => {
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

menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menu.hidden) {
    closeMenu();
    menuBtn.focus();
  }
});

const navLinks = [...document.querySelectorAll(".nav a")];
const observed = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
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

function wireChannel(key, href, text) {
  const value = STUDIO[key];
  if (!value) return;
  const block = document.querySelector(`[data-channel="${key}"]`);
  const anchor = block.querySelector("a");
  anchor.href = href(value);
  anchor.textContent = text(value);
  block.hidden = false;
}

wireChannel("phone", (value) => `tel:${value.replace(/\s/g, "")}`, (value) => value);
wireChannel("email", (value) => `mailto:${value}`, (value) => value);

function composeRequest(data) {
  const servizio = servizioLabel[data.get("servizio")] || data.get("servizio");
  return [
    "Richiesta per Studio Squeri",
    `Nome: ${data.get("nome")}`,
    `Email: ${data.get("email")}`,
    `Telefono: ${data.get("telefono") || "—"}`,
    `Ambito: ${servizio}`,
    `Sede: ${data.get("sede") || "—"}`,
    `Attività: ${data.get("attivita") || "—"}`,
    "",
    String(data.get("messaggio")).trim(),
  ].join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function setFieldError(field) {
  if (field.validity.valueMissing) {
    field.setCustomValidity("Compila questo campo.");
  } else if (field.validity.typeMismatch) {
    field.setCustomValidity("Inserisci un indirizzo email valido.");
  } else if (field.validity.tooShort) {
    field.setCustomValidity("Aggiungi qualche parola in più.");
  } else {
    field.setCustomValidity("");
  }
}

form.querySelectorAll("input, textarea, select").forEach((field) => {
  field.addEventListener("invalid", () => setFieldError(field));
  field.addEventListener("input", () => field.setCustomValidity(""));
  field.addEventListener("change", () => field.setCustomValidity(""));
});

let lastRequest = "";

async function publishRequest(text) {
  lastRequest = text;
  requestText.textContent = text;
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
  const copied = await copyText(text);

  if (STUDIO.email) {
    window.location.href = `mailto:${STUDIO.email}?subject=${encodeURIComponent("Richiesta dallo studio online")}&body=${encodeURIComponent(text)}`;
    copyStatus.textContent = "Si apre il programma di posta con la richiesta già compilata.";
    return;
  }

  copyStatus.textContent = copied
    ? "Testo copiato. Incollalo in un messaggio oppure portalo in studio, a Santo Stefano d'Aveto o a Chiavari."
    : "Seleziona il testo e copialo. Le sedi sono in Via Emanuele Razzetti 16/10 e in Vico Oneto 6 a Chiavari.";
}

form.addEventListener("submit", async (event) => {
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
  await publishRequest(composeRequest(new FormData(form)));
});

document.querySelector("#copyAgain").addEventListener("click", async () => {
  const copied = await copyText(lastRequest);
  copyStatus.textContent = copied
    ? "Copiata di nuovo."
    : "Seleziona il testo qui sopra e copialo a mano.";
});

document.querySelector("#editRequest").addEventListener("click", () => {
  requestPanel.hidden = true;
  form.hidden = false;
  form.querySelector("input, textarea, select")?.focus();
});

function finishIntro(curtain) {
  document.documentElement.classList.add("is-in");
  curtain.remove();
  gsap.set(".hero-reveal, .header", { clearProps: "all" });
  ScrollTrigger.refresh();
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

if (reduce) {
  document.querySelector(".curtain")?.remove();
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

fitRail();
window.addEventListener("resize", fitRail);
ScrollTrigger.addEventListener("refreshInit", fitRail);
document.fonts?.ready?.then(fitRail);

const motion = gsap.matchMedia();

motion.add("(prefers-reduced-motion: no-preference)", () => {
  const bar = document.querySelector(".progress span");
  const setShiftY = gsap.quickSetter(".marble-shift", "y", "px");
  let marbleRange = window.innerHeight * 0.1;

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onRefresh(self) {
      marbleRange = window.innerHeight * 0.1;
      setShiftY(-marbleRange * self.progress);
    },
    onUpdate(self) {
      bar.style.transform = `scaleX(${self.progress})`;
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
  revealGroup(".service-list", ".service", { stagger: 0.05 });
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
  revealGroup(".studio-grid > div:first-child", ":scope > *:not([hidden])", { stagger: 0.04 });
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
