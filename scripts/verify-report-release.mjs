// Release gate: pinned reviewed bytes, not a new semantic approval.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, join} from 'node:path';
import assert from 'node:assert/strict';
import {evidencePath} from '../content-tools/evidence-paths.mjs';
import {verifyReportCatalogueRemoval} from '../content-tools/report-retirement-proof.mjs';
import {verifyCibgIntegration} from './integrate-cibg-bio.mjs';
import {packages,integration} from './integrate-boc-digi.mjs';
const viewer=fileURLToPath(new URL('../',import.meta.url));
export const packet=resolve(viewer,'../report-ingestion/CLOUDTOETS-2025');
export const custodyPath=resolve(packet,'../pilot-custody/CLOUDTOETS-2025-final.json');
export const custodyHash='d47c08a7d5a2e7d5368c8da46cfc75d64c28fb7faac5e240d0559775197612ae';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const json=path=>JSON.parse(readFileSync(path,'utf8'));
const evidenceJson=path=>json(evidencePath(path));
export function verifyPacket(){
  assert.equal(hash(readFileSync(join(packet,'HANDOFF.json'))),'968277897afa2bc3703521fe39b337961fac8a97ba7f041efff70f59ecf0f682','Handoff changed');
  assert.equal(hash(readFileSync(custodyPath)),custodyHash,'Custody changed');
  const handoff=json(join(packet,'HANDOFF.json')),custody=json(custodyPath);
  for(const item of [...Object.values(handoff.files),...Object.values(handoff.guard_files),handoff.original_pdf])assert.equal(hash(readFileSync(evidencePath(item.path))),item.sha256,item.path);
  for(const [name,digest] of Object.entries(custody.files))assert.equal(hash(readFileSync(join(packet,name))),digest,name);
  for(const name of ['source-final-review.json','audit-final-review.json']){
    const review=json(join(packet,name));assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);
    for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(packet,target))),digest,target);
  }
  return handoff;
}
function verifyV52Registry(registryBytes){
  assert.equal(hash(registryBytes),'e471588aa3298f2695877d77f64f01fc9171fc09ac7e3f19abc384b9028c99e6','Unapproved registry: exact ERP25 exception integration only');
  const registry=JSON.parse(registryBytes);
  assert.equal(registry.corpus.length,13);
  assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),148);
  const priorPath=resolve(viewer,'../report-ingestion/integration-FRAUDE25-v51/PREVIOUS-REVIEWED-REPORTS.json');
  assert.equal(hash(readFileSync(priorPath)),'bc0a4bea56e534cbbaf5408084b37a8d619fb3a4cdb86e5c980405d99c31a804');
  const prior=json(priorPath);
  assert.deepEqual(registry.corpus.slice(0,11),prior.corpus);
  assert.deepEqual(registry.themes.slice(0,prior.themes.length),prior.themes);
  assert.deepEqual(registry.corpus[10],json(join(packet,'APP-FINAL.json')));
  assert.deepEqual(registry.corpus[11],json(resolve(packet,'../FRAUDE-CORRUPTIE-2025/APP-FINAL.json')));
  const erpPriorPath=resolve(packet,'../integration-ERP25-v52/PREVIOUS-REVIEWED-REPORTS.json');
  assert.equal(hash(readFileSync(erpPriorPath)),'0bdcfcfc67fb489c99602666015eb2f840035144ab6e6c751d438810140d01dc');
  const erpPrior=json(erpPriorPath);
  assert.deepEqual(registry.corpus.slice(0,12),erpPrior.corpus);
  assert.deepEqual(registry.themes.slice(0,erpPrior.themes.length),erpPrior.themes);
  assert.deepEqual(registry.corpus[12],json(resolve(packet,'../ERP-REGIE-2025/APP-FINAL.json')));
  return registry;
}
export function verifyErpPacket(){
 const folder=resolve(packet,'../ERP-REGIE-2025'),out=resolve(packet,'../integration-ERP25-v52');
 const dispositionPath=join(out,'EXCEPTION-DISPOSITION.json');
 assert.equal(hash(readFileSync(dispositionPath)),'1fa130dc88f9a24ad70bf83410ec5d70189cb961a163e80dd67f5dc25f87b3b1');
 const disposition=json(dispositionPath);assert.equal(disposition.originalGateStatus,'HOLD');
 for(const [path,digest] of Object.entries(disposition.bindings))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
 for(const path of [join(folder,'GATE-VERIFY.json'),join(out,'PRE-INTEGRATION-GATE.json')]){
  const gate=json(path);assert.equal(gate.status,'HOLD');assert.deepEqual(gate.errors,disposition.allowedErrors);
 }
 const receiptPath=resolve(packet,'../custody/ERP-REGIE-2025-final-1.json');
 assert.equal(hash(readFileSync(receiptPath)),'32ff3192b53929b48f8f927bd5c2ec6b19861046612d12b0022de547729aa430');
 for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 for(const name of ['source-final-review.json','audit-final-review.json']){
  const review=json(join(folder,name));assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);
  for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);
 }
 const app=json(join(folder,'APP-FINAL.json'));assert.equal(hash(readFileSync(evidencePath(json(join(folder,'SOURCE.json')).pdf_path))),app.framework.report.pdf_hash);
 // Historic frozen path is validated against preserved bytes, never rewritten or silently rehashed.
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files)){
  const checked=path.replaceAll('\\','/').endsWith('/viewer/app/reviewed-reports.json')?resolve(packet,'../integration-FRAUDE25-v51/PREVIOUS-REVIEWED-REPORTS.json'):evidencePath(path);
  assert.equal(hash(readFileSync(checked)),digest,checked);
 }
}
export function verifyFraudePacket(){
 const folder=resolve(packet,'../FRAUDE-CORRUPTIE-2025');
 const receiptPath=resolve(packet,'../custody/FRAUDE-CORRUPTIE-2025-final-1.json');
 assert.equal(hash(readFileSync(receiptPath)),'7916d3665f803bf6b6fc1b65bccce584f9a6e1c1107f8c0be11d5d2279fab01f');
 const receipt=json(receiptPath);
 for(const [name,digest] of Object.entries(receipt.files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 for(const name of ['source-final-review.json','audit-final-review.json']){
  const review=json(join(folder,name));assert.equal(review.decision,'APPROVE');
  assert.deepEqual(review.unresolved_issues,[]);
  for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);
 }
 const app=json(join(folder,'APP-FINAL.json'));
 assert.equal(hash(readFileSync(evidencePath(app.framework.report.localPdf))),app.framework.report.pdf_hash);
 // Preserve the original analysis anchors: compare old registry to the saved exact prior bytes.
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files)){
  const checked=path.replaceAll('\\','/').endsWith('/viewer/app/reviewed-reports.json')?resolve(viewer,'../report-ingestion/integration-FRAUDE25-v51/PREVIOUS-REVIEWED-REPORTS.json'):evidencePath(path);
  assert.equal(hash(readFileSync(checked)),digest,checked);
 }
}
export function verifyReportRelease(){
  verifyReportCatalogueRemoval(json(join(viewer,'app/report-point-catalogue.json')));
  const cibg=verifyCibgIntegration();
  verifyPacket();
  verifyFraudePacket();
  verifyErpPacket();
  verifyIvhoPacket();
  verifyIltPacket();
  verifyBocDigiPackets();
  verifyBegrotingPacket();
  verifyHvpPacket();
  verifyBsaPacket();
  verifyF35Packet();
  verifyRegistry(readFileSync(join(viewer,'app/reviewed-reports.json')));
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-pilot-catalogue.json'))),'4e3986240b4b019ee2fe8ed904e57f2e2afbfb030f2c2ce75b60dcf7a0de13a7','Catalogue changed');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-fraude-catalogue.json'))),'ebc664ea674de6a3be024e5488768a1c569b06f3c94635ff30db1e36a28fd3b1','Fraude catalogue changed');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-erp-catalogue.json'))),'368adaff05673f393b06d1f0f5e89a526488106077852fc5de79164e8b3644af','ERP catalogue changed');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-ivho-catalogue.json'))),'ca8d2f092501baf2d3ee0a6862b47af0f878ccb4d909822d11b709528b7165ec','IVHO catalogue changed');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-ilt-catalogue.json'))),'ce19d2e8e971f958573686e407a55826854a2d88db44ceea779704508ae39458','ILT catalogue changed');
  for(const p of packages)assert.equal(hash(readFileSync(join(viewer,`app/reviewed-${p.short}-catalogue.json`))),p.cat);
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-boc-display.json'))),'dab9a521c1edc97352810b4c058e636c44f0b6a176096b60ac3277e729512557');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-begroting-catalogue.json'))),'60f14c704d597e8bd09fb7ce4f3283a8ce49ae165e79fe6dbfd382d94f1db31a');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-begroting-display.json'))),'913f6a072dc9c2f56754033f2efdf615a6a4ab66cb94ac17174677f1f3522175');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-hvp-catalogue.json'))),'0cb53a9622c16c6cc34fc5cacb804c56c6d69dfb5e6f53468217f35b8f89f82b');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-hvp-display.json'))),'3fc273bcd4958824470ef3f9a2e710b760aefb2a7e6fde2bba109cf69b38a86f');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-bsa-catalogue.json'))),'ae1e3bf21411e93f36db8f3dc468e47b7c322c43a8b395ea089a63182aec09ec');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-bsa-display.json'))),'bbaed67b1063699b69b498291b8840045d6557ffa79e2cfb451e743b6419a670');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-f35-catalogue.json'))),'3fb2f6eb172d59a4950e55de0e389ba34f0681947e728e8bfa01dfee76e44d60');
  assert.equal(hash(readFileSync(join(viewer,'app/reviewed-f35-display.json'))),'dd667fc37cb88bea5eaf6cf4dd709f4a7c1be680dd7a40d1e62dca706e1bd557');
  // The source taxonomy is preserved; discovery links are a separate reviewed layer.
  for(const [path,digest] of Object.entries(json(join(packet,'BASELINE-FREEZE.json')).files)){
    if(!path.replaceAll('\\','/').endsWith('/viewer/app/reviewed-reports.json'))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
  }
  return {status:'PASS',reports:22,items:305,cibg_integration:cibg,f35v25_integration_authorized:true,f35v25_receipt_revision:2,bsa2324_integration_authorized:true,bsa2324_receipt_revision:2,hvp25_integration_authorized:true,begvoorb25_integration_authorized:true,boc25_integration_authorized:true,digiinkoop25_integration_authorized:true,iltrisk25_integration_authorized:true,ivho25_integration_authorized:true,fraude25_integration_authorized:true,erp25_integration:'AUTHORIZED_BASELINE_EXCEPTION',erp25_original_gate:'HOLD',human_source_validation:false};
}
function verifyV54Registry(registryBytes){
 assert.equal(hash(registryBytes),'45d98032656967a0f4a37e651a6c3fb15dd45efe13651a0c002c033e84ab7de9','Unapproved registry: exact IVHO25 integration only');
 const priorBytes=readFileSync(resolve(packet,'../integration-IVHO25-v54/PREVIOUS-REVIEWED-REPORTS.json'));
 const prior=verifyV52Registry(priorBytes),registry=JSON.parse(registryBytes);
 assert.equal(registry.corpus.length,14);assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),158);
 assert.deepEqual(registry.corpus.slice(0,13),prior.corpus);
 assert.deepEqual(registry.themes.slice(0,prior.themes.length),prior.themes);
 assert.deepEqual(registry.researchPresets.slice(0,prior.researchPresets.length),prior.researchPresets);
 assert.deepEqual(registry.researchGroups,prior.researchGroups);
 assert.deepEqual(registry.corpus[13],json(resolve(packet,'../IVHO-BEZOEKFREQUENTIE-2025/APP-FINAL.json')));
 return registry;
}
function verifyV59Registry(registryBytes){
 assert.equal(hash(registryBytes),'05aefd696599fd29ae359f4112b5f1084e12bff5c9dd48e25c28a6c83bb19d4b','Unapproved registry: exact ILTRISK25 integration only');
 const prior=verifyV54Registry(readFileSync(resolve(packet,'../integration-ILTRISK25-v59/PREVIOUS-REVIEWED-REPORTS.json'))),registry=JSON.parse(registryBytes);
 assert.equal(registry.corpus.length,15);assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),174);
 assert.deepEqual(registry.corpus.slice(0,14),prior.corpus);
 assert.deepEqual(registry.themes.slice(0,prior.themes.length),prior.themes);
 assert.deepEqual(registry.researchPresets.slice(0,prior.researchPresets.length),prior.researchPresets);
 assert.deepEqual(registry.researchGroups,prior.researchGroups);
 assert.deepEqual(registry.corpus[14],json(resolve(packet,'../ILT-RISICOGERICHT-2025/APP-FINAL.json')));
 return registry;
}
function verifyV64Registry(registryBytes){
 assert.equal(hash(registryBytes),'1e870aa4b60a7c31a53c22cd4cefb4acf3472d6b0d7c68f3eb613513f4d7c644','Unapproved registry: exact BOC25 and DIGIINKOOP25 integration only');
 const prior=verifyV59Registry(readFileSync(join(integration,'PREVIOUS-REVIEWED-REPORTS.json'))),registry=JSON.parse(registryBytes);
 assert.equal(registry.corpus.length,17);assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),209);
 assert.deepEqual(registry.corpus.slice(0,15),prior.corpus);
 for(const key of ['themes','researchPresets'])assert.deepEqual(registry[key].slice(0,prior[key].length),prior[key]);
 assert.deepEqual(registry.researchGroups,prior.researchGroups);
 packages.forEach((p,i)=>assert.deepEqual(registry.corpus[15+i],json(resolve(packet,'../',p.folder,'APP-FINAL.json'))));
 return registry;
}
function verifyV65Registry(registryBytes){
 assert.equal(hash(registryBytes),'ba6d65c777a40bc3855cf775f65805bbf8280a09d59a2107048f94cc5fea3391','Unapproved registry: exact BEGVOORB25 integration only');
 const prior=verifyV64Registry(readFileSync(resolve(packet,'../integration-BEGVOORB25-v65/PREVIOUS-REVIEWED-REPORTS.json'))),registry=JSON.parse(registryBytes);
 assert.equal(registry.corpus.length,18);assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),256);
 assert.deepEqual(registry.corpus.slice(0,17),prior.corpus);
 for(const key of ['themes','researchPresets'])assert.deepEqual(registry[key].slice(0,prior[key].length),prior[key]);
 assert.deepEqual(registry.researchGroups,prior.researchGroups);
 assert.deepEqual(registry.corpus[17],json(resolve(packet,'../BEGROTINGSVOORBEREIDING-2025/APP-FINAL.json')));
 return registry;
}
function verifyV66Registry(registryBytes){
 assert.equal(hash(registryBytes),'bc0554756607b1b2fac501b043af8f48e5594578513b160a0f63f773a280483a','Unapproved registry: exact HVP25 integration only');
 const prior=verifyV65Registry(readFileSync(resolve(packet,'../integration-HVP25-v66/PREVIOUS-REVIEWED-REPORTS.json'))),registry=JSON.parse(registryBytes);
 assert.equal(registry.corpus.length,19);assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),265);
 assert.deepEqual(registry.corpus.slice(0,18),prior.corpus);
 for(const key of ['themes','researchPresets'])assert.deepEqual(registry[key].slice(0,prior[key].length),prior[key]);
 assert.deepEqual(registry.researchGroups,prior.researchGroups);
 assert.deepEqual(registry.corpus[18],json(resolve(packet,'../UITVOERING-HVP-2025/APP-FINAL.json')));
 return registry;
}
function verifyV67Registry(registryBytes){
 assert.equal(hash(registryBytes),'3cb8278271dc41d3331d787993e0cb26d46d517d6327b45813798600c0119860','Unapproved registry: exact BSA2324 revision2 integration only');
 const prior=verifyV66Registry(readFileSync(resolve(packet,'../integration-BSA2324-v67/PREVIOUS-REVIEWED-REPORTS.json'))),registry=JSON.parse(registryBytes);
 assert.equal(registry.corpus.length,20);assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),276);
 assert.deepEqual(registry.corpus.slice(0,19),prior.corpus);
 for(const key of ['themes','researchPresets'])assert.deepEqual(registry[key].slice(0,prior[key].length),prior[key]);
 assert.deepEqual(registry.researchGroups,prior.researchGroups);
 assert.deepEqual(registry.corpus[19],json(resolve(packet,'../BSA-CONTRACTVOORWAARDEN-2023-2024/APP-FINAL.json')));
 return registry;
}
export function verifyBegrotingPacket(){
 const folder=resolve(packet,'../BEGROTINGSVOORBEREIDING-2025'),out=resolve(packet,'../integration-BEGVOORB25-v65');
 assert.equal(hash(readFileSync(join(folder,'HANDOFF.md'))),'bd65bf76e298660f9a7d25a2c5dad2a9b480093b21b8cb60f154f45ba1eccd58');
 const receiptPath=resolve(packet,'../custody/BEGROTINGSVOORBEREIDING-2025-final-1.json');
 assert.equal(hash(readFileSync(receiptPath)),'3d7e1bb46386e080aaf78d04fe0d2285533afdf8161c58b02b501077ccb62b3f');
 for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 assert.equal(hash(readFileSync(join(folder,'APP-FINAL.json'))),'73761ea705c179c4d429e915bfdb6d6ad7ea2192c50a3fafc284f712af49067b');
 for(const [name,digest] of Object.entries(json(join(folder,'REVIEW-BASIS.json')).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 const reviews=['source-final-review.json','audit-final-review.json'].map(name=>json(join(folder,name)));
 assert.notEqual(reviews[0].reviewer_agent,reviews[1].reviewer_agent);
 for(const review of reviews){assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);assert.equal(review.item_reviews.length,47);assert.ok(review.item_reviews.every(i=>i.decision==='APPROVE'));for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);}
 const app=json(join(folder,'APP-FINAL.json')),config=json(join(folder,'CONFIG.json'));
 assert.equal(hash(readFileSync(evidencePath(config.pdf_path))),app.framework.report.pdf_hash);
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
 const frozen=evidenceJson(config.registry_path),prior=json(join(out,'PREVIOUS-REVIEWED-REPORTS.json'));assert.deepEqual(prior.corpus.slice(0,frozen.corpus.length),frozen.corpus);
 const gate=json(join(out,'PRE-INTEGRATION-GATE.json'));assert.equal(gate.status,'PASS_FOR_PARENT_REVIEW');assert.deepEqual(gate.errors,[]);
}
export function verifyHvpPacket(){
 const folder=resolve(packet,'../UITVOERING-HVP-2025'),out=resolve(packet,'../integration-HVP25-v66');
 assert.equal(hash(readFileSync(join(folder,'HANDOFF.md'))),'c9e06ab4a0dddc93ce96b6e237235115566a34b6e36935e8ac92e6409b4824a9');
 const receiptPath=resolve(packet,'../custody/UITVOERING-HVP-2025-final-1.json');
 assert.equal(hash(readFileSync(receiptPath)),'0c5425b4616eb7f68e4ea31f700fdbab43ebf48f79b98913cd9c18f5f047d760');
 for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 assert.equal(hash(readFileSync(join(folder,'APP-FINAL.json'))),'a160b13ea440f2c86c190f7063cf2ad9b972959dc2dddae6c598dc4fe4dbfd70');
 for(const [name,digest] of Object.entries(json(join(folder,'REVIEW-BASIS.json')).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 const reviews=['source-final-review.json','audit-final-review.json'].map(name=>json(join(folder,name)));
 assert.notEqual(reviews[0].reviewer_agent,reviews[1].reviewer_agent);
 for(const review of reviews){assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);assert.equal(review.item_reviews.length,9);assert.ok(review.item_reviews.every(i=>i.decision==='APPROVE'));for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);}
 const app=json(join(folder,'APP-FINAL.json')),config=json(join(folder,'CONFIG.json'));
 assert.equal(hash(readFileSync(evidencePath(config.pdf_path))),app.framework.report.pdf_hash);
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
 const frozen=evidenceJson(config.registry_path),prior=json(join(out,'PREVIOUS-REVIEWED-REPORTS.json'));assert.deepEqual(prior.corpus.slice(0,frozen.corpus.length),frozen.corpus);
 const gate=json(join(out,'PRE-INTEGRATION-GATE.json'));assert.equal(gate.status,'PASS_FOR_PARENT_REVIEW');assert.deepEqual(gate.errors,[]);
}
export function verifyBsaPacket(){
 const folder=resolve(packet,'../BSA-CONTRACTVOORWAARDEN-2023-2024'),out=resolve(packet,'../integration-BSA2324-v67');
 assert.equal(hash(readFileSync(join(folder,'HANDOFF.md'))),'739321f94ced63a1f5d9ff8fea9768615b007c4161704dcf169d0787f9005126');
 const receiptPath=resolve(packet,'../custody/BSA-CONTRACTVOORWAARDEN-2023-2024-final-2.json');
 assert.equal(hash(readFileSync(receiptPath)),'47bb612777796be5c6603fe42ab051c9433a3cd63cd9d0183a80d551a394bdf5');
 for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 assert.equal(hash(readFileSync(join(folder,'APP-FINAL.json'))),'5ab8af63afb182f815aaa89bcf99cc7862aa72863b45a01931a2eb6907418a3e');
 for(const [name,digest] of Object.entries(json(join(folder,'REVIEW-BASIS.json')).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 const reviews=['source-final-review.json','audit-final-review.json'].map(name=>json(join(folder,name)));
 assert.notEqual(reviews[0].reviewer_agent,reviews[1].reviewer_agent);
 for(const review of reviews){assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);assert.equal(review.item_reviews.length,11);assert.ok(review.item_reviews.every(i=>i.decision==='APPROVE'));for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);}
 const app=json(join(folder,'APP-FINAL.json')),config=json(join(folder,'CONFIG.json'));
 assert.equal(hash(readFileSync(evidencePath(config.pdf_path))),app.framework.report.pdf_hash);
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
 const frozen=evidenceJson(config.registry_path),prior=json(join(out,'PREVIOUS-REVIEWED-REPORTS.json'));assert.deepEqual(prior.corpus.slice(0,frozen.corpus.length),frozen.corpus);
 const gate=json(join(out,'PRE-INTEGRATION-GATE.json'));assert.equal(gate.status,'PASS_FOR_PARENT_REVIEW');assert.deepEqual(gate.errors,[]);

 const oldReceipt=resolve(packet,'../custody/BSA-CONTRACTVOORWAARDEN-2023-2024-final-1.json');
 assert.equal(hash(readFileSync(oldReceipt)),'3620bff492c3951e5fbb929f44f5a9b7fe64aa81a5564646bea22a6eb260aa79');
 const repair=json(join(folder,'AUTHOR-SOURCE-ID-REPAIR-02.json')),before=readFileSync(evidencePath(join(repair.historical_snapshot,'APP-FINAL.json')),'utf8');
 assert.equal(hash(before),repair.before_app_sha256);assert.equal(app.source.id,app.framework.report.id);
 const token='"id": "BSA-CONTRACTVOORWAARDEN-2023-2024"';assert.equal(before.split(token).length,2);
 assert.equal(before.replace(token,'"id": "BSA2324"'),readFileSync(join(folder,'APP-FINAL.json'),'utf8'));
}
export function verifyBocDigiPackets(){
 const prior=json(join(integration,'PREVIOUS-REVIEWED-REPORTS.json')),gates=json(join(integration,'PRE-INTEGRATION-GATES.json'));
 for(const p of packages){
  const folder=resolve(packet,'../',p.folder),receiptPath=resolve(packet,'../custody',p.folder+'-final-1.json');
  assert.equal(hash(readFileSync(join(folder,'HANDOFF.md'))),p.handoff);
  assert.equal(hash(readFileSync(receiptPath)),p.receipt);
  for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
  assert.equal(hash(readFileSync(join(folder,'APP-FINAL.json'))),p.app);assert.equal(hash(readFileSync(join(folder,'CATALOGUE.json'))),p.cat);
  for(const [name,digest] of Object.entries(json(join(folder,'REVIEW-BASIS.json')).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
  const reviews=['source-final-review.json','audit-final-review.json'].map(name=>json(join(folder,name)));
  assert.notEqual(reviews[0].reviewer_agent,reviews[1].reviewer_agent);
  for(const review of reviews){assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);assert.equal(review.item_reviews.length,p.count);assert.ok(review.item_reviews.every(i=>i.decision==='APPROVE'));for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);}
  const app=json(join(folder,'APP-FINAL.json')),config=json(join(folder,'CONFIG.json'));
  assert.equal(hash(readFileSync(evidencePath(config.pdf_path))),app.framework.report.pdf_hash);
  for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
  const frozen=evidenceJson(config.registry_path);assert.deepEqual(prior.corpus.slice(0,frozen.corpus.length),frozen.corpus);
  assert.equal(gates[p.id].status,'PASS_FOR_PARENT_REVIEW');assert.deepEqual(gates[p.id].errors,[]);
 }
}
export function verifyIltPacket(){
 const folder=resolve(packet,'../ILT-RISICOGERICHT-2025');
 assert.equal(hash(readFileSync(join(folder,'HANDOFF.md'))),'501f4de0432a504872aad3745949d5fb0fd8f48390407ad09f6919c429dca273');
 const receiptPath=resolve(packet,'../custody/ILT-RISICOGERICHT-2025-final-2.json');
 assert.equal(hash(readFileSync(receiptPath)),'9bfc6ca64837ac5bb7e667ee84143cfdbedafc74fe949ca10db6ad2aa79a95bd');
 for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 const reviews=['source-final-review.json','audit-final-review.json'].map(name=>json(join(folder,name)));
 assert.notEqual(reviews[0].reviewer_agent,reviews[1].reviewer_agent);
 for(const review of reviews){
  assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);
  assert.equal(review.item_reviews.length,16);assert.ok(review.item_reviews.every(i=>i.decision==='APPROVE'));
  for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);
 }
 const app=json(join(folder,'APP-FINAL.json')),config=json(join(folder,'CONFIG.json'));
 assert.equal(hash(readFileSync(evidencePath(config.pdf_path))),app.framework.report.pdf_hash);
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
 const frozen=evidenceJson(config.registry_path),prior=json(resolve(packet,'../integration-ILTRISK25-v59/PREVIOUS-REVIEWED-REPORTS.json'));
 assert.deepEqual(prior.corpus.slice(0,12),frozen.corpus);
 const gate=json(resolve(packet,'../integration-ILTRISK25-v59/PRE-INTEGRATION-GATE.json'));
 assert.equal(gate.status,'PASS_FOR_PARENT_REVIEW');assert.deepEqual(gate.errors,[]);
}
export function verifyIvhoPacket(){
 const folder=resolve(packet,'../IVHO-BEZOEKFREQUENTIE-2025');
 const receiptPath=resolve(packet,'../custody/IVHO-BEZOEKFREQUENTIE-2025-final-1.json');
 assert.equal(hash(readFileSync(receiptPath)),'5a595a0e2188d2893123697d95a1bbd95cda2d20abb324052fffb7ee0c168979');
 for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 const reviews=['source-final-review.json','audit-final-review.json'].map(name=>json(join(folder,name)));
 assert.notEqual(reviews[0].reviewer_agent,reviews[1].reviewer_agent);
 for(const review of reviews){
  assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);
  assert.equal(review.item_reviews.length,10);assert.ok(review.item_reviews.every(i=>i.decision==='APPROVE'));
  for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);
 }
 const app=json(join(folder,'APP-FINAL.json'));
 assert.equal(hash(readFileSync(evidencePath(json(join(folder,'CONFIG.json')).pdf_path))),app.framework.report.pdf_hash);
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
 const frozen=evidenceJson(json(join(folder,'CONFIG.json')).registry_path);
 const currentPrior=json(resolve(packet,'../integration-IVHO25-v54/PREVIOUS-REVIEWED-REPORTS.json'));
 assert.deepEqual(currentPrior.corpus.slice(0,12),frozen.corpus,'Analysis baseline report content drift');
 const displayBytes=readFileSync(join(viewer,'app/reviewed-ivho-display.json'));
 assert.equal(hash(displayBytes),'c7ff23c8cbff660212f1130405bd8352f461abde9070d9ae6fbad5f6d73360d0','IVHO display supplement changed');
 const display=JSON.parse(displayBytes),visualBytes=readFileSync(join(folder,'VISUAL-EVIDENCE.json')),visual=JSON.parse(visualBytes);
 assert.equal(hash(visualBytes),display.reviewedVisualFileSha256);
 assert.deepEqual(display.supplements,visual.visual_supplements);assert.deepEqual(display.transcription,visual.management_reaction_transcription);
 assert.equal(display.imageSha256,visual.pages.find(p=>p.page===39).image_sha256);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(verifyReportRelease()));
export function verifyF35Packet(){
 const folder=resolve(packet,'../F35-VOORTGANG25-2025'),out=resolve(packet,'../integration-F35V25-v68');
 assert.equal(hash(readFileSync(join(folder,'HANDOFF.md'))),'5056a6e27133ec5bb49c5cac34f2cd125176e2612ab3389b1592e115b8ce4029');
 const receiptPath=resolve(packet,'../custody/F35-VOORTGANG25-2025-final-2.json');
 assert.equal(hash(readFileSync(receiptPath)),'1afe8b45934353b56ef2a803d69b505c6430c05d07e09a72de95d5644dd4e1e2');
 for(const [name,digest] of Object.entries(json(receiptPath).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 assert.equal(hash(readFileSync(join(folder,'APP-FINAL.json'))),'03db39f898ef587f57036863cd93c603ce5715c4b6464fd7ee6887338605702c');
 for(const [name,digest] of Object.entries(json(join(folder,'REVIEW-BASIS.json')).files))assert.equal(hash(readFileSync(join(folder,name))),digest,name);
 const reviews=['source-final-review.json','audit-final-review.json'].map(name=>json(join(folder,name)));
 assert.notEqual(reviews[0].reviewer_agent,reviews[1].reviewer_agent);
 for(const review of reviews){assert.equal(review.decision,'APPROVE');assert.deepEqual(review.unresolved_issues,[]);assert.equal(review.item_reviews.length,14);assert.ok(review.item_reviews.every(i=>i.decision==='APPROVE'));for(const [target,digest] of Object.entries(review.target_hashes))assert.equal(hash(readFileSync(join(folder,target))),digest,target);}
 const app=json(join(folder,'APP-FINAL.json')),config=json(join(folder,'CONFIG.json'));
 assert.equal(hash(readFileSync(evidencePath(config.pdf_path))),app.framework.report.pdf_hash);
 for(const [path,digest] of Object.entries(json(join(folder,'BASELINE-FREEZE.json')).files))assert.equal(hash(readFileSync(evidencePath(path))),digest,path);
 const frozen=evidenceJson(config.registry_path),prior=json(join(out,'PREVIOUS-REVIEWED-REPORTS.json'));assert.deepEqual(prior.corpus.slice(0,frozen.corpus.length),frozen.corpus);
 const gate=json(join(out,'PRE-INTEGRATION-GATE.json'));assert.equal(gate.status,'PASS_FOR_PARENT_REVIEW');assert.deepEqual(gate.errors,[]);
}

export function verifyRegistry(registryBytes){
 assert.equal(hash(registryBytes),'9dc1f77f31e771e41571d7e0c8142a9193976039fd58c16a398328ff938c8a62','Unapproved registry: exact F35V25 revision2 integration only');
 const prior=verifyV67Registry(readFileSync(resolve(packet,'../integration-F35V25-v68/PREVIOUS-REVIEWED-REPORTS.json'))),registry=JSON.parse(registryBytes);
 assert.equal(registry.corpus.length,21);assert.equal(registry.corpus.reduce((n,c)=>n+c.framework.lines.length,0),290);
 assert.deepEqual(registry.corpus.slice(0,20),prior.corpus);
 for(const key of ['themes','researchPresets'])assert.deepEqual(registry[key].slice(0,prior[key].length),prior[key]);
 assert.deepEqual(registry.researchGroups,prior.researchGroups);
 assert.deepEqual(registry.corpus[20],json(resolve(packet,'../F35-VOORTGANG25-2025/APP-FINAL.json')));
 return registry;
}
