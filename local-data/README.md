# Database en alleen-lezen dienst

Deze map koppelt Omnibus aan een apart voorbereide SQLite-database. De browser laadt catalogusregels, bouwstenen en bronpassages op het moment dat ze nodig zijn. De database zit niet in Git maar staat bij de [releases](https://github.com/Robert-Worm/omnibus/releases/latest); de originele brondocumenten blijven privé.

## Begin hier

Gebruik de [setuphandleiding](../docs/contributor-setup.md#een-database-ontvangen) om een passende database te ontvangen en een genegeerd instellingenbestand te maken. Vanuit de hoofdmap van de repository:

```text
npm run data:check-runtime -- --settings local-data/runtime/local-build.json
npm run build -- --settings local-data/runtime/local-build.json
npm start -- --settings local-data/runtime/local-build.json --port 4319
```

Open de applicatie op `http://127.0.0.1:4319/`. Zowel de build als de server controleren de gekozen bronrelease en runtimepublicatie; ze schakelen niet stilletjes over naar de nieuwste inhoud. De build leest een voorbereide publicatie en maakt er zelf geen. Herstart de preview na het opnieuw bouwen.

Voor codewijzigingen kun je [de zelfstandige tests draaien](../docs/contributor-setup.md#eerste-controle-zonder-database). Die hebben de private bronverzameling niet nodig.

## De relevante code vinden

- `repository.mjs` leest geversioneerde catalogusregels.
- `runtime-publication.mjs` controleert de publicatie die een build gebruikt.
- `server.mjs` levert de alleen-lezen API; `static-web.mjs` levert de toegestane buildbestanden.
- `runtime-backup.mjs` maakt een gecontroleerde SQLite-back-up, inclusief runtimebestanden.
- `../lib/database-source-client.mjs` regelt browserverzoeken en hun grenzen.

## Grenzen

Bewaar live databases en instellingen in genegeerde private opslag, buiten de openbare webmap. De API biedt geen SQL, geen databasedownloads, geen inhoud bewerken en geen opslag van gebruikersprojecten. Browserprojecten staan apart en hebben hun eigen back-up via projectbestanden. De beperkingen van de alleen-lezen dienst garanderen niet dat elke hostinginrichting veilig is.

Inhoud wijzigen vraagt een apart gereviewde publicatie. Volg de [publicatiehandleiding](../docs/contributor-publication.md); voor back-up en herstel de [herstelhandleiding](../docs/runtime-herstel.md). De oudere JSON-overdracht van alleen bronnen is geen volledige back-up van de runtime.

[Terug naar het projectoverzicht](../README.md#wegwijs-in-de-mappen).
