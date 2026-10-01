import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { collectDocuments } from "../netlify/lib/feeds.js";
import { draftReport } from "../netlify/lib/update.js";
import { longLabel, romeParts } from "../netlify/lib/shape.js";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function printDocuments(documents) {
  if (!documents.length) {
    console.log("Nessun atto nella finestra.");
    return;
  }
  for (const document of documents) {
    console.log(`- ${document.date} · ${document.label}`);
    console.log(`  ${document.title}`);
    console.log(`  ${document.href}`);
  }
}

function printReport(report) {
  console.log(`${report.dateLabel}`);
  console.log(report.status === "invariato" ? "Niente di nuovo" : `${report.items.length} novità`);
  console.log("");
  console.log(report.recap);
  for (const item of report.items) {
    console.log("");
    console.log(item.area);
    console.log(item.audience);
    console.log(item.title);
    console.log(item.recap);
    for (const link of item.links) console.log(`${link.label}  ${link.href}`);
  }
}

function saveLocal(report) {
  const dir = fileURLToPath(new URL("../.local", import.meta.url));
  const file = fileURLToPath(new URL("../.local/novita.json", import.meta.url));
  mkdirSync(dir, { recursive: true });
  let briefings = [];
  if (existsSync(file)) {
    try {
      const saved = JSON.parse(readFileSync(file, "utf8"));
      if (Array.isArray(saved.briefings)) briefings = saved.briefings;
    } catch {
      briefings = [];
    }
  }
  const next = [report, ...briefings.filter((item) => item.id !== report.id)].slice(0, 8);
  writeFileSync(file, `${JSON.stringify({ briefings: next }, null, 2)}\n`);
}

loadEnv(fileURLToPath(new URL("../.env", import.meta.url)));
delete process.env.NOVITA_BASE_URL;

const sourcesOnly = process.argv.includes("--fonti");
const now = new Date();

try {
  if (sourcesOnly) {
    const start = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    console.log(`Fonti dal ${longLabel(romeParts(new Date(start)))}, senza modello e senza pubblicazione.`);
    console.log("");
    printDocuments((await collectDocuments(start)).documents);
  } else {
    const drafted = await draftReport({ now });
    saveLocal(drafted.report);
    console.log(`Resoconto del ${drafted.report.dateLabel}, via OpenRouter. Non è online.`);
    console.log(`${drafted.documents} documenti letti.`);
    if (drafted.notes?.length) {
      console.log("Ancora da correggere:");
      for (const note of drafted.notes) console.log(`- ${note}`);
    }
    console.log("Aprilo in locale: http://127.0.0.1:5173/#novita");
    console.log("Se la pagina è già aperta, ricaricala.");
    console.log("");
    printReport(drafted.report);
  }
} catch (error) {
  if (error?.code === "missing-key" || /401|Authentication/i.test(error?.message || "")) {
    console.error("OpenRouter non ha accettato la chiave.");
    console.error("Metti nel file .env una riga OPENROUTER_API_KEY= con la chiave del sito, poi rilancia npm run novita:prova");
    process.exit(1);
  }
  throw error;
}
