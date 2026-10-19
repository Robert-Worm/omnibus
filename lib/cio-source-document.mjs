// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/cio-source-document.mjs";
import {cioPages} from "@/lib/cio-law-adapter.mjs";
import {catalogueDerived} from "@/lib/catalogue-runtime.mjs";
const pageMetadata=data.pageMetadata;
export const cioSourceDocument={...data,pages:[]};
catalogueDerived(()=>cioSourceDocument.pages.splice(0,cioSourceDocument.pages.length,...cioPages.map((page,index)=>({...page,...pageMetadata[index]}))));
export default data;
