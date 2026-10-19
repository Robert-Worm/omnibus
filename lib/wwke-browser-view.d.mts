import type {Line} from './framework-types';
import type {WwkePoint} from './wwke-law-data.mjs';
export const lawBrowserColumns:{id:string;title:string}[];
export type WwkeBrowseFilters={query?:string;sector?:string;government?:string;audience?:string;includeGeneral?:boolean;selectedOnly?:boolean;section?:'norms'|'context'|'hold'};
export const wwkeBrowserGroups:{id:string;title:string;description:string;criteria:string[]}[];
export function wwkeBrowserInventory(filters?:WwkeBrowseFilters,selectedIds?:string[]):{norms:WwkePoint[];context:WwkePoint[];hold:WwkePoint[]};
export function wwkeBrowserRows(filters?:WwkeBrowseFilters,selectedIds?:string[]):(Line&{criterionId:string;groupId:string;groupTitle:string;sourceChapter:string;pointIds:string[]})[];
