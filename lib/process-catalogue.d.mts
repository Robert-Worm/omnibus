// The build supplies this module through the existing database adapter.
import type {CatalogueProcess,SourceDomains} from './source-catalogue-filter.mjs';
export const processes:CatalogueProcess[];
export const activeProcesses:CatalogueProcess[];
export const processResearchTopics:Partial<Record<string,string[]>>;
export const sourceDomains:SourceDomains;
export const filterSources:ReturnType<typeof import('./source-catalogue-filter.mjs').createSourceFilter>;
