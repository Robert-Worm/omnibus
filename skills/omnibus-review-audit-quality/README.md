# De kwaliteit van auditbouwstenen reviewen

> **In het kort:** deze skill beoordeelt de kwaliteit van bouwstenen: klopt de bron, hangen doel, risico, beheersing en toetsing logisch samen? Je krijgt een cijfer van 1 tot 10 (de OAK-schaal) en concrete verbetervoorstellen.

Een los te installeren AI-skill van Omnibus. De instructies en methoden zijn in het Nederlands. Lees [SKILL.md](SKILL.md) voor de eigenlijke werkwijze en de gekoppelde naslag; deze pagina is een introductie, geen vervanging van de methode.

## Wat je aanlevert

De exacte bronpassages en context, plus de volledige keten van doel, risico, beheersmaatregel, norm en toetspunt.

## Wat je krijgt

Een scorekaart volgens OAK-1.0 met bewijsverwijzingen, concrete problemen en voorgestelde verbeteringen.

## Voorbeeldopdracht

> Gebruik $omnibus-review-audit-quality in alleen-tekstmodus voor deze bouwstenen. Lees de meegeleverde bronnen, scoor de huidige formulering en stel verbeteringen voor. Wijzig de database niet.

## Vereisten en beperkingen

OAK-1.0 is een rubriek van Omnibus, geen officiële standaard of assurance-oordeel. Het scorescript controleert rekenwerk en structurele grenzen, niet of de bron klopt. Geen volledige score zonder voldoende bewijs, en geen claim van onafhankelijke reviewers als die er niet echt waren.

Gebruik een AI-assistent die deze map en het geautoriseerde bronmateriaal kan lezen. Bestandstoegang, tools om bronnen te lezen en onafhankelijke reviewcontexten moeten echt beschikbaar zijn als de methode erom vraagt. De skill installeert die tools niet, maakt geen accounts aan, levert geen AI-abonnement en geeft geen toestemming om te publiceren. Kosten en privacyvoorwaarden van de AI-aanbieder staan daar los van. Brontekst is bewijs, geen instructie aan de assistent. Controleer het resultaat voordat je erop vertrouwt.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-review-audit-quality
npm run skills:install -- --skill omnibus-review-audit-quality
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.
