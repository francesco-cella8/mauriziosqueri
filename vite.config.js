import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const localBriefing = fileURLToPath(new URL("./.local/novita.json", import.meta.url));

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        agricoltura: resolve(root, "servizi/agricoltura.html"),
        appalti: resolve(root, "servizi/appalti.html"),
        forestale: resolve(root, "servizi/forestale.html"),
        bandi: resolve(root, "servizi/bandi.html"),
        privacy: resolve(root, "privacy.html"),
        cookie: resolve(root, "cookie.html"),
        noteLegali: resolve(root, "note-legali.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    {
      name: "modulo-locale",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method !== "POST") return next();
          const path = (req.url || "").split("?")[0];
          if (path !== "/") return next();
          const chunks = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            const isRequest =
              raw.includes("form-name=richiesta") || raw.includes("form-name%3Drichiesta");
            if (!isRequest) {
              res.statusCode = 404;
              res.end();
              return;
            }
            res.statusCode = 200;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("ok");
          });
        });
      },
    },
    {
      name: "novita-locale",
      configureServer(server) {
        server.middlewares.use("/api/briefing", (req, res, next) => {
          if (req.method !== "GET") return next();
          if (!existsSync(localBriefing)) {
            res.statusCode = 404;
            res.end();
            return;
          }
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(readFileSync(localBriefing));
        });
      },
    },
  ],
});
