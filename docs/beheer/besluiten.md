# Besluiten van de beheerder

<!-- paginatype: logboek -->

> **In het kort:** welke besluiten over Omnibus al genomen zijn, waarom, en wat het gevolg is. Lees dit voordat je iets verandert wat hier staat; voeg elk nieuw besluit toe.

## Zo gebruik je deze lijst

Een besluit geldt tot er een nieuw besluit is dat het vervangt. Wil je een besluit veranderen? Bespreek het in [Discussions](https://github.com/Robert-Worm/omnibus/discussions) en zet het nieuwe besluit hier, met een verwijzing naar het oude. Haal oude besluiten niet weg.

## De besluiten

| Datum | Besluit | Reden | Gevolg |
| --- | --- | --- | --- |
| 2026-10-19 | Geen accounts, inloggen of betalingen; projecten blijven op de eigen computer | Eenvoud en privacy; Omnibus is niet-commercieel | Zie [bewust niet](../routekaart.md#bewust-niet) in de routekaart |
| 2026-10-19 | De openbare database staat als zip bij de releases, niet in Git | Code en inhoud blijven gescheiden; de repository blijft klein | `check:code-only` weigert databases en bronbestanden in Git |
| 2026-10-19 | Code en eigen uitwerkingen onder de PolyForm Noncommercial-licentie | Vrij te gebruiken, niet commercieel | [LICENSE](../../LICENSE) en [NOTICE](../../NOTICE) |
| 2026-10-20 | De vier IIA Topical Requirements blijven met volledige tekst in de database | Bruikbaarheid voor auditors; risico bewust aanvaard | Vraagt de IIA om verwijdering, dan gaan de teksten uit de volgende database. Zie NOTICE. |
| 2026-10-20 | Een test met schermlezer en in desktop-Excel hoort niet bij de online demo | Prioriteit voor de demo van 1 december | Staat als open punt in [ACCESSIBILITY.md](../../ACCESSIBILITY.md) |
| 2026-10-20 | Het eindresultaat heet overal **referentiekader** | Eén woord voorkomt verwarring | De documentatiecheck waarschuwt bij andere woorden voor het eindresultaat |
| 2026-10-20 | De voortgang loopt via GitHub (claims en voortgangspagina) | Eén overzicht voor iedereen | De Content Workbench is op 2026-10-21 uit de repository gehaald |
| 2026-10-21 | Bijdragers mogen hooguit vijf bronnen tegelijk claimen | Bronnen naast elkaar verwerken kan, zonder dat er veel blijft liggen | De claimbot sluit een zesde claim, met uitleg |
| 2026-10-21 | Geen pilot met externe bijdragers in de huidige ronde | Nu niet nodig | Kan later opnieuw worden opgepakt |
| 2026-10-21 | De online versie draait bij Sliplane (Starter, €9 per maand, verkeer inbegrepen), met de openbare database in de image | Vaste, voorspelbare kosten; geen rekening per GB; geen aparte database of schijf nodig | Zie [online zetten in een container](../../hosting/container/README.md) |
| 2026-10-21 | De online versie is bereikbaar via links vanaf andere sites (mail, zoekmachine) | Een gedeelde link moet gewoon werken; beveiliging mag de site niet onbruikbaar maken | Alleen het openen van een pagina mag; andere sites kunnen geen gegevens opvragen en Omnibus niet insluiten |
| 2026-10-21 | Vaste bouwstenen voor elke pagina: paginatypen, tabelvormen, statuslabels en GitHub-meldingen met een vet Nederlands woord vooraan | Een professionele, rustige weergave die overal gelijk is | Zie de [bouwstenen](../bijdragen/bouwstenen.md); de documentatiecheck bewaakt paginatypen en meldingen |
| 2026-10-21 | De applicatiecode blijft voorlopig in vier mappen | Verplaatsen vraagt een nieuw runtimecontract en een nieuwe databaserelease | Zie [het onderzoek](../bijdragen/architectuur.md#onderzoek-alle-applicatiecode-in-één-map) |

## Samengevat

Dertien besluiten bepalen nu hoe Omnibus werkt. Kort gezegd: geen account, de database apart, één woord voor het resultaat en voortgang op GitHub. Verder hooguit vijf claims per persoon en een vaste prijs online.

## Volgende stap

Terug naar het [beheerhandboek](handboek.md).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
