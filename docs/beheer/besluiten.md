# Besluiten van de beheerder

<!-- paginatype: logboek -->

> **In het kort:** welke besluiten over Omnibus al genomen zijn, waarom, en wat het gevolg is. Lees dit voordat je iets verandert wat hier staat; voeg elk nieuw besluit toe.

## Zo gebruik je deze lijst

Het nieuwste besluit staat bovenaan. Elk besluit heeft een vaste ID, zoals B-001; verwijs daarnaar met een link als `besluiten.md#b-001`.

Een besluit geldt tot er een nieuw besluit is dat het vervangt. Wil je een besluit veranderen? Bespreek het in [Discussions](https://github.com/Robert-Worm/omnibus/discussions) en zet het nieuwe besluit bovenaan, met het volgende nummer en een verwijzing naar het oude. Haal oude besluiten niet weg. Zet bij het oude besluit in de kolom *Gevolg* vooraan **Vervangen door B-0xx.**

## De besluiten

| ID | Datum | Besluit | Reden | Gevolg |
| --- | --- | --- | --- | --- |
| <a id="b-025"></a>B-025 | 2026-10-30 | DORA komt volledig in Omnibus: de verordening en alle geldende RTS, ITS en richtsnoeren, stap voor stap uitgewerkt. Regels voor toezichthouders worden een apart subkader met een eigen blad dat zegt voor wie het is. Vervallen stukken, zoals de ingehaalde DNB Good Practice, komen er niet in; hooguit een verwijzing | Net als bij elk kader gaat het om volledigheid; een deeltje geeft een vals beeld. Dat DORA alleen voor financiële instellingen geldt, is een uitbreiding van de scope, geen reden om delen weg te laten | Zie [epic #267](https://github.com/Robert-Worm/omnibus/issues/267). Eerst uitzoeken welke onderdelen van DORA niet goed in het format van Omnibus passen |
| <a id="b-024"></a>B-024 | 2026-10-27 | Terugzetten online gaat voorlopig door opnieuw te bouwen; geen vooraf bewaarde image | De online versie is een demo; wachten op Docker Hub of npm is dan aanvaardbaar | Opnieuw bekijken samen met B-023. Opties staan in [#215](https://github.com/Robert-Worm/omnibus/issues/215) |
| <a id="b-023"></a>B-023 | 2026-10-24 | Sliplane blijft elke commit op `main` direct uitrollen, ook als de tests nog lopen of falen | De online versie is een demo; een fout is snel hersteld en een nieuwe dienst aanmaken is nu niet nodig | Opnieuw bekijken als echte gebruikers de online versie nodig hebben. Opties staan in [#214](https://github.com/Robert-Worm/omnibus/issues/214) |
| <a id="b-022"></a>B-022 | 2026-10-30 | De beheerder bevestigt toestemming voor verwerking van NOREA-handreikingen. Toegelaten tot de werklijst, met bronvermelding, uitgave en officiële link | Via een contactpersoon bevestigde toestemming. Bewijs blijft privé; rechten blijven bij NOREA. Materiaal van andere rechthebbenden valt hier niet automatisch onder | Vervangt de aanname over openbare beschikbaarheid; vult B-016 aan. [Epic #254](https://github.com/Robert-Worm/omnibus/issues/254) vervangt #210. Opname pas na de gewone inhoudelijke controles |
| <a id="b-021"></a>B-021 | 2026-10-24 | Profielen per bron (*standaard* en *diep*) komen er alleen als de meting laat zien dat de kwaliteit niet daalt | Minder lezingen mag nooit ten koste gaan van de kwaliteit | Uitwerking van [B-018](#b-018). Het voorstel uit [#187](https://github.com/Robert-Worm/omnibus/issues/187) wordt gemeten |
| <a id="b-020"></a>B-020 | 2026-10-24 | De koppeling met de Rijksmap komt pas op de routekaart als de Rijksmap aan alle eisen uit [#151](https://github.com/Robert-Worm/omnibus/issues/151) voldoet | Te vroeg koppelen maakt Omnibus afhankelijk van gegevens zonder vaste versie of controle | De beheerder toetst de eisen. Tot dan gebruikt Omnibus alleen de rapportlinks voor claims |
| <a id="b-019"></a>B-019 | 2026-10-24 | Licht werk krijgt het label **Opus 5.5**: pagina's, stories, besluiten, skills zoeken. Zwaar werk krijgt **ChatGPT Astra**: bronnen, grote reviews, gemeten runs, code | Het Claude-abonnement is beperkt, dat van ChatGPT groot; het zware werk gaat daarheen | Zie [wie pakt welk werk op?](handboek.md#wie-pakt-welk-werk-op). Een epic met beide soorten werk krijgt beide labels |
| <a id="b-018"></a>B-018 | 2026-10-24 | Een skill zuiniger maken mag alleen als de wijziging op de vaste testset is gemeten en de kwaliteitsscore bij geen enkele bron daalt | Efficiëntie mag nooit ten koste gaan van betrouwbaarheid | Zie [skills meten](skill-meting.md). Dit geldt ook voor minder volledige lezingen van de bron |
| <a id="b-017"></a>B-017 | 2026-10-24 | Een nieuwe database bij 5 ingeleverde bronnen, of een maand na de vorige als er minstens één klaarligt | Bijdragers zien hun werk snel terug; kleine releases zijn makkelijker te controleren | De voortgang toont hoeveel bronnen klaarliggen. Bij veel aanbod kan het aantal omhoog |
| <a id="b-016"></a>B-016 | 2026-10-24 | Wetten en kaders met veel belang voor overheidsaudit gaan voor. Kaders met auteursrecht alleen als IIA-leden ze moeten toepassen: GIAS en de vier Topical Requirements | Omnibus is voor overheidsaudit; wat een auditor moet toepassen, hoort erin | Zie de [werklijst wetten en kaders](../bijdragen/werklijst-wetten-en-kaders.md). NOREA: zie [B-022](#b-022) |
| <a id="b-015"></a>B-015 | 2026-10-24 | Geen aparte online demo: de proefversie is de online versie. Geen gebruikerstests of generale repetitie; reviews en tests doet AI waar dat kan | Minder afhankelijk van mensen; de tijd gaat naar kwaliteit en efficiëntie | Vervangt B-005. De checklist live demo is vervallen; wat overblijft staat in [epic #140](https://github.com/Robert-Worm/omnibus/issues/140) |
| <a id="b-014"></a>B-014 | 2026-10-23 | Dependabot-meldingen en geheimen scannen gaan aan; de beheerder beoordeelt een melding binnen 7 dagen, *critical* of *high* binnen 2 werkdagen, een gelekte sleutel direct | Kwetsbare onderdelen en gelekte sleutels wil je weten voordat iemand ze misbruikt | Zie [automatische meldingen](../../SECURITY.md#automatische-meldingen) en het [beheerhandboek](handboek.md) |
| <a id="b-013"></a>B-013 | 2026-10-21 | De applicatiecode blijft voorlopig in vier mappen | Verplaatsen vraagt een nieuw runtimecontract en een nieuwe databaserelease | Zie [het onderzoek](../bijdragen/architectuur.md#onderzoek-alle-applicatiecode-in-één-map) |
| <a id="b-012"></a>B-012 | 2026-10-21 | Vaste bouwstenen voor elke pagina: paginatypen, tabelvormen, statuslabels en GitHub-meldingen met een vet Nederlands woord vooraan | Een professionele, rustige weergave die overal gelijk is | Zie de [bouwstenen](../bijdragen/bouwstenen.md); de documentatiecheck bewaakt paginatypen en meldingen |
| <a id="b-011"></a>B-011 | 2026-10-21 | De online versie is bereikbaar via links vanaf andere sites (mail, zoekmachine) | Een gedeelde link moet gewoon werken; beveiliging mag de site niet onbruikbaar maken | Alleen het openen van een pagina mag; andere sites kunnen geen gegevens opvragen en Omnibus niet insluiten |
| <a id="b-010"></a>B-010 | 2026-10-21 | De online versie draait bij Sliplane (Starter, €9 per maand, verkeer inbegrepen), met de openbare database in de image | Vaste, voorspelbare kosten; geen rekening per GB; geen aparte database of schijf nodig | Zie [online zetten in een container](../../hosting/container/README.md) |
| <a id="b-009"></a>B-009 | 2026-10-21 | Geen pilot met externe bijdragers in de huidige ronde | Nu niet nodig | Kan later opnieuw worden opgepakt |
| <a id="b-008"></a>B-008 | 2026-10-21 | Bijdragers mogen hooguit vijf bronnen tegelijk claimen | Bronnen naast elkaar verwerken kan, zonder dat er veel blijft liggen | De claimbot sluit een zesde claim, met uitleg |
| <a id="b-007"></a>B-007 | 2026-10-20 | De voortgang loopt via GitHub (claims en voortgangspagina) | Eén overzicht voor iedereen | De Content Workbench is op 2026-10-21 uit de repository gehaald |
| <a id="b-006"></a>B-006 | 2026-10-20 | Het eindresultaat heet overal **referentiekader** | Eén woord voorkomt verwarring | De documentatiecheck waarschuwt bij andere woorden voor het eindresultaat |
| <a id="b-005"></a>B-005 | 2026-10-20 | Een test met schermlezer en in desktop-Excel hoort niet bij de online demo | Prioriteit voor de demo van 1 december | **Vervangen door B-015.** Staat als open punt in [ACCESSIBILITY.md](../../ACCESSIBILITY.md) |
| <a id="b-004"></a>B-004 | 2026-10-20 | De vier IIA Topical Requirements blijven met volledige tekst in de database | Bruikbaarheid voor auditors; risico bewust aanvaard | Vraagt de IIA om verwijdering, dan gaan de teksten uit de volgende database. Zie NOTICE. |
| <a id="b-003"></a>B-003 | 2026-10-19 | Code en eigen uitwerkingen onder de PolyForm Noncommercial-licentie | Vrij te gebruiken, niet commercieel | [LICENSE](../../LICENSE) en [NOTICE](../../NOTICE) |
| <a id="b-002"></a>B-002 | 2026-10-19 | De openbare database staat als zip bij de releases, niet in Git | Code en inhoud blijven gescheiden; de repository blijft klein | `check:code-only` weigert databases en bronbestanden in Git |
| <a id="b-001"></a>B-001 | 2026-10-19 | Geen accounts, inloggen of betalingen; projecten blijven op de eigen computer | Eenvoud en privacy; Omnibus is niet-commercieel | Zie [bewust niet](../routekaart.md#bewust-niet) in de routekaart |

## Volgende stap

Lees in het [beheerhandboek](handboek.md) welke taken er per dag, week en release zijn.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
