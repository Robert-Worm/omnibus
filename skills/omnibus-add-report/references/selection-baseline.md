# Selectie en bestaande collectie vastleggen

Gebruik `freeze-baseline` na [bronvoorbereiding](source-preparation.md), vóór
een lezer begint. De coördinator legt de werkelijk gecontroleerde bronkeuze en
de bestaande collectie vast. Het hulpmiddel kiest of classificeert geen rapport
en leest of wijzigt geen database.

## Invoer voorbereiden

Vraag de eigenaar om exacte, actuele momentopnamen van het rapportregister,
de datarelease en de taxonomie. Bewaar deze privé onder `baseline/` in de
pakketmap, met hun afzonderlijk vastgelegde SHA-256-checksums. Gebruik het
volledige register, niet alleen een selectie van rapporten. Ook een werkelijk
lege collectie moet als zodanig zijn gecontroleerd; maak geen lege vervanger.

Het register heeft de bestaande vorm `corpus[].framework.report.id` en
`corpus[].framework.lines`. De vaste naam eindigt op
`/viewer/app/reviewed-reports.json`, zoals de bestaande toelatingscontrole verwacht.
Extra baselinebestanden mogen worden opgenomen. Taxonomiecode wordt uitsluitend
als bestand gehasht en nooit uitgevoerd.

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
  "taxonomy_path": "baseline/taxonomy.mjs",
  "files": {
    "baseline/viewer/app/reviewed-reports.json": "<registerhash>",
    "baseline/data-release.json": "<datareleasehash>",
    "baseline/taxonomy.mjs": "<taxonomiehash>"
  }
}
```

Bewaar de hash van dit plan buiten de pakketmap. Geef de baseline en selectie
niet aan de blinde bronlezers. De bestaande methodebegrenzing blijft gelden:
één rapport, `gpt-6-astra`, geen betaalde extra's of automatische vervolgextractie.
Dit hulpmiddel geeft daarvoor geen nieuwe toestemming.

## Vastleggen en verdergaan

De [onafhankelijk beoordeelde hulpmiddelenrelease](stage-receipts.md) moet ook
`scripts/baseline-registry-counts.mjs` bevatten. Voer vanuit de skillmap uit:

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

Dit is een bevriezing van aangeleverde momentopnamen. Het script kan niet bewijzen
dat de eigenaar de juiste actieve collectie heeft aangeleverd, of dat de actieve
database daarna ongewijzigd blijft. De bestaande actuele publicatie- en
toelatingscontroles blijven nodig. Export van baselinegegevens uit een database,
het praktische taxonomieoverzicht, reviewbasis en eindvrijgave worden hiermee
niet uitgevoerd. Bewaar gegenereerde bestanden en oorspronkelijke gegevens privé.
