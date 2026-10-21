# Besluiten van de beheerder

<!-- paginatype: logboek -->

> **In het kort:** welke besluiten over Omnibus al genomen zijn, waarom, en wat het gevolg is. Lees dit voordat je iets verandert wat hier staat; voeg elk nieuw besluit toe.

## Zo gebruik je deze lijst

Het nieuwste besluit staat bovenaan. Elk besluit heeft een vaste ID, zoals B-001; verwijs daarnaar met een link als `besluiten.md#b-001`.

Een besluit geldt tot er een nieuw besluit is dat het vervangt. Wil je een besluit veranderen? Bespreek het in [Discussions](https://github.com/Robert-Worm/omnibus/discussions) en zet het nieuwe besluit bovenaan, met het volgende nummer en een verwijzing naar het oude. Haal oude besluiten niet weg. Zet bij het oude besluit in de kolom *Gevolg* vooraan **Vervangen door B-0xx.**

## De besluiten

| ID | Datum | Besluit | Reden | Gevolg |
| --- | --- | --- | --- | --- |
| <a id="b-013"></a>B-013 | 2026-10-21 | De applicatiecode blijft voorlopig in vier mappen | Verplaatsen vraagt een nieuw runtimecontract en een nieuwe databaserelease | Zie [het onderzoek](../bijdragen/architectuur.md#onderzoek-alle-applicatiecode-in-één-map) |
| <a id="b-012"></a>B-012 | 2026-10-21 | Vaste bouwstenen voor elke pagina: paginatypen, tabelvormen, statuslabels en GitHub-meldingen met een vet Nederlands woord vooraan | Een professionele, rustige weergave die overal gelijk is | Zie de [bouwstenen](../bijdragen/bouwstenen.md); de documentatiecheck bewaakt paginatypen en meldingen |
| <a id="b-011"></a>B-011 | 2026-10-21 | De online versie is bereikbaar via links vanaf andere sites (mail, zoekmachine) | Een gedeelde link moet gewoon werken; beveiliging mag de site niet onbruikbaar maken | Alleen het openen van een pagina mag; andere sites kunnen geen gegevens opvragen en Omnibus niet insluiten |
| <a id="b-010"></a>B-010 | 2026-10-21 | De online versie draait bij Sliplane (Starter, €9 per maand, verkeer inbegrepen), met de openbare database in de image | Vaste, voorspelbare kosten; geen rekening per GB; geen aparte database of schijf nodig | Zie [online zetten in een container](../../hosting/container/README.md) |
| <a id="b-009"></a>B-009 | 2026-10-21 | Geen pilot met externe bijdragers in de huidige ronde | Nu niet nodig | Kan later opnieuw worden opgepakt |
| <a id="b-008"></a>B-008 | 2026-10-21 | Bijdragers mogen hooguit vijf bronnen tegelijk claimen | Bronnen naast elkaar verwerken kan, zonder dat er veel blijft liggen | De claimbot sluit een zesde claim, met uitleg |
| <a id="b-007"></a>B-007 | 2026-10-20 | De voortgang loopt via GitHub (claims en voortgangspagina) | Eén overzicht voor iedereen | De Content Workbench is op 2026-10-21 uit de repository gehaald |
| <a id="b-006"></a>B-006 | 2026-10-20 | Het eindresultaat heet overal **referentiekader** | Eén woord voorkomt verwarring | De documentatiecheck waarschuwt bij andere woorden voor het eindresultaat |
| <a id="b-005"></a>B-005 | 2026-10-20 | Een test met schermlezer en in desktop-Excel hoort niet bij de online demo | Prioriteit voor de demo van 1 december | Staat als open punt in [ACCESSIBILITY.md](../../ACCESSIBILITY.md) |
| <a id="b-004"></a>B-004 | 2026-10-20 | De vier IIA Topical Requirements blijven met volledige tekst in de database | Bruikbaarheid voor auditors; risico bewust aanvaard | Vraagt de IIA om verwijdering, dan gaan de teksten uit de volgende database. Zie NOTICE. |
| <a id="b-003"></a>B-003 | 2026-10-19 | Code en eigen uitwerkingen onder de PolyForm Noncommercial-licentie | Vrij te gebruiken, niet commercieel | [LICENSE](../../LICENSE) en [NOTICE](../../NOTICE) |
| <a id="b-002"></a>B-002 | 2026-10-19 | De openbare database staat als zip bij de releases, niet in Git | Code en inhoud blijven gescheiden; de repository blijft klein | `check:code-only` weigert databases en bronbestanden in Git |
| <a id="b-001"></a>B-001 | 2026-10-19 | Geen accounts, inloggen of betalingen; projecten blijven op de eigen computer | Eenvoud en privacy; Omnibus is niet-commercieel | Zie [bewust niet](../routekaart.md#bewust-niet) in de routekaart |

## Volgende stap

Lees in het [beheerhandboek](handboek.md) welke taken er per dag, week en release zijn.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
