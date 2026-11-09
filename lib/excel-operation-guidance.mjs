// Export-only planning help. Never added to source phase plans or snapshots.
export const unselectedOperationText='Niet geselecteerd in dit bronpakket (NOT_SELECTED). Geen toetsvoorstel voor werking.';

// De bron werkt bij dit toetspunt geen werking uit (#310). Zeg dat eerlijk, en help alleen
// wie de werking toch wil toetsen. Geen bewijsstuk dat de bron niet vraagt.
// Panel 9 november: niet de bron, maar Omnibus werkt de werking niet uit; zelfde woorden als de viewer.
export const operationInstruction='Niet uitgewerkt voor dit toetspunt. Wil je de werking toch toetsen? Kies dan een periode en een aantal gevallen in die periode, en ga per geval na of de handeling bij Bestaan is uitgevoerd. Onderbouw je keuze.';
export const operationEvidence='Niet uitgewerkt voor dit toetspunt. Leg vast welk bewijs je gebruikt.';

export function operationGuidance(){
 return {approach:operationInstruction,evidence:operationEvidence};
}
