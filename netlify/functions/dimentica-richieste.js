// Ogni notte cancella le richieste del modulo più vecchie di 24 mesi.
// Il token NETLIFY_API_TOKEN si legge dall'ambiente Netlify, non dal codice.

import { idsToDelete, nextPage, RETENTION_MONTHS } from "../lib/retention.js";

const API = "https://api.netlify.com/api/v1";

async function readPages(firstUrl, token) {
  const rows = [];
  let url = firstUrl;
  for (let page = 0; url && page < 50; page += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Lettura non riuscita: ${response.status}`);
    const body = await response.json();
    if (Array.isArray(body)) rows.push(...body);
    url = nextPage(response.headers.get("link"));
  }
  return rows;
}

export default async () => {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.SITE_ID;
  if (!token || !siteId) {
    console.log(token ? "SITE_ID mancante" : "NETLIFY_API_TOKEN non impostato");
    return;
  }

  const forms = await readPages(`${API}/sites/${siteId}/forms`, token);
  const targets = forms.filter((form) => form?.name === "richiesta" && form.id);
  const stale = new Set();

  for (const form of targets) {
    const lists = [
      `${API}/forms/${form.id}/submissions?per_page=100`,
      `${API}/forms/${form.id}/submissions?state=spam&per_page=100`,
    ];
    for (const listUrl of lists) {
      for (const id of idsToDelete(await readPages(listUrl, token))) stale.add(id);
    }
  }

  let removed = 0;
  for (const id of stale) {
    const response = await fetch(`${API}/submissions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`Cancellazione non riuscita: ${response.status}`);
    removed += 1;
  }

  console.log(`Richieste oltre i ${RETENTION_MONTHS} mesi cancellate: ${removed}`);
};

export const config = {
  schedule: "30 4 * * *",
};
