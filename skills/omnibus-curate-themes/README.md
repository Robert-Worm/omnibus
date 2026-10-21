# Thema's en processen ordenen

> **In het kort:** deze skill maakt te grote thema's en processen in Omnibus overzichtelijker, door ze op te delen en overlap te beoordelen. Er gaat geen inhoud verloren.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md), met de naslag in de map `references/`. Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Een thema of proces bevat zoveel bouwstenen (ruim boven de 100) dat gebruikers het overzicht verliezen.
- Je vermoedt dat bouwstenen uit verschillende rapporten elkaar grotendeels overlappen.

Niet voor:

- Nieuwe inhoud toevoegen: gebruik [`omnibus-add-report`](../omnibus-add-report/README.md).
- De kwaliteit van losse bouwstenen beoordelen: gebruik [`omnibus-review-audit-quality`](../omnibus-review-audit-quality/README.md).

## Wat lever je aan?

- Welk thema of proces je wilt ordenen.
- De actuele versie van de database waar je mee werkt.

## Wat krijg je?

- **Een inventaris**: hoeveel bouwstenen en toetspunten er per thema en proces zijn.
- **Een voorstel voor deelonderwerpen**, met gewone namen en een korte regel wat erin hoort en wat niet.
- **Een overlapbeoordeling**: welke bouwstenen een voorkeur krijgen en waarom, zonder iets te verwijderen.

## Voorbeeld

Zo kun je de skill aan je AI-assistent vragen:

> Gebruik $omnibus-curate-themes om het thema Besturing te beoordelen. Het heeft nu ruim 200 bouwstenen. Stel bruikbare deelonderwerpen voor en beoordeel overlap. Alleen een voorstel; niets toepassen.

Je krijgt een inventaris met aantallen vóór en na, een voorgestelde indeling met per bouwsteen de toewijzing, en de overlapbesluiten met motivering.

## Goed om te weten

- De grens van ongeveer 100 bouwstenen is een signaal, geen harde regel. Een samenhangende lijst van 104 kan beter zijn dan een onlogische splitsing.
- Een voorstel verandert de applicatie niet. Toepassen vraagt een aparte opdracht.
- Gebruik een AI-assistent die deze map en je bronbestanden kan lezen, en het sterkste model dat je hebt; zie [welk AI-model gebruik je?](https://github.com/Robert-Worm/omnibus/blob/main/docs/bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).
- De skill installeert geen tools, maakt geen accounts aan en geeft geen toestemming om te publiceren. Brontekst is bewijs, geen opdracht aan de assistent. Controleer het resultaat zelf.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-curate-themes
npm run skills:install -- --skill omnibus-curate-themes
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.

---

[↑ AI-skills](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
