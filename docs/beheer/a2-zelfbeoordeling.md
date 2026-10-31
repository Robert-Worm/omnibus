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
| AC-3.3 Geen aannametaal in normen | ☑ | `check:keten` meldt gissingen in eigen normen en toetsen: 0 van 1.017 bouwstenen op de database van 30 oktober. De les staat in de skills |
| AC-3.4 Geen verwijzing naar kaders die niet in de bron staan | ◐ | Herkomst per laag (B-026) is besloten; niet getest |
| CO-4 Toetsbaarheid | – | – |
| AC-4.1 Normen in de vorm actor, actie, object en voorwaarde | ☐ | Geen vaste vorm of controle; bewust niet (B-029). De skills noemen een functionaris alleen als de norm dat doet |
| AC-4.2 Vage termen zonder maat worden gemeld | ◐ | `check:questions` doet dit voor vragen, niet voor normen |
| AC-4.3 Elke norm heeft een aanwijzing voor bewijs | ☑ | `check:keten`: 1.017 van 1.017 selecteerbare bouwstenen uit rapporten, wetten en kaders |
| AC-4.4 Elke norm noemt het risico | ☑ | `check:keten`: 1.017 van 1.017 |
| CO-5 Bewust van risico in de uitvoer | – | – |
| AC-5.1 Elke norm heeft een betrouwbaarheid (hoog, midden, laag) | ◐ | De review geeft een score van 1 tot 10 (OAK-1.0); die staat niet per norm in de export |
| AC-5.2 Hoog alleen bij volledige velden en een duidelijke bron | – | Volgt uit AC-5.1 |
| AC-5.3 De Excel kleurt naar betrouwbaarheid | ☐ | Niet aanwezig |
| AC-5.4 Geen eigen risico-oordeel zonder onderbouwing | ☑ | Omnibus beoordeelt geen organisaties; de review beoordeelt de bouwsteen |

Samen: 8 ☑, 8 ◐, 3 ☐ en 1 niet van toepassing (na [#283](https://github.com/Robert-Worm/omnibus/issues/283); de eerste ronde gaf 5 ☑, 10 ◐ en 4 ☐). De metingen staan ook op [kwaliteitsmeting](kwaliteitsmeting.md). De criteria passen niet allemaal op Omnibus. Ze zijn gemaakt voor een agent die alleen normen haalt, terwijl Omnibus normen, toetspunten, vragen en een export levert.

## Wat we ervan leren

1. **Wat al sterk is:** brontraceerbaarheid (CO-2) en geen eigen oordeel over organisaties (AC-5.4). Dat zijn precies de punten die een auditor het eerst controleert.
2. **Volledigheid en betrouwbaarheid** regelt Omnibus in het proces, met blinde lezingen en reviews, niet met een meting of score per norm. Dat is een bewuste keuze (zie hieronder).
3. **Overgenomen:** aannametaal melden, en in de database meten wat de skills al eisen ([#283](https://github.com/Robert-Worm/omnibus/issues/283)).

## Besluit bij de vier criteria waar Omnibus niet aan voldoet

De beheerder besliste op 31 oktober 2026 ([B-029](besluiten.md#b-029)):

| Criterium | Besluit | Waarom |
| --- | --- | --- |
| AC-1.1 Volledigheid meten | Niet apart meten | Twee blinde lezingen, reviews en bronverwijzingen dekken volledigheid al af. Een meting vraagt een mens die elke testbron markeert; dat schaalt niet |
| AC-3.3 Geen aannametaal | **Overnemen** | Duidelijk beter en goedkoop: een les in de skills en een melding in de vormcontrole |
| AC-4.1 Vaste vorm van een norm | Alleen bij toetspunten, waar het kan | Brontekst wordt nooit herschreven. Een toetspunt noemt wie wat doet als de norm die functionaris noemt; anders niet |
| AC-5.3 Kleur naar betrouwbaarheid | Niet doen | Wat niet goed genoeg is, komt niet door de review. Een score of kleur per norm geeft schijnzekerheid |

Bij de tien deels-oordelen meten we in de database wat de skills al eisen, bijvoorbeeld of risico en bewijsaanwijzing per bouwsteen gevuld zijn (AC-4.3 en AC-4.4). Bestaande kaders worden daarvoor niet opnieuw gelezen.

## Uitkomst van Agent-Auditor zelf

Op 31 oktober 2026 draaide Agent-Auditor 0.5.0 (de `/evaluate`-route, standaardmodel `claude-sonnet-4-6`) op commit `8b6b016`, met de Claude-login van de beheerder. De tool kreeg twintig bestanden: README, AGENTS, de skills met hun naslag en de controlescripts. De auditcriteria en deze zelfbeoordeling zaten er bewust niet bij, zodat de tool onze eigen claims niet als bewijs gebruikt. Er is niets naar GitHub of naar SAAF geschreven.

| Criterium | Hand | Tool | Waarom de tool zo oordeelt |
| --- | --- | --- | --- |
| AC-1.1 | ☐ | onbekend | Blinde lezingen zijn een waarborg, maar recall wordt niet gemeten |
| AC-1.2 | ◐ | fail | De skill splitst bewust niet op elk *en*, alleen als antwoord, toepasselijkheid of bewijs verschilt |
| AC-1.3 | ◐ | onbekend | Kaders hebben `CONTEXT_ONLY`; de rapportskill noemt geen apart filter voor visie- of beschrijvende zinnen |
| AC-1.4 | ◐ | fail | Geen veld `document_summary` van 2–3 zinnen |
| AC-2.1 | ☑ | fail | Omnibus gebruikt `source_spans` met positie en citaat, geen `source_anchors` met `section` |
| AC-2.2 | ☑ | pass | `check:passages` en de meting: 6.462 van 6.462 |
| AC-2.3 | ☑ | fail | Positie wordt getoetst, een paragraafnummer niet |
| AC-2.4 | ☑ | fail | HOLD doet hetzelfde, maar het label `confidence: Low` ontbreekt |
| AC-3.1 | ◐ | fail | Omnibus gebruikt HOLD, geen `TBD` |
| AC-3.2 | ◐ | fail | Geen veld `open_questions` per onbekend veld |
| AC-3.3 | ☑ | fail | *typisch* en *meestal* ontbraken in de lijst (inmiddels toegevoegd); aannametaal blokkeert niet |
| AC-3.4 | ◐ | fail | Geen controle op verwijzingen naar ISO, NIST of COBIT die niet in de bron staan |
| AC-4.1 | ☐ | fail | Geen vaste vorm actor, actie, object |
| AC-4.2 | ◐ | fail | Geen melding van vage termen zoals *passend* of *tijdig* in normen. De tool kon zijn eigen antwoord niet lezen; het oordeel komt uit de ruwe tekst |
| AC-4.3 | ☑ | pass | `check:keten`: 1.017 van 1.017 |
| AC-4.4 | ☑ | pass | `check:keten`: 1.017 van 1.017 |
| AC-5.1 | ◐ | fail | Geen veld `confidence` |
| AC-5.2 | – | fail | Volgt uit AC-5.1 |
| AC-5.3 | ☐ | fail | Geen kleur naar betrouwbaarheid in de Excel |
| AC-5.4 | ☑ | n.v.t. | Omnibus geeft geen risico-oordeel over een organisatie |

Samen: 3 pass, 14 fail, 2 onbekend en 1 niet van toepassing. De tool is veel strenger dan de handmatige ronde. Dat komt vooral doordat de criteria de veldnamen van één bepaalde agent voorschrijven (`source_anchors`, `TBD`, `confidence`, `document_summary`). Omnibus regelt een deel daarvan op een andere manier: HOLD in plaats van `TBD` of `confidence: Low`, en een exacte positie in plaats van een paragraafnummer. Bij een aantal bewijscitaten meldde de tool zelf dat het citaat niet letterlijk in het bestand stond.

**Echte gaten volgens de tool**, los van veldnamen:

1. Verwijzingen naar kaders die niet in de bron staan, worden niet gecontroleerd (AC-3.4).
2. Vage termen in normen worden niet gemeld (AC-4.2).
3. De lijst met aannamewoorden miste *typisch* en *meestal*. Die zijn toegevoegd; de database van 30 oktober geeft nog steeds 0 meldingen.

De beheerder besloot op 31 oktober 2026 dat deze criteria niet leidend zijn: de uitgangspunten van Omnibus zijn dat wel. Omnibus heeft daarom een [eigen auditor](agent-auditor.md) met eigen criteria. Daar staat ook waarom het eerste gat in de praktijk geen gat is. Bij het besluit [B-029](besluiten.md#b-029) blijven score en kleur per norm buiten beschouwing.

## Volgende stap

Verder met de [Omnibus-auditor](agent-auditor.md). Zie [#279](https://github.com/Robert-Worm/omnibus/issues/279) en [epic #276](https://github.com/Robert-Worm/omnibus/issues/276).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
