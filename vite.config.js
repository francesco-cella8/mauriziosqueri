import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const localBriefing = fileURLToPath(new URL("./.local/novita.json", import.meta.url));

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
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
