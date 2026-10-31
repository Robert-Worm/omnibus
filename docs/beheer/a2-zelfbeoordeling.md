# Zelfbeoordeling tegen de A2-criteria van SAAF Agent-Auditor

<!-- paginatype: naslag -->

> **In het kort:** hoe Omnibus scoort op de twintig vaste criteria waarmee SAAF Agent-Auditor elke agent beoordeelt. Dit is een handmatige eerste ronde, gedaan door de AI-assistent op 31 oktober 2026, zonder de tool zelf te draaien. Een mens moet de oordelen nog bevestigen.

## Hoe deze beoordeling tot stand kwam

Agent-Auditor beoordeelt elke repository met dezelfde vijf beheersdoelstellingen en vier criteria per doelstelling (bron: `audit-criteria-sheet.html` in SAAF-Project/Agent-Auditor). Die criteria zijn geschreven voor een agent die normen haalt uit een beleidsdocument. In Omnibus doen de skills `omnibus-add-report` en `omnibus-add-framework` dat, en de database bevat het resultaat. De beoordeling gaat daarom over de skills en de database samen.

De tool zelf is niet gedraaid. Die vraagt Python, een Claude Code-login en de gh CLI, en stuurt de inhoud van de repository naar een taalmodel. Deze ronde gebruikt wat er al bekend is uit de [auditcriteria](../../AUDIT-CRITERIA.md) en de [auditcriteria voor de skills](../../skills/AUDIT-CRITERIA.md).

| Teken | Betekenis |
| --- | --- |
| ☑ | Voldoet, met bewijs |
| ◐ | Deels, of alleen als instructie zonder meting |
| ☐ | Voldoet niet of is niet gemeten |
| – | Niet van toepassing |

## Uitkomst

| Criterium (samengevat) | Oordeel | Onderbouwing |
| --- | --- | --- |
| CO-1 Volledigheid van extractie | – | – |
| AC-1.1 Minstens 90% van de gemarkeerde normatieve zinnen wordt gevonden | ☐ | Er is geen testbron met gemarkeerde zinnen en geen meting van de volledigheid |
| AC-1.2 Een zin met meerdere eisen wordt gesplitst | ◐ | `check:questions` vangt samengestelde vragen; voor normen is er geen controle |
| AC-1.3 Beschrijvende zinnen worden geen norm | ◐ | Contextpunten en HOLD bestaan; niet apart gemeten |
| AC-1.4 Een korte samenvatting van de bron | ◐ | Het tabblad *Over* beschrijft elke bron; niet getoetst aan dit criterium |
| CO-2 Brontraceerbaarheid | – | – |
| AC-2.1 Elke norm heeft een bronverwijzing met vindplaats en citaat | ☑ | Elke passage heeft bron, pagina en exacte positie |
| AC-2.2 Het citaat staat letterlijk in de bron | ☑ | `check:passages`: 6.462 van 6.462 op de database van 30 oktober |
| AC-2.3 De vindplaats bestaat echt | ☑ | Dezelfde controle toetst pagina en positie |
| AC-2.4 Zonder traceerbare bron geen uitvoer, of gemarkeerd | ☑ | Zonder passage blijft een punt HOLD (`omnibus-add-report`) |
| CO-3 Hallucinatieweerstand | – | – |
| AC-3.1 Onbekende gegevens worden als onbekend gemarkeerd | ◐ | HOLD en `PENDING_REVIEW`; geen vaste markering per veld |
| AC-3.2 Bij elk onbekend veld een verduidelijkingsvraag | ◐ | Reviews eindigen met *Nog te controleren*; niet per veld |
| AC-3.3 Geen aannametaal in normen | ☐ | Geen controle op aannametaal in normen |
| AC-3.4 Geen verwijzing naar kaders die niet in de bron staan | ◐ | Herkomst per laag (B-026) is besloten; niet getest |
| CO-4 Toetsbaarheid | – | – |
| AC-4.1 Normen in de vorm actor, actie, object en voorwaarde | ☐ | Geen vaste vorm of controle |
| AC-4.2 Vage termen zonder maat worden gemeld | ◐ | `check:questions` doet dit voor vragen, niet voor normen |
| AC-4.3 Elke norm heeft een aanwijzing voor bewijs | ◐ | De skills eisen opzet- en bestaanstoetsen met bewijs; niet gemeten in de database |
| AC-4.4 Elke norm noemt het risico | ◐ | De skills eisen de complete keten met risico; niet gemeten in de database |
| CO-5 Bewust van risico in de uitvoer | – | – |
| AC-5.1 Elke norm heeft een betrouwbaarheid (hoog, midden, laag) | ◐ | De review geeft een score van 1 tot 10 (OAK-1.0); die staat niet per norm in de export |
| AC-5.2 Hoog alleen bij volledige velden en een duidelijke bron | – | Volgt uit AC-5.1 |
| AC-5.3 De Excel kleurt naar betrouwbaarheid | ☐ | Niet aanwezig |
| AC-5.4 Geen eigen risico-oordeel zonder onderbouwing | ☑ | Omnibus beoordeelt geen organisaties; de review beoordeelt de bouwsteen |

Samen: 5 ☑, 10 ◐, 4 ☐ en 1 niet van toepassing. De criteria passen niet allemaal op Omnibus. Ze zijn gemaakt voor een agent die alleen normen haalt, terwijl Omnibus normen, toetspunten, vragen en een export levert.

## Wat we ervan leren

1. **Volledigheid meten.** Er is geen meting van hoeveel normen een skill vindt. Een vaste testbron met gemarkeerde normatieve zinnen zou dat aantonen. Dit sluit aan op de bestaande skillmeting ([B-018](besluiten.md#b-018)).
2. **Vormcontrole voor normen.** Vragen hebben `check:questions`, normen en toetspunten nog niet. Dezelfde regels zijn bruikbaar: samengestelde eisen, vage termen zonder maat en aannametaal.
3. **Betrouwbaarheid zichtbaar maken.** De reviewscore per bouwsteen bestaat, maar de gebruiker ziet hem niet in de viewer of de export.
4. **Wat al sterk is:** brontraceerbaarheid (CO-2) en geen eigen oordeel over organisaties (AC-5.4). Dat zijn precies de punten die een auditor het eerst controleert.

## Volgende stap

De oordelen bevestigen of bijstellen, en de leerpunten 1 tot en met 3 als stories oppakken. Zie [#279](https://github.com/Robert-Worm/omnibus/issues/279) en [epic #276](https://github.com/Robert-Worm/omnibus/issues/276).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
