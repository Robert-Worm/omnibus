# Problemen bij installeren en starten

<!-- paginatype: naslag -->

> **In het kort:** de meldingen die je het vaakst ziet bij het installeren en starten van Omnibus. Per melding: hoe hij eruitziet, wat de oorzaak is en hoe je het herstelt.

## Zo gebruik je deze pagina

Zoek met `Ctrl+F` naar een stukje van de melding die je ziet. De meldingen zijn in het Engels; de uitleg is in het Nederlands. Staat jouw melding er niet bij? Vraag dan om [hulp](#kom-je-er-niet-uit).

## De meldingen

### Git of npm wordt niet herkend

```text
'git' is not recognized as an internal or external command
'npm' is not recognized as an internal or external command
bash: node: command not found
```

- **Oorzaak:** Git of Node.js is niet geïnstalleerd, of je terminal kent het nog niet.
- **Herstellen:** installeer [Git](https://git-scm.com/) en [Node.js 24.21](https://nodejs.org/). Sluit daarna je terminal en open hem opnieuw. Controleer met `git --version` en `node --version`.

### Een verkeerde versie van Node.js

```text
npm warn EBADENGINE Unsupported engine
No such built-in module: node:sqlite
```

- **Oorzaak:** je gebruikt een oudere versie van Node.js. Omnibus heeft versie 24.21 of hoger nodig.
- **Herstellen:** installeer Node.js 24.21 en controleer met `node --version`. Gebruik je `nvm`? Typ dan `nvm use` in de map van Omnibus.

### De opdracht vraagt om instellingen

```text
Error: Usage: build:database -- --settings <local-build.json> OR ...
```

- **Oorzaak:** je bent `--settings` vergeten. Zonder database bouwt Omnibus bewust niet.
- **Herstellen:** typ de opdracht precies zoals in [installeren](installeren.md#4-controleer-en-bouw), met `-- --settings local-data/runtime/local-build.json` erachter.

### Het instellingenbestand wordt niet gevonden

```text
Runtime database check failed: ENOENT: no such file or directory, stat '.../local-data/runtime/local-build.json'
```

- **Oorzaak:** `local-build.json` staat niet op de plek waar Omnibus hem zoekt. Vaak is de zip uitgepakt in een extra map, zoals `local-data/runtime/omnibus-database-2026-10-19/`.
- **Herstellen:** zet `catalogue.sqlite` en `local-build.json` rechtstreeks in `local-data/runtime/`. Zorg ook dat je terminal in de map van Omnibus staat.

### Het instellingenbestand is ongeldig

```text
Runtime database check failed: Invalid database settings: expected database, release and publication only.
```

- **Oorzaak:** `local-build.json` is aangepast, of opgeslagen in een andere tekstcodering. Dat gebeurt soms als je het bestand opent en bewaart in Kladblok.
- **Herstellen:** pak het bestand opnieuw uit de zip. Pas het niet aan.

### Database en instellingen horen niet bij elkaar

```text
Runtime database check failed: Invalid runtime publication: unknown release
```

- **Oorzaak:** het instellingenbestand hoort bij een andere database. Je hebt bijvoorbeeld bestanden uit twee verschillende zips gemengd.
- **Herstellen:** pak beide bestanden opnieuw uit dezelfde zip. Pas nooit zelf een controlegetal aan.

### De database is beschadigd

```text
Runtime database check failed: Release content verification failed: package contents
```

- **Oorzaak:** de inhoud van `catalogue.sqlite` klopt niet met de controlegetallen. De download is mislukt of het bestand is beschadigd.
- **Herstellen:** download de zip opnieuw bij de [releases](https://github.com/Robert-Worm/omnibus/releases/latest) en pak hem opnieuw uit. Blijft de melding? Meld het dan; dan is er mogelijk iets mis met de release.

### Omnibus weigert te starten

```text
Preview start refused. Check explicit start options, the pinned database, web build and port.
```

- **Oorzaak:** meestal is de poort al in gebruik, bijvoorbeeld door een Omnibus die nog draait. Het kan ook zijn dat je nog niet hebt gebouwd.
- **Herstellen:** sluit andere terminals waarin Omnibus draait, of kies een andere poort met `--port 4320`. Heb je nog niet gebouwd? Voer dan eerst [stap 4](installeren.md#4-controleer-en-bouw) uit.

### De browser toont "Host not allowed"

```text
{"error":"Host not allowed"}
```

- **Oorzaak:** je opent Omnibus op een ander adres dan waarop hij draait. Op je eigen computer is dat `http://127.0.0.1:4319/`, niet `http://localhost:4319/`. Omnibus weigert andere adressen, zodat websites niet stiekem bij je gegevens kunnen.
- **Herstellen:** open precies het adres dat in de terminal staat. Met Docker is het juist `http://localhost:8080/`, niet `127.0.0.1:8080`. Gebruik je Docker met een andere poort, bijvoorbeeld 3000? Start dan met `-e PUBLIC_ORIGIN=http://localhost:3000`.

### Mijn project is weg

- **Oorzaak:** elk adres en elke poort heeft eigen opslag in de browser. Open je Omnibus op een ander adres, een andere poort of in een andere browser, dan zie je je project niet.
- **Herstellen:** open Omnibus op het adres dat je eerder gebruikte. Of open je projectbestand met **Open project**. Bewaar je werk regelmatig met **Bewaar project**.

<a id="kom-je-er-niet-uit"></a>
## Kom je er niet uit?

Stel je vraag in de categorie *Hulp* van [Discussions](https://github.com/Robert-Worm/omnibus/discussions/new?category=hulp). Zet erbij:

- je besturingssysteem, bijvoorbeeld Windows 11 of Ubuntu 24.04;
- de uitkomst van `node --version`;
- welke database je gebruikt, bijvoorbeeld `2026-10-19`;
- de opdracht die je typte en de volledige melding.

Zet er **geen** vertrouwelijke onderzoeksgegevens of projectbestanden bij. Discussions is openbaar.

## Samengevat

De meeste problemen komen door een ontbrekend programma, een verkeerde Node-versie, een extra map bij het uitpakken of een ander adres in de browser. Pak bij twijfel de zip opnieuw uit; pas nooit zelf een controlegetal aan.

## Volgende stap

Werkt Omnibus? Lees dan [werken met Omnibus](werken-met-omnibus.md).

---

[↑ Omnibus gebruiken](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
