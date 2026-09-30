import { timingSafeEqual } from "node:crypto";
import { runUpdate } from "../lib/update.js";

function sameSecret(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export default async (req) => {
  const key = process.env.OPENROUTER_API_KEY || "";
  const token = req.headers.get("x-studio-token") || "";
  if (!key || !sameSecret(token, key)) {
    return new Response("Non autorizzato", { status: 401 });
  }

  try {
    const result = await runUpdate();
    console.log(JSON.stringify(result));
    return Response.json(result);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Controllo non riuscito");
    return new Response("Controllo non riuscito", { status: 500 });
  }
};
