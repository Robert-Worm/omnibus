# Een conceptueel model voorbereiden

> **In het kort:** deze skill voegt een bekend onderzoeksmodel toe, met dimensies en interviewvragen per niveau, en controleert of de theorie goed is gebruikt.

Een los te installeren AI-skill van Omnibus. De instructies en methoden zijn in het Nederlands. Lees [SKILL.md](SKILL.md) voor de eigenlijke werkwijze en de gekoppelde naslag; deze pagina is een introductie, geen vervanging van de methode.

## Wat je aanlevert

De primaire modelpublicaties, hun edities, de dimensies en de beoogde respondenten.

## Wat je krijgt

Een modelpakket met herleidbare dimensies, neutrale interviewvragen, niveauvarianten en bewijs van de kwaliteitsreview.

## Voorbeeldopdracht

> Gebruik $omnibus-add-model om het meegeleverde model en de interviewvragen te toetsen aan de primaire publicatie. Alleen voorstellen doen.

## Vereisten en beperkingen

Conceptuele modellen zijn geen juridische normen. Gegenereerde vragen zijn geen gevalideerde meetinstrumenten. De repository bevat hulpmiddelen voor modelkwaliteit, maar niet de private catalogus of de catalogusbrede opdracht uit de methode. Ontbrekende invoer, tools of reviews betekenen dat opname niet als afgerond geldt.

Gebruik een AI-assistent die deze map en het geautoriseerde bronmateriaal kan lezen. Bestandstoegang, tools om bronnen te lezen en onafhankelijke reviewcontexten moeten echt beschikbaar zijn als de methode erom vraagt. De skill installeert die tools niet, maakt geen accounts aan, levert geen AI-abonnement en geeft geen toestemming om te publiceren. Kosten en privacyvoorwaarden van de AI-aanbieder staan daar los van. Brontekst is bewijs, geen instructie aan de assistent. Controleer het resultaat voordat je erop vertrouwt.

## Los installeren

Vanuit de Omnibus-repository kun je alleen deze skill controleren en installeren:

```text
npm run skills:check -- --skill omnibus-add-model
npm run skills:install -- --skill omnibus-add-model
```

Het installatiescript gebruikt de ingestelde Codex-skillsmap en overschrijft nooit een afwijkende bestaande skill. Bekijk en bewaar je eigen aanpassingen voordat je bijwerkt. Kopieer bij handmatig overzetten de hele map, inclusief naslag, scripts, metadata en licentie, niet alleen SKILL.md. Andere assistenten hebben hun eigen manier nodig om deze instructies te laden.

## Licentie

Copyright 2026 Robert Worm en bijdragers. Deze skill valt onder de [PolyForm Noncommercial License 1.0.0](LICENSE): vrij te gebruiken, aan te passen en te delen, niet commercieel, en zonder garantie. De licentie dekt niet de brondocumenten die je aanlevert, en geeft geen toestemming om die met een AI-aanbieder te delen.
