<h1 align="center">Omnibus</h1>

<p align="center">
  <img src="docs/images/omnibus-banner.png" alt="Omnibus: van brondocument naar toetsingskader" width="820">
</p>

<p align="center">
  Verken rapporten, wetten, kaders en modellen, kies normen en toetspunten,<br>
  koppel ze aan onderzoeksvragen en exporteer je toetsingskader naar Excel.
</p>

<p align="center">
  <a href="#licentie"><img alt="Code: PolyForm Noncommercial" src="https://img.shields.io/badge/code-PolyForm%20Noncommercial-01689b?style=flat-square&labelColor=15233b"></a>
  <a href="docs/contributor-setup.md"><img alt="Node 24.17" src="https://img.shields.io/badge/node-24.17-01689b?style=flat-square&labelColor=15233b"></a>
  <a href="agent-tools/README.md"><img alt="Lokale AI-koppeling: MCP" src="https://img.shields.io/badge/AI--koppeling-MCP-01689b?style=flat-square&labelColor=15233b"></a>
  <a href="skills/README.md"><img alt="6 AI-skills" src="https://img.shields.io/badge/AI--skills-6-01689b?style=flat-square&labelColor=15233b"></a>
  <a href="https://github.com/Robert-Worm/omnibus/releases/latest"><img alt="Database: 27 rapporten" src="https://img.shields.io/badge/database-27%20rapporten-01689b?style=flat-square&labelColor=15233b"></a>
  <a href="#status"><img alt="Status: lokaal werkend" src="https://img.shields.io/badge/status-lokaal%20werkend-01689b?style=flat-square&labelColor=15233b"></a>
</p>

<p align="center">
  <a href="#zo-werkt-het"><strong>Zo werkt het</strong></a> ·
  <a href="#aan-de-slag">Aan de slag</a> ·
  <a href="docs/README.md">Documentatie</a> ·
  <a href="skills/README.md">AI-skills</a> ·
  <a href="#meedoen">Meedoen</a>
</p>

---

## Wat is Omnibus?

Omnibus helpt auditors en onderzoekers een **toetsingskader** op te bouwen dat verbonden blijft met zijn bronnen. Je begint met een onderzoeksvraag of met signalen en zorgen, kiest normen, toetspunten en interviewvragen uit rapporten, wetten, kaders en modellen, en exporteert het resultaat als Excel-werkboek.

Bijvoorbeeld: een auditor die informatiebeheer onderzoekt, stelt een kader samen uit relevante bronnen, koppelt toetspunten aan vragen en past het werkdocument aan op de organisatie die wordt onderzocht. Bij elk bouwblok kun je de bron lezen, met de context en de beperkingen.

![Startscherm van Omnibus: begin vanuit een behoefte of vanuit signalen en werk toe naar een referentiekader](docs/images/omnibus-overview.png)

*Het startscherm van de werkende applicatie, met een nieuw project. Bronverzamelingen en onderzoeksprojecten zitten niet in deze repository.*

<a id="zo-werkt-het"></a>
## Zo werkt het

1. **Begin** met een onderzoeksvraag, of verken een thema of proces.
2. **Lees de bron** achter elk bouwblok, met exacte markeringen in de originele tekst.
3. **Kies** normen, toetspunten en interviewvragen voor je onderzoek.
4. **Bouw je kader**, bewaar je project lokaal en exporteer een Excel-werkboek.

Een norm kiezen betekent niet dat die juridisch van toepassing is, of dat de organisatie eraan voldoet. Dat blijft een oordeel van de onderzoeker.

Een optionele **lokale AI-koppeling** laat een eigen AI-client de catalogus doorzoeken en aparte onderzoeksconcepten voorbereiden. De AI kan de brondatabase niet aanpassen.

## Wat er wel en niet in zit

Deze repository bevat de applicatie, de SQLite-koppeling, de lokale AI-tools, zes herbruikbare AI-skills, documentatie en tests met fictieve data.

**De database staat los van de code, bij de [releases](https://github.com/Robert-Worm/omnibus/releases/latest).** Het is één zip van ongeveer 10 MB met 27 rapporten van de Auditdienst Rijk, 7 wetten en kaders en 14 onderzoeksmodellen. Wat er precies in zit en wat er nog komt, staat in de [voortgangslijst](docs/voortgang.md). De tests werken ook zonder database.

Een route als "clone, upload een pdf en publiceer" bestaat nog niet. Nieuwe rapporten gaan via de skills en een inhoudelijke review; lees [wat er kan met eigen documenten](docs/own-content.md).

Brondocumenten, onderzoeksprojecten, inloggegevens en exports blijven buiten Git. Browseropslag is geen back-up: download een projectbestand als je je werk wilt bewaren of overzetten.

<a id="aan-de-slag"></a>
## Aan de slag

### Zonder database: code bekijken en testen

Gebruik Git, Node **24.17.0** en npm **11.13.0** (de geteste combinatie). Vanuit de map van de repository:

```text
npm ci --workspaces=false --ignore-scripts --no-audit --no-fund
npm test
```

De tests gebruiken fictieve data; sommige openen tijdelijk een lokale server. Er is geen account, cloudopslag of privécollectie nodig. Voor gerichte controles en problemen oplossen: zie de [setuphandleiding](docs/contributor-setup.md).

<a id="lokaal-bouwen-en-starten"></a>
### Met de database: de applicatie starten

Download `omnibus-database-*.zip` bij de [nieuwste release](https://github.com/Robert-Worm/omnibus/releases/latest) en pak de zip uit in `local-data/runtime/`. Daar staan dan `catalogue.sqlite` en `local-build.json`, met de vastgelegde hashes. Daarna:

```text
npm run data:check-runtime -- --settings local-data/runtime/local-build.json
npm run build -- --settings local-data/runtime/local-build.json
npm start -- --settings local-data/runtime/local-build.json --port 4319
```

Open [de lokale applicatie](http://127.0.0.1:4319/). De server leest de gekozen publicatie zonder de brondatabase te wijzigen. `npm run dev` is dezelfde preview, geen server die automatisch herlaadt. Bouw opnieuw na een codewijziging, of gebruik een [aparte reviewbuild](docs/contributor-setup.md#een-wijziging-bekijken) om een bestaande preview te behouden.

<a id="lokale-ai-koppeling"></a>
### Je eigen AI-client koppelen

```text
npm run build:agent -- --settings local-data/runtime/local-build.json
```

Volg daarna de [MCP-handleiding](agent-tools/README.md). MCP is de interface waarmee de client de tools van Omnibus aanroept. De koppeling draait lokaal via STDIO; het is geen openbaar adres. Concepten opslaan en bestanden exporteren vragen altijd expliciete toestemming.

Een lokale koppeling maakt een AI-dienst in de cloud **niet** lokaal: wat je naar die dienst stuurt, valt onder diens privacyvoorwaarden. Gebruik alleen documenten die je mag delen, en volg het beleid van je organisatie. Omnibus bevat geen AI-abonnement.

## Wegwijs in de mappen

Je hoeft niet alles te kennen om te beginnen.

| Map | Wat je er vindt | Begin hier |
| --- | --- | --- |
| `app/` | De vier werkstappen, de bronviewers en de exportschermen | [Applicatie](app/README.md) |
| `components/`, `hooks/` | Herbruikbare interface-onderdelen en gedeeld gedrag | [Architectuur](docs/contributor-architecture.md) |
| `lib/` | Gedeelde regels voor selecties, vragen, projecten en Excel-export | [Gedeelde logica](lib/README.md) |
| `local-data/` | De SQLite-koppeling en de alleen-lezen dataservice (niet de bronverzameling) | [Database](local-data/README.md) |
| `agent-tools/` | De lokale koppeling voor AI-clients | [AI-koppeling](agent-tools/README.md) |
| `content-tools/` | Controles en hulpmiddelen voor gereviewde inhoudspakketten | [Inhoudstools](content-tools/README.md) |
| `content-workbench/` | Een los lokaal bord om de voortgang van inhoudsverwerking te volgen | [Workbench](content-workbench/README.md) |
| `skills/` | Zes los bruikbare AI-methoden voor voorbereiding en review | [Kies een skill](skills/README.md) |
| `scripts/`, `hosting/` | Bouw-, controle- en hostingvoorbereidingstools | [Setup](docs/contributor-setup.md) · [Hosting](hosting/release-delivery/README.md) |
| `docs/` | Handleidingen voor gebruikers, bijdragers en beheerders | [Documentatie](docs/README.md) |

Tests staan meestal naast de code die ze controleren.

<a id="status"></a>
## Status

De lokale werkstroom is af en werkt, en de database is te downloaden. Er is nog geen online versie. Accounts en betalingen horen bewust niet bij de applicatie. Wat er nog komt, staat in de [routekaart](docs/routekaart.md).

<a id="meedoen"></a>
## Meedoen

**Help de database vullen.** Van de 542 ADR-rapporten op de werklijst zijn er 27 verwerkt. Kies een open rapport in de [voortgangslijst](docs/voortgang.md), meld het in de [voortgangsdiscussie](https://github.com/Robert-Worm/omnibus/discussions/2) en verwerk het met de [rapportskill](skills/README.md).

Andere nuttige bijdragen zijn duidelijkere uitleg, reproduceerbare foutmeldingen, verbeteringen in toegankelijkheid, gerichte tests en betere reviewmethoden. Je hoeft geen grote nieuwe functie voor te stellen om te helpen.

Lees eerst [CONTRIBUTING.md](CONTRIBUTING.md). Bespreek grotere wijzigingen vooraf in een issue, en gebruik fictieve voorbeelden in plaats van vertrouwelijke rapporten of projecten. Vragen en ideeën kunnen in [Discussions](../../discussions). Beveiligingsproblemen meld je vertrouwelijk via [SECURITY.md](SECURITY.md).

## Verwant project

Omnibus is ontstaan naast de [Rijksmap](https://github.com/Robert-Worm/rijksmap), de kaart van de rijksoverheid met ruim 9.000 audit-, toezicht- en onderzoeksrapporten. De Rijksmap laat zien wát er is onderzocht; Omnibus helpt een nieuw onderzoek op te zetten.

<a id="licentie"></a>
## Licentie

Copyright 2026 Robert Worm en bijdragers.

De eigen code, documentatie en skills van Omnibus vallen onder de [PolyForm Noncommercial License 1.0.0](LICENSE): je mag ze vrij gebruiken, aanpassen en delen, maar niet commercieel. Onderdelen van derden houden hun eigen licentie; zie [NOTICE](NOTICE).

Deze licentie geeft geen rechten op rapporten, wetten, kaderpublicaties of modelpublicaties van derden, of op jouw onderzoeksdata, en geeft geen toestemming om steun van het project of van bronuitgevers te suggereren.
