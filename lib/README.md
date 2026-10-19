# Gedeelde applicatielogica

Deze map bevat de regels die de browser en de lokale AI-tools delen: bronnen laden, selecties, onderzoeksvragen, projectbestanden en het maken van Excel-werkboeken.

## Begin hier

- `catalogue-runtime.mjs` en `database-source-client.mjs` laden brondata op aanvraag.
- `framework-model.mjs` en `research-plan.mjs` ondersteunen selecties en vraagkoppelingen.
- `project-session.mjs` en `project-codec.mjs` regelen projectopslag en bestandsformaten.
- `excel-export.mjs` en `export-profiles.mjs` bouwen en configureren werkboeken.
- `content-adapters/` vertaalt bronstructuren naar het gedeelde viewerformaat.

## Grenzen

Uitvoerbare regels horen hier; private broninhoud blijft buiten Git. Sommige modules hangen af van data die bij de ondersteunde databasebuild wordt aangeleverd; ze zijn niet allemaal losse Node-programma's. De tests naast de modules gebruiken waar nodig fictieve data.

Zie [setup en testkeuzes](../docs/contributor-setup.md), de [gedetailleerde codekaart](../docs/contributor-architecture.md) en de [richtlijnen voor bijdragen](../CONTRIBUTING.md).

[Terug naar het projectoverzicht](../README.md#wegwijs-in-de-mappen).
