# Problemen bij installeren en starten

<!-- paginatype: naslag -->

> **In het kort:** de meldingen die je het vaakst ziet bij het installeren en starten van Omnibus. Per melding: hoe hij eruitziet, wat de oorzaak is en hoe je het herstelt.

## Zo gebruik je deze pagina

Zoek met `Ctrl+F` naar een stukje van de melding die je ziet. De meldingen van Git, npm, Node.js en Docker zijn in het Engels; die van de installatieopdracht in het Nederlands. Staat jouw melding er niet bij? Vraag dan om [hulp](#kom-je-er-niet-uit).

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

- **Oorzaak:** het adres is niet toegestaan. In de huidige code op de hoofdtak (`main`) werken lokaal zowel `http://127.0.0.1:4319/` als `http://localhost:4319/`. Beide namen moeten de poort gebruiken waarop Omnibus werkelijk draait. Andere hostnamen, subdomeinen en verkeerde poorten blijven geweigerd.
- **Herstellen:** open het adres uit de terminal. Die toont `127.0.0.1` met de gebruikte poort. Lokaal kun je ook `localhost` gebruiken met precies diezelfde poort. Oudere releases kunnen `localhost` nog weigeren; gebruik dan het adres met `127.0.0.1` uit de terminal.
- **Nazorg:** gebruik steeds hetzelfde adres. De twee lokale namen hebben elk hun eigen browseropslag, ook op dezelfde poort. Zie [Mijn project is weg](#mijn-project-is-weg) als je werk niet verschijnt.

Bij Docker en publieke hosting geldt alleen het adres dat is ingesteld met `PUBLIC_ORIGIN`; de extra lokale naam geldt daar niet. Het Docker-voorbeeld gebruikt `http://localhost:8080`. Voor poort 3000 gebruik je zowel `-p 3000:8080` als `-e PUBLIC_ORIGIN=http://localhost:3000`.

Omnibus controleert ook de herkomst die de browser meestuurt (`Origin`). Als die aanwezig is, moeten protocol, naam en poort exact bij het geopende adres passen. Een afwijkende herkomst geeft `Origin not allowed`, ook bij een verzoek tussen de twee lokale namen.

### Docker Desktop draait niet

```text
Cannot connect to the Docker daemon
error during connect: ... The system cannot find the file specified.
```

- **Oorzaak:** Docker Desktop is niet gestart, of nog bezig met opstarten.
- **Herstellen:** start Docker Desktop en wacht tot er *Engine running* staat. Probeer de opdracht daarna opnieuw.

### De poort is al in gebruik bij Docker

```text
Bind for 0.0.0.0:8080 failed: port is already allocated
```

- **Oorzaak:** er draait al iets op poort 8080, bijvoorbeeld een eerdere Omnibus.
- **Herstellen:** stop de andere container met `docker ps` en `docker stop <naam>`. Of kies een andere poort: `docker run --rm -p 3000:8080 -e PUBLIC_ORIGIN=http://localhost:3000 omnibus`.

### Het bouwen met Docker komt niet verder

```text
npm error network request to https://registry.npmjs.org/... failed
ETIMEDOUT
```

- **Oorzaak:** Docker kan het internet niet bereiken, vaak door een proxy of firewall van je werkplek.
- **Herstellen:** probeer het op een ander netwerk. Lukt dat niet, vraag je IT-afdeling om de proxy in Docker Desktop in te stellen, of gebruik de [online versie](https://omnibus.sliplane.app).

### Mijn project is weg

- **Oorzaak:** elk adres en elke poort heeft eigen opslag in de browser. Ook `localhost` en `127.0.0.1` hebben aparte opslag op dezelfde poort. Open je Omnibus op een ander adres, een andere poort of in een andere browser, dan zie je je project niet.
- **Herstellen:** open Omnibus op het adres dat je eerder gebruikte. Wil je van adres wisselen? Gebruik eerst **Bewaar project** op het oude adres en daarna **Open project** op het nieuwe adres. Heb je al een projectbestand, open dat dan met **Open project**. Bewaar je werk regelmatig.

<a id="kom-je-er-niet-uit"></a>
## Meldingen van de installatieopdracht

De opdracht `node scripts/installeer.mjs` toont een melding met ✗, zegt eronder *Wat je doet* en geeft een link naar hulp.

| Melding | Wat je doet |
| --- | --- |
| `Je gebruikt Node.js … ; Omnibus heeft versie … of hoger nodig.` | Installeer [Node.js 24.21](https://nodejs.org/), sluit de terminal en open hem opnieuw. Zie [een verkeerde versie van Node.js](#een-verkeerde-versie-van-nodejs) |
| `De onderdelen konden niet worden geïnstalleerd.` | Controleer je internetverbinding. Werkt het nog niet, verwijder dan de map `node_modules` en start opnieuw |
| `De database kon niet worden opgehaald: …` | Start de opdracht opnieuw. Komt de fout terug, meld het dan. Pak een afgewezen zip niet zelf uit |
| `De database haalt de controle niet.` | Verwijder de map `local-data/runtime` en start opnieuw; de database wordt dan opnieuw opgehaald |
| `Het bouwen is mislukt.` | Lees de melding erboven en start de opdracht opnieuw. Stuur die melding mee als je hulp vraagt |
| `Omnibus kon niet starten.` | Sluit een ander venster waarin Omnibus draait. Zie [Omnibus weigert te starten](#omnibus-weigert-te-starten) |

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
