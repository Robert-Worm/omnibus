const instructions = {
  entry:{title:'Kies je vertrekpunt',labels:['Opdracht of signalen','Passende normen','Je referentiekader'],steps:['Bij een opdracht begin je met het doel en het gewenste inzicht. Bij signalen uit intake, gesprekken of eerder onderzoek begin je met een thema of proces.','Bekijk bronnen en kies relevante normen. Formuleer en verfijn hiermee je onderzoeksvragen; een eerder bekende vraag kun je ook gebruiken.','Combineer normen en vragen in Bouw je kader en exporteer je referentiekader naar Excel. Je kunt stappen herhalen en wisselen zonder je werk te verliezen.']},
  'risk-start':{title:'1. Van signalen naar inhoud',labels:['Kies een gebied','Open de werkruimte','Kies voor je onderzoek'],steps:['Kies vanuit je signalen een thema, proces, wet, kader of wetenschappelijk model. Verken de categorieën of gebruik het zoekveld. Klik opnieuw op het actieve gebied om terug te gaan naar alle categorieën.','Open de inhoud die bij je onderzoek past. Bij thema’s en processen zie je doelen, risico’s, beheersmaatregelen en normen; bij wetten, kaders en modellen vind je normen of modelvariabelen en vragen.','Selecteer relevante inhoud. In Bouw je kader formuleer en koppel je onderzoeksvragen; daarna exporteer je het referentiekader. Historische risico’s zijn geen actuele vaststellingen over jouw organisatie.']},
  start: {title:'1. Start bij de opdracht', labels:['Bespreek de behoefte','Formuleer je doel','Baken af en ga verder'], steps:[
    'Bespreek welk inzicht de opdrachtgever nodig heeft en welke beslissing of verbetering dit moet ondersteunen.',
    'Kies een onderzoeksrichting en vul onderwerp en beoogd gebruik in. Gebruik de doelstelling als controle: beschrijft die echt de opdracht?',
    'Controleer of je doelstelling past bij de behoefte van de opdrachtgever. Ga daarna naar Verzamel; je kunt de doelstelling later bijstellen.',
  ]},
  collect: {title:'2. Verzamel gericht', labels:['Verken inhoud','Werk in een viewer','Breng je selectie samen'], steps:[
    'Kies Wetten & kaders, Modellen of Thema’s & processen. Gebruik categorieën en zoeken om passende inhoud te vinden. Rapporten zijn beschikbaar als oorspronkelijke bronnen.',
    'Open inhoud met ‘Open in viewer’. De mapjes met aantallen bij ‘Open …’ tonen hoeveel bronnen, modellen of onderwerpen je open hebt, niet hoeveel toetspunten je hebt gekozen.',
    'Kies relevante toetspunten of voeg zelf gekozen modelvragen toe. Ga naar Bouw je kader om ze aan onderzoeksvragen te koppelen. Alleen openen selecteert niets.',
  ]},
  foundations: {title:'2. Verken wetten en kaders', labels:['Vind een bron','Open of selecteer','Controleer wat past'], steps:[
    'Kies Wetten of Kaders en verken een categorie of zoek op onderwerp. Je keuze voor Wetten of Kaders blijft bewaard wanneer je terugkomt.',
    '‘Open in viewer’ opent de normen zonder ze te selecteren. Met ‘Selecteer alle normen’ kies je de hele bron; de knop verandert daarna in ‘Deselecteer alle normen’. Bij bronnen zonder deze knop kies je in de viewer.',
    'Gebruik Open wetten & kaders voor de gegroepeerde normen, toetspunten en bronpassages. Controleer daar de oorspronkelijke tekst, actualiteit en toepasselijkheid voor jouw organisatie.',
  ]},
  'foundation-workspace': {title:'2. Kies normen en toetspunten', labels:['Bekijk de groepen','Controleer de bron','Kies je toetspunten'], steps:[
    'Wissel bovenaan tussen geopende wetten en kaders. Verken de groepen en normen; het informatie-icoon bij een norm geeft extra toelichting.',
    'Open een norm voor de toetspunten, Bronpassage en Toetsaanpak. Bekijk de verplichting en onderbouwing; klik een bronverwijzing om de oorspronkelijke passage in de documentviewer te lezen.',
    'Vink losse toetspunten of een hele groep aan, of kies ‘Selecteer alle normen’. Met ‘Normen met gekozen toetspunten’ bekijk je je selectie. Ga daarna naar ‘Naar stap 3: Bouw je kader’.',
  ]},
  models: {title:'2. Verken modellen', labels:['Zoek een passend model','Open de vragenwerkplaats','Kies vragen in context'], steps:[
    'Verken een categorie of zoek op model, auteur of vraagstuk. De kaart beschrijft het model en toont de beschikbare vragen en onderdelen.',
    'Kies ‘Open in viewer’. Via Open modellen wissel je tussen je geopende modellen. Openen kiest nog geen vragen; er is geen knop om alle modelvragen tegelijk te selecteren.',
    'Vink in de viewer de vragen aan die passen bij je onderwerp en gesprekspartner. Ze staan direct klaar in Bouw je kader. Bij Exporteer kun je ook een losse modelleidraad maken.',
  ]},
  'model-workspace': {title:'2. Werk je modelvragen uit', labels:['Kies onderwerp en niveau','Verken en selecteer','Werk uit en voeg toe'], steps:[
    'Open een model of wissel bovenaan van model. Vul het gespreksonderwerp in en kies met wie je spreekt. Vraagkeuzes blijven per niveau bewaard.',
    'Open een variabele of dimensie en vink passende vragen aan. Ze staan direct klaar in Bouw je kader; uitvinken haalt ze uit je selectie. Het boek-icoon opent begrippen en toepassingen. ‘Over dit model’ geeft achtergrond en bronnen.',
    'Pas vragen aan of voeg een eigen vraag toe. Met × verwijder je een eigen vraag; ‘Ongedaan maken’ herstelt haar. Via ‘Naar stap 3: Bouw je kader’ koppel je de gekozen modelvragen aan je onderzoeksvragen.',
  ]},
  catalogue: {title:'2. Verken thema’s en processen', labels:['Kies je invalshoek','Verken een categorie','Open of selecteer'], steps:[
    'Kies Thema’s voor een breed onderwerp of Processen voor één activiteit. De gekozen invalshoek blijft bewaard wanneer je terugkomt.',
    'Verken de groepen of gebruik het zoekveld. Elke kaart beschrijft het onderwerp en toont hoeveel bouwstenen en bronrapporten beschikbaar zijn.',
    'Met ‘Open in viewer’ bekijk je de inhoud zonder iets te selecteren. Met ‘Selecteer alle bouwstenen’ kies je het hele onderwerp; nogmaals klikken deselecteert alles. Je geopende onderwerpen staan bij Open thema’s & processen.',
  ]},
  topics: {title:'2. Kies vanuit eerdere onderzoeken', labels:['Verken de samenhang','Bekijk de onderbouwing','Selecteer wat relevant is'], steps:[
    'Wissel tussen geopende onderwerpen en bekijk de groepen. Lees het doel, risico en de beheersdoelstelling; het informatie-icoon licht het onderwerp toe.',
    'Open een norm voor de toetspunten, historische bevinding en toetsaanpak. Bekijk de rapportverwijzing, datum en onderzoekscontext. Een historische bevinding is geen actuele vaststelling over jouw organisatie.',
    'Vink passende toetspunten of een groep aan, of kies ‘Selecteer alle normen’. Met ‘Normen met gekozen toetspunten’ bekijk je je selectie. Via ‘Naar stap 3: Bouw je kader’ koppel je die aan je onderzoeksvragen.',
  ]},
  reports: {title:'2. Verken oorspronkelijke rapporten', labels:['Vind een rapport','Lees de bron','Beoordeel de relevantie'], steps:[
    'Zoek een rapport dat aansluit bij je onderwerp. Rapporten bieden praktijkvoorbeelden en historische onderzoeksbevindingen.',
    'Open het rapport om de oorspronkelijke passages en hun context te lezen. Gebruik thema’s en processen om samenhangende bouwstenen uit eerdere onderzoeken te kiezen.',
    'Controleer periode, onderzoekscontext en vergelijkbaarheid met jouw organisatie. Een aanbeveling of bevinding uit een rapport is niet automatisch een toetsnorm voor je eigen onderzoek.',
  ]},
  reader: {title:'2. Controleer de oorspronkelijke bron', labels:['Lees de passage','Bekijk de context','Gebruik wat past'], steps:[
    'Bekijk de aangehaalde tekst in de documentviewer en controleer het pagina- of artikelnummer.',
    'Lees ook de omliggende tekst. Onderscheid de verplichting of bevinding van toepassingsvoorwaarden, uitzonderingen en toelichting.',
    'Ga terug naar de viewer om relevante toetspunten te kiezen. De bron bekijken selecteert niets en is nog geen oordeel over naleving.',
  ]},
  framework: {title:'3. Bouw je kader', labels:['Formuleer je vragen','Koppel passende inhoud','Controleer de samenhang'], steps:[
    'Kies ‘Zelf een vraag maken’ of ‘Bekijk mijn vraagopzet’. Bevestig je eigen vragen met ‘Vragen toevoegen’ of je gekozen voorstel met ‘Gebruik deze opzet’. Bij aanpassen kies je ‘Wijzigingen bewaren’. Deelvragen zijn optioneel.',
    'Verbind passende normen en interviewvragen met je vragen. Sleep een onderdeel of groep, of gebruik de koppelknoppen. Een selectie is nog geen koppeling.',
    'Bekijk of je per vraag voldoende passende informatie kunt verzamelen. Verwijder onnodige koppelingen, verzamel ontbrekende informatie en ga daarna naar Exporteer.',
  ]},
  export: {title:'4. Maak je werkdocument', labels:['Kies je werkdocument','Controleer het voorbeeld','Download en bewaar'], steps:[
    'Kies normtoetsing, een risico-controlmatrix of een interviewleidraad. Voor een losse modelleidraad kies je het model als basis.',
    'Vul de gevraagde gegevens en instellingen in. Controleer in het voorbeeld welke vragen en gekoppelde normen meegaan, inclusief de bronverantwoording.',
    'Download je werkdocument en bewaar ook je project om later verder te werken. Wijzigingen in Excel worden niet teruggelezen in Omnibus.',
  ]},
};
/** @returns {{title:string,labels:string[],steps:string[]}} */
export function workflowInstructions(page) { return instructions[page==='processes'?'catalogue':page] || instructions.collect; }
