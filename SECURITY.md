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

## Waar kunnen problemen zitten?

Bijvoorbeeld in de bronweergave, het openen van projectbestanden, de Excel-export, de lokale server, de AI-koppeling, de publicatiehulpmiddelen of de gebruikte bibliotheken.

Omnibus draait nu alleen lokaal. De lokale server en de AI-koppeling zijn niet bedoeld als openbare dienst. Een geheim adres of CORS-instelling is geen toegangsbeveiliging.

## Verder lezen

De [acceptatiecontracten](docs/beheer/acceptatiecontracten.md) en de [architectuur](docs/bijdragen/architectuur.md) beschrijven wat beschermd moet blijven. `npm run check:code-only` zoekt naar bestanden en geheimen die niet in Git horen; het is geen volledige beveiligingsscan.
