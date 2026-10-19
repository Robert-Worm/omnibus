// Compile-only contracts; no private data or model code is loaded.
import type {initialModelLibrary,restoreModelLibrary,scopedExportSelection,exportDraftForSelection,selectedModelOptions} from './model-library.mjs';
import type {activeIntegrityModel} from './cev-active.mjs';
import type {Draft} from './framework-types.js';

export function models(load:typeof initialModelLibrary):string[]{return load().models.map(model=>model.id);}
export function restore(load:typeof restoreModelLibrary,input:unknown):string[]{return load(input).models.map(model=>model.title);}
export function selection(value:ReturnType<typeof scopedExportSelection>):string[]{return [...value.included,...value.themes.flatMap(theme=>theme.lineIds)];}
export function questions(load:typeof activeIntegrityModel):string[]{return load().items.flatMap(item=>item.questions.map(question=>question.question));}
export function unloadedTitle(load:typeof activeIntegrityModel):string{
  // @ts-expect-error The lazy model's metadata is absent before its content loads.
  return load().title;
}
export function counts(select:typeof exportDraftForSelection,draft:Draft):number{return select(draft,[]).exportSelection.exported;}
export function invalidSelection(select:typeof exportDraftForSelection,draft:Draft){
  // @ts-expect-error Selected norms are identities, not embedded source records.
  return select(draft,[{id:'synthetic'}]);
}
export function invalidInterview(select:typeof selectedModelOptions){
  // @ts-expect-error Interview levels must be an array, not a single string.
  return select(undefined,{levels:'operational',starr:false,triangulation:false,overrides:{}});
}
