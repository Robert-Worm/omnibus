# Architectuur en codekaart

Omnibus is een React/TypeScript-app met gedeelde JavaScript-logica voor
bronselecties, onderzoeksprojecten en Excel. Vite bouwt de browserapp tegen een
expliciet gekozen SQLite-publicatie. Een kleine Node-server levert die app en
alleen-lezen brongegevens. De lokale MCP-server hergebruikt dezelfde workflow en
exports, met eigen concepten en uitvoerbestanden.

## Gegevensstroom

```text
Vertrouwde privé-verwerking + bronreviews
  -> afzonderlijke publicatieopdracht
     -> SQLite-database + bronreleasehash + runtimepublicatiehash
        -> webbuild -> lokale lees-API -> browserproject -> projectbestand / Excel
        -> agent-build + afgeleide zoekindex -> lokale MCP -> apart concept / Excel
```

De publicatie bevat JSON-gegevens, geen uit de database uit te voeren JavaScript.
De buildplugin combineert die gegevens met getrackte adapters. Daardoor kunnen
imports met historische inhoudsnamen in code voorkomen zonder dat het
bijbehorende private bronbestand in Git hoort. Los zo'n import niet op door
private authoringmodules toe te voegen: controleer eerst het runtimecontract en
de plugin. De build leest de database; zij publiceert geen nieuwe broninhoud.

De twee hashes hebben verschillende taken. `release` bindt bronidentiteiten en
versies; `publication` bindt de afgeleide gegevens voor de runtime. Daarnaast
wordt het codecontract gecontroleerd. Starten met een andere database dan de
build verwacht wordt geweigerd. Een hash bewijst geen inhoudelijke kwaliteit en
is geen ondertekende verklaring van herkomst.

## Codekaart

| Gebied | Begin bij | Verantwoordelijkheid |
| --- | --- | --- |
| Browserstart | [database.html](../database.html), [offline.tsx](../offline.tsx) | HTML-ingang en React-mount; de naam `offline.tsx` maakt dit geen zelfstandige offlinebuild |
| App en navigatie | [app/framework-editor.tsx](../app/framework-editor.tsx), [app/workflow-patterns.tsx](../app/workflow-patterns.tsx) | De bestaande werkstappen, projectstate en gedeelde keuze-/werkpanelen |
| Bronviewers | [app/law-point-source.tsx](../app/law-point-source.tsx), [app/criterion-source-layout.tsx](../app/criterion-source-layout.tsx), [app/database-report-library.tsx](../app/database-report-library.tsx) | Gedeelde bronweergave, passages en paginanavigatie; opmaak in [viewer-readability.css](../app/viewer-readability.css) |
| Catalogus en brontransport | [lib/catalogue-runtime.mjs](../lib/catalogue-runtime.mjs), [lib/database-source-client.mjs](../lib/database-source-client.mjs) | Uitgesteld laden, bronidentiteit, begrensde requests en cache |
| Selecties en vragen | [lib/framework-model.mjs](../lib/framework-model.mjs), [lib/research-plan.mjs](../lib/research-plan.mjs), [lib/investigation.mjs](../lib/investigation.mjs) | Projectvalidatie, vraagkoppelingen en onderzoeks-/exportselecties |
| Lokale opslag en import | [lib/project-session.mjs](../lib/project-session.mjs), [lib/project-codec.mjs](../lib/project-codec.mjs), [lib/project-limits.mjs](../lib/project-limits.mjs) | Browseropslag, conflictdetectie, projectformaat, compressie en invoergrenzen |
| Excel | [app/export-creator.tsx](../app/export-creator.tsx), [lib/excel-export.mjs](../lib/excel-export.mjs), [lib/export-profiles.mjs](../lib/export-profiles.mjs) | Exportkeuzes en bestaande werkboekgenerator voor de drie werkvormen |
| Build en contract | [scripts/build-database-web.mjs](../scripts/build-database-web.mjs), [vite.database.config.ts](../vite.database.config.ts), [scripts/published-catalogue.mjs](../scripts/published-catalogue.mjs) | Gepinde build, virtuele inhoudsmodules, assets en laadgrenzen |
| Adapters | [lib/runtime-contract.mjs](../lib/runtime-contract.mjs), [lib/content-adapters/](../lib/content-adapters/) | Toegestane module-identiteiten/exports en uitvoerbare omzettingslogica zonder de private inhoudstabellen |
| SQLite en lees-API | [local-data/repository.mjs](../local-data/repository.mjs), [local-data/runtime-publication.mjs](../local-data/runtime-publication.mjs), [local-data/server.mjs](../local-data/server.mjs) | Databaselezen, publicatiecontrole en begrensde loopback-HTTP; start via [serve-database-web.mjs](../scripts/serve-database-web.mjs) |
| Lokale MCP | [agent-tools/server.mjs](../agent-tools/server.mjs), [agent-tools/service.mjs](../agent-tools/service.mjs), [agent-tools/workflow.mjs](../agent-tools/workflow.mjs) | STDIO-tools, invoer-/uitvoergrenzen en hergebruik van selectie-, vraag- en exportlogica |
| Private inhoudsoverdracht | [content-tools/](../content-tools/), [scripts/prepare-runtime-publication.mjs](../scripts/prepare-runtime-publication.mjs) | Intake en beheerpublicatie; geen onderdeel van de lees-API |
| Content Workbench | [content-workbench/](../content-workbench/) | Apart lokaal voortgangsbord en eigen database; een status is geen bronreview |

[Synthetische runtimefixtures](../local-data/test-support/runtime-fixture.mjs) en
nabijgelegen `*.test.mjs`-bestanden ondersteunen tests zonder private collectie.
Niet iedere losse module is direct met Node uitvoerbaar: runtime-inhoudsimports
worden bij de ondersteunde build opgelost. Gebruik de
[gedocumenteerde testkeuze](contributor-setup.md#passende-controles-kiezen).

## Gedrag dat wijzigingen moeten behouden

Bronnen, selecties en projectinhoud zijn verschillende zaken. Bronpassages houden
hun oorspronkelijke tekst, versie en exacte Unicode-offsets. Een selectie
verandert geen bronreview, HOLD-status of juridische toepasselijkheid. Een
onderzoeksproject bewaart eigen tekst, vraagkoppelingen en bronverwijzingen;
Excel moet die betekenis blijven volgen.

Herbruik de bestaande viewers, de vier werkstappen en hun gedeelde opmaak.
Bron-specifieke omzetting hoort in een adapter. Een presentatiewijziging mag
geen selecties, vraagkoppelingen of opgeslagen evidence wijzigen. De
[actieve contracten](acceptatiecontracten.md) beschrijven deze grenzen;
[AGENTS.md](../AGENTS.md) bevat aanvullende repositoryafspraken.

`project-session.mjs` bewaakt conflicten tussen tabbladen vóór schrijven en
valideert imports voordat de huidige staat wordt vervangen. Dit is geen
transactiegarantie over meerdere browsers. Bewaar downloadbare projectkopieën;
codeversionering beschermt browseropslag niet.

## Gegevens en rechten

| Gegeven | Grens |
| --- | --- |
| Code, adapters, synthetische fixtures en documentatie | In Git, na review |
| Broncollectie, originele documenten en inhoudelijke reviewdossiers | In de afzonderlijke privé-verwerkingsomgeving |
| Runtime-database, lokale instellingen, backups en buildoutput | Buiten Git; gebruik de genegeerde mappen of een afzonderlijke private locatie |
| Onderzoeksprojecten en browserexports | Browseropslag en door de gebruiker opgeslagen bestanden; geen accountopslag of automatische serverupload |
| MCP-concepten en exports | Nieuwe aparte bestanden onder `agent-output/`; AI-gebruik en opslaan vragen expliciete toestemming |
| Secrets en technische credentials | Buiten Git en buiten browserbuilds, logs en reviewbijlagen |

Een build kan brongegevens bevatten of via zijn API beschikbaar maken. Dat een
bestand buiten Git blijft, maakt een publiek bereikbare route niet privé.
Alleen inhoud met goedgekeurde verspreidingsrechten kan later openbaar worden
geleverd. De loopbackserver en lokale Workbench zijn geen publieke hostingroute.

De repository blijft privé tot de publicatiechecks zijn afgerond. Eigen code,
documentatie en skills vallen onder [Apache 2.0](../LICENSE).
Behoud de afzonderlijke [stylesheetlicentie](../app/vendor/shadcn-LICENSE.txt),
[fontvermeldingen](../app/rijksmap-fonts.css) en dependencyvermeldingen. De
[buildcode](../scripts/font-license-notices.mjs) bewaart assetvermeldingen in
geleverde HTML. Zulke vermeldingen verlenen geen rechten op andere projectcode,
rapporten of onderzoeksgegevens. Beoordeel code- en bronrechten afzonderlijk
vóór een toekomstige openbare release.

## Huidige afbakening

De losstaande WorkOS-/access-proeven en hun exclusieve dependencies en tests
zijn verwijderd. Login, accounts, rollen, cloudprojecten en betalingen zijn
geen onderdeel van de applicatiearchitectuur. Technische bescherming van de
lees-, bestands-, import- en publicatiegrenzen blijft nodig.

Nieuwe inhoud verwerken, een andere database-engine, een remote MCP-dienst en
publieke hosting zijn geen onderdeel van deze ontwikkelaarsstart. Raadpleeg de
[routekaart](routekaart.md) en [bekende beperkingen](contributor-setup.md#bekende-beperkingen)
voordat een wijziging die grenzen raakt.
