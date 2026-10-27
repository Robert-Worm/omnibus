// Regels voor nieuwe backlog-items, los van de GitHub-aanroepen zodat ze te testen zijn.

/** De twee labels voor de werkverdeling (besluit B-019). */
export const WERKLABELS = ["Opus 5.5", "ChatGPT Astra"];

/**
 * Een nieuwe story moet minstens één werklabel hebben, anders weet niemand wie hem oppakt.
 * Bestaande issues vallen hier niet onder: die hebben hun label al op GitHub.
 */
export function controleerNieuweStory(story) {
  const labels = story.labels ?? [];
  if (!labels.some((l) => WERKLABELS.includes(l)))
    throw new Error(`Story ${story.id} mist een werklabel: geef ${WERKLABELS.join(" of ")} mee (B-019).`);
  const onbekend = labels.filter((l) => !WERKLABELS.includes(l) && !["story", "routekaart", "kwaliteit", "presentatie", "P1", "P2", "P3", "klaar", "bezig", "wacht-op-ander", "wacht-op-beheerder", "gepauzeerd"].includes(l));
  if (onbekend.length) throw new Error(`Story ${story.id} heeft een onbekend label: ${onbekend.join(", ")}.`);
}
