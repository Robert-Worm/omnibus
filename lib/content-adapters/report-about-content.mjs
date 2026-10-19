// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/report-about-content.mjs";
// Editorial reading guidance only: never modifies norms, source text or evidence.
import {curatedThemes} from "@/lib/theme-curation.mjs";
const themes=data.themes;
export function reportAboutContent(workspaces=[],lines=[]){
 const titles=[...new Set(lines.map(l=>l.title).filter(Boolean))];
 const workspace=workspaces.length===1?workspaces[0]:null;
 if(workspace?.id==='process:system-choices')return {
  intro:'Dit kader helpt je onderzoeken waarom een organisatie voor een systeem kiest en hoe zij de aansluitingen met andere systemen beheerst. Het verbindt lessen over financiële ERP-systemen met ervaringen uit de transitie van DigiInkoop.',
  focus:'Kijk naar de afweging tussen eigen bouw en hergebruik, de haalbaarheid van kritieke koppelingen en de overdracht van gegevens en beheer. Een oplossing die bij de ene organisatie past, is niet vanzelf geschikt voor een andere.',
  audience:'Bruikbaar als vertrekpunt voor organisaties die systemen kiezen, vervangen of verbinden, bijvoorbeeld een ministerie, uitvoeringsorganisatie of sharedserviceorganisatie. Vooral relevant wanneer informatie door meerdere systemen of organisaties loopt.',
  use:'Baken één systeemkeuze of gegevensketen af. Betrek de proceseigenaar, architectuur, functioneel beheer en de ontvangende organisatie. Onderzoek de keuzeonderbouwing, koppeltests en afspraken over eigenaarschap en overdracht.',
  titles,
 };
 const curatedTheme=curatedThemes.find(theme=>'theme:'+theme.id===workspace?.id);
 const audiences=data.audiences;
 const theme=curatedTheme?[curatedTheme.description,audiences[curatedTheme.id]]:workspace?.id?.startsWith('theme:')?themes[workspace.id.slice(6)]:null;
 const label=workspace?.title||'de geopende onderwerpen';
 return {
  intro:theme?.[0]||(workspace?.id?.startsWith('report:')?`Dit kader bevat onderzoeksvoorstellen uit ${label}. De normen hieronder geven aan welke onderwerpen uit dat rapport zijn uitgewerkt.`:`Dit kader bundelt onderzoeksvoorstellen voor ${label}. De opgenomen normen bepalen welke onderdelen je hiermee kunt onderzoeken.`),
  focus:curatedTheme?.exclude||(theme?'De onderstaande normen laten zien welke onderdelen van dit thema in de beschikbare rapporten zijn uitgewerkt.':'Gebruik de onderstaande normen om te bepalen welk deel van dit proces bij jouw onderzoek hoort. De indeling is geen volledige beschrijving van het proces.'),
  audience:theme?.[1]||(workspace?.id?.startsWith('report:')?'Voor onderzoekers die willen beoordelen welke lessen uit dit rapport bruikbaar zijn in hun eigen organisatie. Vergelijk daarvoor eerst de hieronder beschreven onderzoekscontext met je eigen situatie.':`Voor de eigenaren, uitvoerders en afnemers van de processen die bij “${label}” horen. Gebruik de opgenomen normen om te bepalen welke verantwoordelijkheden of afhankelijkheden in jouw organisatie relevant zijn.`),
  use:'Bepaal je onderzoeksperiode en kies de onderdelen die bij je onderzoeksvraag passen. De rapporten leveren aanknopingspunten, geen oordeel over jouw organisatie of bewijs dat de beheersing nu werkt.',
  titles,
 };
}
const curated=data.curated;
export function reportSourceGuidance(framework){
 const cards=curated[framework?.report?.id];
 if(cards)return {curated:true,cards};
 // Unknown sources must not be given a fabricated summary. Show their original
 // qualifications, grouped under practical reading questions instead.
 const buckets=[
  {title:'Past de onderzochte situatie bij jouw onderzoek?',action:'Vergelijk de onderzochte organisatie, periode en afbakening met je eigen onderzoeksobject.',test:/scope|reikwijdte|historisch|onderzoeksperiode|populatie|representatie/i},
  {title:'Wat kan deze bron wel en niet aantonen?',action:'Maak onderscheid tussen ervaringen, voorstellen en vastgesteld bewijs. Onderzoek de huidige werking zelf.',test:/assurance|werking|effectiviteit|bevinding|interview|managementreactie|voorstel/i},
  {title:'Waar moet je de oorspronkelijke passage controleren?',action:'Controleer de bronpassage bij onduidelijke tekst, ontbrekende informatie of tegenstrijdige uitleg. Trek daaruit niet zelf een verdergaande conclusie.',test:/.*/},
 ];
 const grouped=buckets.map(b=>({...b,notes:[]}));
 for(const text of framework?.limitations||[])grouped.find(b=>b.test.test(text)).notes.push(text);
 return {curated:false,cards:grouped.filter(b=>b.notes.length).map(({title,action,notes})=>({title,action,notes,meaning:''}))};
}
