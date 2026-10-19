// Display contract only. The source publication retains all wording and mappings.
export type WwkeAboutSector={id:string;pointId:string;authority:string};
export const wwkeAboutCopy:{history:string;extension:string};
export const wwkeAboutSectors:WwkeAboutSector[];
export const wwkeContextPlacement:Record<'definitions'|'scope'|'sectors'|'authorities'|'sourceQuality'|'criterionDetail',string[]>;
export const wwkeRelatedContext:Partial<Record<string,string[]>>;
