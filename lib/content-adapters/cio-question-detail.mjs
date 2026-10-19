// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/cio-question-detail.mjs";
// Editorial question structure only: never rewrite source points or their scope.
// Each objective belongs to exactly one broad topic. Point overlap is deduplicated
// by the existing adoption logic; all original objective-to-point mappings remain.
export const cioBroadQuestionGroups = data.cioBroadQuestionGroups;

// Complete sentences per objective avoid constructions such as “inrichting ingericht”.
// These are research prompts; original objectives, point mappings and saved text stay intact.
export const cioSpecificQuestions = data.cioSpecificQuestions;
export function cioQuestionGroups(objectives,detail='specific') {
  if(detail==='broad')return cioBroadQuestionGroups;
  return objectives.map(o=>({key:o.id,objectives:[o.id],text:cioSpecificQuestions[o.id] || `Wat blijkt uit de onderzochte praktijk over “${o.title}” binnen de toepasselijke CIO-stelseltaken?`}));
}
