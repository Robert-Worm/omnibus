import type {Draft} from './framework-types';
import type {ModelLibraryState} from '../app/model-library';
export type FoundationBrowse = {query:string;sourceId:string;topic:string;groupId:string;page:number;selectedOnly:boolean;reviewedOnly:boolean;grouped:boolean};
export type ProjectView = {page:string;lastCollectionPage:string;researchRoute:string;foundationCatalogueScope:'laws'|'frameworks';discoveryAxis:'themes'|'processes';discoveryCategory:string;openModelIds:string[];selected:string;readerId:string;reportPage:number;foundationFocus:string;sourceProcess:string;activeModel:string;modelDimension:string;modelQuery:string;combined:boolean;excluded:string[];foundationBrowse:FoundationBrowse;reportScope:'open'|'audit'|'all';choiceThemeId:string};
export type AboutViews = {laws:boolean;models:boolean;reports:boolean};
export type Project = {format:'rijksmap-project';version:2;collections:import('./source-collections.mjs').CollectionPreference;draft:Draft;modelLibrary:ModelLibraryState;workspace:{openIds:string[];activeId:string|null};view:ProjectView & {aboutViews:AboutViews}};
export type ProjectReadResult = {project:Project;legacy:boolean;migration:{fromVersion:number;toVersion:number}|null;preserveOriginal:boolean};
export type ProjectOpenReceipt = {originalKey:string|null;notice:string};
export const PROJECT_KEY:string;
export const MAX_PROJECT_BYTES:number;
export function projectContentEqual(a:unknown,b:unknown):boolean;
export function projectView(value?:Partial<ProjectView & {aboutViews:AboutViews}>):ProjectView & {aboutViews:AboutViews};
export function makeProject(draft:Draft,models:ModelLibraryState,workspace:Project['workspace'],view?:Partial<ProjectView & {aboutViews:AboutViews}>,collections?:Project['collections']):Project;
export function readProject(value:unknown,current:Project,options:{restoreDraft:(value:unknown)=>Draft;restoreModels:(value:unknown)=>ModelLibraryState;themes:unknown[];collections?:import('./source-collections.mjs').SourceCollections}):ProjectReadResult;
export function acceptProjectFile(opened:ProjectReadResult,persist:()=>ProjectOpenReceipt):ProjectOpenReceipt & {savedLocally:boolean};
export function guardedProjectStore(storage:Pick<Storage,'getItem'|'setItem'>,key?:string):{
  raw:()=>string|null;save:(project:Project)=>void;saveSerialized:(text:string)=>void;checkpoint:(preserve?:boolean)=>void;
  acceptProject:(opened:ProjectReadResult,originalText:string,options?:{replace?:boolean;preservePrevious?:boolean})=>ProjectOpenReceipt;
};
