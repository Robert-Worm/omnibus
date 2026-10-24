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
// Omnibus maakt zelf geen interviewvragen meer uit deze onderwerpen: een toetspunt zonder
// goedgekeurde vraag krijgt een korte uitleg (zie materialInterview in lib/investigation.mjs).
