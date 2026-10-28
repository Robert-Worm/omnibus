// Test-only catalogue adapters. Fixture values cross the loader boundary as
// structured data and JSON modules, never as interpolated JavaScript source.
let fixtureData;
export function initialize(data) {fixtureData = data;}

const fixtures = {
  './reviewed-reports.mjs': `
    import fixture from 'omnibus-test:compatibility-data' with {type:'json'};
    export const reviewedScopeSnapshots=fixture.snapshots;
    export const reviewedScopeDecisions={"WB-1":["retain","Synthetic"],"WB-2":["retain","Synthetic"]};
    export const reviewedResearchPresets=[];`,
  './report-quality-revisions.mjs':'export const revisedReportLine=l=>l;',
  './process-catalogue.mjs':'export const activeProcesses=[],processes=[];',
  './control-objectives.mjs':'export const controlObjectiveFor=l=>l.controlObjective;',
  './foundations/registry.mjs':'export const importedFoundationItems=[],importedFoundationMetadata=[];',
  './interview-structure.mjs':'export const starrPrompts=()=>[],modelStarrPrompts=()=>[],interviewLevels=[];',
  './report-point-source.mjs': `
    import fixture from 'omnibus-test:compatibility-data' with {type:'json'};
    export const currentReportPointInterview=()=>undefined;
    export function validateReportTrace(m){if(m.reportTrace!==fixture.reportTrace)throw Error('Synthetic report evidence mismatch');}`,
  './cio-law-data.mjs':'export const cioMetadata={id:"TESTCIO"},cioProposals=[],cioPoints=[],cioReviewBasis="synthetic";',
  './cio-content.mjs':'export function validateCioEditorialTrace(){throw Error("Unexpected CIO evidence");}',
  './topical-content.mjs':'export const topicalMetadata=[],topicalProposals=[],topicalIds=[];export function validateTopicalMaterial(){throw Error("Unexpected topical evidence");}',
  './wwke-law-data.mjs': `
    import fixture from 'omnibus-test:compatibility-data' with {type:'json'};
    export const wwkeMetadata={id:'TESTWWKE'},wwkeProposals=[],wwkeSourceId='TESTWWKE';
    export function validateWwkeMaterial(m){if(m.lawTrace!==fixture.lawTrace)throw Error('Synthetic law evidence mismatch');}`,
  './investigation.mjs': `
    export {validateInvestigation} from 'omnibus-test:real-investigation';
    export const investigationFramework=framework=>framework;
    export const materialQuestionText=m=>m.question;
    export const materialMatchesLine=()=>{throw Error('Unexpected material admission');};
    export const validateExportSettings=()=>{throw Error('Unexpected export settings');};`,
  'omnibus-data:lib/theme-workspaces.mjs':'export default {presets:[]};',
  '@/lib/research-flow.mjs':'export const subSuggestions=()=>[];'
};

const jsonModule = value => ({url:'data:application/json,'+encodeURIComponent(JSON.stringify(value)),shortCircuit:true});
export function resolve(s,c,next) {
  if(s==='omnibus-test:compatibility-data')return jsonModule(fixtureData);
  if(s==='omnibus-test:real-investigation')return next(new URL('./investigation.mjs',fixtureData.parentURL).href,c);
  if(s==='./theme-workspaces.mjs'&&c.parentURL.endsWith('/project-session.mjs'))
    return next(new URL('./content-adapters/theme-workspaces.mjs',c.parentURL).href,c);
  if(s.endsWith('.json'))return jsonModule(s.endsWith('/report-additions.json')?{control_objectives:[],organizational_goals:[]}:{});
  if(s==='@/lib/reviewed-reports.mjs')s='./reviewed-reports.mjs';
  if(Object.hasOwn(fixtures,s))return {url:'data:text/javascript,'+encodeURIComponent(fixtures[s]),shortCircuit:true};
  if(s.startsWith('@/lib/'))return next(new URL('./'+s.slice(6),fixtureData.parentURL).href,c);
  return next(s,c);
}
