# Gedeelde logica (`lib/`)

> **In het kort:** de regels die de browser en de AI-koppeling delen: bronnen laden, selecties, onderzoeksvragen, projectbestanden en Excel-export.

## Belangrijkste bestanden

| Bestand | Wat het doet |
| --- | --- |
| `catalogue-runtime.mjs`, `database-source-client.mjs` | Brongegevens laden wanneer ze nodig zijn |
| `framework-model.mjs`, `research-plan.mjs` | Selecties en de koppeling met onderzoeksvragen |
| `project-session.mjs`, `project-codec.mjs` | Projecten bewaren in de browser en als bestand |
| `excel-export.mjs`, `export-profiles.mjs` | De Excel-werkboeken en de drie werkvormen |
| `content-adapters/` | Zet brongegevens om naar het gedeelde formaat van de viewers |

## Wanneer heb je dit nodig?

Als je iets verandert aan hoe selecties, vragen, projecten of exports werken.

## Spelregels

- Logica hoort hier; broninhoud niet.
- Sommige modules werken alleen binnen de build met een database, niet als los Node-programma.
- Tests staan naast de modules en gebruiken fictieve data.

## Verder lezen

[Architectuur](../docs/bijdragen/architectuur.md) · [Ontwikkelen](../docs/bijdragen/ontwikkelen.md)

---

[↑ Omnibus](../README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
