# Onderwerpen publiceren

<!-- paginatype: taak -->

> **In het kort:** de indeling van een familie in onderwerpen en de vraagplannen per onderwerp staan in één
> onderwerppakket buiten Git. Je controleert het pakket tegen een database, laat de plannen beoordelen en zet het met
> `npm run content:topics` in een kopie van die database. De app leest de onderwerpen uit de database; de code verandert
> er niet voor.

## Wat heb je nodig?

- Een database met de bronnen van de familie, met haar `local-build.json`.
- Een onderwerppakket (`format: omnibus-topic-package`). De vorm staat in
  [de onderwerpmethode](../../skills/omnibus-add-framework/references/topic-method.md).
- Node 24.21 en deze repository.

Bewaar het pakket, de dossiers en de reviews samen buiten Git, bij de reviewdossiers. Het pakket is de bron: met het
pakket en dezelfde database maak je dezelfde publicatie opnieuw.

## Stap voor stap

### 1. Controleer het pakket

```text
npm run content:topics -- --settings <map>/local-build.json --package <pakket.json> --check
```

| Uitkomst | Betekenis |
| --- | --- |
| `CHECKED` | Indeling, dekking, ontwerpen en reviews kloppen |
| `HOLD` | De redenen staan erbij: een norm zonder plek, een regel zonder norm, een vraag die niet door de vormcontrole komt, een review bij een andere versie van het plan |

### 2. Maak dossiers voor de reviewer

```text
npm run content:topics -- --settings <map>/local-build.json --package <pakket.json> --dossiers <nieuwe map>
```

Per plan een dossier met de vragen, de normen met hun tekst en toetspunten, wat verplaatst of los is, en de
`itemHash`. Reviews zijn hier nog niet nodig. De reviewer geeft per vraag een besluit; alleen een plan waarvan elke vraag
*behouden* is, gaat door. Het besluit hoort bij de `itemHash`: verandert er iets aan het plan, ook de volgorde van
toetspunten, dan beoordeelt de reviewer het opnieuw.

### 3. Zet het pakket in een nieuwe database

```text
npm run content:topics -- --settings <map>/local-build.json --package <pakket.json> --out <nieuwe map>
```

Het hulpmiddel controleert alles opnieuw, ook de reviews, kopieert de database, zet familie en plannen in de
procescatalogus van een nieuwe publicatie op dezelfde bronrelease, en controleert het resultaat met
`data:check-runtime`. Het schrijft `local-build.json` en `topic-receipt.json`. De invoerdatabase blijft ongewijzigd en
de nieuwe wordt niet automatisch in gebruik genomen.

**Gelukt als:** de opdracht eindigt met `TOPICS_PUBLISHED`.

### 4. Vergelijk, test en breng uit

Vergelijk met `data:compare-runtime` (alleen `lib/process-catalogue.mjs` hoort te veranderen), draai
`npm run check:onderwerpen -- --settings <nieuwe map>/local-build.json`, test in een aparte build (lijst, viewer,
onderwerp als geheel, stap 3) en breng de database uit zoals in [database publiceren](database-publiceren.md).

## Teksten bij een onderwerp

Het tabblad **Over dit onderwerp** haalt zijn teksten uit de familie in het pakket. Ze zijn optioneel; zonder tekst toont
Omnibus de korte omschrijving uit de indeling.

- Per onderwerp: `about` (alinea's: wat het onderwerp regelt en waarom de normen bij elkaar horen) en `notIn`
  (zinnen over wat er niet in zit en waar het wel staat). Per deelonderwerp: `description`.
- Voor de familie: `about.method` (hoe de indeling is gemaakt), `about.choose` (hoe je een andere keuze maakt),
  `about.sourcesIntro`, `about.practiceLaw` en `about.practicePractice`.
- `[[T6]]` in een tekst wordt een link naar dat onderwerp; `**Kies alle toetspunten**` wordt vet (voor knopnamen). Het hulpmiddel weigert een verwijzing naar een onderwerp
  dat niet bestaat.

- `combination`: de centrale vraag voor twee of meer onderwerpen samen. `template` bevat `{onderwerpen}`; `phrases` geeft
  per onderwerp een korte frase die zegt wat je onderzoekt. Omnibus vult in: "A en B", of "A, B en C". `review`
  (`reviewer`, `reviewDate`, `textHash`) hoort bij precies dit kader en deze frasen; anders weigert het hulpmiddel het pakket.

Een nieuwe tekst vraagt geen nieuwe beoordeling van de vraagplannen. Geef het pakket daarvoor een nieuwe `edition` en
laat `planEdition` staan op de editie waarvoor de plannen zijn beoordeeld. Zonder `planEdition` gelden de plannen voor
`edition`, en vraagt een nieuwe editie ook nieuwe reviews.

## Na een nieuwe database

Komt er een nieuwe database met nieuwe of gewijzigde normen, draai dan `check:onderwerpen`. Meldt het een norm zonder
plek, werk dan de indeling in het pakket bij, laat de geraakte plannen opnieuw beoordelen en publiceer het pakket
opnieuw op de nieuwe database.

## Samengevat

- Indeling en vraagplannen zijn inhoud: één pakket buiten Git, geen code.
- `--check` controleert, `--dossiers` maakt het werk voor de reviewer, `--out` maakt een nieuwe database.
- Een plan gaat alleen door met een review die bij precies deze versie hoort en waarin elke vraag behouden is.
- Na elke nieuwe database: `check:onderwerpen`.

## Volgende stap

Breng de nieuwe database uit volgens [database publiceren](database-publiceren.md#een-release-uitbrengen).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
