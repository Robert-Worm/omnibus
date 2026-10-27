# Selectie en bestaande collectie vastleggen

Gebruik `freeze-baseline` na [bronvoorbereiding](source-preparation.md), vóór
een lezer begint. De coördinator legt de werkelijk gecontroleerde bronkeuze en
de bestaande collectie vast. Het hulpmiddel kiest of classificeert geen rapport
en leest of wijzigt geen database. De eigenaar kan de benodigde momentopnamen
vooraf vanuit een Omnibus-codecheckout aanleveren.

## Eigenaar: baseline aanleveren

Gebruik de codeversie die bij de collectie hoort en een instellingenbestand met
de expliciete `database`, `release` en `publication`, zoals bij de bestaande
lokale databasebouw. Maak een eigen, niet gedeelde pakketmap en kies daarbinnen
een **nieuwe** submap `baseline`. Voer vanuit de Omnibus-codecheckout uit:

```text
node content-tools/export-report-baseline.mjs --settings <local-build.json> --out <pakketmap>/baseline
```

De export opent de database alleen-lezen en gebruikt de bestaande integriteits-,
bron- en publicatiecontroles. Het register combineert alle drie rapportmodules,
inclusief later geladen delen, en laat dezelfde ingetrokken rapporten weg als de
app. De taxonomie volgt de actieve proceslijst en behoudt alle definities en
overige velden. Het is een afgeleid overzicht; de database blijft ongewijzigd.

**Gelukt als:** `BASELINE_DELIVERED_NOT_APPROVED` verschijnt. De uitvoer bevat het
volledige register, `data-release.json`, `taxonomy.json` en als laatste
`BASELINE-DELIVERY.json`. Dit bewijs noemt de gebruikte release/publicatie,
aantallen, bestandschecksums en de herkomst van het overzicht. Bewaar de
teruggegeven `receipt.sha256` afzonderlijk en geef die samen met de map aan de
coördinator. Geef geen database of privébronbestanden aan de blinde bronlezers.

Een bestaande doelmap wordt geweigerd. Bewaar bij een onderbreking de gedeeltelijke
uitvoer voor onderzoek; gebruik een nieuwe pakketmap voor een herhaling. Er wordt
geen bronkeuze, lezing, review of vrijgave aangemaakt.

## Invoer voorbereiden

Vraag de eigenaar om exacte, actuele momentopnamen van het rapportregister,
de datarelease en de taxonomie. Bewaar deze privé onder `baseline/` in de
pakketmap, met hun afzonderlijk vastgelegde SHA-256-checksums. Gebruik het
volledige register, niet alleen een selectie van rapporten. Ook een werkelijk
lege collectie moet als zodanig zijn gecontroleerd; maak geen lege vervanger.

Het register heeft de bestaande vorm `corpus[].framework.report.id` en
`corpus[].framework.lines`. De vaste naam eindigt op
`/viewer/app/reviewed-reports.json`, zoals de bestaande toelatingscontrole verwacht.
Extra baselinebestanden mogen worden opgenomen. Controleer bij een aangeleverde
export eerst de afzonderlijk ontvangen hash van `BASELINE-DELIVERY.json` en de
drie bestandshashes daarin. Neem die paden en hashes over in het plan hieronder
en voeg het aanleverbewijs zelf aan `files` toe. Voor het praktische overzicht
is `taxonomy.json` vereist, met een niet-lege `processes`-lijst van unieke
proces-ID's en titels. Alle andere definitievelden blijven behouden.
Taxonomiecode wordt nooit uitgevoerd.

Schrijf een privé `selection-plan.json` met de werkelijke waarden. Dit is alleen
een vormvoorbeeld; tekst tussen `<...>` is geen bewijs:

```json
{
  "report_id": "<nieuw-rapport-id>",
  "candidate": "<kandidaat-id>",
  "model": "gpt-6-astra",
  "source_pdf_sha256": "<afzonderlijk-gecontroleerde-pdf-hash>",
  "selection": {
    "classification_evidence": "<waarop de bronclassificatie berust>",
    "verified_by": "<wie dit werkelijk heeft gecontroleerd>"
  },
  "baseline_observation": "<hoe is vastgesteld welke collectie nu actief is>",
  "registry_path": "baseline/viewer/app/reviewed-reports.json",
  "release_path": "baseline/data-release.json",
  "taxonomy_path": "baseline/taxonomy.json",
  "files": {
    "baseline/viewer/app/reviewed-reports.json": "<registerhash>",
    "baseline/data-release.json": "<datareleasehash>",
    "baseline/taxonomy.json": "<taxonomiehash>",
    "baseline/BASELINE-DELIVERY.json": "<afzonderlijk-ontvangen-aanleverhash>"
  }
}
```

Bewaar de hash van dit plan buiten de pakketmap. Geef de baseline en selectie
niet aan de blinde bronlezers. De bestaande methodebegrenzing blijft gelden:
één rapport, `gpt-6-astra`, geen betaalde extra's of automatische vervolgextractie.
Dit hulpmiddel geeft daarvoor geen nieuwe toestemming.

## Vastleggen en verdergaan

De [onafhankelijk beoordeelde hulpmiddelenrelease](stage-receipts.md) moet ook
`scripts/baseline-registry-counts.mjs` en `scripts/taxonomy-snapshot.mjs` bevatten.
Voer vanuit de skillmap uit:

```text
node scripts/stage-receipts.mjs freeze-baseline --packet <pakketmap> --plan selection-plan.json --plan-sha256 <bewaarde-planhash> --coordinator <werkelijke-identiteit> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <bewaarde-invoerhash>
```

**Gelukt als:** `SELECTION_AND_BASELINE_FROZEN_NOT_APPROVED` verschijnt. De hulp
schrijft `SELECTION.json`, `PILOT-CONTROL.json` en als laatste `BASELINE-FREEZE.json`.
Die baseline bevat de berekende aantallen rapporten en bouwstenen, alle oorspronkelijke
checksums, de selectie en de begrenzing van het werk. De bestanden met de
momentopnamen blijven ongewijzigd. Een reeds actief rapport wordt geweigerd.

Bewaar `receipt.sha256` buiten het pakket. Geef die bij iedere volgende
faseopdracht en bij `freeze-first` mee als
`--baseline-freeze-sha256 <bewaarde-baselinehash>`. De startbewijzen binden deze
baseline; veranderde bestanden kunnen niet stilzwijgend worden overgenomen.
De drie goedkeuringsvelden in de uitvoer blijven `false`.

Bij een fout of onderbreking: bewaar de aanwezige bestanden, onderzoek de oorzaak
en gebruik zo nodig een nieuwe pakketversie. Bestaande selecties/baselines worden
niet overschreven en worden niet achteraf bij al begonnen lezingen aangemaakt.

## Praktische taxonomie klaarzetten

Voer vóór praktische uitwerking vanuit de skillmap uit:

```text
node scripts/stage-receipts.mjs snapshot-taxonomy --packet <pakketmap> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <bewaarde-invoerhash> --baseline-freeze-sha256 <bewaarde-baselinehash>
```

**Gelukt als:** `TAXONOMY_SNAPSHOT_NOT_APPROVED` verschijnt. Bewaar de teruggegeven
ontvangsthash. `TAXONOMY-SNAPSHOT.json` bevat dezelfde definities, vindbaar per
proces-ID, met het bronpad en de exacte bestandshash. De praktische auteur en
reviewers gebruiken deze versie. Ze beoordelen zelf welke processen passen bij
elk bouwblok; het hulpmiddel maakt geen koppelingen en beoordeelt geen inhoud.

De praktische fases vereisen dit overzicht en binden het aan hun startbewijs.
Ontbrekende of gewijzigde definities blokkeren het vervolg. Het overzicht kan
niet worden overschreven of pas na begonnen praktische uitwerking worden gemaakt.
De eerste bronlezingen blijven blind voor deze taxonomie.

Dit is een bevriezing van aangeleverde momentopnamen. Het script kan niet bewijzen
dat de eigenaar de juiste actieve collectie heeft aangeleverd, of dat de actieve
database daarna ongewijzigd blijft. De bestaande actuele publicatie- en
toelatingscontroles blijven nodig. Leg na de herstelronde de
[reviewbasis](review-basis.md) vast. Deze voorbereiding geeft geen eindvrijgave.
Bewaar gegenereerde bestanden en oorspronkelijke gegevens privé.
