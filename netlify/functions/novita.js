import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "GET") return new Response("Metodo non consentito", { status: 405 });

  let briefings = [];
  try {
    const archive = await getStore("novita").get("archivio", { type: "json" });
    if (Array.isArray(archive?.briefings)) briefings = archive.briefings;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Archivio non letto");
  }

  return Response.json(
    { briefings },
    { headers: { "cache-control": "public, max-age=300" } }
  );
};

export const config = {
  path: "/api/briefing",
};
