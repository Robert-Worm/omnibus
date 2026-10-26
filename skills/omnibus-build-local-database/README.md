# Eigen database bouwen

> **In het kort:** deze skill begeleidt je stap voor stap van een eigen pdf tot een eigen database op je computer, in de gewone viewer van Omnibus. Hij gebruikt de andere skills en de bestaande controles in de goede volgorde.

Een los te installeren AI-skill van Omnibus. De eigenlijke werkwijze staat in [SKILL.md](SKILL.md). De technische uitleg staat in [eigen pakketten lokaal laden](../../content-tools/local-database.md). Deze pagina is een introductie, geen vervanging van de methode.

## Wanneer gebruik je deze skill?

- Je wilt eigen rapporten, wetten, kaders of onderzoeksmodellen in Omnibus gebruiken, alleen op je eigen computer.

Niet voor:

- Een bron toevoegen aan de openbare database: dat gaat via een claim, zie [meedoen](../../docs/bijdragen/README.md).
- Alleen een bron omzetten, zonder database: gebruik direct [`omnibus-add-report`](../omnibus-add-report/README.md), [`omnibus-add-framework`](../omnibus-add-framework/README.md) of [`omnibus-add-model`](../omnibus-add-model/README.md).

## Wat lever je aan?

- Je documenten, en de zekerheid dat je ze mag verwerken en met je AI-dienst mag delen.
- Omnibus, op je computer geïnstalleerd met [één opdracht](../../docs/gebruiken/installeren.md#met-één-opdracht).

## Wat krijg je?

- **Een eigen database** met je documenten, te openen op `http://127.0.0.1:4328/`.
- **Een lijst** met per document wat erin zit en wat nog open is.

## Hoe werkt het?

De assistent vraagt eerst wat ontbreekt en zegt eerlijk wat kan. Daarna volgt hij acht stappen: verwerken met de passende skill, kwaliteit controleren, de intake, een pakketlijst, jouw besluit als eigenaar, de invoer controleren, bouwen en openen, en afronden. Na elke stap zie je wat er gelukt is.

## Goed om te weten

- **Rapporten en kaders** komen alleen in de viewer met volledig reviewbewijs. Zonder de verwerkingsomgeving van de beheerder lukt dat nog niet; een onderzoeksmodel wel. Daaraan wordt gewerkt in [#225](https://github.com/Robert-Worm/omnibus/issues/225).
- **Jij bent de eigenaar.** De assistent maakt het besluit pas als jij bevestigt dat de reviews onafhankelijk waren, de bron echt is gelezen en de inhoud klopt met de bron.
- **De gewone Omnibus blijft gelijk.** Je eigen database staat ernaast, alleen op je computer.

---

[↑ AI-skills](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
