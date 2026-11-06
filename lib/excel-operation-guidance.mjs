// Export-only planning help. Never added to source phase plans or snapshots.
export const unselectedOperationText='Niet geselecteerd in dit bronpakket (NOT_SELECTED). Geen toetsvoorstel voor werking.';

// De bron werkt bij dit toetspunt geen werking uit (#310). Zeg dat eerlijk, en help alleen
// wie de werking toch wil toetsen. Geen bewijsstuk dat de bron niet vraagt.
export const operationInstruction='De bron werkt bij dit toetspunt geen werkingstoets uit. Toets je de werking toch, bepaal dan de onderzoeksperiode en kies passende gevallen of momenten binnen die periode. Onderbouw je selectie.';
export const operationEvidence='Niet uitgewerkt in de bron. Leg vast welk bewijs je gebruikt.';

export function operationGuidance(){
 return {approach:operationInstruction,evidence:operationEvidence};
}
