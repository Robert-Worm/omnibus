import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const rubricVersion='OAK-1.0';
export const weights=Object.freeze({bron:25,doel:5,risico:10,beheersdoelstelling:10,beheersmaatregel:10,norm:10,toetspunten:10,opzet:8,bestaan:8,samenhang:4});
const caps=Object.freeze({SOURCE_MISMATCH:3,FALSE_ASSURANCE:4,UNEXECUTABLE_TEST:5,CRITICAL_CHAIN_GAP:5});
const fail=message=>{throw Error(message);};
const text=value=>typeof value==='string'&&value.trim().length>0;
const isRating=value=>value&&typeof value==='object'&&!Object.hasOwn(value,'notApplicable')&&text(value.reason)&&
  (value.score===null||Number.isInteger(value.score)&&value.score>=1&&value.score<=10);
const isNotApplicable=value=>value&&value.notApplicable===true&&value.score===null&&text(value.reason);
const sameIds=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
const round=value=>Math.round(value*10)/10;

// Deterministic arithmetic, NOT a source reader or semantic approval gate.
export function scoreReview(review){
  if(!review||review.rubricVersion!==rubricVersion||!text(review.itemId))fail('Expected OAK-1.0 and a stable itemId');
  for(const key of ['sourceVerified','coverageComplete','werkingIncluded'])if(typeof review[key]!=='boolean')fail('Expected boolean '+key);
  const active={...weights,...(review.werkingIncluded?{werking:10}:{})};
  if(!review.ratings||!sameIds(Object.keys(review.ratings),Object.keys(active)))fail('Ratings must contain the exact applicable dimensions');
  for(const [key,value] of Object.entries(review.ratings))if(!isRating(value))fail('Invalid score/reason: '+key);
  if(!review.sourceVerified&&review.ratings.bron.score!==null)fail('An unverified source must have a null source score');
  if(!Array.isArray(review.expectedPointIds)||review.expectedPointIds.some(id=>!text(id))||new Set(review.expectedPointIds).size!==review.expectedPointIds.length)fail('Expected distinct point IDs');
  if(!Array.isArray(review.pointScores)||new Set(review.pointScores.map(p=>p.id)).size!==review.pointScores.length)fail('Duplicate or invalid point scores');
  const pointKeys=['toetspunten','opzet','bestaan',...(review.werkingIncluded?['werking']:[])];
  for(const point of review.pointScores){
    if(!review.expectedPointIds.includes(point.id))fail('Unexpected point ID: '+point.id);
    if(!sameIds(Object.keys(point),['id',...pointKeys]))fail('Unexpected point dimensions: '+point.id);
    for(const key of pointKeys)if(!isRating(point[key])&&!(key==='werking'&&isNotApplicable(point[key])))fail('Invalid point score/reason: '+point.id+' '+key);
  }
  if(!Array.isArray(review.flags))fail('Expected flags array');
  const flags=review.flags.map(flag=>{
    if(!flag||!text(flag.reason)||!(Object.hasOwn(caps,flag.code)||flag.code==='UNRESOLVED_SOURCE'))fail('Unknown or unsubstantiated flag');
    return {code:flag.code,reason:flag.reason};
  });
  const completePoints=sameIds(review.expectedPointIds,review.pointScores.map(p=>p.id));
  if(review.pointScores.length&&completePoints)for(const key of pointKeys){
    const values=review.pointScores.filter(p=>!isNotApplicable(p[key])).map(p=>p[key].score);
    if(!values.length)fail('Exclude werking from the profile when no point has applicable werking');
    const expected=values.includes(null)?null:Math.min(...values);
    if(review.ratings[key].score!==expected)fail('Use the lowest individual point score (or null when unreviewed): '+key);
  }
  if(!review.expectedPointIds.length)flags.push({code:'UNEXECUTABLE_TEST',reason:'No testing points available in the reviewed norm chain.'});
  const missingDimensions=Object.keys(active).filter(key=>review.ratings[key].score===null);
  const incomplete=!review.sourceVerified||!review.coverageComplete||!completePoints||missingDimensions.length>0||flags.some(f=>f.code==='UNRESOLVED_SOURCE');
  const known=Object.keys(active).filter(key=>review.ratings[key].score!==null);
  const weighted=known.length?known.reduce((sum,key)=>sum+review.ratings[key].score*active[key],0)/known.reduce((sum,key)=>sum+active[key],0):null;
  const lowest=known.length?Math.min(...known.map(key=>review.ratings[key].score)):null;
  const result={rubricVersion,itemId:review.itemId,profile:review.werkingIncluded?'chain-with-werking':'chain-opzet-bestaan',
    status:'ONVOLLEDIG',total:null,weightedScore:null,
    sourceScore:review.ratings.bron.score,lowestScore:lowest,caps:[],flags,
    coverage:{expectedPoints:review.expectedPointIds.length,reviewedPoints:review.pointScores.length,completePoints,missingDimensions,
      werkingNotApplicableIds:review.pointScores.filter(p=>isNotApplicable(p.werking)).map(p=>p.id)},
    caveat:'Checks arithmetic and declared coverage only; not source fidelity, actual reading or reviewer independence.'};
  if(incomplete)return result;
  result.weightedScore=round(weighted);
  result.caps=flags.filter(f=>Object.hasOwn(caps,f.code)).map(f=>({code:f.code,maximum:caps[f.code]}));
  if(review.ratings.bron.score<8||lowest<7)result.caps.push({code:'DIMENSION_BELOW_THRESHOLD',maximum:6});
  const maximum=Math.min(10,...result.caps.map(c=>c.maximum));
  result.total=round(Math.min(weighted,maximum));
  result.status=flags.some(f=>f.code==='SOURCE_MISMATCH')?'BRONFOUT':
    result.caps.length?'HERZIEN':weighted>=8?'BRUIKBAAR_VOOR_VERVOLGREVIEW':'VERBETEREN';
  return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    if(process.argv.length!==3)fail('Usage: node score.mjs review.json');
    console.log(JSON.stringify(scoreReview(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
