import catalogue from '../app/reviewed-pilot-catalogue.json' with {type:'json'};
import fraude from '../app/reviewed-fraude-catalogue.json' with {type:'json'};
import erp from '../app/reviewed-erp-catalogue.json' with {type:'json'};
import ivho from '../app/reviewed-ivho-catalogue.json' with {type:'json'};
import ilt from '../app/reviewed-ilt-catalogue.json' with {type:'json'};
import boc from '../app/reviewed-boc-catalogue.json' with {type:'json'};
import digi from '../app/reviewed-digi-catalogue.json' with {type:'json'};
import begroting from '../app/reviewed-begroting-catalogue.json' with {type:'json'};
import hvp from '../app/reviewed-hvp-catalogue.json' with {type:'json'};
import bsa from '../app/reviewed-bsa-catalogue.json' with {type:'json'};
import f35 from '../app/reviewed-f35-catalogue.json' with {type:'json'};
const catalogues=[catalogue,fraude,erp,ivho,ilt,boc,digi,begroting,hvp,bsa,f35];
// Approved per-item discovery links. Do not infer complete process coverage,
// change the normative source catalogue, or select any items on the user's behalf.
export const reviewedProcessCatalogue=catalogue;
export function reviewedProcessTopics(processId){
  return catalogues.flatMap(catalogue=>catalogue.process_mappings.filter(m=>m.process_id===processId).map(m=>({
    themeId:catalogue.theme.id,title:catalogue.theme.title,lineIds:[...m.line_ids],reason:m.reason,
  })));
}
export function reviewedThemeProcesses(themeId){
  return catalogues.filter(c=>c.theme.id===themeId).flatMap(c=>c.process_mappings.map(m=>m.process_id));
}
