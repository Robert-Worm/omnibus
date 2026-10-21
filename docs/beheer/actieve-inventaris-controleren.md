# Actieve inventaris controleren

<!-- paginatype: taak -->

> **In het kort:** een extra controle bij een nieuwe database. Bevat hij precies de goedgekeurde pakketten en documenten? En komt er niets terug dat eerder is verwijderd?

Bij een nieuwe publicatie wil je voorkomen dat eerder verwijderde pakketten of documenten ongemerkt terugkomen. Deze optionele beheercontrole vergelijkt de gekozen publicatie met een vooraf beoordeelde inventaris. Zij verandert niets aan de database en start geen upload of activatie.

## Gebruik

1. Controleer de kandidaat met de bestaande [publicatieroute](database-publiceren.md).
2. Beoordeel welke pakket- en documentversies erin horen. Gebruik de bestaande `publicationInventory`-structuur: `packages` met `kind`, `id`, `version` en `documents` met `id`, `version`. Beide lijsten zijn verplicht. Een versie is de volledige SHA-256-inhoudsidentiteit, niet een versienummer of jokerteken.
3. Bewaar de goedgekeurde inventaris als privébestand, buiten Git en de webroot. Neem de kandidaatuitvoer niet zonder review over als goedkeuring.
4. Voer de vergelijking uit met expliciete bestanden:

```text
npm run data:check-active-inventory -- --approved work/approvals/active-inventory.json --candidate work/candidate/local-build.json
```

Het kandidaatinstellingenbestand bevat `database`, `release` en `publication`. Het databasepad is relatief aan dat instellingenbestand.

`ACTIVE_INVENTORY_MATCH` en afsluitcode 0 betekenen dat de inventarissen gelijk zijn. Toevoegingen, verwijderingen en versieverschillen leveren `HOLD` en afsluitcode 1; ongeldige invoer of beschadigde runtime-inhoud blokkeert ook. Dubbele identiteiten zijn niet toegestaan.

Een nieuw goedgekeurd rapport blijft mogelijk: neem zijn pakketversie én alle bijbehorende documentversies bewust op in de beoordeelde inventaris. De controle heeft geen vaste rapportlijst of maximumaantal.

## Wat dit niet bewijst

De vergelijking controleert pakket- en documentlidmaatschap in de gekozen release, niet alle opgeslagen bytes of andere releases in het SQLite-bestand. Runtime-modules, resources en artefacten vragen daarnaast de bestaande volledige publicatievergelijking. De controle verwijdert geen historische gegevens.

Een match bewijst niet wie de inventaris heeft goedgekeurd, maakt HOLD-inhoud niet goedgekeurd en verleent geen verspreidingsrechten. Behoud de inhoudelijke review en de bewuste activatiestap. Invoer en uitvoer blijven privé.

## Samengevat

- Leg vooraf vast welke pakketten en documenten in de nieuwe database horen.
- Vergelijk de kandidaat daarmee; alles wat afwijkt, verklaar je eerst.
- De controle wijzigt niets en keurt niets goed.

## Volgende stap

Terug naar [database publiceren](database-publiceren.md).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
