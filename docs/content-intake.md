# Inhoudspakketten gecontroleerd aanleveren

Nieuwe rapporten, kaders en modellen houden hun bestaande extractie- en
reviewbestanden. Een apart `intake.json` beschrijft welke bestanden worden
overgedragen en controleert of hun bytes ongewijzigd zijn aangekomen. Deze
aanlevercontrole schrijft niets naar de database en publiceert niets.

## Rapport of kader uit een afzonderlijke chat

Gebruik de versie van de skill in deze codecheckout voor de pilot. De
voorbereidingschat gebruikt respectievelijk
[omnibus-add-report](../skills/omnibus-add-report/SKILL.md) of
[omnibus-add-framework](../skills/omnibus-add-framework/SKILL.md). Geef die chat
de gekozen bron, de privé-contracten en de bestaande taxonomie die nodig zijn
voor inhoudelijke verwerking. De codecheckout zelf bevat die private bronnen niet.

Begin de overdracht met het passende voorbeeldplan:

- [Rapportplan](../skills/omnibus-add-report/assets/intake-plan.json.example)
- [Kaderplan](../skills/omnibus-add-framework/assets/intake-plan.json.example)

Kopieer het plan naar een nieuwe `work/content-inbox/<pakket-id>/<versie>/plan.json`.
Vervang voorbeeldidentiteit, versie, titel en paden door de werkelijke waarden.
De voorbeeldnamen zijn geen verplichte hernoeming van frozen bestanden. Pas de
rollen aan op basis van hun inhoud, voeg alle benodigde contract-, bron- en
reviewafhankelijkheden toe en gebruik bestaande contextbestanden voor beperkingen
als die daar al in staan. Voeg bij een XML-bron de werkelijke teksteditie toe,
geen verzonnen PDF. Het plan bevat geen broninhoud en is geen goedgekeurd pakket.

Voer de twee opdrachten uit de volgende sectie uit zodra de werkelijke bestanden
aanwezig zijn. Geef daarna aan de ontvangende chat:

- Het manifestpad en de manifesthash afzonderlijk, plus pakket-ID, versie en broneditie.
- De echte reviewstatus en open punten, met verwijzingen naar het bestaande bewijs.
- De verwachte norm-/punt-ID's en aantallen, groepen of thema-/procesingangen,
  selectiegrenzen en eventuele mappingproblemen.

Gebruik hiervoor het bestaande overdrachtsoverzicht, geen tweede dossier. Als
de voorbereidingschat geen lokale toegang heeft, worden de pakketbestanden eerst
naar de lokale inbox overgedragen. Ontbrekende bestanden of reviews blijven HOLD;
een voorbeeldbestand is geen vervangend bewijs. De integrator volgt daarna
[de controle- en previewroute](content-maintenance.md#van-voorbereidingschat-naar-lokale-applicatie).

## Een nieuw manifest voorbereiden

Maak in een nieuwe overdrachtsmap een `plan.json` met dezelfde pakketgegevens,
contractidentiteit en bestandsrollen als hieronder. Gebruik als `format`
`omnibus-intake-plan` en als `schemaVersion` het getal `1`. Elk bestand krijgt
alleen `id`, `path` en `roles`: de opdracht berekent `sha256` en `bytes` zelf.
Kies de rollen op basis van de werkelijke inhoud; ze worden niet afgeleid uit
bestandsnamen. Een verkort voorbeeld voor een modelpakket:

```json
{
  "format": "omnibus-intake-plan",
  "schemaVersion": 1,
  "package": {"id": "voorbeeldmodel", "kind": "model", "version": "1", "title": "Voorbeeldmodel"},
  "contract": "model-review-1",
  "files": [
    {"id": "contract", "path": "payload/contract.md", "roles": ["contract"]},
    {"id": "bron", "path": "payload/bron.txt", "roles": ["source", "source-text"]},
    {"id": "model", "path": "payload/model.json", "roles": ["viewer-content", "context", "limitations"]},
    {"id": "reviewbasis", "path": "payload/reviewbasis.json", "roles": ["review-basis"]},
    {"id": "review", "path": "payload/review.json", "roles": ["review"]}
  ]
}
```

Voer vanuit de codecheckout uit:

```text
npm run content:prepare -- <overdrachtsmap>/plan.json --output <overdrachtsmap>/intake.json
npm run content:intake -- <overdrachtsmap>/intake.json
```

De voorbereiding maakt uitsluitend een nieuwe `intake.json` naast het plan.
Bronbestanden en het plan blijven ongewijzigd. De uitkomst
`MANIFEST_PREPARED_VERIFICATION_REQUIRED` betekent dat de opgegeven bestanden
zijn gemeten, niet dat hun inhoud of review is goedgekeurd. Bewaar de getoonde
manifesthash afzonderlijk bij verzending als controle voor de ontvanger.

Een bestaand manifest wordt nooit overschreven; er is geen force-optie.
Gebruik deze opdracht niet om een afgekeurde ontvangst opnieuw van checksums
te voorzien. Bij een inhoudelijke revisie horen een nieuwe pakketversie,
nieuwe overdrachtsmap en bijpassende reviews. Na een schrijffout kan een
onvolledig nieuw manifest achterblijven; dat is geen geldig ontvangstbewijs.
Pakketmappen, plannen en gegenereerde manifests blijven buiten Git.

## Controle uitvoeren

Gebruik Node 24.17, de geteste ontwikkelversie, vanuit de codecheckout:

```text
npm run content:intake -- <pad-naar-intake.json>
npm run content:intake -- <pad-naar-intake.json> --expect-sha256 <extern-bewaarde-manifesthash>
```

De eerste opdracht vergelijkt bestanden met de opgegeven checksums. De tweede
controleert ook een eerder, buiten het pakket vastgelegde manifesthash. Bereken
een vertrouwde hash niet opnieuw uit een gewijzigde ontvangst om die alsnog
te laten slagen. Een hash bewijst integriteit, niet wie het pakket heeft gemaakt
of of een reviewer werkelijk onafhankelijk heeft gelezen.

De uitkomst is `FILES_VERIFIED_REVIEW_REQUIRED` of een fout met `HOLD` en een
niet-nul afsluitcode. `publishable`, `contentValidated` en `reviewValidated`
blijven altijd `false`. De controle voert geen scripts, opdrachten uit een
manifest, netwerkverzoeken of imports van aangeleverde code uit.

## HOLD herstellen

De twee opdrachten houden hun bestaande uitvoercontract: bij succes JSON op
stdout met afsluitcode `0`; bij een fout JSON op stderr met `status: "HOLD"`,
`publishable: false`, de bestaande `error`-tekst en afsluitcode `1`. Bij een
ongeldige object-/veldstructuur of een ontbrekend gedeclareerd pakketbestand
komt daar een optioneel `diagnostic`-object bij. Andere fouten houden hun
bestaande uitvoer. Automatische afnemers moeten onbekende extra velden kunnen
negeren; de manifeststructuur en succesuitvoer veranderen niet.

| `diagnostic.code` | Betekenis en herstel |
| --- | --- |
| `INTAKE_FIELDS` | `location` wijst het object aan; `missingFields` noemt ontbrekende velden en `expectedFields` de volledige toegestane set. `unexpectedFieldCount` telt extra velden zonder hun vrije tekst te herhalen. Corrigeer een voorbereidingsplan volgens het bestaande contract; vraag bij een ontvangen manifest een gecorrigeerde overdracht aan de afzender. |
| `INTAKE_OBJECT` | Op `location` is een object vereist, bijvoorbeeld bij `null` of een lijst. `expectedFields` toont de vereiste velden. Vul gegevens uit het echte pakket in; maak geen leeg bewijsobject om door de controle te komen. |
| `INTAKE_FILE_MISSING` | Het bij `file.id` en `file.path` gedeclareerde bestand ontbreekt, of een bovenliggende pakketmap ontbreekt. Lever het oorspronkelijke bestand op die relatieve locatie aan. Bij voorbereiding kan ook een verkeerd planpad worden gecorrigeerd; wijzig bij ontvangst het manifest of de checksums niet. |

`location: "files[1]"` betekent het tweede bestandsrecord; `$` is het
hoofdobject. `action` beschrijft de herstelstap en `nextCommand` geeft een
opdrachtsjabloon voor **na** dat herstel. Vervang de voorbeeldpaden en hash
zelf; deze tekst voert niets uit. Een expliciet gekozen `--historical-report`
blijft in het sjabloon staan, inclusief de verplichte afzonderlijk bewaarde hash.
Ontbreekt dat bewijs, dan blijft de historische ontvangst geblokkeerd.

Voorbeeld: ontbreekt `roles` in het tweede record van `plan.json`, dan noemt de
diagnose `files[1]` en `missingFields: ["roles"]`. Leg daar de rollen vast die
het werkelijke bestand vervult en probeer de bestaande voorbereiding opnieuw:

```text
npm run content:prepare -- work/content-inbox/voorbeeld/1/plan.json --output work/content-inbox/voorbeeld/1/intake.json
```

Voorbeeld: ontbreekt een reviewbestand bij ontvangst, haal dan de ongewijzigde
oorspronkelijke kopie op bij de afzender en controleer dezelfde ontvangst opnieuw:

```text
npm run content:intake -- work/content-inbox/voorbeeld/1/intake.json --expect-sha256 <afzonderlijk-bewaarde-manifesthash>
```

Een afwijkende hash blijft HOLD. Verwijder geen vereiste bewijsstukken en maak
geen nieuwe checksums om een afgekeurde ontvangst te laten slagen. Bij een echte
inhoudelijke revisie horen een nieuwe pakketversie, map en bijpassende reviews;
bewaar het oorspronkelijke pakket. Ook na geslaagde ontvangst volgen de
[bestaande soortspecifieke reviews en publicatiestappen](#naar-een-kandidaatpublicatie).

## Het manifest

Maak een nieuwe overdrachtsmap met het manifest en ongewijzigde kopieën van de
oorspronkelijke bestanden in een ondermap, bijvoorbeeld `payload/`. Voeg het
manifest niet toe aan een reeds bevroren analysepakket. Oude absolute paden in
reviewbestanden worden niet herschreven; daarvoor blijft een expliciete
padmapping en verificatie met de oorspronkelijke gate nodig.

Het JSON-object heeft precies vijf velden:

| Veld | Waarde |
| --- | --- |
| `format` | `omnibus-intake` |
| `schemaVersion` | `1` |
| `package` | Object met stabiel `id`, `kind`, `version` en leesbare `title` |
| `contract` | Een van de drie onderstaande contractidentiteiten |
| `files` | Lijst met de daadwerkelijk aanwezige bestanden |

Ieder bestand heeft precies `id`, `path`, `sha256`, `bytes` en `roles`.
`path` is relatief aan de manifestmap en gebruikt `/`; bijvoorbeeld
`payload/APP-FINAL.json`. `sha256` is de kleine-letter SHA256 van de oorspronkelijke
bestandsbytes; `bytes` is de werkelijke bestandsgrootte, niet het aantal tekens.
`roles` is een niet-lege lijst. Eén bestaand bestand mag meerdere rollen vervullen:
bronbeperkingen en context hoeven geen nieuwe bestanden te worden als ze al in
het bevroren pakket staan.

Pakket-ID, versie en bestands-ID beginnen met een letter of cijfer en bevatten
maximaal 96 letters, cijfers, punten, streepjes of underscores. Het pakket-ID
blijft gelijk bij een inhoudelijke revisie; de versie verandert. Deze lokale
controle houdt nog geen register bij dat dubbele pakketversies wereldwijd weigert.

## Bestaande contracten behouden

| `kind` | `contract` | Aanvullende verplichte bestandsrollen |
| --- | --- | --- |
| `report` | `report-kit-1.1` | `source-bank`, `viewer-content`, `catalogue`, `source-links`, `context`, `receipt` |
| `framework` | `framework-cio-0.1+addendum-01` | `source-bank`, `catalogue`, `source-links`, `context`, `migration` |
| `model` | `model-review-1` | `viewer-content`, `context` |

Alle drie vereisen bovendien `contract`, `source`, `source-text`, `limitations`,
`review-basis` en `review`. Overige afhankelijkheden krijgen de rol `supporting`.
Neem alle bestanden mee die de oorspronkelijke gate nodig heeft, inclusief
externe ontvangstbewijzen en vrijgaveankers. Het manifest vervangt geen gate.

Voor rapporten verwijzen de rollen naar de bestaande bestanden uit
`single-report-kit-v1.1`: bijvoorbeeld `APP-FINAL.json`, `CATALOGUE.json`,
`RECONCILED-SOURCE.json`, `APP-SOURCE-LINKS.json`, reviewbasis en ontvangstbewijs.
Voor kaders blijven bronrecord-, catalogus-, migratie- en reviewcontracten uit
het CIO-contract en addendum leidend. Een model gebruikt zijn oorspronkelijke
modelpayload, bronnen, vraagkwaliteitsrubriek en versiegebonden modelreviews.
Verzamel ontbrekende stukken eerst; hernoem geen andersoortig pakket om een
ondersteunde contractidentiteit te kunnen gebruiken.

De controle verifieert dat de opgegeven rollen aanwezig zijn, niet dat de
bestandsinhoud die rollen waarmaakt. Een tekst met “APPROVE” of een PDF met een
`review`-label levert dus geen inhoudelijke vrijgave op. Bronspans,
vraagkoppelingen, selectiestatus en volledige reviewdekking worden daarna met de
bestaande soortspecifieke controles en onafhankelijke beoordeling geverifieerd.

## Grenzen en vervolgstap

De controle weigert dubbele IDs en paden, padtraversal, links/junctions binnen
het pakket, Windows-onbruikbare bestandsnamen, gewijzigde bestanden en
ontbrekende rollen. Limieten: 1 MiB manifest, 256 bestanden, 256 MiB per bestand
en 512 MiB totaal. Pas zulke grenzen alleen bewust in code en tests aan;
een manifest kan ze niet uitschakelen. Lees alleen uit een stilstaande pakketmap
waar anderen tijdens de controle geen schrijfrechten op hebben. Deze lokale
controle is geen beveiligde uploadservice voor internetgebruik.

Een historisch archief kan meer bestanden bevatten dan deze grens toestaat.
De foutmelding noemt het werkelijke en toegestane aantal. Dit is een HOLD voor
de overdracht, geen inhoudelijke afkeuring van de bron. Verwijder geen bestanden
die door de oorspronkelijke reviewbasis of gate worden vereist om onder de
limiet te komen. Splits een bevroren reviewdossier niet in losse pakketten die
ieder ten onrechte volledig lijken. Behoud alle oorspronkelijke bewijsrelaties.

### Volledige historische rapportarchieven

Voor een bestaand, bevroren rapportarchief kan de lokale beheerder expliciet
`--historical-report` kiezen. Dit profiel staat maximaal 1.024 bestanden toe;
de grenzen van 1 MiB manifest, 256 MiB per bestand en 512 MiB totaal blijven
gelijk. Alle bestaande controles op rollen, paden, links, bytes en checksums
blijven gelden. Het profiel werkt uitsluitend voor `report`, is geen veld in
het aangeleverde manifest en wordt nooit automatisch gekozen. Het is geen
internet-uploadfunctie of manier om inhoudelijke HOLD-status te omzeilen.

Controleer eerst het oorspronkelijke archiefmanifest, reviewbewijs en externe
kitafhankelijkheden tegen de eerder vastgelegde hashes. Kopieer alle vereiste
bestanden ongewijzigd naar een nieuwe inboxmap. Neem ook het oorspronkelijke
manifest en externe vrijgavebewijzen op. Leg verplaatste absolute paden apart
vast; herschrijf de bevroren bestanden niet. Laat de oorspronkelijke gate en
bewijsrelaties leidend blijven bij de volledigheidscontrole.

```text
npm run content:prepare -- <overdrachtsmap>/plan.json --output <overdrachtsmap>/intake.json --historical-report
npm run content:intake -- <overdrachtsmap>/intake.json --expect-sha256 <afzonderlijk-bewaarde-manifesthash> --historical-report
```

Bewaar de nieuwe transporthash buiten het pakket voordat de ontvangst wordt
geverifieerd; de ontvanger gebruikt die afzonderlijk aangeleverde hash. De
historische controle weigert een ontbrekende of afwijkende hash. Die nieuwe
hash vervangt nooit de oorspronkelijke review- of archiefhashes. De uitkomst
vermeldt `profile: historical-report`; `publishable`, `contentValidated` en
`reviewValidated` blijven `false`. Dit profiel bewijst niet dat een pakket
historisch of inhoudelijk goedgekeurd is; die beoordeling blijft bij de integrator.

### Naar een kandidaatpublicatie

Er is nog geen knop of generieke pakketimport voor databasepublicatie. Na de
aanlevercontrole volgen bronsoortspecifieke review en integratie in de vertrouwde
privé-verwerkingsomgeving. De bestaande `data:publish-runtime`-opdracht draagt
daarna een expliciet gekozen, goedgekeurde bronrelease over naar een nieuwe
runtime-database; zie [de publicatiestappen](../README.md#inhoud-opnieuw-publiceren).

Controleer die afzonderlijke database met `data:check-runtime`, bouw ertegen en
voer de integratieproef met bronmarkering, selectie, vraaglinks, projectherstel
en exports uit voordat je de nieuwe publicatie in gebruik neemt. De ontvangst-
en databasecontroles vervangen de inhoudelijke review niet. De actieve database
blijft staan zolang de nieuwe release niet expliciet is gekozen.
