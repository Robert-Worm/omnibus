# De schermen (`app/`)

> **In het kort:** hier staat alles wat je in de browser ziet: de vier werkstappen, de bronviewers en de exportschermen.

## Belangrijkste bestanden

| Bestand | Wat het doet |
| --- | --- |
| `framework-editor.tsx` | De hoofdwerkstroom: navigatie, de vier stappen en de projectstatus |
| `workflow-patterns.tsx` | Gedeelde introducties en keuzekaarten |
| `law-point-source.tsx`, `criterion-source-layout.tsx` | De gedeelde bronviewers voor wetten, kaders en rapporten |
| `database-report-library.tsx` | De rapportbibliotheek |
| `export-creator.tsx` | De exportstap; het Excel-bestand zelf wordt gemaakt in [`lib/`](../lib/README.md) |
| `viewer-readability.css` | Opmaak en typografie van de viewers |

## Wanneer heb je dit nodig?

Als je iets aan een scherm wilt veranderen of verbeteren.

## Spelregels

- Hergebruik de bestaande viewers en opmaak; maak geen nieuwe weergave per bron.
- Inhoud komt uit de database. Zet geen rapporten of kaders in de code.
- Selecties, vraagkoppelingen en opgeslagen projecten moeten blijven werken.

## Verder lezen

[Architectuur](../docs/bijdragen/architectuur.md) · [Ontwikkelen](../docs/bijdragen/ontwikkelen.md) · [AGENTS.md](../AGENTS.md)

---

[↑ Omnibus](../README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
