# Kwaliteitsrubriek voor modellen en vragen

Dit is de nieuwe Omnibus-werkwijze voor inhoudelijke modelreview. Bestaande
modellen zijn hiermee niet met terugwerkende kracht goedgekeurd. Technische
tests, heuristieken en een inventaris vervangen geen toepassing van deze rubriek.

## Bron en model

1. Benoem wat het model verklaart/ordent en wat niet. Onderscheid oorspronkelijke
   theorie, latere revisies, empirisch instrument en eigen interviewuitwerking.
2. Leg per dimensie definitie, grenzen, relevante primaire bronplaatsen en
   eventuele eigen indicatoren vast. Een gelijknamige dimensie uit een andere
   publicatie mag niet zonder uitleg worden vermengd.
3. Bewaar officiële namen naast begrijpelijke Nederlandse weergave. Leg
   vertalingen en aanpassingen vast. Claim geen validiteit, betrouwbaarheid,
   scoregrens of diagnose die de bron voor deze toepassing niet onderbouwt.
4. Controleer bronrechten/licentie bij overname van instrumentitems. Beschikbare
   tekst op internet is niet automatisch toestemming voor volledige herpublicatie.

## Beoordeel iedere hoofdvraag, niveauvariant en cyclerformulering

| Aspect | Concrete beoordeling |
| --- | --- |
| Construct | Welk begrip wordt verkend? Past het bij deze dimensie/indicator? |
| Neutraliteit | Kan de respondent ook afwezigheid, goed functioneren of een andere verklaring noemen? Geen ingesloten tekortkoming of gewenste conclusie. |
| Eén focus | Is één samenhangend antwoord mogelijk? Splits werkelijk verschillende oordelen; verplaats concrete verdieping naar doorvragen. |
| Beantwoordbaarheid | Kan deze respondent dit uit eigen werk/waarneming weten? Vraag niet naar verborgen motieven of ervaringen van iedereen. |
| Taal | Begrijpelijk gesproken Nederlands, concrete actor/object/context, weinig jargon. Open uitnodiging; alleen een vraagteken of 'hoe' is geen kwaliteitsbewijs. |
| Niveau | Operationeel: eigen handelingen/ervaringen. Management: inrichting, ondersteuning, afwegingen. Strategisch: richting, prioriteiten, toezicht. Geen simpel toevoegen van functietitels. |
| Bewijsgrens | Perceptie en illustratief voorbeeld zijn geen bewezen werking of causaal effect. Een vervolgvraag mag om concreet voorbeeld/tegenvoorbeeld vragen. |
| Dekking | Geen onverklaarde lege dimensies, nauwelijks verschillende dubbelvragen of kunstmatige quota. Overlap met andere dimensies wordt verklaard. |

Vergelijk niveauvarianten op hetzelfde bedoelde construct. Onderwerpvervanging
(`{{onderwerp}}`) moet grammaticaal werken bij een proces, organisatieonderdeel
en concreet gedrag. Cyclen verandert de formulering, niet wat de vraag onderzoekt.
Controleer gevoelige vragen op veiligheid/attributie: vraag naar situaties en
waarnemingen, niet onnodig naar identificeerbare personen.

## Voorbeelden voor oordeel, niet om overal letterlijk te gebruiken

- Problematisch: 'Waarom spreekt uw leidinggevende mensen onvoldoende aan?'
  veronderstelt zowel een tekortkoming als een actor en vraagt naar diens motief.
  Beter: 'Wat gebeurt er in uw team wanneer iemand afwijkt van een werkafspraak?'
  Doorvraag: 'Kunt u een situatie beschrijven en wat er daarna gebeurde?'
- Problematisch: 'Zijn de regels duidelijk en zijn er voldoende middelen?'
  combineert verschillende constructen in een ja/nee-vraag. Beoordeel ze apart.
- 'Kunt u beschrijven hoe ...?' kan een goede open uitnodiging zijn. Keur die
  niet af omdat de grammaticale aanhef ook een ja/nee-antwoord toelaat.

## Reviewbewijs

`prepareModelReview` maakt targets voor model, dimensies en iedere vraagvariant.
Aanvullende cycleruitvoer die niet in de payload staat moet apart worden bevroren
en gereviewd; de checker beweert die niet automatisch te dekken.

Twee onafhankelijke rollen beoordelen dezelfde `basisHash`:

- `theory`: per target `construct`, `sourceFidelity`, `coverage`,
  `interpretationLimits`.
- `practical`: per target `neutrality`, `singleFocus`, `answerability`,
  `plainLanguage`, `levelFit`.

Review-envelope: `role`, daadwerkelijke `actorId`, `basisHash`, `decision`
(`APPROVE`/`REVISE`/`UNRESOLVED`), `humanValidation:false`, `unresolvedIssues`,
`assessments[{targetId,decision,reason,aspects:{...}}]`.
Gebruik specifieke redenen. Op model/dimensieniveau gaat de reden over de
samenhang/dekking van de onderliggende vragen; geen zinloze puntenscore.
De coördinator verifieert onafhankelijkheid en werkelijke lezing buiten het JSON.

Herstel door de auteur creëert een nieuwe model-/bronbasis en vraagt inhoudelijke
herbevestiging; geen automatisch aanpassen van reviewhashes. Bronbeperking,
verkeerde vraag en ontbrekende review zijn verschillende statussen. Bestaande
projectvragen blijven behouden, ook als de catalogus later verbetert.
