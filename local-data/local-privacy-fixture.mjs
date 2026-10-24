// Software-test material only. Never derive a review or publication from real inputs.
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {prepareIntake} from '../content-tools/intake.mjs';
import {prepareModelReview, REVIEW_ASPECTS} from '../content-tools/model-quality.mjs';

export const syntheticMarker = 'OMNIBUS_FICTIEVE_PRIVACYPROEF_157';
export const syntheticSource = syntheticMarker + ': verzonnen bron, geen echte norm. 😀é\n';
export const bytesHash = bytes => createHash('sha256').update(bytes).digest('hex');
export const saveJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});

export async function createPrivacyPackage(dir) {
  const folder = join(dir, 'synthetic-package');
  mkdirSync(folder);
  const model = {id:'PRIVACY_TEST', title:'Fictief privacymodel', question:'Hoe verloopt de fictieve oefening?',
    selection_status:'HOLD', limitations:'Uitsluitend softwaretest; geen inhoudelijke goedkeuring.',
    items:[{id:'TEST', title:'Fictief begrip', definition:syntheticSource,
      questions:[{id:'TEST-1', title:'Fictieve vraag', question:'Hoe beschrijf je deze oefening?', origin:'synthetic-test'}]}]};
  writeFileSync(join(folder, 'source.txt'), syntheticSource, {flag:'wx'});
  writeFileSync(join(folder, 'contract.txt'), 'Synthetic model-review-1 test only.', {flag:'wx'});
  saveJson(join(folder, 'model.json'), model);
  const basis = prepareModelReview(model, {sourceEvidence:[{id:'source', sha256:bytesHash(syntheticSource)}]});
  saveJson(join(folder, 'basis.json'), basis);
  saveJson(join(folder, 'reviews.json'), Object.entries(REVIEW_ASPECTS).map(([role, aspects]) => ({
    role, actorId:'synthetic-reviewer-' + role, basisHash:basis.basisHash, decision:'APPROVE', humanValidation:false,
    unresolvedIssues:[], assessments:basis.targets.map(target => ({targetId:target.id, decision:'APPROVE',
      reason:'Fictitious software test only.', aspects:Object.fromEntries(aspects.map(a => [a, 'Fictitious assessment only.']))}))
  })));
  // Stored as untrusted bytes. If ever evaluated, the test must fail, even offline.
  writeFileSync(join(folder, 'inert.mjs'), "import {writeFileSync} from 'node:fs'; writeFileSync(" +
    JSON.stringify(join(dir, 'package-code-executed.txt')) + ", 'synthetic'); throw Error('PACKAGE_CODE_MUST_NOT_RUN');", {flag:'wx'});
  saveJson(join(folder, 'plan.json'), {format:'omnibus-intake-plan', schemaVersion:1,
    package:{id:model.id, kind:'model', version:'synthetic-1', title:model.title}, contract:'model-review-1', files:[
      {id:'contract', path:'contract.txt', roles:['contract']},
      {id:'source', path:'source.txt', roles:['source','source-text']},
      {id:'model', path:'model.json', roles:['viewer-content','context','limitations']},
      {id:'basis', path:'basis.json', roles:['review-basis']},
      {id:'reviews', path:'reviews.json', roles:['review']},
      {id:'inert', path:'inert.mjs', roles:['supporting']}
    ]});
  const intake = await prepareIntake(join(folder, 'plan.json'), join(folder, 'intake.json'));
  const plan = join(dir, 'packages.json');
  saveJson(plan, {format:'omnibus-local-database', schemaVersion:1,
    packages:[{intake:'synthetic-package/intake.json', sha256:intake.manifestSha256, authorIds:['synthetic-author']}]});
  return {plan, out:join(dir, 'synthetic-review-database')};
}
