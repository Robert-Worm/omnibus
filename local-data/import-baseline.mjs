import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,relative,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CatalogueRepository,digest} from './repository.mjs';
import {verifyReportQualityRelease} from '../scripts/verify-report-quality-release.mjs';
import {revisedReportLine} from '../lib/report-quality-revisions.mjs';
import {topicalPackages,topicalIds} from '../lib/topical-content.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(join(root,p),'utf8'));
const entry=(kind,data)=>({id:data.id,kind,title:data.title||data.name||data.id,status:data.selection_status??data.review_status??data.reviewStatus??null,data});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}

export async function baselineSnapshot(){
 verifyReportQualityRelease();
 // Existing release gates, never substituted with a successful SQL import.
 for(const args of [['scripts/verify-report-release.mjs'],['scripts/prepare-cio-integration.mjs','--check'],['scripts/prepare-wwke.mjs','--check'],['scripts/verify-cio-editorial.mjs'],['scripts/verify-wwke-text-review.mjs'],['scripts/prepare-report-point-catalogue.mjs','--check'],['scripts/prepare-topical-integration.mjs','--check']])
  execFileSync(process.execPath,args,{cwd:root,stdio:'inherit'});
 const [{extendReportCorpus},{default:points},{importedFoundationItems},{foundations},{foundationDocuments},{initialModelLibrary},cio,wwke,{PRODUCT_VERSION}]=await Promise.all([
  import('../lib/reviewed-reports.mjs'),import('../lib/report-point-catalogue.mjs'),import('../lib/foundations/registry.mjs'),import('../lib/investigation.mjs'),import('../lib/foundation-reader.mjs'),import('../lib/model-library.mjs'),import('../lib/cio-law-data.mjs'),import('../lib/wwke-law-data.mjs'),import('../lib/product-release.mjs')]);
 const corpus=extendReportCorpus(read('app/trial-corpus.json'));
 const packages=corpus.corpus.map(c=>({id:c.framework.report.id,kind:'report',title:c.framework.report.title,metadata:c.framework.report,
  context:{...c.framework,lines:undefined,evidence:undefined},
  records:[...c.framework.lines.map(x=>entry('norm',revisedReportLine(x))),...c.framework.evidence.map(x=>entry('evidence',x)),...points.points.filter(x=>x.report_id===c.framework.report.id).map(x=>entry('point',x)),...points.sources.filter(x=>x.report_id===c.framework.report.id).map(x=>entry('source-link',x))]}));
 const foundationIds=[...new Set(importedFoundationItems.map(x=>x.sourceId))].filter(id=>!topicalIds.includes(id));
 for(const id of foundationIds){const metadata=foundations.find(x=>x.id===id)||{id,title:id};
  packages.push({id,kind:'foundation',title:metadata.title,metadata,records:importedFoundationItems.filter(x=>x.sourceId===id).map(x=>entry('norm',x))});
 }
 for(const p of topicalPackages)packages.push({id:p.id,kind:'foundation',title:p.context.title,metadata:foundations.find(s=>s.id===p.id),context:p.context,
  records:[...p.catalogue.criteria.map(x=>entry('norm',x)),...p.catalogue.points.map(x=>entry('point',x)),...p.catalogue.objectives.map(x=>entry('objective',x)),...p.bank.records.map(x=>entry('source-link',x))]});
 for(const model of initialModelLibrary().models)packages.push({id:model.id,kind:'model',title:model.title,metadata:{...model,items:undefined},records:model.items.map(x=>entry('dimension',x))});
 for(const [id,metadata,catalogue,bank] of [[cio.cioSourceId,cio.cioMetadata,cio.cioCatalogue,cio.cioSourceBank],[wwke.wwkeSourceId,wwke.wwkeMetadata,wwke.wwkeCatalogue,wwke.wwkeBank]])
  packages.push({id,kind:'law',title:metadata.title,metadata,context:{...catalogue,points:undefined,criteria:undefined,objectives:undefined},records:[...catalogue.criteria.map(x=>entry('norm',x)),...catalogue.points.map(x=>entry('point',x)),...catalogue.objectives.map(x=>entry('objective',x)),...bank.records.map(x=>entry('source-link',x))]});
 const allDocuments=[...foundationDocuments,...topicalPackages.flatMap(p=>p.documents),...corpus.corpus.map(c=>({...c.source,id:c.source.id||c.framework.report.id})),
  {id:cio.cioSourceId+'-publication',pages:cio.cioPages,sourceBank:cio.cioSourceBank.source_identity},
  {id:wwke.wwkeSourceId+'-publication',pages:wwke.wwkePages,sourceBank:{source_pdf_sha256:wwke.wwkeBank.source_pdf_sha256,source_pages_sha256:wwke.wwkeBank.source_pages_sha256}}];
 const documents=[...new Map(allDocuments.map(d=>[digest(d),d])).values()];
 const artifacts=['lib/foundations/source-passages.json','lib/wwke-reviewed/context.json','lib/wwke-reviewed/status.json','lib/wwke-reviewed/receipt.json','lib/wwke-reviewed/filters.json','lib/wwke-reviewed/impact.json','lib/cio-reviewed/issues.json','lib/cio-reviewed/status.json'].map(name=>({name,data:read(name)}));
 const files=[...walk(join(root,'app')),...walk(join(root,'lib'))].filter(p=>/\.(json|mjs|tsx)$/.test(p)&&!p.endsWith('.test.mjs')).sort().map(path=>({path:relative(root,path).replaceAll('\\','/'),bytes:fs.statSync(path).size,sha256:digest(fs.readFileSync(path,'utf8'))}));
 artifacts.push({name:'baseline-file-inventory',data:files});
 const manifest={format:'omnibus-catalogue-release',schema:1,baselineVersion:PRODUCT_VERSION,basisHash:digest(files),validation:'Existing source gates passed; import is not a new content approval',humanValidation:'Preserved per original source; not granted by migration',counts:{packages:packages.length,records:packages.reduce((n,p)=>n+p.records.length,0),documents:documents.length,pages:documents.reduce((n,d)=>n+d.pages.length,0)}};
 return {manifest,packages,documents,artifacts};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const path=process.argv[2]||fileURLToPath(new URL('./runtime/catalogue.sqlite',import.meta.url));
 fs.mkdirSync(resolve(path,'..'),{recursive:true});
 const snapshot=await baselineSnapshot(),repository=new CatalogueRepository(path);
 try{const release=repository.importRelease(snapshot);console.log(JSON.stringify({release,path,...snapshot.manifest.counts,integrity:repository.integrity()}));}
 finally{repository.close();}
}
