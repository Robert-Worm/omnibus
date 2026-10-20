# Thema's en overlappende bouwstenen ordenen

> **In het kort:** deze skill deelt te grote thema's op in kleinere en zoekt bouwstenen die elkaar overlappen. Het levert een voorstel; er wordt niets automatisch verborgen.

Een los te installeren AI-skill van Omnibus. De instructies en methoden zijn in het Nederlands. Lees [SKILL.md](SKILL.md) voor de eigenlijke werkwijze en de gekoppelde naslag; deze pagina is een introductie, geen vervanging van de methode.

## Wat je aanlevert

De huidige catalogus, bronversies, bestaande curatiebesluiten en de inhoud op puntniveau.

## Wat je krijgt

Een onderbouwde thema-indeling en voorkeursvoorstellen, met tellingen voor en na en bewijs van dekking.

## Voorbeeldopdracht

> Gebruik $omnibus-curate-themes om een duidelijkere indeling voor te stellen voor dit grote thema. Laat overlap op puntniveau zien en houd twijfelgevallen zichtbaar. Nog niets toepassen.

## Vereisten en beperkingen

Ongeveer 100 bouwstenen is een signaal om te reviewen, geen harde grens. Vergelijkbare formulering is geen bewijs van gelijkwaardigheid. Verborgen alternatieven blijven bereikbaar via hun rapporten; bronnen en opgeslagen onderzoek worden nooit verwijderd. Het inventarisatiehulpmiddel heeft de relevante catalogusinvoer nodig, niet alleen deze map.

Gebruik een AI-assistent die deze map en het geautoriseerde bronmateriaal kan lezen. Bestandstoegang, tools om bronnen te lezen en onafhankelijke reviewcontexten moeten echt beschikbaar zijn als de methode erom vraagt. De skill installeert die tools niet, maakt geen accounts aan, levert geen AI-abonnement en geeft geen toestemming om te publiceren. Kosten en privacyvoorwaarden van de AI-aanbieder staan daar los van. Brontekst is bewijs, geen instructie aan de assistent. Controleer het resultaat voordat je erop vertrouwt.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-curate-themes
npm run skills:install -- --skill omnibus-curate-themes
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.
