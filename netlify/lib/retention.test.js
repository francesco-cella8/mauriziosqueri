import assert from "node:assert/strict";
import test from "node:test";
import { idsToDelete, isPastRetention, nextPage, retentionCutoff } from "./retention.js";

const now = new Date("2026-10-03T10:00:00.000Z");

test("il taglio è ventiquattro mesi prima", () => {
  assert.equal(retentionCutoff(now).toISOString(), "2024-10-03T10:00:00.000Z");
});

test("cancella solo le richieste più vecchie del termine", () => {
  assert.equal(isPastRetention("2024-10-03T10:00:00.000Z", now), true);
  assert.equal(isPastRetention("2024-10-03T10:00:01.000Z", now), false);
  assert.equal(isPastRetention("2026-10-02T10:00:00.000Z", now), false);
  assert.equal(isPastRetention("", now), false);
  assert.equal(isPastRetention(null, now), false);
});

test("ignora le richieste senza data o senza id", () => {
  const ids = idsToDelete(
    [
      { id: "vecchia", created_at: "2024-01-01T00:00:00.000Z" },
      { id: "recente", created_at: "2026-09-01T00:00:00.000Z" },
      { id: "senzadata" },
      { created_at: "2020-01-01T00:00:00.000Z" },
    ],
    now
  );
  assert.deepEqual(ids, ["vecchia"]);
});

test("legge la pagina successiva dall'intestazione Link", () => {
  const header =
    '<https://api.netlify.com/api/v1/forms/1/submissions?page=2>; rel="next", <https://api.netlify.com/api/v1/forms/1/submissions?page=4>; rel="last"';
  assert.equal(nextPage(header), "https://api.netlify.com/api/v1/forms/1/submissions?page=2");
  assert.equal(nextPage('rel="prev"'), null);
  assert.equal(nextPage(""), null);
});
