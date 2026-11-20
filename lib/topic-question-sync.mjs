// Een vraagopzet uit een onderwerpplan volgt de selectie: haal je een onderwerp helemaal weg, dan gaan de vragen over dat
// onderwerp ook weg (beheerder, 20 november 2026). Bij een combinatie blijven de andere onderwerpen staan; de centrale vraag
// wordt dan de beoordeelde vraag voor wat overblijft, tenzij je die zelf hebt herschreven.
import {researchOf, deleteQuestion, editQuestion, linkLine} from './research-plan.mjs';
import {processById, processQuestionPlan, combinedTopicId} from './research-proposals.mjs';
import {questionProcesses as processes} from './process-catalogue.mjs';
import {topicFamilies, chosenTopics} from './topic-families.mjs';

const topicProcess = (familyId, topic) => processes.find(p => p.topic?.family === familyId && p.topic.topic === topic && !p.topic.sub);
const partOfTopic = (question, rootKey, gone) => gone.some(topic => {
  const key = question.planPartKey || '', own = topicProcess(rootKey.family, topic);
  return key.endsWith(':broad:' + topic) || (own && key.startsWith(`process:${own.id}:`));
});

/**
 * Haal vragen weg over onderwerpen die tussen `previous` en `draft` uit de selectie verdwenen.
 * @returns {{draft:any, removed:string[]}} removed: namen van de weggehaalde onderwerpen
 */
export function syncTopicQuestions(previous, draft) {
  if (!researchOf(draft).questions.length || previous.included === draft.included) return {draft, removed: []};
  let next = draft;
  const removed = [];
  for (const root of researchOf(draft).questions.filter(q => q.parent_id === null && q.planKey?.startsWith('process:'))) {
    const process = processById(root.planKey.slice('process:'.length));
    const familyId = process?.topic?.family, family = familyId && topicFamilies.find(item => item.id === familyId);
    if (!family || process.topic.sub) continue;
    const topics = process.topic.combination ?? [process.topic.topic];
    const before = chosenTopics(previous, family), now = chosenTopics(next, family);
    // Alleen wat je net weghaalde: een opzet die je koos vóór je iets selecteerde, blijft staan.
    const gone = topics.filter(topic => before.has(topic) && !now.has(topic));
    if (!gone.length) continue;
    removed.push(...gone.map(topic => family.topicTitle(topic)));
    const rest = topics.filter(topic => !gone.includes(topic));
    if (!rest.length) { next = deleteQuestion(next, root.id); continue; }
    for (const sub of researchOf(next).questions.filter(q => q.parent_id === root.id && partOfTopic(q, {family: familyId}, gone)))
      next = deleteQuestion(next, sub.id);
    const replacement = rest.length > 1 ? combinedTopicId(familyId, rest) : topicProcess(familyId, rest[0])?.id;
    const plan = replacement && processQuestionPlan(next, replacement);
    const current = researchOf(next).questions.find(q => q.id === root.id);
    // Een zelf herschreven centrale vraag laten we staan; een voorgestelde vraag volgt de onderwerpen.
    const ownText = current.origin === 'user' || current.text.trim() !== (processQuestionPlan(draft, process.id)?.text ?? '').trim();
    if (plan?.text && !ownText) next = editQuestion(next, root.id, plan.text, current.origin || 'suggested');
    next = {...next, research: {...researchOf(next), questions: researchOf(next).questions.map(q => q.id === root.id && replacement ? {...q, planKey: 'process:' + replacement} : q)}};
    // Blijft één onderwerp over, dan is zijn brede deelvraag gelijk aan de nieuwe centrale vraag: die valt weg en haar
    // koppelingen gaan naar de centrale vraag, zodat dezelfde zin niet twee keer onder elkaar staat.
    if (rest.length === 1) {
      const central = researchOf(next).questions.find(q => q.id === root.id);
      for (const sub of researchOf(next).questions.filter(q => q.parent_id === root.id && q.text.trim() === central.text.trim())) {
        const lines = researchOf(next).links.filter(link => link.question_id === sub.id).map(link => link.line_id);
        next = deleteQuestion(next, sub.id);
        for (const line of lines) next = linkLine(next, line, root.id);
      }
    }
  }
  return {draft: next, removed};
}
