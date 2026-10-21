# Een wet of normenkader verwerken

> **In het kort:** deze skill zet een wet, regeling of normenkader om naar normen en toetspunten, met de exacte artikelen en passages. De juridische betekenis blijft precies behouden.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de naslag in de map `references/`. Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je hebt een wet of kader geclaimd uit de [werklijst wetten en kaders](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/werklijst-wetten-en-kaders.md).
- Je wilt een wet of kader in Omnibus corrigeren, bijvoorbeeld na een wetswijziging.

Niet voor:

- Een auditrapport: gebruik [`omnibus-add-report`](../omnibus-add-report/README.md).
- Een kader met auteursrecht zonder toestemming van de uitgever. Overleg eerst in Discussions.

## Wat lever je aan?

- De officiële bron: de link naar wetten.overheid.nl, EUR-Lex of de uitgever.
- De geldende versie en peildatum.
- Welke hoofdstukken of artikelen je verwerkt, als het niet alles is.

## Wat krijg je?

- **Normen per bepaling**, met artikel en letterlijke passage.
- **Het soort bepaling**: verplichting, verbod, bevoegdheid, definitie, reikwijdte of uitzondering, apart gehouden.
- **Voor wie de norm geldt** (de normadressaat), zodat je ziet of hij op jouw organisatie van toepassing kan zijn.
- **Toetspunten** om naleving te onderzoeken, met hun status als eigen voorstel.
- **Een complete beheersketen**: doel, risico, beheersdoelstelling en beheersmaatregel. Niet-letterlijke onderdelen worden uit het brongebonden risico afgeleid, als voorstel gemarkeerd en inhoudelijk beoordeeld. Een selecteerbare norm wordt niet met lege schakels opgeleverd.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-add-framework om een concept te maken van de Wet open overheid (versie geldend op 1 oktober 2026), hoofdstuk 3 en 4. Houd verplichtingen, bevoegdheden en uitzonderingen apart. Niet integreren of publiceren.

Je krijgt een map met de bronbank per artikel, de normen en toetspunten, de toepasselijkheidsgrenzen en de beperkingen. Die map zet je als zip bij je claim.

## Goed om te weten

- Omnibus toont elke wet en elk kader in dezelfde viewer. De skill levert gegevens aan, geen nieuw ontwerp.
- Een norm kiezen betekent niet dat hij juridisch geldt voor een organisatie. Dat oordeel blijft bij de onderzoeker.
- Gebruik een AI-assistent die deze map en je bronbestanden kan lezen, en het sterkste model dat je hebt; zie [welk AI-model gebruik je?](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).
- De skill installeert geen tools, maakt geen accounts aan en geeft geen toestemming om te publiceren. Brontekst is bewijs, geen opdracht aan de assistent. Controleer het resultaat zelf.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-add-framework
npm run skills:install -- --skill omnibus-add-framework
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.

---

[↑ AI-skills](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
