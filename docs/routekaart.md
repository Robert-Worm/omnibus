# Routekaart

> **In het kort:** Omnibus werkt nu op je eigen computer, met een openbare database. Vanaf hier lopen vier paden naast elkaar: een online versie, AI die rechtstreeks met de database werkt, je eigen databases bouwen, en samen de openbare database laten groeien.

Dit zijn voornemens, geen beloftes. Volgorde en details kunnen veranderen. Ideeën en reacties zijn welkom in [Discussions](https://github.com/Robert-Worm/omnibus/discussions).

## Overzicht

```mermaid
flowchart LR
    N["✅ Nu<br/>Lokaal werkend<br/>met openbare database"]
    N --> A["🌐 Pad A<br/>Online versie"]
    N --> B["🤖 Pad B<br/>AI rechtstreeks<br/>aan de database"]
    N --> C["🗂️ Pad C<br/>Eigen databases<br/>bouwen"]
    N --> D["🤝 Pad D<br/>Samen bijdragen"]
    classDef default fill:#eaf2f8,stroke:#01689b,color:#15233b;
```

| Pad | Doel | Waar staat het | Lees meer |
| --- | --- | --- | --- |
| 🌐 **A · Online versie** | Omnibus gebruiken zonder iets te installeren | 🔄 Voorbereiding loopt | [Pad A](#pad-a--online-versie) |
| 🤖 **B · AI aan de database** | Je AI-assistent laat zoeken en een onderzoeksopzet voorbereiden | ✅ Lokaal werkend | [Pad B](#pad-b--ai-rechtstreeks-aan-de-database) |
| 🗂️ **C · Eigen databases** | Eigen documenten en een eigen database gebruiken, naast de openbare | 🔄 Deels mogelijk | [Pad C](#pad-c--eigen-databases-bouwen) |
| 🤝 **D · Samen bijdragen** | De openbare database samen uitbreiden | ✅ Claimsysteem werkt | [Pad D](#pad-d--samen-bijdragen) |

Legenda: ✅ klaar · 🔄 bezig · ⬜ gepland

## Het vertrekpunt: wat er nu is

- Een werkende applicatie op je eigen computer, met de vier stappen van onderzoeksrichting tot Excel-export. Zie [installeren](gebruiken/installeren.md).
- Een openbare [database](https://github.com/Robert-Worm/omnibus/releases/latest) met 27 rapporten, 7 wetten en kaders en 14 onderzoeksmodellen.
- Zes [AI-skills](../skills/README.md) om bronnen te verwerken en te controleren.

## Pad A · Online versie

**Doel:** Omnibus in de browser gebruiken, zonder installatie. Als eerste mijlpaal een online demo, met als streefdatum 1 december 2026.

| Stap | Status |
| --- | --- |
| Applicatie verpakken als zelfstandig [runtimepakket](beheer/runtime-pakket.md) | ✅ |
| Container (image) maken en lokaal testen met fictieve gegevens, zie [`hosting/`](../hosting/release-delivery/README.md) | ✅ |
| Database veilig naar de server overbrengen en de eerste start regelen | 🔄 |
| Online proef: beveiligde verbinding, probes en logs, snelheid, back-up en herstel | ⬜ |
| Onafhankelijke beveiligings- en overdrachtsreview | ⬜ |
| Gebruikers testen de demo | ⬜ |
| Generale repetitie met dezelfde code en database, plus terugvalroute | ⬜ |
| Online demo | ⬜ |

Wat er per stap nog moet gebeuren, staat in de [checklist live demo](beheer/live-demo-checklist.md).
Een test met schermlezer en in desktop-Excel hoort bewust niet bij deze demo
(besluit 20 oktober 2026). Deze tabel en de checklist volgen dezelfde
demomijlpaal; de bredere kwaliteitsbacklog is geen extra verplichte bouwronde vóór
1 december.

## Pad B · AI rechtstreeks aan de database

**Doel:** je eigen AI-assistent laten zoeken in alle bronnen en een onderzoeksopzet laten voorbereiden, die je daarna in Omnibus afmaakt.

| Stap | Status |
| --- | --- |
| Lokale koppeling via MCP: zoeken, bronnen lezen, opzet voorstellen, Excel maken | ✅ [AI-koppeling](gebruiken/ai-koppeling.md) |
| Koppeling met andere open datasets, zoals de [Rijksmap](https://www.rijksmap.nl) | ⬜ |
| Koppeling met de online versie, zodat ook AI-diensten in de cloud kunnen aansluiten | ⬜ na pad A |

## Pad C · Eigen databases bouwen

**Doel:** met je eigen documenten werken en je eigen database gebruiken, naast de openbare. Denk aan een organisatie met interne rapporten of eigen kaders die de eigen computer of het eigen netwerk niet mogen verlaten.

| Stap | Status |
| --- | --- |
| Een eigen document omzetten naar bouwstenen met een AI-skill | ✅ [eigen documenten](gebruiken/eigen-documenten.md) |
| Dat resultaat zelf in je lokale Omnibus laden, zonder tussenkomst van de beheerder | ⬜ |
| Een eigen database maken met de publicatiehulpmiddelen | 🔄 kan nu alleen via de [beheerroute](beheer/database-publiceren.md) |
| Meerdere databases naast elkaar gebruiken, met een knop in de applicatie | ⬜ |

## Pad D · Samen bijdragen

**Doel:** de openbare database samen laten groeien, met bronnen die goed zijn verwerkt en gecontroleerd.

| Stap | Status |
| --- | --- |
| Claimsysteem: bronnen op je naam zetten, inleveren en volgen | ✅ [meedoen](bijdragen/README.md) |
| Werklijsten: 9.116 rapporten, 542 aanbevolen, wetten en kaders met hun rechten | ✅ [voortgang](bijdragen/voortgang.md) |
| Vastleggen met welk AI-model een bron is verwerkt | ✅ |
| Eerst de [542 aanbevolen rapporten](bijdragen/werklijst-aanbevolen.md) van de Auditdienst Rijk | 🔄 27 in de database |
| Alle wetten en kaders die openbaar mogen; afspraken met uitgevers van beschermde kaders | ⬜ [werklijst](bijdragen/werklijst-wetten-en-kaders.md) |
| Automatische controle van een ingeleverd pakket, zodat bijdragers sneller horen of het compleet is | ⬜ |
| Vaker kleine databasereleases, zodat bijdragen snel zichtbaar worden | ⬜ |

## Hoe de paden samenhangen

- **Pad D vult de database** die alle andere paden gebruiken.
- **Pad A en pad B** maken die database beter bereikbaar: via de browser en via AI.
- **Pad C** is voor wie (ook) met eigen, niet-openbare bronnen werkt. Het gebruikt dezelfde skills en controles als pad D, maar het resultaat blijft bij jou.

## Bewust niet

- **Accounts, inloggen en rollen.** Omnibus werkt zonder account.
- **Projecten in de cloud.** Je onderzoek blijft op je eigen computer.
- **Betaalde functies.** Omnibus blijft niet-commercieel.

Dat verandert alleen na een nieuw, bewust besluit.

## Samengevat

Vier paden vanaf een werkende lokale versie: online, AI, eigen databases en samen bijdragen. Pad D voedt de rest.

## Volgende stap

Wil je helpen? Begin bij [meedoen](bijdragen/README.md).
