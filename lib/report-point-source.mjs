import additions from '../app/report-additions.json' with {type:'json'};
import {reportPointLookup} from './report-point-lookup.mjs';
// Published download recorded in the verified Q0062 intake, not a guessed URL.
export const reportDownloadUrls={CIBGBIO24:'https://open.overheid.nl/documenten/93975e81-f46d-4eeb-b2b1-802e0db6ccfa/file'};
export function reportPointTrace(catalogue,pointId,lookup=reportPointLookup(catalogue)){
 const p=lookup.points(pointId);
 if(!p)throw Error('Onbekend rapporttoetspunt.');
 const report=lookup.reports(p.report_id);
 const exact=additions.locators.find(l=>l.point_id===pointId);
 const relations=exact?exact.relations:[...p.source_links,...p.context_source_links].map(link=>{
  const m=lookup.sources(link.material_id);
  if(!m||m.locator_status!=='EXACT')throw Error('Exacte bronlocatie ontbreekt.');
  return {...link,source_hash:m.source_hash,quote:m.quote,start:m.start,end:m.end,page:m.page,page_end:m.page_end,locator_status:'EXACT'};
 });
 const questions=(catalogue.interview_questions||[]).filter(q=>q.point_ids.includes(p.id));
 const visuals=(catalogue.visual_sources||[]).filter(v=>v.supports_point_ids?.includes(p.id)||v.context_line_ids?.includes(p.legacy_line_id));
 return {version:1,point_id:p.id,report_id:p.report_id,source_hash:report.source_hash,pdf_hash:report.pdf_hash,
  relations,questions,visuals,source_context:p.source_context,
  limitations:additions.corpus.find(c=>c.framework.report.id===p.report_id)?.framework.limitations||[]};
}
export function validateReportTrace(material){
 let t;try{t=JSON.parse(material.reportTrace);}catch{throw Error('Ongeldige rapportherleiding.');}
 if(t.version!==1||t.point_id!==material.sourcePointId||t.source_hash!==material.sourceHash||!Array.isArray(t.relations)||!t.relations.length||!Array.isArray(t.questions)||!Array.isArray(t.limitations))throw Error('Onvolledige rapportherleiding.');
 for(const r of t.relations)if(r.locator_status!=='EXACT'||r.source_hash!==t.source_hash||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end<=r.start||!Number.isInteger(r.page)||r.page<1||Array.from(r.quote||'').length!==r.end-r.start)throw Error('Ongeldige rapportbronlocatie.');
 const original=additions.locators.find(l=>l.point_id===t.point_id);
 if(original&&(original.source_hash!==t.source_hash||JSON.stringify(original.relations)!==JSON.stringify(t.relations)))throw Error('Rapportbronlocaties wijken af van de beoordeelde bron.');
 if(original){
  const report=additions.corpus.find(c=>c.framework.report.id===t.report_id);
  const point=additions.catalogue.points.find(p=>p.id===t.point_id);
  const questions=additions.interview_questions.filter(q=>q.point_ids.includes(t.point_id));
  const visuals=additions.visual_sources.filter(v=>v.supports_point_ids?.includes(t.point_id)||v.context_line_ids?.includes(point?.legacy_line_id));
  if(!report||point?.report_id!==t.report_id||report.framework.report.pdf_hash!==t.pdf_hash||JSON.stringify(t.questions)!==JSON.stringify(questions)||JSON.stringify(t.visuals)!==JSON.stringify(visuals)||JSON.stringify(t.limitations)!==JSON.stringify(report.framework.limitations)||JSON.stringify(t.source_context)!==JSON.stringify(point.source_context))throw Error('Rapportvragen of bronbeperkingen wijken af van het beoordeelde pakket.');
 }
 return t;
}
