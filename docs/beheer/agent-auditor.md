# Omnibus-auditor

<!-- paginatype: naslag -->

> **In het kort:** een AI-auditor die de opzet van de skills en controles beoordeelt tegen de uitgangspunten van Omnibus. Hij leest de eigen checkout, geeft per criterium een oordeel met citaten, en zoekt elk citaat daarna letterlijk op. Gebouwd op 31 oktober 2026 naar het voorbeeld van SAAF Agent-Auditor ([#279](https://github.com/Robert-Worm/omnibus/issues/279)).

## Waarom een eigen auditor

SAAF Agent-Auditor beoordeelt elke agent met dezelfde twintig criteria. Die zijn geschreven voor een agent die normen uit één beleidsdocument haalt, met vaste veldnamen zoals `TBD`, `confidence` en `source_anchors`. Op Omnibus gaf dat 14 keer *fail*, vooral omdat Omnibus het op een andere manier regelt: HOLD in plaats van `TBD`, een exacte bronpositie in plaats van een paragraafnummer, en bewust geen score per norm ([B-029](besluiten.md#b-029)).

**Onze eigen uitgangspunten zijn leidend.** Daarom heeft Omnibus een eigen auditor. De werkwijze komt van Agent-Auditor; de criteria zijn van Omnibus.

| Overgenomen van Agent-Auditor | Anders in Omnibus |
| --- | --- |
| Vijf beheersdoelstellingen: volledigheid, traceerbaarheid, geen gissingen, toetsbaarheid, risicobewust | De criteria gebruiken de begrippen van Omnibus: HOLD, CONTEXT_ONLY, exacte positie, eigen voorstel, herkomst per laag |
| Eén taalmodel beoordeelt de opzet en moet citaten geven | Eén aanroep per doelstelling in plaats van per criterium: vijf aanroepen in plaats van twintig |
| Elk citaat wordt opgezocht in het bestand | Ook een citaat uit meerdere regels code-commentaar telt als letterlijk |
| – | Oordelen als ☑ ◐ ☐ –, zoals in de [auditcriteria](../../AUDIT-CRITERIA.md) |
| – | Een criterium met een echte controle verwijst naar de [kwaliteitsmeting](kwaliteitsmeting.md) |
| – | Leest alleen; schrijft niets naar GitHub of SAAF |

De criteria staan in `scripts/auditor/criteria.mjs`. De werkwijze komt uit [SAAF-Project/Agent-Auditor](https://github.com/SAAF-Project/Agent-Auditor), overgenomen met bronvermelding volgens [B-027](besluiten.md#b-027).

## Uitkomst op 31 oktober 2026

Commit `2be24f0`, model `claude-sonnet-5-5`. Doelstelling OD-5 is opnieuw gedraaid nadat de code van de MCP-route aan de bundel was toegevoegd. Van de 47 citaten zijn er 46 letterlijk teruggevonden.

| Doelstelling | ☑ voldoet | ◐ deels | Wat ◐ hier vooral betekent |
| --- | ---: | ---: | --- |
| OD-1 Volledigheid door het proces | 0 | 4 | Blinde lezingen, splitsen en context zijn instructies in de skills; geen controle meet ze |
| OD-2 Brontraceerbaarheid | 1 | 3 | `check:passages` controleert de citaten; dat elke bouwsteen een passage hééft, meet niemand |
| OD-3 Geen gissingen | 1 | 4 | `check:keten` meldt aannametaal; aanvullen uit eigen kennis is alleen een instructie |
| OD-4 Toetsbaarheid | 1 | 3 | `check:keten` meet risico en bewijs, niet de rest van de keten |
| OD-5 Risicobewust | 1 | 3 | De MCP-route weigert HOLD; voor de webapplicatie zag de auditor alleen de instructie |
| **Samen** | **4** | **17** | Geen ☐ |

◐ betekent hier bijna steeds hetzelfde: het staat goed in de skills, maar er draait geen controle die het meet. Dat is eerlijk, en het wijst de weg. Waar een controle te maken is, kan ◐ ☑ worden. Twee voor de hand liggende zijn:

1. **Elke selecteerbare bouwsteen heeft minstens één bronpassage** (OC-2.3), gemeten in de database.
2. **De hele keten is gevuld**, niet alleen risico en bewijs (OC-4.1): ook doel, beheersdoelstelling en beheersmaatregel.

Niet alles hoeft ☑ te worden. Of de lezingen echt blind waren (OC-1.1), meet je niet in de opzet.

## Twee vragen uit de eerste ronde

**Waarom stonden sommige citaten niet letterlijk in het bestand?** Agent-Auditor zoekt een citaat letter voor letter op, alleen met witruimte gelijkgetrokken. Het model voegde soms twee regels code-commentaar samen tot één zin. De tekens `//` aan het begin van elke regel kloppen dan niet meer, ook al staat de zin er wel. Een paar keer vatte het model echt samen. De eigen auditor haalt commentaartekens weg voor het zoeken, en vraagt het model om één aaneengesloten stuk over te nemen. In deze ronde vond de auditor 46 van de 47 citaten terug. Het ene dat niet klopte, *Geen Unicode-normalisatie*, staat wel in de repository, maar in de kadermethode en niet in de rapportmethode die het model noemde. Precies daarvoor is de controle er: een citaat telt alleen in het bestand dat het model zelf aanwijst.

**Is "geen controle op kaders die niet in de bron staan" een echt gat?** Het criterium bedoelt een norm die zegt "conform ISO 27001" terwijl de bron ISO niet noemt. Dan lijkt het alsof de bron dat eist. De database van 30 oktober is daarop doorzocht. ISO en AVG komen 10 keer voor in eigen toetsteksten zonder dat de norm ze noemt; BIO alleen waar de bron BIO noemt. Elke keer is het een uitdrukkelijke grens, zoals "geen volledige ISO 50001-beoordeling geclaimd" of "geen rechtstreeks bewijs van AVG-naleving". Dat is juist goed. In de praktijk is er dus geen gat. Het criterium staat als OC-3.4 in de eigen auditor, met die uitzondering erbij.

## De auditor draaien

Nodig: Claude Code met een ingelogde sessie. Het draaien telt mee in het gebruik van dat abonnement: vijf aanroepen van elk ongeveer 100.000 tokens.

```text
npm run audit:skills
npm run audit:skills -- --doelstelling OD-2 --uit work/auditor-04
```

Het rapport en de ruwe uitkomst komen in een nieuwe map onder `work/`, buiten Git. Standaard gebruikt de auditor het model *sonnet*. Claude Code doet bij grote invoer een kleine controle met een licht model ernaast; het oordeel komt van het gevraagde model.

## Volgende stap

De beheerder kiest welke ◐ een controle krijgen. Zie [#279](https://github.com/Robert-Worm/omnibus/issues/279).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
