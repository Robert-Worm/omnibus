// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/process-catalogue.mjs";
import { retiredThemeIds } from "@/lib/catalogue-retirement.mjs";
import {createSourceFilter} from '../source-catalogue-filter.mjs';
import { additionalProcesses } from '../additional-processes.mjs';
import {catalogueDerived} from '../catalogue-runtime.mjs';
// Een vraagplan per onderwerp van een familie (B-076) staat in dezelfde lijst, met het veld `topic`. Het is geen proces
// in de navigatie: het plan wordt alleen in stap 3 aangeboden.
const all = [...data.processes, ...additionalProcesses].map(process=>({...process}));
export const processes = all.filter(process => !process.topic);
export const topicProcesses = all.filter(process => process.topic);
catalogueDerived(()=>{
  for(const process of all){
    if(Object.hasOwn(data.questionPlans??{},process.id))process.questionPlan=data.questionPlans[process.id];
    else delete process.questionPlan;
  }
});
export const activeProcesses = processes.filter(p => !p.themeId || !retiredThemeIds.includes(p.themeId));
export const questionProcesses = [...activeProcesses, ...topicProcesses];
// Editorial process topics, not norms or automatic mappings to an entire law.
// Unknown processes must never fall back to another process's question plan.
export const processResearchTopics = data.processResearchTopics;
export const sourceDomains = data.sourceDomains;
export const filterSources = createSourceFilter(processes, sourceDomains);
