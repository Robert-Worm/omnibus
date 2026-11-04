import test from 'node:test';
import assert from 'node:assert/strict';
import {auditReadingText,currentAuditGuidance,distinctAuditLimitations,sourceSnapshotStatus} from './audit-reading.mjs';
import {sourceQuestionSubject} from './source-question-subject.mjs';
import {provisionStatusLabel,provisionStatusText} from './provision-status.mjs';
import {sourceBackground,workbookEvidence} from './excel-saved-evidence.mjs';
import {frameworkLimitation} from './framework-limitations-wording.mjs';
import {frameworkContextText} from './framework-context-wording.mjs';
import {frameworkSourceRole,frameworkSourceLink} from './framework-source-labels.mjs';

test('About wording preserves unfamiliar limits and source records while explaining reviewed text',()=>{
 const original=Object.freeze({title:'Bewijsgrens',text:'Opzet en bestaan geven geen oordeel over duurzame werking. Kies zelf onderzoeksperiode, gevallen en onderbouwing.'});
 const result=frameworkLimitation(original);
 assert.match(result.text,/duurzame werking/);assert.match(result.text,/onderzoeksperiode, gevallen en onderbouwing/);
 assert.equal(original.title,'Bewijsgrens');
 const amended={...original,text:original.text+' Aanvullende uitzondering: alleen actor B.'};
 assert.equal(frameworkLimitation(amended).text,amended.text);
 assert.equal(frameworkLimitation(amended).title,amended.title);
 const text='Lead overseer is specifieke toepasser van 1.4 vanaf 16 januari 2025.';
 assert.match(frameworkContextText('DORA-2024-1502','applicability',text),/artikel 1, lid 4/);
 assert.equal(frameworkContextText('another-source','applicability',text),text);
 assert.equal(frameworkContextText('DORA-2024-1502','ownQuestion',text),text);
});

test('About source roles and links do not invent authority or unsafe destinations',()=>{
 assert.match(frameworkSourceRole('CONSOLIDATED_READING_AID_ONLY'),/uitsluitend als leeshulp/);
 assert.equal(frameworkSourceRole('New role'),'New role');
 assert.equal(frameworkSourceLink('https://example.org/official?lang=nl'),'https://example.org/official?lang=nl');
 for(const unsafe of ['javascript:alert(1)','file:///private.pdf','data:text/html,test','https://user:password@example.org','/local-file'])assert.equal(frameworkSourceLink(unsafe),undefined);
});

test('only exact authoring notes leave the reading layer; legal HOLD and scope remain',()=>{
 const history='Alle ketens en toetsen zijn auteursvoorstel/HOLD; geen eigen review, toelating of juridische eindclaim.';
 const restriction='HOLD: de actor is onbeslist. Geen algemene vrijstelling; artikel16 geldt alleen voor de genoemde doelgroep.';
 const original=history+'\n\n'+restriction+'\n\nVragen en pakketbrede eindreviews volgen afzonderlijk; geen integratie en geen roottrackingmutatie.';
 assert.equal(currentAuditGuidance(original),restriction);
 const record={material:{sourceContext:original,topicalTrace:'{"original":"HOLD"}'},sources:[]};
 assert(!sourceBackground(record).includes(history));
 assert(sourceBackground(record).includes('HOLD: de actor is onbeslist'));
 assert.equal(record.material.sourceContext,original);
 assert.equal(workbookEvidence([record],{})[0].savedMaterial.sourceContext,original);
 assert(sourceBackground({...record,material:{sourceContext:original}}).includes(history));
});

test('deduplication retains different legal qualifications and does not mutate the frozen list',()=>{
 const a={title:'A',text:'Scope'},b={title:'B',text:'Scope'},c={title:'C',text:'Scope met uitzondering'};
 const input=Object.freeze([a,b,c]);assert.deepEqual(distinctAuditLimitations(input),[a,c]);assert.equal(input.length,3);
 assert.equal(auditReadingText('binnen6(1), op basis van artikel8'),'binnen het kader van artikel 6, lid 1, op basis van artikel 8');
});

test('a dated unknown snapshot is never promoted to current law or entity applicability',()=>{
 const source={status:'UNKNOWN',effective_from:'2025-03-05',as_of:'2026-11-01'};
 assert.equal(sourceSnapshotStatus(source).date,'2025-03-05');
 assert.match(sourceSnapshotStatus(source).qualification,/niet bevestigd/);
 const item={effectiveStatus:'unknown',effectiveFrom:source.effective_from};
 assert.equal(provisionStatusLabel(item),'Bronstatus niet bevestigd');
 assert.match(provisionStatusText(item),/Datum volgens bronpakket: 2025-03-05/);
 assert.match(provisionStatusText(item),/afzonderlijk de toepasselijkheid/);
 assert.equal(item.effectiveStatus,'unknown');
 assert.equal(provisionStatusLabel({effectiveStatus:'draft'}),'Concept · geen geldende verplichting');
});

test('source subject rendering preserves reviewed wording, mappings and literal dollar signs',()=>{
 const template='Hoe beheerst {{onderwerp}} risico’s voor {{onderwerp}}?';
 assert.equal(sourceQuestionSubject(template),'Hoe beheerst [onderwerp] risico’s voor [onderwerp]?');
 assert.equal(sourceQuestionSubject(template,'Team $&'),'Hoe beheerst Team $& risico’s voor Team $&?');
 assert.equal(template,'Hoe beheerst {{onderwerp}} risico’s voor {{onderwerp}}?');
 assert.equal(sourceQuestionSubject('Eigen vraag over [organisatie]?','Team'),'Eigen vraag over [organisatie]?');
});
