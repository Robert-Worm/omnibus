// Export-only planning help. Never added to source phase plans or snapshots.
export const unselectedOperationText='Niet geselecteerd in dit bronpakket (NOT_SELECTED). Geen toetsvoorstel voor werking.';

export const operationInstruction='Bepaal de onderzoeksperiode en kies passende gevallen of momenten binnen die periode. Onderbouw je selectie.';

export function operationGuidance(){
 return {approach:operationInstruction,evidence:''};
}
