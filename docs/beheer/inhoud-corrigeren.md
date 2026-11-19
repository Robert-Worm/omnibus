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

## Volgende stap

Breng de nieuwe database uit volgens [database publiceren](database-publiceren.md#een-release-uitbrengen).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
