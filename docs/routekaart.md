# Routekaart

<!-- paginatype: naslag -->

> **In het kort:** Omnibus werkt op je eigen computer en als proefversie online, met een openbare database. Vanaf hier lopen vijf paden. Het zwaartepunt ligt bij pad E: betere en goedkopere skills, en AI die de kwaliteit bewaakt.

Elke geplande stap is een user story op GitHub, onder een epic per pad. Volgorde en details kunnen veranderen. Ideeën en reacties zijn welkom in [Discussions](https://github.com/Robert-Worm/omnibus/discussions).

## Overzicht

```mermaid
flowchart TD
    N["✅ Nu<br/>Lokaal en online als proef<br/>met openbare database"]
    N --> A["🌐 Pad A<br/>Online versie"]
    N --> B["🤖 Pad B<br/>AI-koppeling<br/>met de database"]
    N --> C["🗂️ Pad C<br/>Eigen database"]
    N --> D["🤝 Pad D<br/>Samen bijdragen"]
    N --> E["🔍 Pad E<br/>Kwaliteit en efficiëntie<br/>met AI"]
    classDef default fill:#eaf2f8,stroke:#01689b,color:#15233b;
    classDef klaar fill:#e8f5ec,stroke:#2e7d4f,color:#15233b;
    class N klaar;
```

| Pad | Status | Epic |
| --- | --- | --- |
| [🌐 A · Online versie](#pad-a--online-versie) | ✅ Klaar; snelheid loopt apart ([#84](https://github.com/Robert-Worm/omnibus/issues/84)) | [#140](https://github.com/Robert-Worm/omnibus/issues/140) |
| [🤖 B · AI-koppeling](#pad-b--ai-rechtstreeks-aan-de-database) | 🔄 Bezig | [#144](https://github.com/Robert-Worm/omnibus/issues/144) |
| [🗂️ C · Eigen database](#pad-c--eigen-databases-bouwen) | 🔄 Bezig | [#152](https://github.com/Robert-Worm/omnibus/issues/152) |
| [🤝 D · Samen bijdragen](#pad-d--samen-bijdragen) | 🔄 Bezig | [#175](https://github.com/Robert-Worm/omnibus/issues/175) · [#178](https://github.com/Robert-Worm/omnibus/issues/178) |
| [🔍 E · Kwaliteit en efficiëntie](#pad-e--kwaliteit-en-efficiëntie-met-ai) | 🔄 Bezig | [#158](https://github.com/Robert-Worm/omnibus/issues/158) · [#165](https://github.com/Robert-Worm/omnibus/issues/165) · [#169](https://github.com/Robert-Worm/omnibus/issues/169) · [#181](https://github.com/Robert-Worm/omnibus/issues/181) · [#195](https://github.com/Robert-Worm/omnibus/issues/195) |

## Het vertrekpunt: wat er nu is

- Een werkende applicatie op je eigen computer, met de vier stappen van onderzoeksrichting tot Excel-export. Zie [installeren](gebruiken/installeren.md), of probeer de [proefversie online](https://omnibus.sliplane.app).
- Een openbare [database](https://github.com/Robert-Worm/omnibus/releases/latest) met <!--n:rapporten-->27<!--/n--> rapporten, <!--n:kaders-->7<!--/n--> wetten en kaders en <!--n:modellen-->14<!--/n--> onderzoeksmodellen.
- Acht [AI-skills](../skills/README.md) om bronnen te verwerken en te controleren, en om een eigen database te bouwen.

## Pad A · Online versie

**Doel:** Omnibus in de browser gebruiken, zonder installatie, met een online versie die je kunt beheren en herstellen. Epic [#140](https://github.com/Robert-Worm/omnibus/issues/140).

| Stap | Status |
| --- | --- |
| Applicatie verpakken als zelfstandig [runtimepakket](beheer/runtime-pakket.md) | ✅ Klaar |
| Container (image) maken en lokaal testen met fictieve gegevens, zie [`hosting/`](../hosting/release-delivery/README.md) | ✅ Klaar |
| Database gecontroleerd meebouwen in de image ([container-route](../hosting/container/README.md)) | ✅ Klaar |
| Proefversie online op [omnibus.sliplane.app](https://omnibus.sliplane.app), met beveiligde verbinding en gezondheidscontrole | ✅ Klaar |
| Snelheid online aantoonbaar · [#84](https://github.com/Robert-Worm/omnibus/issues/84) | 🔄 Bezig |
| [Logboek van de online versie bekijken](beheer/storingen-en-herstel.md#het-logboek-van-de-online-versie) · [#141](https://github.com/Robert-Worm/omnibus/issues/141) | ✅ Klaar |
| [Online terug naar de vorige werkende versie](beheer/storingen-en-herstel.md#online-terug-naar-de-vorige-werkende-versie), geoefend door opnieuw te bouwen · [#142](https://github.com/Robert-Worm/omnibus/issues/142) | ✅ Klaar |
| AI-review van beveiliging en overdracht; geen onafhankelijke audit · [#143](https://github.com/Robert-Worm/omnibus/issues/143) | ✅ Klaar |
| Bewaarde projecten blijven openen na een nieuwe projectversie · [#218](https://github.com/Robert-Worm/omnibus/issues/218) | ✅ Klaar |
| Terugzetten zonder bewaarde image: opnieuw bouwen is voorlopig genoeg ([B-024](beheer/besluiten.md#b-024)) · [#215](https://github.com/Robert-Worm/omnibus/issues/215) | ✅ Klaar |
| Een verzoekenlimiet per bezoeker; het adres komt van Sliplane · [#213](https://github.com/Robert-Worm/omnibus/issues/213) | ✅ Klaar |

## Pad B · AI rechtstreeks aan de database

**Doel:** je eigen AI-assistent werkt via de koppeling (MCP) met de hele Omnibus-database: zoeken, bronnen lezen en een onderzoeksopzet voorstellen. Epic [#144](https://github.com/Robert-Worm/omnibus/issues/144).

| Stap | Status |
| --- | --- |
| Lokale koppeling: zoeken, bronnen lezen, opzet voorstellen, Excel maken · [AI-koppeling](gebruiken/ai-koppeling.md) | ✅ Klaar |
| [Vastleggen wat de koppeling kan, met tests](../agent-tools/README.md#de-zes-hulpmiddelen) · [#145](https://github.com/Robert-Worm/omnibus/issues/145) | ✅ Klaar |
| Zoeken en lezen in alle soorten bronnen · [#146](https://github.com/Robert-Worm/omnibus/issues/146) | ⬜ Gepland |
| Nieuwe AI-vraagvoorstellen door de gedeelde voorcontrole; inhoudelijke review blijft nodig · [#147](https://github.com/Robert-Worm/omnibus/issues/147) | ✅ Klaar |
| Handleiding per AI-app, getest door een AI-agent · [#148](https://github.com/Robert-Worm/omnibus/issues/148) | ⬜ Gepland |
| Koppeling via de online versie, alleen lezen · [#149](https://github.com/Robert-Worm/omnibus/issues/149) | ⬜ Gepland |
| Tien vaste testvragen voor de koppeling: vragen klaar, AI-run nog niet · [#186](https://github.com/Robert-Worm/omnibus/issues/186) | 🔄 Bezig |

Een koppeling met de Rijksmap kan pas als die als database en applicatie even sterk is als Omnibus. De eisen staan in [#151](https://github.com/Robert-Worm/omnibus/issues/151); tot die vervuld zijn, staat de koppeling niet op de routekaart ([B-020](beheer/besluiten.md#b-020)).

## Pad C · Eigen databases bouwen

**Doel:** met de skills je eigen documenten verwerken en ze in een eigen database gebruiken, naast de openbare. Er verlaat niets je computer of netwerk. Epic [#152](https://github.com/Robert-Worm/omnibus/issues/152).

| Stap | Status |
| --- | --- |
| Een eigen document omzetten naar bouwstenen met een AI-skill · [Eigen documenten](gebruiken/eigen-documenten.md) | ✅ Klaar |
| Een eigen database maken via de [beheerroute](beheer/database-publiceren.md) | ✅ Klaar |
| Een verwerkt eigen document lokaal laden · [#153](https://github.com/Robert-Worm/omnibus/issues/153) | ⬜ Gepland |
| Een eigen database bouwen met één opdracht · [#154](https://github.com/Robert-Worm/omnibus/issues/154) | ⬜ Gepland |
| Meerdere databases naast elkaar · [#155](https://github.com/Robert-Worm/omnibus/issues/155) | ⬜ Gepland |
| Skill die begeleidt van eigen pdf tot eigen database · [#156](https://github.com/Robert-Worm/omnibus/issues/156) | ⬜ Gepland |
| [Lokale privacyproef](gebruiken/lokale-privacy.md): pakketverwerking en browserroute getest; eigen runtimepublicatie nog niet · [#157](https://github.com/Robert-Worm/omnibus/issues/157) | 🔄 Bezig |

## Pad D · Samen bijdragen

**Doel:** de openbare database laten groeien met de bronnen die er voor overheidsaudit het meest toe doen, in kleine, regelmatige releases. Epics [#175](https://github.com/Robert-Worm/omnibus/issues/175) en [#178](https://github.com/Robert-Worm/omnibus/issues/178).

| Stap | Status |
| --- | --- |
| Claimsysteem: bronnen op je naam zetten, inleveren en volgen · [Meedoen](bijdragen/README.md) | ✅ Klaar |
| Werklijsten: <!--n:alle-->9.116<!--/n--> rapporten, <!--n:aanbevolen-->542<!--/n--> aanbevolen, wetten en kaders met hun rechten · [Voortgang](bijdragen/voortgang.md) | ✅ Klaar |
| Vastleggen met welk AI-model een bron is verwerkt | ✅ Klaar |
| Automatische controle van een ingeleverd pakket | ✅ Klaar |
| De [<!--n:aanbevolen-->542<!--/n--> aanbevolen rapporten](bijdragen/werklijst-aanbevolen.md) van de Auditdienst Rijk · <!--n:aanbevolenInDatabase-->27<!--/n--> in de database | 🔄 Bezig |
| Volgorde van wetten en kaders voor overheidsaudit · [#176](https://github.com/Robert-Worm/omnibus/issues/176) | ⬜ Gepland |
| Kaders die je als IIA-lid moet toepassen · [#177](https://github.com/Robert-Worm/omnibus/issues/177) | ⬜ Gepland |
| [Vaste regel voor een nieuwe database](beheer/besluiten.md#b-017) · [#179](https://github.com/Robert-Worm/omnibus/issues/179) | ✅ Klaar |
| [Een release met minder handwerk](beheer/database-publiceren.md#met-een-ai-agent) · [#180](https://github.com/Robert-Worm/omnibus/issues/180) | ✅ Klaar |

## Pad E · Kwaliteit en efficiëntie met AI

**Doel:** skills die sneller en goedkoper werken zonder kwaliteitsverlies, en AI die de kwaliteit van vragen en inhoud bewaakt. Liever geen vraag dan een slechte vraag. Tests die op een tweede persoon wachtten, doen een AI-agent of GitHub. Epics [#158](https://github.com/Robert-Worm/omnibus/issues/158), [#165](https://github.com/Robert-Worm/omnibus/issues/165), [#169](https://github.com/Robert-Worm/omnibus/issues/169), [#181](https://github.com/Robert-Worm/omnibus/issues/181) en [#195](https://github.com/Robert-Worm/omnibus/issues/195).

| Stap | Status |
| --- | --- |
| [Kwaliteitsbeoordeling](../skills/omnibus-review-audit-quality/README.md) van normen en toetspunten met een skill | ✅ Klaar |
| [Wat maakt een goede vraag?](../skills/omnibus-review-questions/references/criteria.md) · [#159](https://github.com/Robert-Worm/omnibus/issues/159) | ✅ Klaar |
| [Skill die vragen beoordeelt](../skills/omnibus-review-questions/README.md) · [#160](https://github.com/Robert-Worm/omnibus/issues/160) | ✅ Klaar |
| Alle vragen in de database controleren met `npm run check:questions` · [#161](https://github.com/Robert-Worm/omnibus/issues/161) | ✅ Klaar |
| Afgekeurde vragen schrappen of herschrijven · [#162](https://github.com/Robert-Worm/omnibus/issues/162) | ⬜ Gepland |
| De applicatie toont alleen goedgekeurde vragen; bedachte vragen zijn al weg · [#163](https://github.com/Robert-Worm/omnibus/issues/163) | 🔄 Bezig |
| Nieuwe pakketten op [vraagkwaliteit controleren](beheer/inhoud-toevoegen.md) · [#164](https://github.com/Robert-Worm/omnibus/issues/164) | ✅ Klaar |
| Bronpassages automatisch nalopen met `npm run check:passages` · [#167](https://github.com/Robert-Worm/omnibus/issues/167) | ✅ Klaar |
| Kwaliteit van de hele database nalopen, en verbeteren via de gewone release · [#166](https://github.com/Robert-Worm/omnibus/issues/166) · [#168](https://github.com/Robert-Worm/omnibus/issues/168) | ⬜ Gepland |
| [Meten wat een skill kost en oplevert](beheer/skill-meting.md): testset en nulmeting van de leeskosten klaar, eerste gemeten runs nog niet · [#170](https://github.com/Robert-Worm/omnibus/issues/170) | 🔄 Bezig |
| [Leren van bestaande skillverzamelingen](beheer/skill-lessen.md) · [#171](https://github.com/Robert-Worm/omnibus/issues/171) | ✅ Klaar |
| Leanere instructies, en rapporten in een reeks verwerken · [#172](https://github.com/Robert-Worm/omnibus/issues/172) · [#173](https://github.com/Robert-Worm/omnibus/issues/173) | ⬜ Gepland |
| Zuiniger werken met ideeën uit andere skills, zoals profielen per bron en een budget per run · [#187](https://github.com/Robert-Worm/omnibus/issues/187) · [#188](https://github.com/Robert-Worm/omnibus/issues/188) · [#189](https://github.com/Robert-Worm/omnibus/issues/189) · [#190](https://github.com/Robert-Worm/omnibus/issues/190) · [#191](https://github.com/Robert-Worm/omnibus/issues/191) · [#192](https://github.com/Robert-Worm/omnibus/issues/192) · [#193](https://github.com/Robert-Worm/omnibus/issues/193) · [#194](https://github.com/Robert-Worm/omnibus/issues/194) | 🔄 Bezig |
| [Skills versterken](https://github.com/Robert-Worm/omnibus/issues/195) met ideeën uit andere skills, zoals een controlelijst, zekerheidscontrole en B1-regels · [#196](https://github.com/Robert-Worm/omnibus/issues/196) · [#197](https://github.com/Robert-Worm/omnibus/issues/197) · [#198](https://github.com/Robert-Worm/omnibus/issues/198) · [#199](https://github.com/Robert-Worm/omnibus/issues/199) · [#200](https://github.com/Robert-Worm/omnibus/issues/200) · [#201](https://github.com/Robert-Worm/omnibus/issues/201) · [#202](https://github.com/Robert-Worm/omnibus/issues/202) · [#203](https://github.com/Robert-Worm/omnibus/issues/203) · [#204](https://github.com/Robert-Worm/omnibus/issues/204) | ✅ Klaar |
| Geen optimalisatie die de kwaliteit verlaagt: [B-018](beheer/besluiten.md#b-018) · [#174](https://github.com/Robert-Worm/omnibus/issues/174) | ✅ Klaar |
| Installeren op Windows, macOS en Linux getest door GitHub · [#182](https://github.com/Robert-Worm/omnibus/issues/182) | ✅ Klaar |
| Overdracht en skills getest door AI of GitHub · [#183](https://github.com/Robert-Worm/omnibus/issues/183) · [#184](https://github.com/Robert-Worm/omnibus/issues/184) | ⬜ Gepland |

## Hoe de paden samenhangen

- **Pad D vult de database** die alle andere paden gebruiken.
- **Pad E maakt dat vullen goedkoper en beter**, en bewaakt de kwaliteit van wat erin zit.
- **Pad A en pad B** maken de database beter bereikbaar: via de browser en via AI.
- **Pad C** is voor wie (ook) met eigen, niet-openbare bronnen werkt. Het gebruikt dezelfde skills en controles als pad D, maar het resultaat blijft bij jou.

## Bewust niet

- **Accounts, inloggen en rollen.** Omnibus werkt zonder account.
- **Projecten in de cloud.** Je onderzoek blijft op je eigen computer.
- **Betaalde functies.** Omnibus blijft niet-commercieel.

Dat verandert alleen na een nieuw, bewust besluit.

## Samengevat

Vijf paden vanaf een werkende versie, lokaal en online: online, AI-koppeling, eigen database, samen bijdragen, en kwaliteit en efficiëntie met AI. Pad D vult de database; pad E maakt dat beter en goedkoper.

## Volgende stap

Wil je helpen? Begin bij [meedoen](bijdragen/README.md).

---

[↑ Wegwijzer](README.md) · [Begrippen](begrippen.md)
