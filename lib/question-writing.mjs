import {researchOf,addQuestion} from './research-plan.mjs';
import {createReviewedResearchRenderer} from './research-direction-review.mjs';
import reviews from './question-example-reviews.mjs';

const renderExample=createReviewedResearchRenderer(reviews);

// Writing prompts, not claims or questions extracted from the selected sources.
export function questionExamples(subject='',routeIndex=0) {
 const values={onderwerp:String(subject).trim() || '[onderwerp]'};
 const routes=questionExampleTemplates().map(route=>{
  const central=renderExample(route.central,values);
  // Retain route indices and context. A rejected central template must not
  // quietly lend its plan to still-positive children from that route.
  return {...route,central,sub:central?route.sub.map(text=>renderExample(text,values)).filter(Boolean):[]};
 });
 return {routes,central:routes.map(r=>r.central),sub:routes[routeIndex]?.sub || routes[0].sub};
}

export function questionExampleTemplates() {
 const topic='{{onderwerp}}';
 const routes=[
  {label:'Werkwijze beoordelen',central:`In hoeverre voldoet de werkwijze voor ${topic} bij [organisatieonderdeel] in [periode] aan [toetsingscriteria]?`,sub:[
   `Welke toetsingscriteria zijn van toepassing op de werkwijze voor ${topic}?`,
   `Hoe wordt bij [organisatieonderdeel] in [periode] daadwerkelijk gewerkt aan ${topic}?`,
   `Op welke punten voldoet de werkwijze voor ${topic} aan de toetsingscriteria en op welke punten eventueel niet?`,
   `Hoe zijn de toetsingscriteria voor ${topic} vertaald naar taken en verantwoordelijkheden?`,
   `Welke waarborgen in de werkwijze voor ${topic} moeten fouten voorkomen of tijdig signaleren?`,
   `In hoeverre zijn deze waarborgen voor ${topic} in de onderzochte gevallen aantoonbaar toegepast?`,
   `Welke afwijkingen bij ${topic} zijn vastgesteld en wat betekenen die voor het beoogde resultaat?`,
   `Hoe worden uitzonderingen op de werkwijze voor ${topic} beoordeeld en vastgelegd?`,
   `Welke verschillen in de uitvoering van ${topic} zijn zichtbaar tussen [teams of locaties]?`,
   `Welke beperkingen in het beschikbare bewijs begrenzen het oordeel over de werkwijze voor ${topic}?`,
  ]},
  {label:'Resultaten beoordelen',central:`In hoeverre bereikt [organisatieonderdeel] in [periode] de beoogde resultaten voor ${topic}?`,sub:[
   `Welke resultaten wil [organisatieonderdeel] voor ${topic} in [periode] bereiken?`,
   `Welke resultaten zijn voor ${topic} in die periode aantoonbaar bereikt?`,
   `Hoe verhouden de bereikte resultaten voor ${topic} zich tot de beoogde resultaten?`,
   `Zijn de doelen voor ${topic} voldoende concreet om de bereikte resultaten te beoordelen?`,
   `Welke indicatoren geven een bruikbaar beeld van de resultaten voor ${topic} en wat blijft buiten beeld?`,
   `In hoeverre zijn de gegevens over de resultaten voor ${topic} volledig en betrouwbaar?`,
   `Hoe verschillen de resultaten voor ${topic} tussen [doelgroepen, teams of locaties]?`,
   `Welke onbedoelde effecten van ${topic} blijken uit het beschikbare bewijs?`,
   `Hoe verhouden de resultaten voor ${topic} zich tot een bruikbare uitgangssituatie of vergelijkingsgroep?`,
   `Welke conclusies over ${topic} zijn mogelijk en welke niet, gegeven de meetperiode en bewijskwaliteit?`,
  ]},
  {label:'Resultaten verklaren',central:`Welke factoren helpen verklaren in hoeverre [organisatieonderdeel] in [periode] de beoogde resultaten voor ${topic} bereikt?`,sub:[
   `Welke resultaten wil [organisatieonderdeel] voor ${topic} in [periode] bereiken?`,
   `In hoeverre zijn deze resultaten voor ${topic} aantoonbaar bereikt?`,
   `Welke factoren binnen en buiten [organisatieonderdeel] kunnen de resultaten voor ${topic} verklaren?`,
   `Welke aanwijzingen ondersteunen of weerspreken deze mogelijke verklaringen voor de resultaten van ${topic}?`,
   `Via welk verondersteld mechanisme zouden de onderzochte factoren de resultaten voor ${topic} beïnvloeden?`,
   `In welke volgorde traden de relevante veranderingen en resultaten bij ${topic} op?`,
   `Welke verschillen tussen [gevallen of locaties] helpen verklaringen voor ${topic} te toetsen?`,
   `Welke alternatieve verklaringen voor de resultaten van ${topic} zijn onderzocht?`,
   `Welke rol speelden externe ontwikkelingen bij de resultaten voor ${topic}?`,
   `Hoe sterk is het bewijs voor een bijdrage aan de resultaten van ${topic}, zonder samenhang als oorzaak aan te merken?`,
  ]},
  {label:'Risicobeheersing onderzoeken',central:`In hoeverre beheerst [organisatieonderdeel] in [periode] de voor ${topic} relevante risico’s binnen [vastgestelde grenzen]?`,sub:[
   `Welke doelen voor ${topic} kunnen door de onderzochte risico’s worden geraakt?`,
   `Welke risico’s voor ${topic} zijn onderbouwd en welke signalen zijn nog onzeker?`,
   `Hoe zijn de prioriteiten en grenzen voor het accepteren van risico’s bij ${topic} bepaald?`,
   `Welke maatregelen moeten de belangrijkste risico’s voor ${topic} beperken?`,
   `Zijn de maatregelen voor ${topic} passend ontworpen voor de beoogde risico’s?`,
   `Waren de maatregelen voor ${topic} op [peildatum] aantoonbaar aanwezig?`,
   `Wat blijkt uit onderzochte gevallen over de werking van de maatregelen voor ${topic}?`,
   `Welke restrisico’s voor ${topic} zijn zichtbaar en hoe wordt over hun aanvaardbaarheid besloten?`,
   `Hoe worden incidenten en veranderingen in risico’s voor ${topic} gesignaleerd en opgevolgd?`,
   `Welke onzekerheden begrenzen het oordeel over de risicobeheersing van ${topic}?`,
  ]},
  {label:'Sturing en verantwoordelijkheid',central:`In hoeverre ondersteunt de sturing op ${topic} bij [organisatieonderdeel] in [periode] tijdige en onderbouwde besluitvorming?`,sub:[
   `Welke besluiten over ${topic} moeten op welk niveau worden genomen?`,
   `Hoe zijn taken, bevoegdheden en verantwoordelijkheden voor ${topic} verdeeld?`,
   `Waar sluiten verantwoordelijkheden voor ${topic} op elkaar aan en waar ontstaan leemten of overlap?`,
   `Welke informatie ontvangen beslissers over ${topic} en op welk moment?`,
   `In hoeverre is deze informatie over ${topic} geschikt om doelen, risico’s en afwijkingen te beoordelen?`,
   `Hoe zijn relevante belangen en alternatieven in besluiten over ${topic} afgewogen?`,
   `Hoe worden besluiten over ${topic} vertaald naar uitvoerbare opdrachten?`,
   `Hoe worden afwijkingen bij ${topic} besproken en waar nodig geëscaleerd?`,
   `Wat blijkt uit onderzochte besluiten over de opvolging en terugkoppeling bij ${topic}?`,
   `Welke sturingspraktijken bij ${topic} werken aantoonbaar goed en waar is verbetering nodig?`,
  ]},
  {label:'Informatie als basis',central:`In hoeverre is de informatie over ${topic} bij [organisatieonderdeel] in [periode] geschikt voor [beoogd gebruik]?`,sub:[
   `Welke informatie over ${topic} hebben de beoogde gebruikers nodig?`,
   `Welke kwaliteitseisen gelden voor die informatie over ${topic}?`,
   `Hoe ontstaan de gegevens over ${topic} en welke bewerkingen ondergaan ze?`,
   `In hoeverre zijn de onderzochte gegevens over ${topic} volledig?`,
   `In hoeverre zijn de onderzochte gegevens over ${topic} juist en controleerbaar?`,
   `Is informatie over ${topic} tijdig beschikbaar voor het beoogde gebruik?`,
   `Worden begrippen en definities voor ${topic} door betrokkenen consistent gebruikt?`,
   `Hoe worden fouten in informatie over ${topic} gevonden en hersteld?`,
   `Welke beperkingen en onzekerheden in informatie over ${topic} zijn voor gebruikers zichtbaar?`,
   `Wat betekenen eventuele informatiegebreken voor beslissingen over ${topic}?`,
  ]},
  {label:'Dienstverlening beoordelen',central:`In hoeverre sluit de uitvoering van ${topic} bij [organisatieonderdeel] in [periode] aan op [afgesproken dienstverlening] en de behoeften van [doelgroep]?`,sub:[
   `Welke behoeften heeft de doelgroep bij ${topic} en hoe zijn die vastgesteld?`,
   `Welke afspraken over kwaliteit en tijdigheid gelden voor ${topic}?`,
   `Hoe toegankelijk is ${topic} voor verschillende groepen gebruikers?`,
   `Welke informatie krijgen gebruikers over het verloop en de voorwaarden van ${topic}?`,
   `In hoeverre voldoet de uitvoering van ${topic} aan de afgesproken doorlooptijden?`,
   `Hoe zorgvuldig en consistent worden vergelijkbare gevallen bij ${topic} behandeld?`,
   `Hoe worden uitzonderlijke omstandigheden van gebruikers bij ${topic} meegewogen?`,
   `Wat blijkt uit ervaringen en klachten over de kwaliteit van ${topic}?`,
   `Welke verschillen bestaan tussen gerapporteerde prestaties en ervaringen met ${topic}?`,
   `In hoeverre worden signalen van gebruikers benut bij het verbeteren van ${topic}?`,
  ]},
  {label:'Samenwerking in de keten',central:`In hoeverre ondersteunt de samenwerking tussen [betrokken partijen] in [periode] een betrouwbare uitvoering van ${topic}?`,sub:[
   `Welke gezamenlijke resultaten beogen de betrokken partijen met ${topic}?`,
   `Hoe zijn afspraken en verantwoordelijkheden voor ${topic} tussen partijen verdeeld?`,
   `Welke overdrachtsmomenten zijn kritisch voor ${topic}?`,
   `Welke informatie moet bij overdrachten voor ${topic} beschikbaar en begrijpelijk zijn?`,
   `Wat blijkt uit onderzochte gevallen over de kwaliteit en tijdigheid van overdrachten bij ${topic}?`,
   `Hoe beïnvloeden verschillende belangen of prioriteiten de uitvoering van ${topic}?`,
   `Hoe gaan partijen gezamenlijk om met knelpunten bij ${topic}?`,
   `Hoe is voorzien in de uitval of vertraging van een betrokken partij bij ${topic}?`,
   `Welke gezamenlijke informatie maakt de ketenprestaties voor ${topic} inzichtelijk?`,
   `Welke samenwerkingsafspraken voor ${topic} werken in de praktijk en welke vragen aanpassing?`,
  ]},
  {label:'Verandering volgen',central:`In hoeverre wordt de verandering rond ${topic} bij [organisatieonderdeel] in [periode] beheerst ingevoerd met behoud van [kritieke dienstverlening]?`,sub:[
   `Welk probleem moet de verandering rond ${topic} oplossen en welke resultaten worden verwacht?`,
   `Hoe zijn reikwijdte en succescriteria voor de verandering rond ${topic} vastgesteld?`,
   `Welke gevolgen van de verandering rond ${topic} zijn voor mensen, processen en systemen onderzocht?`,
   `Zijn verantwoordelijkheden en beslismomenten voor de invoering van ${topic} duidelijk?`,
   `Hoe zijn benodigde capaciteit en deskundigheid voor de verandering rond ${topic} geregeld?`,
   `Welke tests of proeven onderbouwen besluiten over ingebruikname bij ${topic}?`,
   `Hoe worden afhankelijkheden en invoeringsrisico’s rond ${topic} beheerst?`,
   `Hoe worden gebruikers voorbereid en ondersteund bij de verandering rond ${topic}?`,
   `Wat blijkt tijdens invoering over het behoud van de kritieke dienstverlening rond ${topic}?`,
   `Hoe worden afwijkingen en leerpunten bij de invoering van ${topic} verwerkt in vervolgbesluiten?`,
  ]},
  {label:'Verbeteringen opvolgen',central:`In hoeverre leiden de afgesproken verbetermaatregelen voor ${topic} bij [organisatieonderdeel] in [periode] tot aantoonbaar herstel van [vastgestelde tekortkomingen]?`,sub:[
   `Welke tekortkomingen bij ${topic} vormen het uitgangspunt voor de verbetermaatregelen?`,
   `Welke oorzaken van tekortkomingen bij ${topic} zijn onderzocht en onderbouwd?`,
   `In hoeverre sluiten de maatregelen voor ${topic} aan op deze oorzaken?`,
   `Zijn verantwoordelijkheden, middelen en termijnen voor verbetering van ${topic} vastgelegd?`,
   `Welke maatregelen voor ${topic} zijn aantoonbaar uitgevoerd?`,
   `Welke criteria worden gebruikt om een verbetermaatregel voor ${topic} af te sluiten?`,
   `Wat blijkt uit het beschikbare bewijs over veranderingen in de vastgestelde tekortkomingen bij ${topic}?`,
   `Welke terugkerende problemen bij ${topic} zijn ondanks de maatregelen zichtbaar?`,
   `Hoe worden vertraagde of onvoldoende werkende verbetermaatregelen voor ${topic} bijgestuurd?`,
   `Welke afspraken en controles zijn bedoeld om bereikte verbeteringen van ${topic} na afsluiting te behouden?`,
  ]},
 ];
 return routes;
}

export const subjectExamples=['de afhandeling van aanvragen','de samenwerking tussen teams','het beheer van toegangsrechten','de uitvoering van subsidiebeleid'];
export const questionKey=text=>String(text).trim().replace(/\s+/g,' ').replace(/[?.!]+$/,'').toLocaleLowerCase('nl');
export const hasQuestion=(questions,text)=>questions.some(q=>questionKey(q)===questionKey(text));
export function appendUniqueQuestion(questions,text){return text.trim()&&!hasQuestion(questions,text)?[...questions,text]:questions;}
export function addOwnSubquestions(draft,parentId,texts) {
 let next=draft;
 for(const text of texts.filter(t=>t.trim())) {
  const children=researchOf(next).questions.filter(q=>q.parent_id===parentId).map(q=>q.text);
  if(!hasQuestion(children,text)) next=addQuestion(next,parentId,text,'user').draft;
 }
 return next;
}
export function nextUnusedExample(examples,questions,index){
 for(let n=1;n<=examples.length;n++){const next=(index+n)%examples.length;if(!hasQuestion(questions,examples[next]))return next;}
 return index>=0?index:0;
}

export function mappedQuestionSuggestions(suggestions,draft) {
 return suggestions.flatMap(s=>{
  const ids=[...new Set(s.ids||[])].filter(id=>draft.included.includes(id));
  return ids.length && typeof s.text==='string' && s.text.trim() && s.text.length<=2000 ? [{...s,ids}] : [];
 });
}

// A question's working subject is separate from the intake and source-plan identity.
export function setQuestionSubject(draft,id,subject) {
 if(typeof subject!=='string'||subject.length>1000)throw Error('Ongeldig vraagonderwerp.');
 const research=researchOf(draft);
 if(!research.questions.some(q=>q.id===id&&q.parent_id===null))throw Error('Onbekende centrale vraag.');
 return {...draft,research:{...research,questions:research.questions.map(q=>q.id===id?{...q,subject:subject.trim()}:q)}};
}
