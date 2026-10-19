import type {filterSources,activeProcesses,processResearchTopics} from './process-catalogue.mjs';
export function retainedFields(filter:typeof filterSources):number[] {
  return filter([{id:'S',title:'Synthetic',kind:'law',extra:42}]).map(row=>row.extra);
}
export function processQuestion(process:typeof activeProcesses[number]):string{return process.question;}
export function optionalTopics(topics:typeof processResearchTopics):string[]{return topics['absent']??[];}
export function invalidSource(filter:typeof filterSources){
  // @ts-expect-error A source without a title cannot be ordered or displayed.
  return filter([{id:'S',kind:'law'}]);
}
