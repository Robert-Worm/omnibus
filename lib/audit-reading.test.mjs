import test from 'node:test';
import assert from 'node:assert/strict';
import {auditReadingText,currentAuditGuidance,distinctAuditLimitations,sourceSnapshotStatus} from './audit-reading.mjs';
import {sourceQuestionSubject} from './source-question-subject.mjs';
import {provisionStatusLabel,provisionStatusText,provisionStatusForPoint} from './provision-status.mjs';
import {sourceBackground,workbookEvidence} from './excel-saved-evidence.mjs';
import {frameworkLimitation,frameworkAboutLimitations} from './framework-limitations-wording.mjs';
import {frameworkAboutGuidance} from './framework-about-guidance.mjs';
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
 assert.match(frameworkContextText('DORA-2024-1502','applicability',text),/subcriterium 1.4 \(artikel 2, lid 5, punt b\)/);
 assert.equal(frameworkContextText('another-source','applicability',text),text);
 assert.equal(frameworkContextText('DORA-2024-1502','ownQuestion',text),text);
});

test('About source roles and links do not invent authority or unsafe destinations',()=>{
 assert.match(frameworkSourceRole('CONSOLIDATED_READING_AID_ONLY'),/alleen ter vergelijking/);
 assert.equal(frameworkSourceRole('New role'),'New role');
 assert.equal(frameworkSourceLink('https://example.org/official?lang=nl'),'https://example.org/official?lang=nl');
 const withCredentials=new URL('https://example.org');withCredentials.username='synthetic-user';withCredentials.password='synthetic-value';
 for(const unsafe of ['javascript:alert(1)','file:///private.pdf','data:text/html,test',withCredentials.href,'/local-file'])assert.equal(frameworkSourceLink(unsafe),undefined);
});

test('About removes reviewed process history but preserves revised and unfamiliar source restrictions',()=>{
 const history=Object.freeze({title:'Toelating',text:'De normgroepen en toetspunten zijn onafhankelijk beoordeeld. Toelating tot de actieve collectie staat nog open.'});
 const restriction=Object.freeze({title:'Voorwaarde',text:'HOLD: de voorgeschreven actor blijft onduidelijk; alleen taak B is uitgewerkt.'});
 const revised=Object.freeze({...history,text:history.text+' Nieuwe beperking: taak C is niet onderzocht.'});
 const source=Object.freeze([history,restriction,revised]);
 const result=frameworkAboutLimitations('DORA-2025-1190',source);
 assert.equal(result.length,2);
 assert(result.some(row=>row.text===restriction.text));
 assert(result.some(row=>row.text===revised.text));
 assert.equal(source.length,3);
 assert.equal(frameworkAboutLimitations('new-framework',[history])[0].text,history.text);
});

test('About merges presentation notes without losing distinct conditions or changing evidence',()=>{
 const common=Object.freeze({title:'Onderzoeksvoorstellen',text:'Doelen, risico’s, beheersuitwerkingen en vragen zijn brongebonden onderzoeksvoorstellen. De normtekst, toepassingsvoorwaarden en eventuele open bronvragen bepalen de grenzen van de uitwerking.'});
 const condition=Object.freeze({title:'Uitzondering',text:'Uitsluitend van toepassing op actor A bij aanleiding B.'});
 const input=Object.freeze([common,common,condition]);
 const result=frameworkAboutLimitations('DORA-2022-2554',input);
 assert.equal(result.length,2);
 assert(result.some(row=>row.title==='Onderzoeksvoorstellen en bewijs'&&row.text.includes('toepassingsvoorwaarden')));
 assert.equal(result.find(row=>row.title==='Uitzondering').text,condition.text);
 assert.equal(input[0],common);
});

test('concise application never replaces new or revised context without its review binding',()=>{
 const context={audience:['Andere actor'],applicability:'Nieuwe uitzondering',use_cases:['Casus'],intro:'Inleiding',source_explanation:'Andere editie',limitations:[{title:'HOLD',text:'Niet voldoende onderbouwd.'}]};
 assert.equal(frameworkAboutGuidance('DORA-2022-2554',context),undefined);
 assert.equal(frameworkAboutGuidance('new-framework',context),undefined);
 assert.equal(context.limitations[0].text,'Niet voldoende onderbouwd.');
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
 assert.match(sourceSnapshotStatus(source).qualification,/afzonderlijk/);
 const item={effectiveStatus:'unknown',effectiveFrom:source.effective_from};
 assert.equal(provisionStatusLabel(item),'');
 assert.match(provisionStatusText(item),/Datum volgens bronpakket: 2025-03-05/);
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

test('een onbevestigde bronstatus staat niet in de toetspunttitel; een echte status wel (#304)', () => {
 assert.equal(provisionStatusForPoint('Bronstatus niet bevestigd'),'');
 assert.equal(provisionStatusForPoint('Concept · geen geldende verplichting'),'Concept · geen geldende verplichting');
 assert.equal(provisionStatusForPoint(''),'');
});

test('het werkwoord HOLD wordt gewone taal; de inhoud van de beperking blijft staan', async () => {
  const {zonderHold} = await import('./audit-reading.mjs');
  assert.equal(zonderHold('HOLD: de bronvraag is onopgelost.'), 'Niet vrijgegeven: de bronvraag is onopgelost.');
  assert.equal(zonderHold('P0060 en P0063 blijven geheel HOLD. S0147 is helder.'), 'P0060 en P0063 blijven niet vrijgegeven. S0147 is helder.');
  assert.equal(zonderHold('De claim staat op HOLD.'), 'De claim is niet vrijgegeven.');
  assert.equal(zonderHold('Geen correctie. HOLD voor een toets die de verwijzing volgt.'), 'Geen correctie. Niet vrijgegeven voor een toets die de verwijzing volgt.');
});

test('werkcodes in de Wwke-uitleg worden gewone taal', async () => {
  const {zonderWerkcodes} = await import('./audit-reading.mjs');
  assert.equal(zonderWerkcodes('P0060, P0061, P0062 en P0063 blijven geheel HOLD. S0147 formuleert de termijn. Geen nieuw brondefect in S0147.'),
    'De vier toetspunten over artikel 15a blijven niet vrijgegeven. De wet formuleert de termijn. Geen nieuw gebrek in de wettekst.');
  assert.equal(zonderWerkcodes('De termijn in record 141 blijft helder. Werking blijft NOT_SELECTED; meer niet.'),
    'De termijn in artikel 15, zesde lid, blijft helder. De toets op werking is niet geselecteerd; meer niet.');
  assert.equal(zonderWerkcodes('24 pagina\'s opnieuw geëxtraheerd met pdfplumber en exact gelijk aan pages.json; klaar.'),
    '24 pagina\'s opnieuw geëxtraheerd en exact gelijk aan de vastgelegde paginatekst; klaar.');
});
