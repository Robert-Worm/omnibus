// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/point-interview.mjs";
// Export-only interview topics. These are editorial questions, not quotations,
// additional legal requirements or a replacement for the full testing point.
const cioTopics=data.cioTopics;
// Role-specific topics are prepared by the content publisher, not the web build.

const wwkeTopics=data.wwkeTopics;
export function pointInterviewTopic(material){
 const id=material.sourcePointId||material.sourceControlId||'';
 if(id.startsWith('C26-P-'))return cioTopics[id.slice(6)]||'';
 if(id.startsWith('WWA-P-'))return wwkeTopics[Number(id.slice(6))]||'';
 return '';
}
export function pointInterviewVariants(material){
 const topic=pointInterviewTopic(material),subject=topic||`het toetspunt ‘${String(material.title||'dit onderwerp').trim()}’`;
 return {
  questionOperational:`Hoe krijgt ${subject} in de praktijk vorm? Wat is uw eigen rol? Beschrijf een concrete situatie en wat daarin wel of niet lukte.`,
  questionManagement:`Hoe zijn de verantwoordelijkheden voor ${subject} verdeeld? Welke informatie gebruikt u om de uitvoering te volgen en wanneer stuurt u bij?`,
  questionStrategic:`Welke afwegingen maakt uw organisatie bij ${subject}? Hoe beoordeelt u of de gekozen inrichting past bij de doelen en risico’s?`,
 };
}
export const pointLevelProbe={
 operational:'Welke concrete situatie heeft u zelf meegemaakt en wat was uw rol daarin?',
 management:'Hoe zijn de verantwoordelijkheden verdeeld en hoe volgt u de uitvoering en eventuele bijsturing?',
 strategic:'Welke afwegingen spelen op organisatieniveau en hoe beoordeelt u de gevolgen voor doelen en risico’s?',
};
