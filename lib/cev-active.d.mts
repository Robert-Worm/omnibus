import type {LibraryModel,LibraryItem,LibraryQuestion} from './model-library-types.js';
export const activeIntegrityDimensions:string[];
export const prePracticalCevQuestions:(Pick<LibraryQuestion,'id'|'title'|'question'|'probes'> & {
  indicatorIndex0or1:number;variants:Record<string,string>;
})[];
// Before lazy content loading only the empty items array is available.
export function activeIntegrityModel(reviewed?:boolean):Partial<Omit<LibraryModel,'items'>> & {
  items:(LibraryItem & {questions:LibraryQuestion[]})[];
};
declare const data:unknown;
export default data;
