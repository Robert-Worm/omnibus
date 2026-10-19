// The pinned database build supplies the implementation through its existing adapter.
import type {Draft,Framework} from './framework-types.js';
import type {LibraryItem,LibraryModel,LibraryQuestion,ModelLibraryState} from './model-library-types.js';

export function initialModelLibrary():ModelLibraryState;
export function restoreModelLibrary(value:unknown,catalogue?:ModelLibraryState):ModelLibraryState;
export function hasReviewedQuestion(question:LibraryQuestion):boolean|undefined;
export function scopedExportSelection(framework:Framework,draft:Draft):{
  themes:NonNullable<Framework['themes']>;
  themeIds:string[];
  excludedNorms:string[];
  included:string[];
};
export function exportDraftForSelection(draft:Draft,included:string[]):Draft & {
  exportSelection:{chosen:number;exported:number;unlinked:number;excluded:number};
};
export function selectedModelOptions(model:LibraryModel|null|undefined,interviewSettings?:{
  levels:string[];starr:boolean;triangulation:boolean;
  overrides:Record<string,{starr?:boolean;triangulation?:boolean}>;
}):{
  basis:string;modelId:string;modelVersion:string;modelTitle:string;modelQuestion:string;modelSource:string;
  modelItems:Pick<LibraryItem,'id'|'title'|'question'|'probes'|'included'>[];
  interviewStructured:boolean;modelAdapted:boolean;
};
declare const data:unknown;
export default data;
