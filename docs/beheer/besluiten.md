# Besluiten van de beheerder

> **In het kort:** welke besluiten over Omnibus al genomen zijn, waarom, en wat het gevolg is. Lees dit voordat je iets verandert wat hier staat; voeg elk nieuw besluit toe.

## Zo gebruik je deze lijst

Een besluit geldt tot er een nieuw besluit is dat het vervangt. Wil je een besluit veranderen? Bespreek het in [Discussions](https://github.com/Robert-Worm/omnibus/discussions) en zet het nieuwe besluit hier, met een verwijzing naar het oude. Haal oude besluiten niet weg.

## De besluiten

| Datum | Besluit | Reden | Gevolg |
| --- | --- | --- | --- |
| 19-10-2026 | Geen accounts, inloggen of betalingen; projecten blijven op de eigen computer | Eenvoud en privacy; Omnibus is niet-commercieel | Zie [bewust niet](../routekaart.md#bewust-niet) in de routekaart |
| 19-10-2026 | De openbare database staat als zip bij de releases, niet in Git | Code en inhoud blijven gescheiden; de repository blijft klein | `check:code-only` weigert databases en bronbestanden in Git |
| 19-10-2026 | Code en eigen uitwerkingen onder de PolyForm Noncommercial-licentie | Vrij te gebruiken, niet commercieel | [LICENSE](../../LICENSE) en [NOTICE](../../NOTICE) |
| 20-10-2026 | De vier IIA Topical Requirements blijven met volledige tekst in de database | Bruikbaarheid voor auditors; risico bewust aanvaard | Vraagt de IIA om verwijdering, dan gaan de teksten uit de volgende database. Zie NOTICE. |
| 20-10-2026 | Een test met schermlezer en in desktop-Excel hoort niet bij de online demo | Prioriteit voor de demo van 1 december | Staat als open punt in [ACCESSIBILITY.md](../../ACCESSIBILITY.md) |
| 20-10-2026 | Het eindresultaat heet overal **referentiekader** | Eén woord voorkomt verwarring | De documentatiecheck waarschuwt bij andere woorden voor het eindresultaat |
| 20-10-2026 | De voortgang loopt via GitHub (claims en voortgangspagina) | Eén overzicht voor iedereen | De Content Workbench is op 21-10-2026 uit de repository gehaald |
| 21-10-2026 | Bijdragers mogen hooguit vijf bronnen tegelijk claimen | Bronnen naast elkaar verwerken kan, zonder dat er veel blijft liggen | De claimbot sluit een zesde claim, met uitleg |
| 21-10-2026 | Geen pilot met externe bijdragers in de huidige ronde | Nu niet nodig | Kan later opnieuw worden opgepakt |
| 21-10-2026 | De online versie draait bij Sliplane (Starter, €9 per maand, verkeer inbegrepen), met de openbare database in de image | Vaste, voorspelbare kosten; geen rekening per GB; geen aparte database of schijf nodig | Zie [online zetten in een container](../../hosting/container/README.md) |
| 21-10-2026 | De online versie is bereikbaar via links vanaf andere sites (mail, zoekmachine) | Een gedeelde link moet gewoon werken; beveiliging mag de site niet onbruikbaar maken | Alleen het openen van een pagina mag; andere sites kunnen geen gegevens opvragen en Omnibus niet insluiten |
| 21-10-2026 | De applicatiecode blijft voorlopig in vier mappen | Verplaatsen vraagt een nieuw runtimecontract en een nieuwe databaserelease | Zie [het onderzoek](../bijdragen/architectuur.md#onderzoek-alle-applicatiecode-in-één-map) |

## Samengevat

Twaalf besluiten bepalen nu hoe Omnibus werkt. Kort gezegd: geen account, de database apart, één woord voor het resultaat en voortgang op GitHub. Verder hooguit vijf claims per persoon en een vaste prijs online.

## Volgende stap

Terug naar het [beheerhandboek](handboek.md).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
