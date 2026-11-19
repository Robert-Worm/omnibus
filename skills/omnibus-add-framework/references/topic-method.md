# Familie met onderwerpen: de methode

Een familie is een hoofdwet met haar uitvoeringsregelingen, richtsnoeren en eventueel een praktijkkader. Voor zo'n
familie zet het regime *kiezen per onderwerp* de normen van alle onderdelen per onderwerp bij elkaar. DORA is de eerste
familie (besluiten B-068 tot en met B-073 in `docs/beheer/besluiten.md`). Dit bestand beschrijft hoe je het voor een
volgende familie doet.

## Wanneer wel en wanneer niet

Een familie krijgt onderwerpen als alle drie waar zijn:

1. Zij heeft minstens drie toegelaten bronnen, waarvan minstens één de hoofdwet uitwerkt.
2. Eén auditvraag raakt gewoonlijk meer dan één bron.
3. De hoofdwet heeft een hoofdstukindeling waaruit vijf tot tien onderwerpen volgen.

Een kader dat uit één stuk bestaat, of losse stukken zonder uitwerkingsrelatie, krijgt het eenvoudige regime: geen
onderwerpen. De getallen zijn een eerste inschatting op basis van één familie; de beheerder beslist.

## Uitgangspunten

- Elke norm heeft een plek, maar niets wordt in een onderwerp gedwongen. Past een norm in geen onderwerp, dan staat zij
  bewust *buiten* de onderwerpen (hoofdonderwerp `buiten`). Ook hele bronnen kunnen buiten de onderwerpen vallen, met
  een reden.
- Eén hoofdonderwerp per norm, hoogstens twee verwante onderwerpen.
- Een extra as (een kader zoals volledig of vereenvoudigd, of een sectorvlag) komt er alleen als de wet zelf die
  tweedeling maakt. Het praktijkkader als toetsgrondslag in plaats van de wet komt er alleen als het dezelfde eisen dekt.
- De bron blijft altijd zichtbaar en er is één selectie: het onderwerp is een filter, geen eigen scherm.
- De indeling is een selectiehulp. Zeg erbij wie haar heeft nagekeken; een AI-review is geen juridische goedkeuring.

## Stappen

1. **Inventaris.** Alle bronnen van de familie uit het register en alle normen uit de database, met het aantal per bron.
   Benoem de bronnen die buiten de onderwerpen vallen, met reden.
2. **Onderwerpen afleiden** uit de hoofdstukken van de hoofdwet. Elk onderwerp krijgt een zin *hoort erbij* en een zin
   *hoort er niet bij*. Laat een panel (jurist, auditor, informatiearchitect) de lijst beoordelen.
3. **Indelingsregels vastleggen** voordat je indeelt: wanneer hoofdonderwerp, wanneer verwant, wanneer buiten, en op
   welke wettelijke grondslag een as bestaat.
4. **Indelen** door meerdere auteurs, elk een deel, met de regels en de normtekst.
5. **Review per norm** door twee onafhankelijke rollen (jurist en auditor) die de indeling van de auteur niet zelf
   maakten. Leg vast hoeveel normen direct akkoord waren en hoeveel zijn aangepast.
6. **Blinde bouwproef.** Twee rollen bouwen zonder de indeling te zien een kader per onderwerp uit alle normen van de
   familie (kern en rand). Vergelijk: welk deel van wat beiden als kern kozen zit in het filter, wat nam het filter mee
   dat niemand koos, en wat is alleen via *verwante normen* bereikbaar. Bij DORA vond deze proef de sectorspecifieke
   normen die niet in de standaardkeuze hoorden.
7. **Afwijkingen verwerken** en de gewijzigde normen opnieuw laten nakijken.
8. **Vastleggen in een onderwerppakket** (zie hieronder); het hulpmiddel controleert de dekking tegen de database.
9. **Besluit** in `docs/beheer/besluiten.md`, uitleg in `docs/gebruiken/werken-met-omnibus.md`, en het budget en
   verbruik noteren.

Bewaar het dossier buiten Git, bij de private verwerkingsomgeving: de indelingsregels, de opdracht per rol, de eerste
indeling per auteur, de uitkomst van de review per norm, de opdrachten en keuzes van de blinde proef, het
vergelijkingsscript en de uitkomst. Zonder dat dossier is de indeling niet te herhalen of te controleren.

## Vastleggen: het onderwerppakket

De indeling is inhoud, geen code (B-079). Zij staat met de vraagplannen in één pakket buiten Git, en komt met
`npm run content:topics` in de database. De app leest de families uit de database; voor een nieuwe familie verandert er
niets in de code. Een database zonder families geeft gewoon geen onderwerpen.

Het pakket is één JSON-bestand:

```json
{"format":"omnibus-topic-package","schemaVersion":1,"edition":"<jjjjmmdd.nn>",
 "family":{"id":"<kort>","listFamily":"<naam>","category":"","tone":"","topics":[…],"sources":[…],"outside":[…],
           "labels":{"facet":"Onderwerp", …},"index":{"review":{…},"norms":{"<normId>":[bron,hoofd,deel,[verwant],kader,sector]}}},
 "plans":[{"id":"TOPIC-<familie>-<onderwerp>[-<deel>]","design":{…},"review":{…}}]}
```

- `family`: onderwerpen (met *hoort erbij* en *hoort er niet bij*), bronnen met hun laag (wet of praktijk), bronnen
  buiten de onderwerpen met reden, de teksten van de opties (een optie zonder tekst bestaat niet) en per norm de
  indeling, met bovenaan wie haar heeft nagekeken. `labels.facet` is de naam van het filter (Onderwerp, of bijvoorbeeld
  Functie bij het CIO-stelsel). Een groepsnotitie heeft een patroon als tekst: `{"pattern":"^Gewoon raamwerk\\b","text":…}`.
- Een keuze draagt de naam van de familie (`dora:T5`), zodat onderwerpen van twee families niet botsen.
- `plans`: één per onderwerp en per deelonderwerp, met het ontwerp en de reviewbesluiten (zie hieronder).

De stappen staan in [onderwerpen publiceren](../../../docs/beheer/onderwerpen-publiceren.md).

## Een vraagplan per onderwerp

Wie een onderwerp kiest, verwacht in stap 3 een centrale vraag en deelvragen die bij dat onderwerp passen. Zonder eigen
plan wint het voorstel van één bron of thema en blijft een deel van de toetspunten los. Maak daarom per onderwerp en per
deelonderwerp één vraagplan, met de skills `omnibus-build-questions` en `omnibus-review-questions`:

1. **Inventaris.** Alle normen van het onderwerp (hoofd en verwant, wet en praktijkkader, elk regime, sector) met hun
   selecteerbare toetspunten, uit de database.
2. **Ontwerp.** Eén centrale vraag, drie tot acht specifieke deelvragen en twee of drie brede deelvragen die hele
   specifieke vragen bundelen. Een toetspunt volgt zijn norm, tenzij het uitdrukkelijk naar een andere deelvraag gaat.
   Forceer niets: een verwante norm, een sectornorm of een toetspunt dat onder geen vraag past, blijft bewust los. Geen
   restvraag ("overige", "sector"), geen norm of uitkomst in de vraag, elke vraag door de vormcontrole.
3. **Onafhankelijke review.** Een reviewer die het ontwerp niet maakte, leest elke normtekst onder elke vraag en geeft
   per vraag een besluit. Het besluit is gebonden aan de hash van het hele plan: na elke wijziging beoordeelt de
   reviewer het plan opnieuw. Alleen een plan waarvan elke vraag `behouden` kreeg, gaat door.
4. **Publiceren.** `npm run content:topics -- … --dossiers <map>` maakt de dossiers voor de reviewer, met de hash per
   plan; `… --out <map>` zet familie en plannen in een kopie van de database. Het hulpmiddel weigert een plan zonder
   passend besluit, met een norm zonder plek of met een vraag die niet door de vormcontrole komt. Zo'n plan staat als
   proces met het veld `topic` in de procescatalogus, niet in de navigatie.
5. **Proef in de browser.** Kies elk onderwerp, ook een deelonderwerp en het praktijkkader, en kijk in stap 3 of het
   plan van dat onderwerp als eerste wordt aangeboden en welke toetspunten los blijven.

Het ontwerp, de dossiers en de reviewbesluiten horen bij het reviewdossier buiten Git.

## Verplichte controles

- `npm run content:topics -- --settings <map>/local-build.json --package <pakket.json> --check`: de vorm van de
  indeling (geldig hoofdonderwerp, hoogstens twee verwante, bekende bronnen), de dekking tegen de database, een plan per
  onderwerp, de ontwerpregels en de reviews. Het geeft `HOLD` met de redenen of `CHECKED`.
- `npm run check:onderwerpen -- --settings <map>/local-build.json`: draai dit na elke nieuwe database. Een nieuwe of
  hernoemde norm van een ingedeelde bron valt anders stil uit elk onderwerp. Werk dan het pakket bij en publiceer het
  opnieuw; verandert een plan, dan beoordeelt de reviewer het opnieuw.
- De gewone suites (de werking zelf staat in `lib/family-topics.test.mjs` en `content-tools/topic-package.test.mjs`,
  met een verzonnen familie) en een proef in de browser: lijst, viewer, onderwerp als geheel, stap 3, licht en donker.
