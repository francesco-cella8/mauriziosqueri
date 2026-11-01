// Rende la composizione fotogramma per fotogramma e la codifica con ffmpeg.
//
//   node video/render.mjs cues    --format landscape
//   node video/render.mjs stills  --format landscape --at 1,4.5,12
//   node video/render.mjs frames  --format landscape [--from 0 --to 63 --workers 3]
//   node video/render.mjs encode  --format landscape [--audio video/.cache/audio/landscape.wav]
//
// Prima servono le clip (capture/record.mjs) e le foto (capture/stills.mjs).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const VIDEO = path.join(ROOT, "video");
const CACHE = path.join(VIDEO, ".cache");

const args = process.argv.slice(2);
const command = args[0];
const opt = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const FORMAT = opt("format", "landscape");
const FPS = Number(opt("fps", 60));
const SIZE = FORMAT === "portrait" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

function resolveUrl(url) {
  const clean = decodeURIComponent(url.split("?")[0]);
  if (clean === "/vendor/gsap.min.js") return path.join(ROOT, "node_modules/gsap/dist/gsap.min.js");
  if (clean.startsWith("/clips/")) return path.join(CACHE, clean);
  if (clean.startsWith("/stills/")) return path.join(CACHE, clean);
  if (clean.startsWith("/public/")) return path.join(ROOT, clean);
  const file = clean === "/" ? "/index.html" : clean;
  return path.join(VIDEO, "stage", file);
}

function serve() {
  const server = http.createServer((req, res) => {
    const file = resolveUrl(req.url || "/");
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function openStage(browser, port, pageName = "") {
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("errore pagina:", error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("console:", msg.text());
  });
  await page.goto(`http://127.0.0.1:${port}/${pageName}?format=${FORMAT}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const error = await page.evaluate(() => window.__error);
  if (error) throw new Error(error);
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp };
}

async function grab(stage, t, format = "jpeg") {
  await stage.page.evaluate((time) => window.__seek(time), t);
  const { data } = await stage.cdp.send("Page.captureScreenshot", {
    format,
    quality: format === "jpeg" ? 95 : undefined,
    optimizeForSpeed: true,
    captureBeyondViewport: false,
  });
  return Buffer.from(data, "base64");
}

async function main() {
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({ args: ["--hide-scrollbars", "--font-render-hinting=none"] });
  try {
    if (command === "cues") {
      const stage = await openStage(browser, port);
      const data = await stage.page.evaluate(() => ({ duration: window.__duration, cues: window.__cues }));
      fs.mkdirSync(path.join(CACHE, "audio"), { recursive: true });
      const out = path.join(CACHE, "audio", `cues-${FORMAT}.json`);
      fs.writeFileSync(out, JSON.stringify(data, null, 1));
      console.log(`${data.cues.length} segnali, ${data.duration} s → ${out}`);
    } else if (command === "thumb") {
      const stage = await openStage(browser, port, "thumb.html");
      const dir = opt("out", path.join(VIDEO, "export", "thumbs"));
      fs.mkdirSync(dir, { recursive: true });
      const { data } = await stage.cdp.send("Page.captureScreenshot", { format: "png" });
      const tmp = path.join(CACHE, `thumb-${FORMAT}.png`);
      fs.writeFileSync(tmp, Buffer.from(data, "base64"));
      const name = FORMAT === "portrait" ? "copertina-reel-1080x1920.jpg" : "miniatura-youtube-1280x720.jpg";
      const scale = FORMAT === "portrait" ? "1080:1920" : "1280:720";
      await new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-vf", `scale=${scale}:flags=lanczos`, "-q:v", "2", path.join(dir, name)]);
        ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
      });
      console.log(path.join(dir, name));
    } else if (command === "stills") {
      const stage = await openStage(browser, port);
      const times = String(opt("at", "0")).split(",").map(Number);
      const dir = opt("out", path.join(CACHE, "review", FORMAT));
      fs.mkdirSync(dir, { recursive: true });
      for (const t of times) {
        const buf = await grab(stage, t, "jpeg");
        const file = path.join(dir, `t${t.toFixed(2).padStart(6, "0")}.jpg`);
        fs.writeFileSync(file, buf);
      }
      console.log(`${times.length} fotogrammi in ${dir}`);
    } else if (command === "frames") {
      const probe = await openStage(browser, port);
      const duration = await probe.page.evaluate(() => window.__duration);
      await probe.context.close();
      const from = Number(opt("from", 0));
      const to = Number(opt("to", duration));
      const step = Number(opt("step", 1));
      const workers = Number(opt("workers", 3));
      const dir = opt("out", path.join(CACHE, "frames", FORMAT));
      fs.mkdirSync(dir, { recursive: true });
      const first = Math.round(from * FPS);
      const last = Math.round(to * FPS);
      const frames = [];
      for (let f = first; f < last; f += step) frames.push(f);
      const chunk = Math.ceil(frames.length / workers);
      const t0 = Date.now();
      let done = 0;
      await Promise.all(
        Array.from({ length: workers }, async (_, w) => {
          const mine = frames.slice(w * chunk, (w + 1) * chunk);
          if (!mine.length) return;
          const stage = await openStage(browser, port);
          for (const f of mine) {
            const file = path.join(dir, `${String(f).padStart(6, "0")}.jpg`);
            if (opt("resume", "0") === "1" && fs.existsSync(file)) {
              done += 1;
              continue;
            }
            fs.writeFileSync(file, await grab(stage, f / FPS));
            done += 1;
            if (done % 120 === 0) {
              const rate = done / ((Date.now() - t0) / 1000);
              console.log(`${done}/${frames.length} · ${rate.toFixed(1)} fps · mancano ${Math.round((frames.length - done) / rate)} s`);
            }
          }
          await stage.context.close();
        })
      );
      console.log(`fatto: ${frames.length} fotogrammi in ${Math.round((Date.now() - t0) / 1000)} s`);
    } else if (command === "encode") {
      const dir = opt("frames", path.join(CACHE, "frames", FORMAT));
      const audio = opt("audio", path.join(CACHE, "audio", `${FORMAT}.wav`));
      const out = opt("out", path.join(VIDEO, "export", `studio-squeri-${FORMAT === "portrait" ? "9x16" : "16x9"}.mp4`));
      const crf = opt("crf", "17");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const ffArgs = ["-y", "-loglevel", "warning", "-framerate", String(FPS), "-i", path.join(dir, "%06d.jpg")];
      if (fs.existsSync(audio)) ffArgs.push("-i", audio);
      ffArgs.push(
        "-c:v", "libx264",
        "-preset", opt("preset", "slow"),
        "-crf", crf,
        "-profile:v", "high",
        "-level", FORMAT === "portrait" ? "4.2" : "4.2",
        "-pix_fmt", "yuv420p",
        "-color_primaries", "bt709",
        "-color_trc", "bt709",
        "-colorspace", "bt709",
        "-g", String(FPS),
        "-bf", "2",
        "-movflags", "+faststart"
      );
      if (fs.existsSync(audio)) ffArgs.push("-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest");
      ffArgs.push(out);
      await new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", ffArgs, { stdio: ["ignore", "inherit", "inherit"] });
        ff.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
      });
      console.log(`video: ${out}`);
    } else {
      console.log("Comandi: cues | stills | frames | encode");
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
