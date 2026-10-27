# Fasebewijzen vastleggen

De coördinator gebruikt [stage-receipts.mjs](../scripts/stage-receipts.mjs) om
de ontvangen bestanden aan een werkelijk uitgevoerde fase te verbinden. Node.js
24.21 of nieuwer volstaat; een Omnibus-installatie of database is niet nodig.
De [acht fases](../scripts/report-stages.mjs) delen hun bestandscontract met de
bestaande Omnibus-broncontrole.

## Voorwaarden

- Gebruik een eigen pakketmap van de coördinator. Geef lezers en reviewers alleen
  hun toegestane invoer in afzonderlijke werkmappen; laat hen deze map niet wijzigen.
- Het pakket heeft een `RELEASE-BINDING.json` met `kit_manifest_path`,
  `kit_manifest_sha256`, `kit_approval_path` en `kit_approval_sha256`.
  Paden zijn relatief aan het pakket, zonder symlinks of verwijzingen erbuiten.
- Het manifest noemt de auteur (`author_agent`) en checksums (`files`) van de
  daadwerkelijk gebruikte hulpmiddelen. Daaronder moeten
  `scripts/stage-receipts.mjs` en `scripts/report-stages.mjs` staan. Die bestanden
  moeten identiek zijn aan de uitgevoerde scripts.
- Voor invoer van [prepare-source.py](source-preparation.md) geef je ook de buiten
  het pakket bewaarde `--input-freeze-sha256` mee. Het manifest omvat dan ook
  `scripts/prepare-source.py` en de vijf gebruikte instructies onder
  `references/report-kit/`. Die moeten overeenkomen met de vastgelegde voorbereiding.
- Een afzonderlijke reviewer heeft die exacte release beoordeeld. Het
  goedkeuringsbestand bevat `decision: APPROVE`, `reviewer_agent` en
  `target_manifest_sha256`. De coördinator bewaart de checksums van manifest en
  goedkeuring buiten het pakket en geeft die mee aan elke opdracht.
- Na [selectie en baseline vastleggen](selection-baseline.md) is bij iedere
  volgende opdracht ook `--baseline-freeze-sha256 <bewaarde-baselinehash>` vereist.
  De release bevat dan `scripts/baseline-registry-counts.mjs`. Voor het praktische
  taxonomieoverzicht bevat ze ook `scripts/taxonomy-snapshot.mjs`. De baseline,
  selectie en oorspronkelijke momentopnamen blijven aan de fasebewijzen gebonden.
- Maak vóór praktische uitwerking het [taxonomieoverzicht](selection-baseline.md#praktische-taxonomie-klaarzetten).
  De praktische fases gebruiken precies die bevroren definities.

**Deze skill levert geen ingevulde releasegoedkeuring mee.** Het hulpmiddel maakt
die ook niet zelf. Ontbreekt deze controle, dan stopt het. Reviewbasis en definitieve
eindcontrole zijn nog niet zelfstandig meegeleverd. Dit hulpmiddel vervangt die
stappen niet en past geen historische pakketten aan.

## Per fase

Voer de opdrachten uit vanuit de geïnstalleerde skillmap. Vervang de waarden
tussen `<...>` door de werkelijk vastgelegde waarden. `source_a` is een voorbeeld;
gebruik voor de andere rollen hun naam uit het fasecontract.

1. Leg de start vast **vóór** het lees- of reviewwerk:

   ```text
   node scripts/stage-receipts.mjs start --packet <pakketmap> --stage source_a --actor <gespreksidentiteit> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <bewaarde-invoerhash> --baseline-freeze-sha256 <bewaarde-baselinehash>
   ```

   Bewaar de teruggegeven `receipt.sha256` buiten het pakket. De vaste invoer,
   releasebinding en ontvangstbewijzen van voorafgaande fases liggen nu vast.

2. Laat de juiste onafhankelijke rol het werk werkelijk uitvoeren. Neem de
   ontvangen bestanden ongewijzigd over op hun vaste plek. Rond daarna af:

   ```text
   node scripts/stage-receipts.mjs finish --packet <pakketmap> --stage source_a --start-sha256 <bewaarde-starthash> --observation "<waargenomen uitvoering en herkomst van de overdracht>" --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <bewaarde-invoerhash> --baseline-freeze-sha256 <bewaarde-baselinehash>
   ```

   Bewaar ook deze eindhash buiten het pakket. Zonder uitvoer, waarneming of juiste
   starthash kan de fase niet worden afgerond. Gewijzigde invoer of afhankelijkheden
   blokkeren de afronding.

3. Controleer bij ontvangst opnieuw met de afzonderlijk bewaarde eindhash:

   ```text
   node scripts/stage-receipts.mjs check --packet <pakketmap> --stage source_a --end-sha256 <bewaarde-eindhash> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <bewaarde-invoerhash> --baseline-freeze-sha256 <bewaarde-baselinehash>
   ```

**Gelukt als:** de fase levert `STAGE_RECORDED_NOT_APPROVED` op, met
`publishable`, `contentValidated` en `reviewValidated` op `false`. Dat bevestigt
bestandsintegriteit en vastgelegde samenhang, niet dat iemand werkelijk alles
heeft gelezen of inhoudelijk goedgekeurd. De coördinator moet die uitvoering
waarnemen; de bestaande onafhankelijke reviews en broncontroles blijven nodig.

De uitvoer staat in `stage-receipts/` en `STAGE-INDEX.json`. Ontvangstbewijzen en
oude indexversies worden nooit overschreven. Bewaar ze privé bij het pakket.
Voor een herhaalde of onderbroken fase bewaart de coördinator het origineel en
bereidt een nieuwe pakketversie voor; dit hulpmiddel hervat of reconstrueert geen
oude uitvoering. Een achtergebleven `.stage-receipts.lock` wordt niet automatisch
overgenomen. Leg na beide blinde lezingen [de eerste inzendingen vast](first-submissions.md)
voordat de vergelijking begint. Gebruik bij overdracht het [pakketoverzicht](report-package.md).
