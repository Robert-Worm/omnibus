# Scripts (`scripts/`)

> **In het kort:** de opdrachten achter `npm run …`: bouwen, starten, controleren en publiceren. Je roept ze bijna altijd aan via `npm run`, niet rechtstreeks.

## De belangrijkste

| Opdracht | Script | Wat het doet |
| --- | --- | --- |
| `npm run build` | `build-database-web.mjs` | Bouwt de app tegen een database |
| `npm start` | `serve-database-web.mjs` | Start de lokale server |
| `npm run data:check-runtime` | `check-runtime-database.mjs` | Controleert een database |
| `npm run data:compare-runtime` | `compare-runtime-publications.mjs` | Vergelijkt twee databases |
| `npm run data:publish-runtime` | `prepare-runtime-publication.mjs` | Maakt een nieuwe database (beheer) |
| `npm run content:prepare` en `content:intake` | `prepare-content-intake.mjs`, `check-content-intake.mjs` | Maakt en controleert het manifest van een pakket |
| `npm run build:runtime` en `package:runtime` | `build-runtime.mjs`, `package-runtime.mjs` | Maakt het runtimepakket |
| `npm run build:agent` | `build-agent-tools.mjs` | Bereidt de AI-koppeling voor |
| `npm run skills:install` | `install-content-skills.mjs` | Installeert AI-skills |
| `npm run check:code-only` | `check-code-only.mjs` | Controleert dat er geen data of geheimen in Git staan |
| `npm run check:docs` | `check-docs.mjs` | Controleert links, ankers, versies en het paginapatroon van de documentatie |

De `review-*`- en `verify-*`-scripts zijn controles die de beheerder gebruikt bij nieuwe inhoud. Tests staan naast de scripts (`*.test.mjs`).

## Verder lezen

[Ontwikkelen](../docs/bijdragen/ontwikkelen.md) · [Database publiceren](../docs/beheer/database-publiceren.md)
