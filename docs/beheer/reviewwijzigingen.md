# Alleen gewijzigde bouwstenen opnieuw beoordelen

<!-- paginatype: naslag -->

> **In het kort:** vergelijk een bewaarde beoordelingslijst met nieuwe JSON-gegevens. Je krijgt per bron de lijsten `opnieuw`, `ongewijzigd` en `verdwenen`.

## Zo gebruik je deze pagina

Gebruik dit hulpmiddel om een inhoudelijke herbeoordeling te plannen. Het leest gegevens en berekent hashes: controlegetallen van de volledige beoordelingsbasis. Het wijzigt geen bron, database, oude beoordeling of HOLD-status.

Een gelijke normtekst is onvoldoende. Een bouwsteen omvat de norm, alle eigen toetspunten en hun volledige keten. Verandert één toetspunt, dan komt de bijbehorende bouwsteen opnieuw op de lijst. Gekoppelde bouwstenen volgen wanneer hun afhankelijkheid geraakt wordt.

## De vergelijking uitvoeren

Werk in de Omnibus-checkout. Bewaar de JSON-bestanden in je eigen genegeerde `work/`-map. Gebruik nieuwe uitvoerbestanden; overschrijf geen invoer of bewaarde beoordelingen.

1. Maak uit de daadwerkelijk aangeboden inhoud een volledige beoordelingsbasis volgens het gegevenscontract hieronder. Dit hulpmiddel leest zelf geen database of pakketcode.
2. Bereken vóór de beoordeling het manifest: een lijst met hashes per bouwsteen.
3. Voeg pas na de werkelijke beoordeling een verwijzing toe onder `reviews`. Bewaar de bronkaart, scores en onderbouwing apart. Een nieuw manifest bevat altijd een lege beoordelingslijst.
4. Vergelijk bij een volgende versie het bewaarde manifest met de nieuwe beoordelingsbasis.

De opdrachten werken in PowerShell en in een gewone terminal. Maak de map `work/` eerst aan als die nog ontbreekt.

```text
node scripts/check-review-changes.mjs --snapshot work/basis.json
node scripts/check-review-changes.mjs work/beoordeeld-manifest.json work/nieuwe-basis.json
```

De uitvoer is JSON op standaarduitvoer. Je kunt die met `> work/nieuw-plan.json` naar een nieuw bestand sturen. Het script schrijft zelf geen bestanden. Exitcode 0 betekent dat de vergelijking is uitgevoerd; er kunnen nog bouwstenen onder `opnieuw` staan. Exitcode 1 betekent ongeldige of onleesbare invoer; er is dan geen bruikbare planning.

## Betekenis van de lijsten

| Uitkomst | Betekenis | Wat je doet |
| --- | --- | --- |
| `opnieuw` | Nieuwe of gewijzigde basis, ontbrekend bewijs of geen passende volledige oude beoordeling | Lees de bouwsteen en de geraakte keten opnieuw; herstel ontbrekend bewijs |
| `ongewijzigd` | De volledige hash en methode passen bij een volledige oude beoordeling | Bewaar die versiegebonden beoordeling en voer de gewone bron- en publicatiecontroles uit |
| `verdwenen` | De vaste identiteit ontbreekt in de nieuwe volledige inventarisatie | Controleer de verwijdering; behoud oude beoordelingen en gebruikerswerk |

De uitvoer noemt vaste IDs, hashes, toetspunt-IDs en redenen. `removedPointIds` toont verdwenen toetspunten binnen een nog aanwezige norm. De uitvoer bevat geen bronpassages of scores. Een hernoemde norm-ID verschijnt als verdwenen én nieuw; tekstgelijkenis koppelt geen identiteiten aan elkaar.

`ongewijzigd` zegt niets over de hoogte of juistheid van een oude score. Het is geen nieuwe inhoudelijke goedkeuring, vrijgave of actuele juridische beoordeling. De vaste uitvoervelden zijn `planningOnly: true`, `automaticApproval: false` en `runtimeSourceChecksRequired: true`. Bestaande broncontroles bij gebruik, toepasselijkheidsbeoordeling, expliciete toestemming en bewaarbeveiligingen blijven gelden.

## Gegevenscontract voor de beoordelingsbasis

Gebruik alleen JSON-gegevens, nooit een uitvoerbare module. De helper importeert geen aangeleverde paden en volgt geen verwijzingen naar bestanden of websites. Een volledig fictief voorbeeld staat in de functie `fixture` van de [gerichte tests](../../content-tools/review-change-set.test.mjs).

| Onderdeel | Wat het is |
| --- | --- |
| Hoofdvelden | `format: "omnibus-review-basis"`, `schemaVersion: 1`, `scopeId`, `inventoryComplete: true`, `rubricVersion`, `protocolVersion`, `context`, `sources` |
| Bron | `id`, `version`, `documents`, `context`, `applicability`, `hold`, `items` |
| Brondocument | `id`, `version`, `sha256`: de exact bewaarde editie en de hash uit de oorspronkelijke bytes |
| Bouwsteen | `id`, `norm`, `doel`, `risico`, `beheersdoelstelling`, `beheersmaatregel`, `toetspunten`, `passages`, `context`, `applicability`, `hold`, `dependencies`, `evidence` |
| Toetspunt | `id`, `text`, `opzet`, `bestaan`; voeg alle aangeboden aanvullende velden toe, waaronder werking en bewijssoorten |
| Passage | `id`, `documentId`, `documentVersion`, `documentSha256`, `location`, `text`, `context` |
| Afhankelijkheid | `sourceId` en `itemId` van een andere bouwsteen waarvan de betekenis afhangt |

De volledige identiteit is bron-ID plus norm-ID. IDs zijn hoofdlettergevoelig en blijven gelijk wanneer tekst verandert. Ze bevatten maximaal 160 tekens: letters, cijfers, punt, streepje, underscore of dubbele punt. Het eerste teken is een letter of cijfer. Norm-IDs zijn uniek binnen een bron; toetspunt-IDs ook. Bron-, document- en passage-IDs zijn uniek binnen hun eigen lijst. Dubbele IDs of dubbele verwijzingen stoppen de vergelijking.

`scopeId` benoemt de vaste reikwijdte van de inventarisatie, bijvoorbeeld alle toegelaten rapportnormen. Vergelijk dezelfde reikwijdte en lever de volledige lijst, ook als die leeg is. `inventoryComplete` is een expliciete verklaring van de aanleveraar. Het hulpmiddel kan niet ontdekken dat een bron uit een export is vergeten. Een andere reikwijdte of een onvolledige inventarisatie stopt de vergelijking.

`rubricVersion` en `protocolVersion` zijn niet-lege versieaanduidingen. Verhoog ze wanneer de beoordelingsrubriek of werkwijze verandert. Een ontbrekende versie levert `opnieuw` op. De methode is onderdeel van elke hash.

`context` is een object en mag leeg zijn wanneer er geen aanvullende context is. Neem algemene en bronspecifieke formuleringen, definities, uitzonderingen, groepscontext en veldherkomst volledig mee. Neem ook betekenisdragende redactie- en voorstellagen mee. Bewaar onderzoeksobject, actor en periode op het toepasselijke niveau. Een globale contextwijziging raakt alle bouwstenen; gewijzigde broncontext raakt alle bouwstenen van die bron en hun afhankelijke keten.

`applicability` is een gevuld object met de aangeboden toepasselijkheidsgegevens. `hold` is een object met ten minste `active: true` of `active: false`. Neem bestaande gronden, beperkingen en open vragen over. Een gelijk gebleven HOLD kan onder `ongewijzigd` vallen: die HOLD blijft dan onverminderd gelden.

Norm- en ketenvelden zijn niet-lege teksten. `toetspunten` bevat alle bijbehorende punten met hun opzet- en bestaanstoets. Voeg aangeboden beslisregels, bewijssoorten, varianten en toepasselijkheid per punt toe. Alle extra JSON-velden worden meegehasht; de helper gooit ze niet weg.

`passages` bevat de exacte tekst én omliggende betekenisdragende context. `location` is een gevuld object met de oorspronkelijke pagina, artikel- of spanregistratie. De documentversie en documenthash moeten overeenkomen met `documents`. Ontbrekende of afwijkende gegevens leveren `opnieuw` op, ook bij gelijke normtekst. Deze structuurcontrole bewijst niet dat de tekst werkelijk in het oorspronkelijke document staat; daarvoor blijven de bestaande passagecontroles en bronlezing nodig.

`dependencies` is een expliciete lijst, eventueel leeg. Verwijzingen kunnen naar andere bronnen wijzen. De helper neemt alle indirect afhankelijke bouwstenen mee en kan cirkelverwijzingen verwerken. Een ontbrekend doel van een verwijzing maakt de hele afhankelijke keten onvolledig. De aanleveraar moet alle betekenisdragende relaties opnemen; de helper leidt die niet af uit tekst.

`evidence` bevat `complete: true` en `gaps: []` uitsluitend wanneer de aangeleverde basis compleet is. Een ontbrekende verklaring, `false` of open bewijsvragen levert `opnieuw` op. Dit is een verklaring over volledigheid, geen bewijs dat iemand de bronnen gelezen heeft. Vul ontbrekende gegevens nooit op met verzonnen tekst om de controle te passeren.

## Oude beoordelingen aan hun versie binden

`createReviewManifest(basis)` uit [review-change-set.mjs](../../content-tools/review-change-set.mjs) maakt het manifest met lege `reviews`. Voeg na de echte beoordeling een registratie toe met deze velden:

```json
{
  "sourceId": "vaste-bron-id",
  "itemId": "vaste-norm-id",
  "hashVersion": "omnibus-review-sha256-v1",
  "itemHash": "de-bij-de-beoordeling-vastgelegde-sha256",
  "reviewId": "vaste-verwijzing-naar-het-bewaarde-reviewpakket",
  "sourceVerified": true,
  "coverageComplete": true,
  "unresolvedQuestions": []
}
```

Dit is een vormvoorbeeld, geen beoordeling. `itemHash` moet de echte hash van die beoordeelde versie zijn. `coverageComplete` omvat alle eigen toetspunten, varianten en de meegenomen keten. De verwijzing moet naar het werkelijk bewaarde reviewpakket leiden.

`reviewChangeSet(previousManifest, currentBasis)` herberekent de huidige hashes. Alleen een exact passende hash met een volledige oude registratie kan onder `ongewijzigd` vallen. Een onbekende hashversie maakt alle aanwezige bouwstenen opnieuw te beoordelen. Een onbekende schemaversie stopt de vergelijking.

De helper vertrouwt het bewaarde manifest en de beoordelingsverklaringen. Hij controleert geen handtekening, identiteit van een reviewer of inhoud van het reviewpakket. Gebruik daarom het oorspronkelijke, betrouwbaar bewaarde manifest met zijn bijbehorende bewijs. Het opnieuw berekenen van een hash onder een oude beoordeling is geen herbeoordeling.

## Hashberekening en controles

De helper hergebruikt [identity.mjs](../../content-tools/identity.mjs) voor canonieke JSON en SHA-256. Objectvelden worden op naam gesorteerd; tekst, witruimte en lijstvolgorde blijven behouden. Alleen de volgorde van bronnen en normen in de inventarisatie maakt geen verschil. De inhoud van elke bouwsteen, broncontext, globale context en alle opgeloste afhankelijkheden gaat mee. De hashvorm draagt de versie `omnibus-review-sha256-v1`.

Bewaar exporttijdstippen en andere administratieve gegevens buiten de beoordelingsbasis als ze geen betekenis hebben voor de review. Alle extra velden binnen die basis tellen bewust mee. Daarmee kan een ruime context leiden tot extra herbeoordelingen, maar wordt context niet ongemerkt overgeslagen.

Voer de gerichte tests uit met de voorgeschreven Node-versie van de repository:

```text
node --test content-tools/review-change-set.test.mjs
```

De tests gebruiken uitsluitend fictieve gegevens. Ze controleren veranderde bronpassages, ketens, context, methoden, dubbele IDs, verwijderingen, ontbrekend bewijs en behoud van invoerbestanden. Ze voeren geen echte bronreview of databasebewerking uit.

## Volgende stap

Beoordeel de lijst `opnieuw` met de [skill voor auditkwaliteit](../../skills/omnibus-review-audit-quality/SKILL.md). Volg daarna de bestaande route voor [inhoud toevoegen](inhoud-toevoegen.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
