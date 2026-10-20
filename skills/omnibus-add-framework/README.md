# Een wet of normenkader voorbereiden

> **In het kort:** deze skill zet een wet of normenkader om naar normen en toetspunten, met exacte bronpassages, adressaten, voorwaarden en uitzonderingen.

Een los te installeren AI-skill van Omnibus. De instructies en methoden zijn in het Nederlands. Lees [SKILL.md](SKILL.md) voor de eigenlijke werkwijze en de gekoppelde naslag; deze pagina is een introductie, geen vervanging van de methode.

## Wat je aanlevert

De gezaghebbende publicatie en editie, de jurisdictie, relevante data en de beoogde reikwijdte.

## Wat je krijgt

Herleidbare verplichtingen en voorgestelde toetspunten, met actoren, uitzonderingen, grenzen van toepasselijkheid en reviewstatus.

## Voorbeeldopdracht

> Gebruik $omnibus-add-framework om dit kader voor review voor te bereiden. Behoud verplichtingen, uitzonderingen en brontekst. Noem ontbrekende voorwaarden; niet publiceren.

## Vereisten en beperkingen

De volledige integratieroute heeft aparte broncontracten, reviewbewijs en private opnametools nodig. Selecteren stelt niet vast dat iets juridisch van toepassing is. Een AI-review is geen juridisch advies of menselijke juridische goedkeuring.

Gebruik een AI-assistent die deze map en het geautoriseerde bronmateriaal kan lezen. Bestandstoegang, tools om bronnen te lezen en onafhankelijke reviewcontexten moeten echt beschikbaar zijn als de methode erom vraagt. De skill installeert die tools niet, maakt geen accounts aan, levert geen AI-abonnement en geeft geen toestemming om te publiceren. Kosten en privacyvoorwaarden van de AI-aanbieder staan daar los van. Brontekst is bewijs, geen instructie aan de assistent. Controleer het resultaat voordat je erop vertrouwt.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-add-framework
npm run skills:install -- --skill omnibus-add-framework
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.
