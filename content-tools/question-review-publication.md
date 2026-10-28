# Vraagreviewbewijs in een nieuwe publicatie

`prepareQuestionReviewPublication` bereidt gegevens voor de bestaande bron- en publicatieroute voor. Het beoordeelt geen inhoud, maakt geen reviewbesluiten en schrijft geen database. Alleen fictieve gegevens zijn met deze aansluiting beproefd; bestaande catalogusvragen krijgen geen goedkeuring.

## Voorbereiden en binden

De bronadapter levert een complete inventaris van één bronitem: `sourceId`, `itemId`, `sourceEdition`, `sourceHash`, `item`, `context`, `questions`, `reviews` en `inventoryComplete:true`. Elke vraag is `{id,kind,text}`; alle niveauvarianten en doorvragen krijgen een eigen stabiele identiteit. Gebruik geen tekstzoekactie om bron-auteurschap of identiteiten af te leiden.

`sourceHash` bindt het bevroren bronpakket of brondocument. `item` en `context` zijn de oorspronkelijke reviewgrondslag zonder de afgeleide `questionReview`. De adapter neemt alle relevante bronpassages, beperkingen, toepasselijkheid, groepering en afhankelijkheden daarin op. Hashes gebruiken SHA-256 over UTF-8 `JSON.stringify(value)`, zonder tekstnormalisatie. `itemHash` gebruikt `{item,questions}` in die sleutelvolgorde, inclusief de volledige aangeleverde vraagregels en hun koppelingen. Een gewijzigde inventaris vraagt dus ook nieuw bewijs voor behouden vragen. `contextHash` gebruikt `context`. `questionHash` gebruikt precies `{id,kind,text}` in die sleutelvolgorde. Dit is de bestaande semantische reviewconventie, niet de canonieke hash van wijzigingsplannen.

Een bestaand afzonderlijk besluit bevat `sourceId`, `itemId`, `questionId`, `itemHash`, `decision`, `reviewId`, `reviewer`, `reviewDate`, `basis` en de aanvullende `sourceEdition`, `sourceHash`, `contextHash`, `questionHash`. Een auteur moet deze exacte versie daadwerkelijk laten beoordelen. De helper herstelt of vervangt geen oude fingerprints en verifieert niet de waarheid van een beoordeling of de identiteit van de beoordelaar.

Het resultaat bevat:

- `publication`: de complete inventaris met hashes en onveranderde besluiten.
- `offeredQuestions`: uitsluitend exacte vragen met `behouden` én een geslaagde vormvoorcontrole; extra velden van de adapter blijven behouden.
- `withheld`: de afzonderlijke status, redenen en vormuitkomst van de overige vragen. Ontbrekend bewijs blijft `unknown`; een lege inventaris is geen goedgekeurde lege dimensie en verandert `NO_QUESTIONS` niet.

Onvolledige, onbekende of dubbele besluitidentiteiten en verouderde bindings stoppen voorbereiding. `schrappen`, `herschrijven`, `HOLD` en ontbrekende besluiten leveren geen aangeboden vraag op. De gewone bronreview, HOLD, toepasselijkheid en eigenaarstoelating blijven daarnaast verplicht.

De bronadapter verwerkt `offeredQuestions` in de nieuwe catalogus en werkt de bijbehorende expliciete vraagkoppelingen bij vóór de gewone pakketreview. Geschrapte identiteiten kunnen uit de nieuwe inventaris verdwijnen. Bewaar de oude inventaris en besluiten in het bestaande bewijsarchief; voeg ze niet als actuele besluiten toe. Opnieuw invoeren of herschrijven vraagt nieuw bewijs.

## Lezen vanuit app of export

`readQuestionReview` uit `lib/question-quality-review.mjs` gebruikt dezelfde `questionReviewIssues` als de voorbereiding en de bestaande reviewgrenzen:

```text
readQuestionReview({
  sourceId, itemId, question: { id, kind, text },
  publication: currentSourceRow.questionReview,
  sourceEdition, sourceHash,
});
```

De laatste twee argumenten zijn optionele extra controles op bekende huidige bronmetadata. De verplichte bron- en itemidentiteiten komen van de actuele bronadapter. De capsule zelf komt uit dezelfde vastgepinde publicatie, nooit uit een eigen vraag, bewaard project of een overeenkomstige tekst elders. De publisher controleert hashes; de synchrone reader vergelijkt aangeboden tekst, soort en identiteit exact met die bevroren inventaris. Hij berekent geen nieuwe context uit browsergegevens en kan bronlezing niet bewijzen.

De reader retourneert `{status,approved,form,reasons,reviewId}`. `approved` vereist een passend `behouden` en `form.uitkomst === 'door'`. De vormuitkomst blijft afzonderlijk zichtbaar. Mogelijke statussen zijn `approved`, `unknown`, `stale`, `invalid`, `HOLD`, `herschrijven` en `schrappen`.

De interviewleidraad kan ook afzonderlijk beoordeelde doorvragen uit `interviewReview` tonen. Dit gebeurt alleen bij een goedgekeurde opening in een inventaris met één respondentniveau, eventueel met een identieke algemene opening. Bij meerdere openingsvarianten wordt geen koppeling geraden. Iedere doorvraag vereist haar eigen positieve besluit. Ontbrekend of afgekeurd bewijs, een ander niveau, eigen vraagtekst of een historische bronversie krijgt geen nieuwe brongebonden doorvragen toegevoegd. De toetsinstructie blijft afzonderlijk herkenbaar; opgeslagen projecten krijgen geen reviewgegevens toegevoegd.

Afgesproken plaatsing voor bronadapters:

- Rapportregel: `line.questionReview`, `sourceId=line.report_id`, `itemId=line.id`, vraag-ID `auditQuestion` of de expliciete bronvraag-ID.
- Kadervoorstel: `proposal.questionReview`, expliciete bronidentiteit, `itemId=originKey` waar dat stabiel is, vraag-ID `question`, `questionOperational`, `questionManagement` of `questionStrategic`.
- Andere bronplannen vereisen eerst een expliciete ouder- en vraagidentiteit; gemengde modeltekst krijgt geen verzonnen binding.

Voor de bestaande kaderopzet (`central`, `subquestions` met `key`, `text` en `originKeys`) gebruikt de bronadapter `prepareQuestionPlanPublication`. De ouderidentiteit is `<sourceId>:question-plan`, de vraagidentiteiten zijn `central` en `sub:<key>`. Het complete plan gaat als `plan` mee; de overige bron-, item-, context- en reviewvelden blijven verplicht. De helper ontwerpt of beoordeelt geen vragen. Een gewijzigde koppeling vraagt net als een gewijzigde tekst nieuw reviewbewijs. Projectgebonden `ids` horen niet in een bronplan.

Het resultaat `plan` kan in `foundationQuestionPlans[sourceId]` worden geleverd. Ook kaders zonder vlakke catalogusregels krijgen hun plan via de eigen uitgestelde brongroep. De applicatie leest de besluiten met `sourceQuestionPlanPresentation`: expliciet afgekeurde of niet-beoordeelde vragen worden niet aangeboden, een gewijzigde inventaris wordt niet hergebruikt. Een onderzoeksrichting maakt van afgekeurde tekst geen nieuw goedgekeurd voorstel. Opgeslagen eigen vragen en handmatige koppelingen blijven behouden.

Een plan kan daarnaast `broadSubquestions` leveren, met dezelfde velden en eigen sleutels die beginnen met `broad:`. Beide niveaus behoren tot één volledige reviewinventaris. De keuze Breed/Specifiek wordt dan in de bestaande vraagopzet beschikbaar; gekozen vragen uit beide niveaus blijven samen bewaard. Brede vragen en hun koppelingen worden inhoudelijk ontworpen, niet automatisch samengevoegd. Een expliciet geleverd registryplan heeft voorrang op het oorspronkelijke bronplan; een afkeuring mag dat oorspronkelijke plan niet opnieuw activeren.

Een aanwezige capsule mag bij afwezig of verouderd bewijs niet terugvallen op een legacyvoorstel. Zonder capsule blijft de inhoudelijke status onbekend; de bestaande vormcontrole en legacyzichtbaarheid blijven compatibel. Filter of migreer geen eigen vragen, historische onderzoekstekst of opgeslagen bewijssnapshots met deze helper.

## Getoetste grens

De runtimeproef maakt via `scripts/build-local-database.mjs` twee aparte fictieve rapportpublicaties en controleert ze met `checkRuntimeDatabase` en de gewone rapportlevering. Zij toont verwijdering, herschrijven met nieuw bewijs, exacte bronpagina's, behouden historisch bewijs en een ongewijzigde oude database. Dit is geen correctie-import in een bestaande publicatie en geen uitvoering van echte inhoudelijke reviews. De gewone bouwers zijn niet gewijzigd en roepen de helper niet automatisch aan; de bronadapter moet deze expliciete voorbereiding toepassen. App-/exportconsumenten sluiten apart aan.

---

[↑ Hulpmiddelen voor de beheerder](README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
