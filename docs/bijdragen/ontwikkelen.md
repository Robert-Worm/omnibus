# Ontwikkelen aan Omnibus

<!-- paginatype: taak -->

> **In het kort:** zo zet je een ontwikkelomgeving op, draai je de tests en controleer je je wijziging voordat je een pull request maakt. De tests werken zonder database.

## Wat heb je nodig?

- Git, Node **24.17.0** en npm **11.13.0**. Die combinatie is getest op Windows en Ubuntu 24.04.
- Een eigen kopie (fork) van de repository.
- Voor de applicatie in de browser: de database uit de [releases](https://github.com/Robert-Worm/omnibus/releases/latest). Voor de tests is die niet nodig.

## Opzetten en testen

```text
git clone https://github.com/<jouw-naam>/omnibus.git
cd omnibus
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

`npm test` controleert typen en lint, en draait alle tests met fictieve testdata. Sommige tests starten tijdelijk een lokale server. Er is geen account, database of internet nodig.

Wil je de applicatie zelf zien? Volg [installeren](../gebruiken/installeren.md) vanaf stap 3.

## Een wijziging bekijken zonder je huidige versie te verliezen

Bouw in een aparte map en start op een andere poort:

```text
npm run build -- --settings local-data/runtime/local-build.json --out work/review-01
npm start -- --settings local-data/runtime/local-build.json --web-root work/review-01 --port 4320
```

Kies voor elke poging een nieuwe mapnaam onder `work/`. Die map staat buiten Git. Er is geen automatisch herladen: bouw opnieuw na elke wijziging.

## Welke tests passen bij je wijziging?

Een tekstcorrectie vraagt geen volledige testronde. Kies wat past:

| Je wijzigt… | Draai |
| --- | --- |
| Alleen documentatie | `npm run check:docs` |
| Schermen of opmaak | `npm run check:types`, `npm run lint` en `npm run test:frontend` |
| Bronweergave of Excel-export | `npm run test:source` |
| Onderzoeksmodellen of formuleringen | `npm run test:models` |
| Database of server | `npm run test:runtime` |
| Pakketcontrole of publicatie | `npm run test:content-handoff` en `npm run test:publisher` |
| De AI-koppeling | `npm run test:agent:input` |
| Twijfel? | `npm test` |

Draai voor je commit altijd ook `npm run check:code-only`. Die controleert dat er geen databases, bronbestanden of geheimen in Git terechtkomen.

## Documentatie controleren

`npm run check:docs` zoekt tegenstrijdigheden in alle markdownbestanden. Dezelfde controle draait in GitHub Actions bij elke push en elk pull request.

| Controle | Wat moet kloppen |
| --- | --- |
| Links en ankers | Elk gelinkt bestand bestaat; elk `#anker` hoort bij een kop of een `<a id>` op die pagina |
| Node-versie | Elke genoemde versie (zoals "Node 24.17") past bij `.nvmrc`, net als `package.json` en de GitHub-workflows |
| Installatieopdracht | In codeblokken en GitHub-workflows staat altijd `npm ci --ignore-scripts --no-audit --no-fund` |
| Tabellen | Elke kolom heeft een kop; verder de regels uit de [bouwstenen](bouwstenen.md#tabellen), zoals hooguit vier kolommen en vaste statuslabels |
| Paginapatroon | Elke pagina in `docs/` heeft een [paginatype](bouwstenen.md#paginatypen), *In het kort*, *Volgende stap* en de navigatieregel. Een `README.md` in een map heeft *In het kort*. |

Daarnaast geeft de controle waarschuwingen. Die laten de controle niet mislukken. Ze gaan over woorden uit de stijlgids, zinnen van meer dan 25 woorden in `docs/` en verouderde schermafbeeldingen.

Een melding noemt het bestand en het regelnummer. Pas de tekst aan; schakel de controle niet uit.

### Schermafbeeldingen vernieuwen

Heb je de schermen veranderd? Maak dan alle schermafbeeldingen in `docs/images/` en de rondleiding opnieuw, met één opdracht. Het script gebruikt de openbare database en steeds hetzelfde fictieve onderzoek naar de CIO-functie.

Installeer eerst Playwright, alleen voor jezelf: `npm install --no-save playwright` en daarna `npx playwright install chromium`. Het hoort bewust niet bij de vaste onderdelen van Omnibus. Daarna:

```text
npm run build -- --settings local-data/runtime/local-build.json
npm run docs:screenshots -- --settings local-data/runtime/local-build.json
```

Voor de rondleiding (GIF) is ook [ffmpeg](https://ffmpeg.org/) nodig; zonder ffmpeg slaat het script alleen de GIF over. Wil je een paar afbeeldingen? Gebruik `--alleen stap-2-verzamel,rondleiding`. Het script legt in `docs/images/schermafbeeldingen.txt` vast bij welke versie de afbeeldingen horen. Bekijk de afbeeldingen voordat je ze commit.

Externe links controleer je met `npm run check:links`. Dat gebeurt ook elke maandag automatisch. Hoe je een pagina opbouwt en welke woorden je gebruikt, staat in de [stijlgids](stijlgids.md).

## Een pull request maken

1. Maak een branch en houd de wijziging klein en gericht.
2. Gebruik fictieve testdata, nooit echte rapporten of projecten.
3. Beschrijf in je pull request:
   - welk probleem je oplost en wat er veranderde;
   - welke tests je hebt gedraaid, met de uitkomst;
   - wat je níet hebt gecontroleerd.
4. Grotere wijzigingen? Bespreek ze eerst in een issue of in Discussions.

## Spelregels voor de code

- **Hergebruik wat er is:** de bestaande viewers, de vier werkstappen en de Excel-generator. Maak geen nieuwe weergave per bron. Zie [AGENTS.md](../../AGENTS.md).
- **Bronnen blijven onveranderd:** bronpassages, citaten en markeringen pas je nooit aan.
- **HOLD blijft HOLD:** een punt zonder bewijs of review wordt nooit goedgekeurd om een test te laten slagen.
- **Code en data gescheiden:** databases, bronarchieven en gegenereerde uitvoer horen niet in Git.

Hoe de code in elkaar zit, staat in [architectuur](architectuur.md).

<a id="problemen-oplossen"></a>
## Problemen oplossen

| Melding of probleem | Oplossing |
| --- | --- |
| `npm run build` stopt met `Usage: build:database` | Je bent `--settings local-data/runtime/local-build.json` vergeten. Zonder database bouwt Omnibus bewust niet. |
| De controle meldt een afwijkende hash | De database en het instellingenbestand horen niet bij elkaar. Pak de zip opnieuw uit; pas nooit zelf een hash aan. |
| De preview start niet | De poort is al in gebruik. Kies een andere met `--port`. |
| Mijn project is weg | Elk adres en elke poort heeft eigen browseropslag. Open je projectbestand met **Open project**. |
| Tests falen door de Node-versie | Gebruik Node 24.17.0. Controleer met `node --version`. |

Meer meldingen met uitleg staan bij [problemen bij installeren en starten](../gebruiken/problemen-oplossen.md). Kom je er niet uit? Stel je vraag in [Discussions](https://github.com/Robert-Worm/omnibus/discussions).

## Bekende beperkingen

- De online versie is een proefversie; de officiële demo volgt (zie de [routekaart](../routekaart.md#pad-a--online-versie)).
- De AI-koppeling werkt alleen met assistenten die een lokaal proces (STDIO) ondersteunen.
- Met een groot onderzoek (honderden bouwstenen) reageren typen, koppelen en exportkeuzes nog traag ([#82](https://github.com/Robert-Worm/omnibus/issues/82)). Een heel groot gekoppeld onderzoek kan bij export een melding over een te lange Excel-cel geven ([#94](https://github.com/Robert-Worm/omnibus/issues/94)).

## Samengevat

Clone, `npm ci`, `npm test`. Kies gerichte tests bij je wijziging, draai `check:code-only` voor je commit, en beschrijf eerlijk wat je hebt getest.

## Volgende stap

Lees [architectuur](architectuur.md) voor een kaart van de code.

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
