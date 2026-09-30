// Parte ogni mattina. Se l'ultimo resoconto ha meno di tre giorni, non fa nulla.
// La chiave OPENROUTER_API_KEY si legge dall'ambiente Netlify, non dal codice.

export default async (req) => {
  try {
    await req.json();
  } catch {
    // Il pulsante «Run now» può arrivare senza corpo.
  }

  const key = process.env.OPENROUTER_API_KEY;
  const site = process.env.URL;
  if (!key || !site) {
    console.log(key ? "URL del sito mancante" : "OPENROUTER_API_KEY non impostata");
    return;
  }

  const url = new URL("/.netlify/functions/scrivi-novita", site);
  const response = await fetch(url, {
    method: "POST",
    headers: { "x-studio-token": key },
    signal: AbortSignal.timeout(10000),
  });
  console.log(`Controllo avviato: ${response.status}`);
};

export const config = {
  schedule: "0 5 * * *",
};
