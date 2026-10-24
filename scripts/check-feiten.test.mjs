import assert from "node:assert/strict";
import test from "node:test";
import { feiten, vergelijkFeiten } from "./check-feiten.mjs";

const origineel = "Sinds 21 oktober 2026 draait de online versie; zie [hosting](../hosting/README.md) en #142. Besluit B-018 geldt voor PROO26. Draai `npm run check:docs`. Kosten: €10,89 per maand, 4 lezingen.";

test("een goede herschrijving houdt alle feiten", () => {
  const herschreven = "De online versie draait sinds 21 oktober 2026. Lees [hosting](../hosting/README.md) en #142. Voor PROO26 geldt besluit B-018. Draai daarna `npm run check:docs`. Kosten: 4 lezingen, €10,89 per maand.";
  assert.deepEqual(vergelijkFeiten(origineel, herschreven), { weg: [], nieuw: [] });
});

test("een foute herschrijving verliest of verzint feiten", () => {
  const fout = "Sinds 22 oktober 2026 draait de online versie; zie [hosting](../hosting/index.md). Besluit B-017 geldt. Draai `npm test`. Kosten: €10,89 per maand, 3 lezingen.";
  const { weg, nieuw } = vergelijkFeiten(origineel, fout);
  for (const k of ["getal:21", "link:../hosting/README.md", "issue:#142", "besluit:B-018", "id:PROO26", "code:npm run check:docs", "getal:4"]) assert.ok(weg.includes(k), k);
  for (const k of ["getal:22", "link:../hosting/index.md", "besluit:B-017", "code:npm test", "getal:3"]) assert.ok(nieuw.includes(k), k);
});

test("getallen in links en code tellen niet dubbel; verborgen markeringen tellen niet mee", () => {
  const f = feiten("Zie [#12](https://github.com/x/y/issues/12) en `node 24`. <!-- n:rapporten -->");
  // De linktekst telt apart: daarin kan ook een feit staan.
  assert.deepEqual([...f.keys()].sort(), ["code:node 24", "issue:#12", "link:https://github.com/x/y/issues/12"]);
});
