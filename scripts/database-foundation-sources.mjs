import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {databaseReportSource} from './database-report-sources.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const code=path=>readFileSync(resolve(root,path),'utf8');
const imp=(names,path)=>`import {${names}} from ${JSON.stringify(resolve(root,path))};\n`;
const clone=value=>JSON.parse(JSON.stringify(value));
function bodyFrom(path,marker){
  const source=code(path),offset=source.indexOf(marker);
  if(offset<0)throw Error('Source adapter boundary changed: '+path);
  return source.slice(offset);
}

// All parsing of the historical corpus happens at build time. Runtime adapters
// retain their original version/identity rules and receive only checked data.
export async function prepareFoundationSources({repository,release,files,special,move,read}){
  const reader=await import('../lib/foundation-reader.mjs');
  const bva=await import('../lib/foundations/bva.mjs');
  const cio=await import('../lib/cio-source-document.mjs');
  function archived(document){
    return {...databaseReportSource(document,document.id,repository,release),
      // Navigation-only page labels. Text and cells come from the page API.
      pages:document.pages.map(({page,label})=>({page,text:'',...(label?{label}:{})}))};
  }
  const path='lib/foundation-reader.mjs';
  const passageIndex=read('lib/foundations/source-passages.json');
  files.delete(resolve(root,'lib/foundations/source-passages.json'));
  const data={documents:reader.foundationDocuments.map(archived),passageIndex,bvaIndex:clone(bva.bvaIndex)};
  for(const [id,index] of Object.entries(passageIndex)){
    const document=reader.foundationDocuments.find(d=>d.id===id);
    if(!document)throw Error('Passage index without document: '+id);
    move(path,data,['passageIndex',id,'entries'],'source:'+document.sourceId+':passages');
  }
  move(path,data,['bvaIndex','entries'],'source:BVA2021:passages');
  files.set(resolve(root,path),data);
  special.set(resolve(root,path),
    imp('documentHashes','lib/provision-status.mjs')+
    imp('foundationDocumentFocus','lib/foundations/source-document-focus.mjs')+
    imp('historicalFoundationPassages,recognizedVersionedReference','lib/foundation-passage-history.mjs')+
    imp('doraFrameworkContextDocument,doraFrameworkContextIndex,doraFrameworkContextDocumentAllowed','lib/foundations/dorafc-context.mjs')+
    imp('eedVersionedPassages','lib/foundations/eed-versioned-passages.mjs')+
    `const {documents,passageIndex,bvaIndex}=data;const bvaDocument=documents.find(d=>d.id===${JSON.stringify(bva.bvaDocument.id)});\n`+
    bodyFrom(path,'export {documents as foundationDocuments};'));

  // The historical resolver uses locations and aliases, not normative prose.
  // Preserve its exact branching logic without importing every old parser.
  const historyPath='lib/foundation-passage-history.mjs',historyData={};
  const histories=[['history','AIA','source'],['wooHistory','WOO','woo-source'],['wdoHistory','WDO','wdo-source'],
    ['archiefHistory','ARCHIEF2026','archief-source'],['wwkeHistory','WWKE','wwke-source'],['wbkHistory','WBK','wbk-source'],
    ['wpgHistory','WPG','wpg-source'],['wjsgHistory','WJSG','wjsg-source'],['bio2History','BIO2','bio2-source'],
    ['cloudHistory','CLOUD2026','cloud2026-source'],['awHistory','AW','aw-source'],['csrdHistory','CSRD','csrd-source']];
  for(const [name,id,file] of histories){
    const filePath='lib/foundations/'+file+'-passage-history.json';
    historyData[name]=read(filePath);files.delete(resolve(root,filePath));
    move(historyPath,historyData,[name,'entries'],'source:'+id+':history');
  }
  for(const [file,names] of [['aia',['aiaItems']],['woo',['wooItems']],['wdo',['wdoItems']],['wdo-future',['wdoFutureItems']],
    ['archief',['archiefItems']],['wwke',['wwkeItems']],['wbk',['wbkItems']],['wpg',['wpgItems']],['wjsg',['wjsgItems']],
    ['bio2',['bio2Items']],['cloud2026',['cloudItems']],['aw',['awItems']],['csrd',['csrdItems']]]){
    const module=await import(pathToFileURL(resolve(root,'lib/foundations/'+file+'.mjs')).href);
    for(const name of names){
      const items=module[name];
      historyData[name]=clone(items.map(({sourceControlId,location,legacySourceControlIds})=>({sourceControlId,location,legacySourceControlIds})));
      move(historyPath,historyData,[name],'source:'+items[0].sourceId+':history');
    }
  }
  files.set(resolve(root,historyPath),historyData);
  special.set(resolve(root,historyPath),imp('catalogueDerived','lib/catalogue-runtime.mjs')+
    `const {${Object.keys(historyData).join(',')}}=data;const entries=[];\n`+
    `catalogueDerived(()=>entries.splice(0,entries.length,...[${histories.map(([name])=>`...${name}.entries`).join(',')}]));\n`+
    bodyFrom(historyPath,'export function recognizedVersionedReference'));

  const eedPath='lib/foundations/eed-versioned-passages.mjs';
  const eed=await import('../lib/foundations/eed.mjs'),eedSource=await import('../lib/foundations/eed-source.mjs');
  const eedData={historical:read('lib/foundations/eed-source-history.json'),
    eedItems:eed.eedItems.filter(p=>p.id==='EED-033').map(({id,location})=>({id,location})),
    eedDocuments:{datacenter:archived(eedSource.eedDocuments.datacenter)},
    rows:eedSource.eedSource.rows(eed.eedRecords.find(p=>p.id==='033').refs)};
  files.delete(resolve(root,'lib/foundations/eed-source-history.json'));
  move(eedPath,eedData,['historical','documents'],'source:EED:history');
  move(eedPath,eedData,['rows'],'source:EED:history');
  files.set(resolve(root,eedPath),eedData);
  const eedBody=bodyFrom(eedPath,'export function eedVersionedPassages');
  const call="eedSource.rows(eedRecords.find(p=>p.id==='033').refs)";
  if(!eedBody.includes(call))throw Error('EED source adapter changed');
  special.set(resolve(root,eedPath),imp('documentHashes','lib/provision-status.mjs')+
    'const {historical,eedItems,eedDocuments}=data;\n'+eedBody.replace(call,'data.rows'));

  const contextPath='lib/foundations/dorafc-context.json',context=read(contextPath);
  context.workbook.document=archived(context.workbook.document);
  for(const part of ['law','workbook'])move(contextPath,context,[part,'entries'],'source:DORAFC:context');

  // CIO's small source bundle already supplies the exact reviewed page text.
  // Do not import the entire historical reader merely to obtain its metadata.
  if(!cio.cioSourceDocument)throw Error('Exact CIO publication not found');
  const cioPath='lib/cio-source-document.mjs',{pages,...metadata}=cio.cioSourceDocument;
  files.set(resolve(root,cioPath),metadata);
  special.set(resolve(root,cioPath),imp('cioPages','lib/cio-law-adapter.mjs')+imp('catalogueDerived','lib/catalogue-runtime.mjs')+
    `const pageMetadata=${JSON.stringify(pages.map(({text,...rest})=>rest))};\n`+
    `export const cioSourceDocument={...data,pages:[]};\ncatalogueDerived(()=>cioSourceDocument.pages.splice(0,cioSourceDocument.pages.length,...cioPages.map((page,index)=>({...page,...pageMetadata[index]}))));`);
  return {documents:reader.foundationDocuments.length,pages:reader.foundationDocuments.reduce((n,d)=>n+d.pages.length,0)};
}
