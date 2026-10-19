# Applicatieschermen

Deze map bevat de browserapplicatie: een thema verkennen, bouwstenen verzamelen, een onderzoekskader opbouwen en het resultaat exporteren.

## Begin hier

- `framework-editor.tsx` verbindt de hoofdwerkstroom, de navigatie en de projectstatus.
- `workflow-patterns.tsx` levert de gedeelde introducties en keuzepanelen.
- `law-point-source.tsx` en `criterion-source-layout.tsx` leveren de gedeelde bronviewers.
- `export-creator.tsx` toont de exportkeuzes; het werkboek zelf wordt gemaakt in `../lib/`.
- `viewer-readability.css` houdt opmaak en typografie van de viewers consistent.

## Grenzen

Broninhoud komt uit de apart voorbereide database. Bouw geen rapporten in en maak geen nieuwe viewerstijl per bron. Houd selecties, vraagkoppelingen en het opslaan van projecten intact als je een scherm wijzigt.

Zie [setup en preview](../docs/contributor-setup.md), de [gedetailleerde codekaart](../docs/contributor-architecture.md) en de [richtlijnen voor bijdragen](../CONTRIBUTING.md).

[Terug naar het projectoverzicht](../README.md#wegwijs-in-de-mappen).
