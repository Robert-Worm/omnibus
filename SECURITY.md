# Beveiligingsproblemen melden

> **In het kort:** vond je een beveiligingsprobleem? Meld het vertrouwelijk, niet in een openbaar issue. Gebruik de knop **Report a vulnerability** of mail naar info@rijksmap.nl.

## Zo meld je het

1. Gebruik de knop **Report a vulnerability** onder het tabblad *Security* van deze repository, of mail naar [info@rijksmap.nl](mailto:info@rijksmap.nl) met als onderwerp `Omnibus beveiligingsmelding`.
2. Beschrijf:
   - welke versie (commit) en welk onderdeel het betreft, en je Node-versie en besturingssysteem;
   - wat er mis kan gaan, en onder welke voorwaarden;
   - korte stappen om het na te doen, met een klein fictief voorbeeld.
3. Stuur **geen** wachtwoorden, persoonsgegevens, echte onderzoeksbestanden, databases of werkende aanvalscode mee. Is een beschrijving niet genoeg? Vraag dan eerst om een veilige manier om meer te delen.

## Wat wel en niet mag bij onderzoek

- Test alleen in je eigen, afgeschermde testomgeving, met fictieve gegevens.
- Test geen servers, diensten of gegevens van anderen.
- Beperk een test tot wat nodig is om het probleem aan te tonen.

## Wat gebeurt er met je melding?

De beheerder beoordeelt welke versies geraakt zijn, bevestigt het probleem waar mogelijk en zorgt voor een oplossing en een test. Hoe en wanneer het probleem bekend wordt gemaakt, spreken we samen af. Er is geen vaste reactietermijn: Omnibus is een vrijwilligersproject.

Zijn er mogelijk wachtwoorden of sleutels uitgelekt? Meld dat direct. Een bestand uit de laatste commit verwijderen is niet genoeg: de sleutel moet worden vervangen.

## Automatische meldingen

GitHub kan de beheerder automatisch waarschuwen, op drie manieren. Zo is het afgesproken in [besluit B-014](docs/beheer/besluiten.md#b-014).

> [!IMPORTANT]
> **Stand 23 oktober 2026:** Dependabot-updates werken al. Dependabot-meldingen en geheimen scannen staan nog uit; de beheerder zet ze aan onder *Settings → Code security*.

| Wat | Wat het doet | Wie, en binnen welke termijn |
| --- | --- | --- |
| Dependabot-meldingen | Waarschuwt als een gebruikte bibliotheek een bekende kwetsbaarheid heeft | De beheerder beoordeelt een melding binnen 7 dagen; bij *critical* of *high* binnen 2 werkdagen |
| Dependabot-updates | Stelt elke maand een update voor van de GitHub-workflows en de Node-basis-image van de [container](hosting/container/README.md) | De beheerder bekijkt het voorstel bij de maandelijkse controle |
| Geheimen scannen | Waarschuwt als er een sleutel of wachtwoord in Git terechtkomt, en houdt een push met een herkenbare sleutel tegen | Direct: vervang de sleutel en meld het, zie hierboven |

Een melding beoordelen betekent: kijken of Omnibus het kwetsbare deel echt gebruikt, en zo ja, bijwerken of een reden vastleggen waarom niet. Leg die reden vast in de melding zelf. De instellingen staan onder *Settings → Code security* van de repository.

## Waar kunnen problemen zitten?

Bijvoorbeeld in de bronweergave, het openen van projectbestanden, de Excel-export, de lokale server, de AI-koppeling, de publicatiehulpmiddelen of de gebruikte bibliotheken.

Omnibus draait lokaal en als [proefversie online](https://omnibus.sliplane.app), in openbare alleen-lezen modus. De AI-koppeling is niet bedoeld als openbare dienst. Een geheim adres of CORS-instelling is geen toegangsbeveiliging.

## Verder lezen

De [acceptatiecontracten](docs/beheer/acceptatiecontracten.md) en de [architectuur](docs/bijdragen/architectuur.md) beschrijven wat beschermd moet blijven. `npm run check:code-only` zoekt naar bestanden en geheimen die niet in Git horen; het is geen volledige beveiligingsscan.

---

[↑ Omnibus](README.md) · [Wegwijzer](docs/README.md) · [Begrippen](docs/begrippen.md) · [Routekaart](docs/routekaart.md)
