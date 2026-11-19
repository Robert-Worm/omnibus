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
8. **Vastleggen in code en tests** (zie hieronder) en de dekking controleren tegen de database.
9. **Besluit** in `docs/beheer/besluiten.md`, uitleg in `docs/gebruiken/werken-met-omnibus.md`, en het budget en
   verbruik noteren.

Bewaar het dossier buiten Git, bij de private verwerkingsomgeving: de indelingsregels, de opdracht per rol, de eerste
indeling per auteur, de uitkomst van de review per norm, de opdrachten en keuzes van de blinde proef, het
vergelijkingsscript en de uitkomst. Zonder dat dossier is de indeling niet te herhalen of te controleren.

## Vastleggen

- `lib/<familie>-onderwerpen.mjs`: de definitie (onderwerpen, bronnen, bronnen zonder onderwerp, teksten van de opties)
  en één aanroep van `createTopicFamily` uit `lib/family-topics.mjs`. Een optie zonder tekst bestaat niet voor de familie.
- `lib/<familie>-onderwerpen-indeling.mjs`: per norm `[bron, hoofdonderwerp, deelonderwerp, verwant, kader, sector]`,
  met bovenaan wie het heeft nagekeken en wanneer.
- `lib/topic-families.mjs`: voeg de familie toe aan `topicFamilies`. Lijst, viewer en tegels vragen alleen aan dit
  bestand welke familie bij een bron of een keuze hoort; daar hoeft niets voor te veranderen.
- Een keuze draagt de naam van de familie (`dora:T5`), zodat onderwerpen van twee families niet botsen.

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
4. **Publiceren.** Het plan komt in de database als proces met het veld `topic` (`{family, topic, sub}`) en de vaste
   identiteit uit `family.questionPlans`, met de reviewbesluiten via `prepareQuestionPlanPublication`. De publicatie
   weigert een plan zonder passend besluit. Zo'n proces staat niet in de navigatie.
5. **Proef in de browser.** Kies elk onderwerp, ook een deelonderwerp en het praktijkkader, en kijk in stap 3 of het
   plan van dat onderwerp als eerste wordt aangeboden en welke toetspunten los blijven.

Het ontwerp, de dossiers en de reviewbesluiten horen bij het reviewdossier buiten Git.

## Verplichte controles

- `node --test lib/<familie>-onderwerpen.test.mjs`: geldig hoofdonderwerp, hoogstens twee verwante, zonder verwante
  normen staat een norm in precies één onderwerp, kaders sluiten elkaar uit, lijst en viewer tellen hetzelfde, een keuze
  is heen en terug te lezen.
- `npm run check:onderwerpen -- --database <catalogue.sqlite>`: elke norm van een ingedeelde bron heeft een regel in de
  indeling en elke regel een norm. Draai dit na elke nieuwe database; een nieuwe of hernoemde norm valt anders stil uit
  elk onderwerp.
- De gewone suites en een proef in de browser: lijst, viewer, onderwerp als geheel, licht en donker.
