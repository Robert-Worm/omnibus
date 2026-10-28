// New publication writes only. Archived evidence stays on the preparation side;
// no review dossier, author identity or extra payload is sent to the browser.
import {createHash} from 'node:crypto';
import {canonical,digest} from '../content-tools/identity.mjs';
import {prepareModelReview,checkModelReviews} from '../content-tools/model-quality.mjs';
import {createQuestionFormulations} from '../lib/interview-wording.mjs';

export const modelWordingModules=['lib/question-formulations.mjs','lib/interview-practice-formulations.json','lib/cev-active.mjs'];

const fail=message=>{throw Error('Invalid model review publication: '+message);};
const equal=(a,b,message)=>{if(canonical(a)!==canonical(b))fail(message);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Pin an already integrated wording amendment to its archived review context.
 * This is not a new model admission: original theoretical HOLDs and scoped
 * decisions remain unchanged. No private evidence enters the browser. */
function archivedModelWordingReview(repository,release,manifest) {
  const pins=new Map((manifest.inventory?.artifacts??[]).map(row=>[row.name,row.sha256]));
  const archives=repository.db.prepare(`SELECT r.name,a.sha256,a.payload FROM artifacts a
    JOIN release_artifacts r ON r.sha256=a.sha256 WHERE r.release_id=?
    AND json_extract(a.payload,'$.receipt.kind')='reviewed-model-wording-amendment'`).all(release);
  if(!archives.length)return null;
  const expected=new Map();
  for(const row of archives){
    const data=JSON.parse(row.payload),{receipt,reviews,index,reviewIndex,contexts,reusableEvidence}=data;
    if(pins.get(row.name)!==row.sha256||digest(data)!==row.sha256||receipt.schema!==1||
        receipt.unrestrictedModelApproval!==false||
        reviews?.wordingIntegrationDecision!=='ACCEPT_REVIEWED_WORDING_WITH_PRESERVED_LIMITS'||
        reviews.counts?.remaining!==0||reviews.batchBasisHash!==reviewIndex?.batchBasisHash||
        !Array.isArray(index?.models)||!index.models.length||receipt.models!==index.models.length)
      fail('invalid archived model wording evidence');
    const ids=index.models.map(model=>model.modelId);
    if(new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id.trim()))
      fail('invalid archived model scope');
    for(const list of [reviewIndex.models,reviews.modelReviews]){
      if(!Array.isArray(list))fail('missing archived model decisions');
      equal(list.map(m=>m.modelId).sort(),[...ids].sort(),'archived model scope differs');
    }
    for(const meta of index.models){
      const id=meta.modelId;
      for(const list of [reviewIndex.models,reviews.modelReviews])
        equal(list.find(m=>m.modelId===id).jointBasisHash,meta.jointBasisHash,'archived model basis differs');
      // Changed units refer to the final review; unchanged units keep their
      // original review references. Neither path manufactures a new approval.
      const bindings=[...(reviews.assessments??[]),...(reusableEvidence?.entries??[])]
        .filter(entry=>entry.modelId===id&&entry.kind==='model');
      if(bindings.length!==1)fail('missing or ambiguous archived model context: '+id);
      const binding=bindings[0],ref=binding.contextRef;
      const key=typeof ref==='string'?ref:ref?.key,context=contexts?.[key];
      if(!context||digest(context)!==key||
          (typeof ref==='object'&&ref.digest!==key)||binding.jointBasisHash!==meta.jointBasisHash||
          context.rawModel?.id!==id||context.model?.id!==id||!Array.isArray(context.cyclers))
        fail('changed archived model context: '+id);
      equal(context.rawModel,context.model,'archived model requires a different presentation adapter');
      const pinned={model:context.rawModel,cycles:context.cyclers};
      if(expected.has(id))equal(expected.get(id),pinned,'ambiguous archived model wording: '+id);
      expected.set(id,pinned);
    }
  }
  return (library,wording)=>{
    if(!Array.isArray(library?.models))fail('missing archived model delivery');
    const {questionFormulations}=createQuestionFormulations(...modelWordingModules.map(key=>wording[key]));
    for(const [id,{model,cycles}]of expected){
      const delivered=library.models.filter(row=>row?.id===id);
      if(delivered.length!==1)fail('missing or duplicate archived model: '+id);
      equal(delivered[0],model,'delivered model differs from archived review: '+id);
      const actual=[];
      for(const dimension of delivered[0].items)for(const question of dimension.questions??[])
        for(const level of Object.keys(question.variants??{}))
          questionFormulations(question,level).forEach((text,index)=>actual.push({
            id:`${id}/${dimension.id}/${question.id}/${level}/cycle:${index}`,
            dimensionId:dimension.id,questionId:question.id,level,index,text,
            probes:question.probes??'',base:question.variants[level],
          }));
      equal(actual,cycles,'delivered model formulations differ from archived review: '+id);
    }
  };
}

/** Bind local model delivery to its existing immutable intake and reviews.
 * Legacy catalogue models have their separate authoring route. Merely removing
 * a receipt from the browser payload cannot remove this package-side obligation. */
export function localModelPublicationReview(repository, value) {
  const manifest=JSON.parse(repository.db.prepare('SELECT manifest FROM releases WHERE id=?').get(value.release).manifest);
  const verifyArchived=archivedModelWordingReview(repository,value.release,manifest);
  const packages=repository.db.prepare(`SELECT p.version,p.payload FROM packages p
    JOIN release_packages r ON r.version=p.version WHERE r.release_id=? AND p.kind='model'`).all(value.release);
  const local=packages.map(row=>({...row,header:JSON.parse(row.payload)}))
    .filter(({header})=>Object.hasOwn(header,'intakeSha256'));
  if(!local.length)return verifyArchived;
  const artifacts=new Map((manifest.inventory?.artifacts??[]).map(row=>[row.name,row.sha256]));
  const artifactQuery=repository.db.prepare(`SELECT a.payload,a.sha256 FROM artifacts a
    JOIN release_artifacts r ON r.sha256=a.sha256 WHERE r.release_id=? AND r.name=?`);
  const recordQuery=repository.db.prepare('SELECT payload FROM records WHERE version=? ORDER BY position');
  const expected=new Map();
  function artifact(name) {
    const row=artifactQuery.get(value.release,name);
    if(!row||artifacts.get(name)!==row.sha256)fail('missing or changed archived evidence: '+name);
    const data=JSON.parse(row.payload);
    if(digest(data)!==row.sha256)fail('changed archived evidence bytes: '+name);
    return data;
  }
  function bytes(data, maximum=64*1024*1024) {
    if(data?.encoding!=='base64'||!Number.isSafeInteger(data.bytes)||data.bytes<=0||data.bytes>maximum||
        typeof data.content!=='string'||data.content.length>Math.ceil(data.bytes/3)*4)
      fail('invalid archived evidence envelope');
    const decoded=Buffer.from(data.content,'base64');
    if(decoded.length!==data.bytes||decoded.toString('base64')!==data.content||sha(decoded)!==data.sha256)
      fail('archived evidence checksum differs');
    return decoded;
  }
  for(const {version,header} of local) {
    const id=header.id, records=recordQuery.all(version).map(row=>JSON.parse(row.payload));
    if(expected.has(id)||!manifest.inventory?.packages.includes(version)||digest({...header,records})!==version)
      fail('changed or duplicate model package');
    const envelope=artifact(id+'/intake'), intake=JSON.parse(bytes(envelope,2*1024*1024));
    if(envelope.sha256!==header.intakeSha256||intake.package?.kind!=='model'||
        intake.package.id!==id||intake.contract!=='model-review-1'||!Array.isArray(intake.files))
      fail('model intake identity differs');
    const ids=new Set(intake.files.map(file=>file.id));
    if(ids.size!==intake.files.length||intake.files.some(file=>!Array.isArray(file.roles)))fail('invalid model intake files');
    const fileBytes=new Map();
    let size=0;
    for(const file of intake.files) {
      const data=artifact(id+'/files/'+file.id), raw=bytes(data);
      equal([data.sha256,data.bytes,data.roles],[file.sha256,file.bytes,file.roles],'model file differs from intake');
      size+=raw.length;if(size>64*1024*1024)fail('model evidence size limit');
      fileBytes.set(file.id,raw);
    }
    function readRole(role) {
      const files=intake.files.filter(file=>file.roles.includes(role));
      if(files.length!==1)fail('expected one model '+role+' file');
      return JSON.parse(fileBytes.get(files[0].id));
    }
    const model=readRole('viewer-content'), basis=readRole('review-basis'), reviews=readRole('review');
    const sources=intake.files.filter(file=>file.roles.includes('source')).map(({id,sha256})=>({id,sha256}));
    const ordered=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
    if(!Array.isArray(basis.sourceEvidence))fail('missing frozen model sources');
    equal(ordered(basis.sourceEvidence),ordered(sources),'model source inventory differs');
    const prepared=prepareModelReview(model,{sourceEvidence:basis.sourceEvidence});
    equal(prepared,basis,'model review basis differs');
    const {authorIds}=artifact(id+'/review-check');
    if(checkModelReviews(prepared,reviews,{authorIds}).status!=='READY_FOR_INTEGRATION_REVIEW')
      fail('incomplete or rejected model reviews');
    const admission=JSON.parse(bytes(artifact(id+'/local-owner-admission'),2*1024*1024));
    if(admission.decision!=='ADMIT'||admission.scope!=='local-database-only'||
        admission.intakeSha256!==header.intakeSha256||admission.basisHash!==prepared.basisHash||
        !Array.isArray(admission.unresolvedIssues)||admission.unresolvedIssues.length||
        ['reviewerIndependence','actualSourceReading','sourceFidelity'].some(key=>admission.confirmations?.[key]!==true))
      fail('missing matching local model admission');
    equal(admission.package,intake.package,'model admission package differs');
    equal(admission.authorIds,authorIds,'model admission authors differ');
    if(records.length!==1||records[0].kind!=='model'||records[0].id!==id||model.id!==id)
      fail('model record inventory differs');
    equal(records[0].data,model,'model record differs from reviewed source');
    expected.set(id,model);
  }
  if(!value.modules['lib/model-library.mjs'])fail('missing local model delivery');
  return (library,wording)=>{
    if(verifyArchived)verifyArchived(library,wording);
    if(!Array.isArray(library.models))fail('missing model list');
    const {questionFormulations}=createQuestionFormulations(...modelWordingModules.map(key=>wording[key]));
    for(const [id,model] of expected) {
      const delivered=library.models.filter(row=>row?.id===id);
      if(delivered.length!==1)fail('missing or duplicate delivered model: '+id);
      equal(delivered[0],model,'delivered model differs from reviewed source: '+id);
      for(const item of model.items)for(const question of item.questions) {
        const variants=question.variants??{operational:question.question};
        for(const [level,base] of Object.entries(variants)) {
          const approved=question.formulations?.[level]??[base];
          const offered=questionFormulations({...question,variants},level);
          if(offered.some(text=>!approved.includes(text)))fail('unreviewed model formulation output: '+question.id+'/'+level);
        }
      }
    }
  };
}
