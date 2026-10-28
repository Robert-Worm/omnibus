// Cold-use input for #156. Creates no reviews, owner decisions or database.
// Run from the repository: node content-tools/test-support/local-model-skill-trial.mjs
// Then follow omnibus-build-local-database with independent reviewers.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareModelReview} from '../model-quality.mjs';
import {voorcontrole} from '../../lib/question-quality.mjs';
import {structureModelData} from '../../lib/model-structure.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function createModelSkillTrial({revised = false} = {}) {
  const work = join(root, 'work');
  mkdirSync(work, {recursive:true});
  assert.equal(realpathSync(work), join(realpathSync(root), 'work'));
  const folder = mkdtempSync(join(work, 'model-skill-trial-'));
  const source = `FICTIEF ONDERZOEKSMODEL — uitsluitend een lokale softwaregebruiksproef.
Titel: Informatie bij werkoverdracht. Editie: oefening 1.
Auteur: AI-auteur van gebruiksproef #156. Geen bestaande theorie of organisatie.

§1 Doel en begrip
Dit zelfbedachte ordeningsmodel verkent welke informatie iemand ontvangt bij een
werkoverdracht, of kiest bij een afspraak of beleidskeuze over werkoverdracht.
Werkoverdracht betekent hier dat een volgende medewerker een taak overneemt.
Het model bevat één dimensie: overdrachtsinformatie. Definitie: de informatie
die bij het overnemen van een taak beschikbaar is of daarvoor wordt gekozen.
De enige indicator is de door de respondent benoemde informatie bij één eigen,
recente overdracht, afspraak of beleidskeuze. De keuze voor één indicator is
een bewuste beperking van deze oefening, geen claim van volledige validiteit.

§2 Grenzen en toepassing
Uitgesloten zijn snelheid, tevredenheid, prestatie-effecten, algemene kwaliteit
van samenwerking en de vraag of informatie feitelijk juist of volledig was.
Een operationele respondent beschrijft ontvangen informatie; een leidinggevende
beschrijft een eigen afspraak over informatie; een strategische respondent
beschrijft een eigen afweging over informatie bij werkoverdracht. Zonder zo'n
eigen ervaring wordt de vraag overgeslagen. Geen hypothetische antwoorden eisen.
Voorbeelden zijn percepties, geen bewijs van effectieve beheersing of causaliteit.

§3 Eigen operationalisering
Alle interviewvragen en doorvragen in het pakket zijn nieuw geschreven door de
AI-auteur voor deze proef. Ze zijn geen broncitaten, vertalingen of gevalideerde
instrumentitems. Het model geeft geen norm, score, diagnose of toetsgrens.
Deze fictieve tekst is de volledige primaire oefenbron, één UTF-8 tekstpagina.
Er is geen PDF, externe publicatie, empirisch onderzoek of toestemming voor
openbare publicatie. Een lokale proefbeslissing geeft geen echte bronrechten.
`;
  writeFileSync(join(folder, 'source.txt'), source, {flag:'wx'});
  const question = 'Welke informatie ontving u bij een recente werkoverdracht?';
  const model = {
    id:'FICTIEF_OVERDRACHT_156', kind:'own', version:revised ? 'exercise-3' : 'exercise-1', structureVersion:2,
    title:'Fictief model · Informatie bij werkoverdracht', officialName:'Informatie bij werkoverdracht (fictief)',
    author:'AI-auteur gebruiksproef #156', source:'Volledig fictieve oefenbron, editie 1, §1–3', selected:false,
    question:'Welke informatie is beschikbaar of wordt gekozen bij werkoverdracht binnen het onderzochte team?',
    description:'Een zelfbedacht model met één dimensie voor een lokale softwaregebruiksproef.',
    limitation:'Geen wetenschappelijke validatie, norm, score of uitspraak over feitelijke juistheid, volledigheid of werking.',
    usage:'Vraag uitsluitend naar een eigen recente overdracht, afspraak of beleidskeuze. Sla over zonder eigen ervaring.',
    usageNotes:'Alle vragen zijn eigen operationaliseringen; geen gevalideerd meetinstrument. Alleen de bevroren formuleringen vallen binnen de reviewbasis.',
    sources:[{id:'source', title:'Fictieve oefenbron: Informatie bij werkoverdracht, §1–3', url:'', type:'local-reference'}],
    items:[{
      id:'OVERDRACHT', title:'Overdrachtsinformatie', originalTitle:'Overdrachtsinformatie',
      definition:'De informatie die bij het overnemen van een taak beschikbaar is of daarvoor wordt gekozen.',
      boundary:'Geen snelheid, tevredenheid, prestatie-effecten, algemene samenwerking of feitelijke juistheid/volledigheid.',
      question, probes:'Kunt u de situatie kort beschrijven?', included:false,
      indicators:[{id:'OVERDRACHT-I01', title:'Benoemde informatie',
        definition:'Door de respondent benoemde informatie bij één eigen recente overdracht, afspraak of beleidskeuze.',
        documents:'Geen documenttoets; uitsluitend eigen interviewuitwerking.',
        observation:'Wat de respondent zelf ontving of koos.', origin:'authored', sourceIds:['source'], included:false}],
      questions:[{id:'OVERDRACHT-Q01', dimensionId:'OVERDRACHT', indicatorId:'OVERDRACHT-I01',
        title:'Informatie bij een eigen situatie', question,
        variants:{operational:question,
          management:revised
            ? 'Welke informatie koos u bij een recente werkafspraak over werkoverdracht om mee te geven?'
            : 'Hoe bepaalde u bij een recente afspraak over werkoverdracht welke informatie medewerkers meekrijgen?',
          strategic:revised
            ? 'Welke informatie koos u bij een recente beleidskeuze over werkoverdracht als nodig voor de volgende medewerker?'
            : 'Hoe woog u bij een recente keuze over werkoverdracht af welke informatie nodig is?'},
        probes:'Kunt u de situatie kort beschrijven?',
        purpose:'Verkennen welke informatie de respondent ontving of koos; §1–3, eigen operationalisering.',
        origin:'authored', sourceIds:['source'], sourcePage:'Tekstpagina 1, §1–3',
        revision:revised ? 'exercise-2' : 'exercise-1', included:false, selectedLevels:[]}],
    }],
  };
  structureModelData(model);
  save(join(folder, 'model.json'), model);
  const basis = prepareModelReview(model, {sourceEvidence:[{id:'source', sha256:sha256(readFileSync(join(folder, 'source.txt')))}]});
  assert.equal(basis.status, 'STRUCTURAL_PASS_REVIEW_REQUIRED');
  save(join(folder, 'basis.json'), basis);
  const kinds = {model:'onderzoeksvraag', 'research-question':'onderzoeksvraag', question:'interview', formulation:'interview', probe:'doorvraag'};
  const rows = basis.targets.filter(t=>Object.hasOwn(kinds,t.kind))
    .map(t=>({id:t.id,text:t.text,kind:kinds[t.kind]}));
  save(join(folder, 'question-precheck.json'), rows.map(row=>({...row, ...voorcontrole(row.text, row.kind)})));
  writeFileSync(join(folder, 'contract.md'), readFileSync(join(root, 'skills/omnibus-add-model/references/question-quality.md')), {flag:'wx'});
  save(join(folder, 'run-input.json'), {synthetic:true, authorIds:['codex-root-156'],
    sourceSha256:basis.sourceEvidence[0].sha256, basisHash:basis.basisHash,
    status:'PENDING_INDEPENDENT_REVIEW', reviewsCreated:false, ownerAdmissionCreated:false,
    limits:['No third-party source', 'No human validation', 'No publication permission', 'Text source only; no PDF extraction']});
  return {folder, basisHash:basis.basisHash, targets:basis.targets.length, status:'PENDING_INDEPENDENT_REVIEW'};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.slice(2).every(arg => arg === '--revised'), 'Only --revised is supported');
  console.log(JSON.stringify(createModelSkillTrial({revised:process.argv.includes('--revised')}), null, 2));
}
