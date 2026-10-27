# Skills gebruiken met je AI-assistent

<!-- paginatype: taak -->

> **In het kort:** download een Omnibus-skill via je browser en maak een zip met Verkenner of Finder. Voor de Claude-app en ChatGPT heb je geen Git of terminal nodig. Controleer daarna of jouw assistent alle meegeleverde bestanden kan lezen.

## Welke assistent past bij jou?

| Je wilt… | Lees |
| --- | --- |
| Een skill ophalen zonder terminal | [Downloaden en zippen](#1-download-de-skill-zonder-terminal) |
| De skill gebruiken in de Claude-app | [De Claude-app](#de-claude-app-web-of-desktop) |
| De skillbestanden gebruiken in ChatGPT | [ChatGPT](#chatgpt) |
| Werken met Codex of Claude Code | [Ontwikkelaarsroutes](#technische-details) |

Je levert een **compleet pakket** aan, inclusief de vereiste onafhankelijke lezingen en reviews. De beheerder controleert de toelating en integreert het pakket. Ontbrekende onderdelen blijven `HOLD` of `PENDING_REVIEW`; een geïnstalleerde skill bewijst niet dat die stappen zijn uitgevoerd. Gebruik het sterkste model dat je hebt; zie [welk AI-model gebruik je?](bron-verwerken.md#welk-ai-model-gebruik-je).

**Nog in ontwikkeling:** de rapportskill bevat de [contracten en rolinstructies](../../skills/omnibus-add-report/references/report-package.md) en een [hulpmiddel voor fasebewijzen](../../skills/omnibus-add-report/references/stage-receipts.md). De voorbereiding en definitieve vrijgave ontbreken nog in de zelfstandige route; zie [#225](https://github.com/Robert-Worm/omnibus/issues/225). Doe eerst de leesproef. Laat een ontbrekend hulpmiddel of bewijs niet door de AI verzinnen.

Alle voorbeelden gebruiken `omnibus-add-report`. Voor een wet of kader gebruik je `omnibus-add-framework`, voor een onderzoeksmodel `omnibus-add-model`.

## Wat heb je nodig?

Je hebt een browser, Verkenner op Windows of Finder op macOS en je AI-app nodig. Je hoeft Omnibus niet te installeren of een database op te halen.

De app moet alle nodige skillbestanden kunnen lezen en bestanden kunnen maken. Controleer welke functies jouw account en werkruimte toestaan met de proef hieronder.

## Stap voor stap

### 1. Download de skill zonder terminal

1. Open [Omnibus op GitHub](https://github.com/Robert-Worm/omnibus). Boven de bestanden staat de groene knop **Code**. Kies daarin **Download ZIP**.
2. Pak het gedownloade bestand `omnibus-main.zip` uit. Op Windows: rechtsklik in Verkenner en kies **Alles uitpakken**. Op macOS: dubbelklik in Finder op de zip.
3. Open de uitgepakte map `omnibus-main` en daarna `skills`. Zie je eerst nog een map `omnibus-main`, open die ook.
4. Kies de hele map van jouw skill, bijvoorbeeld `omnibus-add-report`. Bewaar alle bestanden daarin, ook `SKILL.md`, `references/`, `assets/`, `agents/` en eventuele `scripts/`.

Deze download bevat de code en skills van de huidige `main`, geen database. De [downloaduitleg van GitHub](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-files-from-github) beschrijft dezelfde route.

**Gelukt als:** je in `skills/omnibus-add-report/` het bestand `SKILL.md` en de meegeleverde submappen ziet.

### 2. Maak een zip van de skillmap

Blijf in de uitgepakte map `skills`. Selecteer één hele skillmap, bijvoorbeeld `omnibus-add-report`.

- **Windows:** rechtsklik op die map. Kies zo nodig **Meer opties weergeven**, daarna **Verzenden naar** → **Gecomprimeerde (gezipte) map**.
- **macOS:** klik met de Control-toets ingedrukt op die map in Finder en kies **Comprimeer**.

Zie de uitleg voor [zippen in Windows](https://support.microsoft.com/nl-nl/windows/experience/storage-filemanagement/zip-and-unzip-files) of [zippen op de Mac](https://support.apple.com/nl-nl/guide/mac-help/mchlp2528/mac).

Controleer de nieuwe `omnibus-add-report.zip`. Open hem in Verkenner, of pak een controlekopie uit in Finder. De zip bevat de skillmap zelf. Voor dit voorbeeld is de volledige inhoud:

```text
omnibus-add-report.zip
└── omnibus-add-report/
    ├── SKILL.md
    ├── README.md
    ├── LICENSE
    ├── agents/
    │   └── openai.yaml
    ├── scripts/
    │   ├── report-stages.mjs
    │   └── stage-receipts.mjs
    ├── references/
    │   ├── report-method.md
    │   ├── report-package.md
    │   ├── stage-receipts.md
    │   └── report-kit/
    │       ├── QUALITY.md
    │       ├── OUTPUT-CONTRACT.md
    │       ├── SOURCE-OUTPUT.md
    │       ├── REVIEW-CONTRACT.json.example
    │       ├── contracts/
    │       │   ├── CONTRACT.md
    │       │   └── record_contract.py
    │       └── roles/
    │           ├── source-reader.md
    │           ├── reconciler.md
    │           ├── practical-author.md
    │           ├── source-reviewer.md
    │           └── practical-reviewer.md
    └── assets/
        └── intake-plan.json.example
```

Andere skills kunnen ook een map `scripts/` hebben. Laat die bestanden staan. Upload niet de hele `omnibus-main.zip` als skill, en zip niet alleen `SKILL.md`.

**Gelukt als:** de zip direct de gekozen skillmap bevat, met alle bestanden en zonder extra buitenmap `skills` of `omnibus-main`.

### 3. Laad de skill in je assistent

#### De Claude-app (web of desktop)

1. Open **Customize** → **Skills**. Volgens de [uitleg van Anthropic](https://support.claude.com/en/articles/12512180-use-skills-in-claude) moeten code-uitvoering en het maken van bestanden aanstaan. Je organisatie kan deze functies beperken.
2. Kies **+** → **Create skill** → **Upload a skill** en selecteer je `omnibus-add-report.zip`. Zet de skill aan. Anthropic beschrijft ook de [vereiste zipindeling](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills).
3. Start een gesprek en doe eerst de proef hieronder. Ontbreekt de uploadfunctie? Controleer de actuele uitleg van Anthropic en de instellingen van je werkruimte.

#### ChatGPT

OpenAI maakt onderscheid tussen lokale skills in de desktopapp en skills via plugins. De [officiële uitleg over skills](https://learn.chatgpt.com/docs/build-skills) beschrijft geen algemene zip-installatieknop voor elke ChatGPT-omgeving.

1. Voeg de bestanden uit je uitgepakte skillmap toe aan een gesprek of aan de bronnen van een [ChatGPT-project](https://learn.chatgpt.com/docs/projects). Neem ook de bestanden uit de submappen mee. Biedt jouw omgeving het lezen van zipbestanden aan, dan kun je de hele skillzip als bijlage proberen.
2. Vermeld de oorspronkelijke paden, zoals `references/report-method.md`, als bijlagen zonder mapindeling verschijnen. Vraag om de bestanden als werkinstructie te gebruiken. Bijlagen toevoegen installeert geen herbruikbare skill.
3. Doe eerst de proef hieronder. Wordt een bestandstype geweigerd of kan de assistent een nodig bestand niet lezen? Gebruik dan een omgeving die de volledige map kan lezen. Verwijder geen bestanden om de upload passend te maken.

### 4. Controleer vóór je begint

Vraag je assistent:

> Lees SKILL.md en de meegeleverde naslag. Noem per bestand het oorspronkelijke pad en één concrete vereiste die erin staat. Noem verwijzingen die je niet kunt openen. Voor omnibus-add-report: lees references/report-package.md en assets/intake-plan.json.example. Noem de verplichte bestandsrollen en de nog ontbrekende uitvoerhulpmiddelen. Maak nog geen extractie of reviewbewijs. Geef aan welke afzonderlijke lezingen of reviews nog nodig zijn.

**Gelukt als:** de assistent de bestanden kan lezen en ontbrekende onderdelen concreet noemt. Alleen zeggen dat de skill geladen is, bewijst dit niet.

**Wat jij doet en wat de beheerder doet**

| Jij | De beheerder |
| --- | --- |
| De skill uitvoeren en het volledige pakket samenstellen | Bestanden, bronbinding en reviewbewijs controleren |
| De vereiste onafhankelijke lezingen en reviews laten uitvoeren | Formele toelating en integratie beoordelen |
| Bronpassages nalopen en twijfels als HOLD vastleggen | Onopgeloste punten teruggeven voor herstel |

Mist je assistent iets voor een volledige review? Dan schrijft hij dat op als `HOLD` of `PENDING_REVIEW`. Bewaar het als tussenresultaat; lever het nog niet als compleet pakket in. Heeft je app geen deelagenten, gebruik dan een nieuwe chat per onafhankelijke rol. Geef een blinde lezer alleen de bron en de eigen rolinstructie, nooit de bevindingen van de andere lezer. Ontbreekt die rolinstructie, stop dan bij dat ontbrekende onderdeel.

## Goed om te weten

- **De skill noemt soms opdrachten** zoals `npm run content:intake`. Kun je die niet uitvoeren, vermeld dat dan. Laat de ontvangende omgeving de echte controle uitvoeren; maak zelf geen geslaagd resultaat of goedkeuring.
- **Lange rapporten** passen niet altijd in één gesprek. Werk dan per hoofdstuk, en noteer welke pagina's gelezen zijn. Wat niet gelezen is, blijft `HOLD`.
- **Deel alleen wat je mag delen.** Controleer of je de bron met jouw AI-dienst mag delen, ook bij een openbaar rapport. Vertrouwelijke stukken vereisen toestemming.
- **Controleer altijd zelf** of de bronpassages kloppen, zoals beschreven in [een bron verwerken](bron-verwerken.md#4-controleer-het-resultaat).

## Technische details

Werk je met Codex of Claude Code? Gebruik dan deze ontwikkelaarsroutes. Deze programma's moeten al beschikbaar zijn.

### Codex

1. Haal de repository op en installeer de onderdelen, zie [installeren](../gebruiken/installeren.md), stap 1 en 2.
2. Installeer de skill:

   ```text
   npm run skills:install -- --skill omnibus-add-report
   ```

3. Start Codex en vraag: *Gebruik $omnibus-add-report voor dit rapport.* Doe eerst de [leesproef](#4-controleer-vóór-je-begint).

### Claude Code

1. Kopieer de hele map `skills/omnibus-add-report/` uit de download naar je eigen skills-map. Het bestand staat daarna op `~/.claude/skills/omnibus-add-report/SKILL.md`. Op Windows is `~` je gebruikersmap, bijvoorbeeld `C:\Users\jouwnaam`. Bewaar eigen aanpassingen als daar al een skill staat.
2. Start Claude Code in een map met je bron.
3. Vraag: *Gebruik de skill omnibus-add-report voor dit rapport*, of typ `/omnibus-add-report`. Doe eerst de [leesproef](#4-controleer-vóór-je-begint).

Zie ook de [uitleg voor Claude Code](https://code.claude.com/docs/en/skills).

## Samengevat

Download de codezip via GitHub, pak hem uit en zip één hele skillmap met Verkenner of Finder. Volg daarna de route voor jouw app en controleer of alle nodige bestanden leesbaar zijn. Lever pas een compleet pakket in als de vereiste lezingen, reviews en bestanden aanwezig zijn.

## Volgende stap

Verder met [een bron verwerken](bron-verwerken.md), stap 2.

---

[↑ Meedoen](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
