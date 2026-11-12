// Sprong naar een norm of groep in een ander kader (besluit beheerder 12 november 2026).
// Wie onder "Verwant" op een verwijzing klikt, komt in het andere kader uit bij de genoemde norm; die licht kort op,
// zodat te zien is waar de verwijzing over gaat. Verwijst de regel naar een heel kader, dan licht de titel van dat kader op. De viewer van het doelkader haalt het verzoek op zodra hij opent.
let pending = null;

export function requestNormJump(sourceId, target = {}) {
  // Zonder norm of groep gaat de verwijzing over het hele kader: dan licht de titel van het kader op.
  pending = {sourceId, norm: target.norm, groep: target.groep, at: Date.now()};
}

/** Het openstaande verzoek voor dit kader, één keer en alleen als het vers is (binnen tien seconden). */
export function takeNormJump(sourceId) {
  if (!pending || pending.sourceId !== sourceId) return null;
  const jump = pending;
  pending = null;
  return Date.now() - jump.at < 10000 ? jump : null;
}
