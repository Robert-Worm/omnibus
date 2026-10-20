// Application explanations, not authoritative legal definitions. Shared by the
// searchable reference window and deliberately annotated interface text only.
export const terminology = [
  {id:'intake',term:'Intake',aliases:['intakegesprek'],definition:'Een eerste verkenning met de opdrachtgever of betrokkenen van de aanleiding, behoefte en context van het onderzoek. Je bespreekt bijvoorbeeld signalen, verwachtingen en wat al bekend is. De intake helpt richting kiezen; zij hoeft nog geen definitieve onderzoeksvraag op te leveren.'},
  {id:'themegroup',term:'Themagroep',aliases:['themagroepen'],definition:'Een verzameling verwante thema’s waarmee je in Omnibus een breed onderwerp kunt verkennen. Je opent eerst een groep en kiest daarbinnen een thema. De indeling is een zoekhulp, geen oordeel over je organisatie.'},
  {id:'processfamily',term:'Procesfamilie',aliases:['procesfamilies'],definition:'Een groep verwante processen, bijvoorbeeld rond dienstverlening of bedrijfsvoering. Je gebruikt de groep om een specifiek proces te vinden; zij beschrijft niet noodzakelijk de indeling van jouw organisatie.'},
  {id:'law',term:'Wet',aliases:['wetten','wetgeving'],definition:'Een wettelijke regeling die eisen, taken of bevoegdheden vastlegt. Omnibus groepeert ook besluiten onder Wetten. Controleer in de oorspronkelijke bron voor wie de regeling geldt, welke voorwaarden gelden en welke versie van toepassing is.'},
  {id:'sourceframework',term:'Kader',aliases:['kaders','beleidskader','beleidskaders'],definition:'Als bron: een samenhangend geheel van uitgangspunten, eisen of richtlijnen om inrichting en handelen aan te toetsen. De status hangt af van de bron en de afspraken in jouw organisatie. Bij ‘Bouw je kader’ gaat het om je eigen referentiekader: de onderzoeksvragen en bouwstenen die je samenbrengt.'},
  {id:'controlobjective',term:'Beheersdoelstelling',aliases:['beheersdoelstellingen'],definition:'De gewenste situatie die je met beheersing wilt bereiken om een risico te beperken. De beheersmaatregel beschrijft de aanpak daarvoor; de norm maakt concreet waaraan je de praktijk beoordeelt.'},
  {id:'control',term:'Beheersmaatregel',aliases:['beheersmaatregelen'],definition:'Een aanpak of voorziening die helpt de beheersdoelstelling te bereiken. In de viewer kan dit een generieke, uit het kader afgeleide aanpak zijn. Dat betekent niet dat de maatregel al aanwezig is. De precieze eisen en voorwaarden staan bij Norm en de bijbehorende toetspunten.'},
  {id:'report',term:'Bronrapport',aliases:['bronrapporten','rapport','rapporten','onderzoeksrapport'],definition:'Een oorspronkelijk onderzoeksrapport waaruit inzichten of bouwstenen zijn afgeleid. Het rapport beschrijft een bepaalde situatie en onderzoeksperiode. Controleer de context voordat je bevindingen of normen voor je eigen onderzoek gebruikt.'},
  {id:'workform',term:'Werkvorm',aliases:['werkvormen'],definition:'De indeling van je Excel-werkdocument: Normtoetsing, Risico-controlmatrix of Interviewleidraad. Kies de vorm die past bij hoe je de geselecteerde bouwstenen wilt gebruiken. De werkvorm verandert hun bron of betekenis niet.'},
  {id:'goal',term:'Doel',aliases:[],definition:'Het resultaat dat je wilt bereiken. Bij de start van je onderzoek gaat het om wat de opdrachtgever met de uitkomsten wil bereiken. In een bronviewer gaat het om het organisatiedoel waarop de getoonde risico’s en beheersing betrekking hebben. Een doel is nog geen onderzoeksvraag of norm.'},
  {id:'insight',term:'Inzicht',aliases:[],definition:'Wat de opdrachtgever beter wil begrijpen om verder te kunnen. Bijvoorbeeld: waar zitten knelpunten, waardoor ontstaan ze en werkt de gekozen aanpak? Je vertaalt deze behoefte naar onderzoeksvragen.'},
  {id:'risk',term:'Risico',aliases:['risico’s',"risico's",'risicos'],definition:'De mogelijkheid dat een gebeurtenis of omstandigheid het bereiken van een doel belemmert. In Omnibus zijn risico’s uit eerdere rapporten aanknopingspunten: je beoordeelt zelf of ze ook in jouw situatie relevant zijn.'},
  {id:'questionbased',term:'Vraaggestuurd',aliases:['vraag gestuurd'],definition:'Een route die begint bij het doel en de behoefte aan inzicht van de opdrachtgever. Je kiest passende normen of modelvariabelen en werkt daarmee onderzoeksvragen uit. Er hoeft dus nog geen uitgewerkte vraag te zijn.'},
  {id:'riskbased',term:'Risk-based',aliases:['risk based','Verken je onderwerp'],definition:'Een route die begint bij signalen uit bijvoorbeeld intake, gesprekken of eerder onderzoek. Je verkent je onderwerp via thema’s, processen, wetten, kaders of modellen en kiest passende bouwstenen. De tool voert geen volledige risicoanalyse voor je uit; beide routes kunnen elkaar aanvullen.'},
  {id:'scope', term:'Afbakening', aliases:['scope'], definition:'Wat je wel en niet onderzoekt, bijvoorbeeld welke organisatie, processen en periode. Dit is iets anders dan vaststellen welke wettelijke eisen gelden.'},
  {id:'existence', term:'Bestaan', aliases:[], definition:'Onderzoeken of een beschreven maatregel daadwerkelijk is ingevoerd en aanwezig is. Dat toont nog niet aan dat deze gedurende een periode goed werkt.'},
  {id:'block', term:'Bouwsteen', aliases:['bouwstenen'], definition:'De verzamelnaam in Omnibus voor een onderdeel dat je kiest voor je onderzoek: een toetspunt, modelvraag of eigen onderdeel. Een geselecteerd toetspunt wordt één bouwsteen, ook als je het aan meerdere onderzoeksvragen koppelt.'},
  {id:'source', term:'Bron', aliases:['bronnen','bronverantwoording'], definition:'Het document of model waarop een norm of vraag is gebaseerd. Controleer daar de onderbouwing, context en versie. Bronverantwoording legt deze herkomst vast.'},
  {id:'central', term:'Centrale vraag', aliases:['centrale vragen'], definition:'De hoofdvraag waarop je onderzoek antwoord moet geven. Deze sluit aan bij het inzicht dat de opdrachtgever nodig heeft.'},
  {id:'subquestion', term:'Deelvraag', aliases:['deelvragen'], definition:'Een vraag die een deel van de centrale vraag uitwerkt. Deelvragen helpen structuur aanbrengen, maar zijn niet verplicht.'},
  {id:'diagnostic', term:'Diagnostisch', aliases:[], definition:'Onderzoek gericht op het begrijpen en verklaren van oorzaken van een probleem. Een samenhang alleen bewijst nog geen oorzakelijk verband.'},
  {id:'evaluative', term:'Evaluatief', aliases:['evaluatiegericht'], definition:'Onderzoek naar de mate waarin doelen zijn bereikt en een aanpak het beoogde resultaat heeft gehad. Maak duidelijk welke doelen en periode je beoordeelt.'},
  {id:'interview', term:'Interviewleidraad', aliases:[], definition:'Een verzameling vragen en gespreksonderwerpen die richting geeft aan interviews. Antwoorden vragen om duiding en, waar nodig, aanvullende onderbouwing.'},
  {id:'link', term:'Koppelen', aliases:['gekoppeld','koppelingen'], definition:'Een gekozen toetspunt of modelvraag verbinden aan een onderzoeksvraag. De koppeling toont waarvoor je het onderdeel wilt gebruiken, niet dat de vraag al is beantwoord.'},
  {id:'model', term:'Modelvraag', aliases:['modelvragen'], definition:'Een vraag op basis van een model, bijvoorbeeld om gedrag of samenwerking te onderzoeken in een interview. Dit is niet automatisch een toetsnorm.'},
  {id:'norm', term:'Norm', aliases:['normen','toetsnorm','toetsnormen','criterium','criteria','toetscriterium','toetscriteria','toetsingscriterium','toetsingscriteria'], definition:'Een eis of verwachting waaraan je de praktijk beoordeelt. Toetspunten werken de norm uit in afzonderlijk te onderzoeken onderdelen. Controleer de bron en toepasselijkheid: een voorgestelde norm is niet automatisch een wettelijke eis.'},
  {id:'object', term:'Onderzoeksobject', aliases:[], definition:'Datgene wat je onderzoekt, bijvoorbeeld een organisatie, proces, systeem of samenwerking.'},
  {id:'framework', term:'Referentiekader', aliases:['auditkader','toetskader','toetsingskader','normenkader','onderzoekskader'], definition:'De samenhang tussen je onderzoeksvragen en de normen, variabelen of interviewvragen die je gebruikt om ze te beantwoorden. In Omnibus bouw je dit op en exporteer je het als werkdocument. Een normenkader legt de nadruk op normen; een interviewkader op gespreksvragen.'},
  {id:'question',term:'Onderzoeksvraag',aliases:['onderzoeksvragen'],definition:'De vraag waarop je met je onderzoek antwoord wilt geven. Ze verbindt het gewenste inzicht met wat je onderzoekt. Normen en modelvariabelen helpen de vraag concreter te maken; je kunt de formulering later verfijnen.'},
  {id:'variable',term:'Variabele',aliases:['variabelen','modelvariabele','modelvariabelen'],definition:'Een kenmerk dat tussen personen, situaties of momenten kan verschillen, bijvoorbeeld ervaren duidelijkheid of samenwerking. Een model helpt bepalen welke kenmerken je onderzoekt en hoe je ze zichtbaar maakt met indicatoren of vragen. Een variabele is niet automatisch een norm.'},
  {id:'theme',term:'Thema',aliases:['thema’s',"thema's",'themas'],definition:'Een breed onderwerp waarmee Omnibus samenhangende onderzoeksinhoud uit verschillende processen en bronnen groepeert. Een thema is geen organisatieteam en bepaalt niet automatisch welke normen voor jou gelden.'},
  {id:'process',term:'Proces',aliases:['processen'],definition:'Een samenhangende activiteit, zoals toegang verlenen of klachten afhandelen. Een procesweergave in Omnibus toont de onderzoeksinhoud die specifiek aan dat proces is gekoppeld. De indeling garandeert geen volledige dekking.'},
  {id:'direction', term:'Onderzoeksrichting', aliases:['onderzoeksrichtingen'], definition:'Het soort inzicht dat je wilt verkrijgen, zoals problemen signaleren, oorzaken verklaren of resultaten evalueren. In Omnibus kies je één richting voor de vraagvoorstellen.'},
  {id:'design', term:'Ontwerpgericht', aliases:[], definition:'Onderzoek naar een voorgestelde oplossing en de mate waarin deze het probleem kan verhelpen. Dit is niet hetzelfde als vaststellen dat de oplossing in de praktijk al werkt.'},
  {id:'setup', term:'Opzet', aliases:[], definition:'Onderzoeken of de beschreven inrichting of maatregel geschikt is om het beoogde doel te bereiken. Hiermee stel je nog niet vast dat deze is ingevoerd of daadwerkelijk werkt.'},
  {id:'signaling', term:'Probleemsignalerend', aliases:[], definition:'Onderzoek naar de aanwezigheid, omvang en gevolgen van mogelijke problemen. Het in beeld brengen van knelpunten is nog geen verklaring van de oorzaken.'},
  {id:'riskcontrol', term:'Risico-controlmatrix', aliases:['risico controlmatrix'], definition:'Een overzicht dat risico’s verbindt met beheersmaatregelen, verantwoordelijkheden en eventuele toetsing. Een opgenomen maatregel is niet automatisch aantoonbaar effectief.'},
  {id:'applicability', term:'Toepasselijkheid', aliases:[], definition:'De vraag of een eis geldt voor jouw organisatie, rol, activiteit en periode. Een zoekfilter of scopeprofiel helpt oriënteren, maar beslist dit niet voor je.'},
  {id:'change', term:'Veranderingsgericht', aliases:[], definition:'Onderzoek naar het verloop van de invoering van een verandering, de voortgang en belemmeringen. De uitkomsten kunnen helpen om de uitvoering bij te sturen.'},
  {id:'operation', term:'Werking', aliases:[], definition:'Onderzoeken of een ingevoerde maatregel gedurende de onderzochte periode daadwerkelijk functioneert zoals bedoeld. Hiervoor is bewijs over die periode nodig.'},
  {id:'breadth', term:'Breedtestrategie', aliases:[], definition:'Een onderzoeksstrategie om een breed overzicht te krijgen, bijvoorbeeld door meerdere teams of gevallen te vergelijken. Baken af waarover je uitspraken wilt doen.'},
  {id:'depth', term:'Dieptestrategie', aliases:[], definition:'Een onderzoeksstrategie om een beperkt aantal situaties of gevallen grondig te begrijpen. Kies bewust welke gevallen je onderzoekt.'},
  {id:'procedural', term:'Procedureel (beschrijvend)', aliases:['procedureel','beschrijvend'], definition:'Onderzoek dat beschrijft wat er gebeurt of hoe iets verloopt, zonder daarmee een oorzakelijk verband vast te stellen.'},
  {id:'causal', term:'Causaal (toetsend)', aliases:['causaal','toetsend'], definition:'Onderzoek dat toetst of een verondersteld oorzakelijk verband bestaat. Alleen samenhang tussen verschijnselen is daarvoor niet voldoende.'},
  {id:'route',term:'Onderzoeksroute',aliases:['onderzoeksroutes'],definition:'Je vertrekpunt in Omnibus: Vraaggestuurd vanuit een onderzoeksbehoefte, of Risk-based vanuit signalen en zorgen. Beide routes komen samen bij Verzamel, Bouw je kader en Exporteer. Een route is iets anders dan een onderzoeksrichting.'},
  {id:'opened',term:'Geopende inhoud',aliases:['geopend','open modellen','open wetten & kaders','open thema’s & processen'],definition:'Bronnen, modellen of onderwerpen die je in een viewer hebt geopend. De aantallen naast het mapje in de navigatie tellen geopende onderdelen, niet gekozen toetspunten of vragen. Alleen openen selecteert niets; sluiten wist je bestaande selectie niet.'},
  {id:'selection',term:'Selectie',aliases:['geselecteerd','gekozen'],definition:'De bouwstenen of modelvragen die je hebt aangevinkt. Ze staan direct klaar in Bouw je kader. Daar verbind je de gekozen inhoud aan onderzoeksvragen: selecteren is nog niet koppelen en zegt niets over naleving.'},
  {id:'viewer',term:'Viewer',aliases:['modelviewer','documentviewer','open in viewer'],definition:'Een werkruimte om geopende inhoud te bekijken. In de bron- en modelviewers kies je toetspunten of werk je vragen uit. De documentviewer toont oorspronkelijke teksten en passages om de context te controleren.'},
  {id:'passage',term:'Bronpassage',aliases:['bronpassages'],definition:'Het aangehaalde deel van een oorspronkelijke bron bij een norm of toetspunt. Gebruik de bronverwijzing om ook de omliggende tekst te lezen. Een bewerking of toelichting in Omnibus is niet hetzelfde als de oorspronkelijke passage.'},
  {id:'testpoint',term:'Toetspunt',aliases:['toetspunten'],definition:'Een concreet te onderzoeken onderdeel van een norm. In de viewer kun je passende toetspunten afzonderlijk selecteren. Je bepaalt zelf of ze relevant en toepasbaar zijn; selectie is nog geen uitgevoerde toets.'},
  {id:'testapproach',term:'Toetsaanpak',aliases:['toetsaanpakken'],definition:'Een voorstel voor hoe je een toetspunt kunt onderzoeken en welke informatie daarbij kan helpen. Stem de aanpak af op je vraag, context en beschikbare onderbouwing. Het voorstel is geen uitgevoerde toets of auditconclusie.'},
  {id:'historical',term:'Historische bevinding',aliases:['historische bevindingen'],definition:'Een vaststelling uit een eerder onderzoeksrapport, binnen de periode en context van dat onderzoek. In thema’s en processen helpt die je relevante bouwstenen vinden. Zij is geen actuele vaststelling over jouw organisatie en niet automatisch een norm.'},
  {id:'scientificmodel',term:'Wetenschappelijk model',aliases:['wetenschappelijke modellen','onderzoeksmodel','onderzoeksmodellen','model','modellen'],definition:'Een inhoudelijk raamwerk om een vraagstuk te begrijpen via begrippen, variabelen of dimensies. Omnibus biedt een eigen kwalitatieve interviewuitwerking, geen officiële of gevalideerde vragenlijst van de modelmakers. Kies zelf passende vragen; bron en beperkingen staan bij ‘Over dit model’.'},
  {id:'dimension',term:'Dimensie',aliases:['dimensies'],definition:'Een onderscheiden aspect van een model, bijvoorbeeld helderheid of bespreekbaarheid. Open in de modelviewer een dimensie of variabele om de bijbehorende vragen te bekijken. Het aantal gekozen vragen is geen score op die dimensie.'},
  {id:'level',term:'Gespreksniveau',aliases:['gespreksniveaus','operationeel','tactisch','strategisch','management','boardroom'],definition:'De rol of het perspectief van je gesprekspartner: operationeel, tactisch/management of strategisch/boardroom. De modelviewer gebruikt dit voor passende vraagformuleringen en bewaart vraagkeuzes per niveau. Het niveau zegt niets over de kwaliteit of het belang van antwoorden.'},
  {id:'ownquestion',term:'Eigen vraag',aliases:['eigen vragen'],definition:'Een vraag die je zelf toevoegt in de modelviewer en naar je context uitwerkt. Aanvinken zet haar klaar in Bouw je kader; uitvinken haalt haar uit je selectie. Met × verwijder je de eigen vraag uit het model; Ongedaan maken kan haar herstellen.'},
  {id:'proposal',term:'Vraagvoorstel',aliases:['vraagvoorstellen','vraagopzet','ik begin met mijn selectie','ik bouw mijn eigen vraag'],definition:'Een mogelijke formulering van je onderzoeksvraag op basis van gekozen bouwstenen. In Bouw je kader kun je beginnen met je selectie of zelf een vraag schrijven. Controleer en pas een voorstel aan voordat je ‘Gebruik deze opzet’ kiest; het is geen vastgestelde onderzoeksopdracht.'},
  {id:'projectfile',term:'Projectbestand',aliases:['bewaar project','open project'],definition:'Een bewaarbestand waarmee je je werk later weer in Omnibus kunt openen. Bewaar dit naast de lokale browseropslag. Een geëxporteerd Excel-werkdocument is iets anders: wijzigingen daarin worden niet teruggelezen in Omnibus.'},
];
const normalise = value => String(value || '').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('nl').trim().replace(/\s+/g,' ');
export function findTerm(id) { return terminology.find(entry => entry.id === (id === 'criterion' ? 'norm' : id)); }
function matchRank(entry,query) {
  const term=normalise(entry.term),aliases=entry.aliases.map(normalise),words=query.split(' ');
  if(term===query)return 0;
  if(aliases.includes(query))return 1;
  if(words.every(word=>term.includes(word)))return 2;
  if(words.every(word=>[term,...aliases].some(label=>label.includes(word))))return 3;
  return 4;
}
export function searchTerms(query='') {
  const normalised=normalise(query),words=normalised.split(' ').filter(Boolean);
  return terminology.filter(entry => words.every(word=>normalise([entry.term,...entry.aliases,entry.definition].join(' ')).includes(word))).sort((a,b)=>(normalised?matchRank(a,normalised)-matchRank(b,normalised):0)||a.term.localeCompare(b.term,'nl'));
}
// Conceptual order, not an imposed research sequence. Each term belongs to one group.
export const terminologyGroups = [
  {id:'assignment',title:'Onderzoeksroute en onderzoeksvragen',ids:['route','questionbased','riskbased','intake','goal','insight','object','scope','question','central','subquestion']},
  {id:'directions',title:'Onderzoeksrichtingen',ids:['direction','signaling','diagnostic','design','change','evaluative']},
  {id:'strategy',title:'Onderzoeksstrategie',ids:['breadth','depth','procedural','causal']},
  {id:'sources',title:'Bronnen verkennen en openen',ids:['themegroup','theme','processfamily','process','risk','law','sourceframework','source','report','viewer','opened','passage','historical']},
  {id:'criteria',title:'Normen en toetspunten',ids:['controlobjective','control','norm','testpoint','applicability','testapproach']},
  {id:'models',title:'Modellen en gespreksvragen',ids:['scientificmodel','variable','dimension','model','level','ownquestion']},
  {id:'framework',title:'Je kader samenstellen',ids:['block','selection','proposal','link','framework']},
  {id:'testing',title:'Toetsen en werkdocumenten',ids:['setup','existence','operation','workform','riskcontrol','interview','projectfile']},
];
export function groupedTerms(query='') {
  const normalised=normalise(query),results=searchTerms(query);
  // Search relevance takes precedence over browsing categories. Never duplicate a result.
  if(normalised)return [
    {id:'exact',title:'Exacte overeenkomst',entries:results.filter(term=>matchRank(term,normalised)<2)},
    {id:'related',title:'Begrippen met deze zoekterm',entries:results.filter(term=>[2,3].includes(matchRank(term,normalised)))},
    {id:'explanation',title:'Gevonden in de uitleg',entries:results.filter(term=>matchRank(term,normalised)===4)},
  ].filter(group=>group.entries.length);
  const matches=new Map(results.map(term=>[term.id,term]));
  return terminologyGroups.map(group=>({...group,entries:group.ids.flatMap(id=>{const term=matches.get(id);return term?[term]:[];})})).filter(group=>group.entries.length);
}
const spellings=terminology.flatMap(entry=>[entry.term,...entry.aliases].map(text=>({text,id:entry.id}))).sort((a,b)=>b.text.length-a.text.length);
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern = new RegExp('(?<![\\p{L}\\p{N}])('+spellings.map(s=>escape(s.text)).join('|')+')(?![\\p{L}\\p{N}])','giu');
export function termSegments(text) {
  const parts=[],seen=new Set();let from=0;
  // Never apply to user questions, document quotations, controls or imported HTML.
  for(const match of text.matchAll(pattern)) {
    if(match.index>from)parts.push({text:text.slice(from,match.index)});
    const id=spellings.find(s=>normalise(s.text)===normalise(match[0])).id;
    parts.push(seen.has(id)?{text:match[0]}:{text:match[0],id});seen.add(id);
    from=match.index+match[0].length;
  }
  if(from<text.length)parts.push({text:text.slice(from)});
  return parts;
}
