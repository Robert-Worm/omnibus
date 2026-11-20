# Inhoud corrigeren

<!-- paginatype: taak -->

> **In het kort:** een kleine tekstcorrectie in de inhoud, zoals een Engelse rechtentekst die Nederlands moet worden,
> doe je met een correctiebestand buiten Git. `npm run content:correct` zet de correctie in een kopie van de database.
> Het hulpmiddel weigert als de oude tekst niet precies klopt.

## Wanneer gebruik je dit?

Voor een losse tekst in de gepubliceerde inhoud die niet via een eigen route loopt. Onderwerpen en vraagplannen gaan via [onderwerpen publiceren](onderwerpen-publiceren.md). Nieuwe of herziene bronnen gaan via het bronpakket zelf.

## Stap voor stap

1. Maak een correctiebestand en bewaar het bij de reviewdossiers:

   ```json
   {"format": "omnibus-content-correction", "edition": "20261119.01", "items": [
     {"module": "lib/topical-reviewed.json", "path": ["packages", "0", "status", "publication_rights"],
      "from": "de huidige tekst, precies", "to": "de nieuwe tekst", "reason": "waarom"}]}
   ```

2. Zet de correctie in een nieuwe database:

   ```bash
   npm run content:correct -- --settings <map>/local-build.json --corrections <correcties.json> --out <nieuwe map>
   ```

   De nieuwe map krijgt `catalogue.sqlite`, `local-build.json` en `correction-receipt.json`. De invoerdatabase blijft zoals ze was.

3. Test de nieuwe database in een aparte build en breng haar uit.

Klopt `from` niet met de database, dan stopt het hulpmiddel en verandert er niets. Staat de nieuwe tekst er al, dan slaat het die correctie over. Zo kun je hetzelfde bestand opnieuw toepassen op een nieuwere database.

## Teksten in een bronpakket

Voor de eigen teksten van Omnibus in een beoordeeld bronpakket (normtekst, toetspunt, toepassing, werkingstoets, beheersmaatregel, titel of bronbeschrijving) gebruik je een correctieverzoek en een review. Het pakket zelf en zijn vraagreviews blijven ongewijzigd; de correctie komt als laag in de database ([B-094](besluiten.md#b-094)).

1. Maak een correctieverzoek buiten Git:

   ```json
   {"format": "omnibus-topical-revision-request", "edition": "20261120.03", "summary": "waar het over gaat", "items": [
     {"key": "NOR-1", "sourceId": "<bron>", "collection": "points", "id": "<toetspunt>", "field": "text", "value": "de nieuwe tekst", "reason": "waarom"},
     {"key": "VOL-1", "sourceId": "<bron>", "collection": "points", "id": "<toetspunt>", "field": "scope", "replace": [["oude woorden", "nieuwe woorden"]], "reason": "waarom"}]}
   ```

   Velden: bij `points` onder meer `text`, `scope`, `conditions.0`, `phase_plans.werking` en `source_links[<record>].contribution`; bij `criteria` `title` en `text`; bij `objectives` ook `control_measure`; bij `context` onder meer `title` en `applicability`. Bronpassages (citaten) kun je zo niet wijzigen.
2. Laat het verzoek onafhankelijk beoordelen. De review noemt het controlegetal van precies dit verzoek en per correctie een besluit:

   ```json
   {"format": "omnibus-topical-revision-review", "requestSha256": "<sha256 van het verzoek>", "reviewer": "wie", "date": "2026-11-20",
    "decisions": [{"key": "NOR-1", "decision": "ACCEPT", "note": "waarom"}]}
   ```

3. Controleer en zet de correcties in een nieuwe database:

   ```bash
   npm run content:revise -- --settings <map>/local-build.json --request <verzoek.json> --review <review.json> --check
   npm run content:revise -- --settings <map>/local-build.json --request <verzoek.json> --review <review.json> --out <nieuwe map>
   ```

Bij `--out` verpakt het hulpmiddel de kaders ook opnieuw voor de browser ([B-095](besluiten.md#b-095)). Alleen herverpakken, zonder correcties, kan met `npm run content:revise -- --settings <map>/local-build.json --pack --out <nieuwe map>`.

Het hulpmiddel weigert als een correctie niet op de huidige tekst past, als de review bij een andere versie van het verzoek hoort of als een correctie niet is aanvaard. Het rekent per gewijzigd toetspunt de beoordeelde overgang uit. De nieuwe map krijgt `catalogue.sqlite`, `local-build.json` en `revision-receipt.json`.

## Samengevat

- Een losse tekst in de publicatie: `content:correct` met een correctiebestand.
- Een eigen tekst in een bronpakket: `content:revise` met een correctieverzoek en een onafhankelijke review.
- Beide maken een nieuwe database; de invoer blijft zoals ze was. Bronpassages veranderen nooit.

## Volgende stap

Breng de nieuwe database uit volgens [database publiceren](database-publiceren.md#een-release-uitbrengen).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
