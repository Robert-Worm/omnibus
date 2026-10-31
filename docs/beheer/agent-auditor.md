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

◐ betekent hier bijna steeds hetzelfde: het staat goed in de skills, maar er draait geen controle die het meet. Niet alles hoeft ☑ te worden. Of de lezingen echt blind waren (OC-1.1), meet je niet in de opzet.

## Bijgewerkt na de eerste ronde

De beheerder besliste op 31 oktober 2026 wat er met de uitkomst gebeurt. Een nieuwe volledige ronde is daarvoor niet nodig.

**Bronpassage en complete keten worden gemeten.** `check:keten` controleert nu per selecteerbare bouwsteen de hele keten: bronpassage, norm, doel, risico, beheersdoelstelling, beheersmaatregel, toets en bewijsaanwijzing. Bij een rapport is de bronpassage vaak de passage over het risico. Een gat in de keten of een bouwsteen zonder bronpassage houdt de release tegen. Op de database van 30 oktober: 1.017 van 1.017 compleet. Zo worden OC-2.3 en OC-4.1 een meting in plaats van alleen een instructie.

**Verwijzen naar een ander kader mag, maar specifiek.** Een kader mag naar een ander kader verwijzen. "Conform ISO" zegt alleen weinig: noem welk artikel of onderdeel, of waarom je verwijst. `check:keten` meldt een algemene verwijzing in eigen tekst als de bron dat kader zelf niet noemt. Het is een melding, geen afkeur. Op de database van 30 oktober zijn dat 2 bouwstenen uit het CIO-besluit met "geen rechtstreeks bewijs van AVG-naleving". Daar staat wel waarom de AVG genoemd wordt, maar niet welk deel. De les staat in de skills `omnibus-add-report` en `omnibus-add-framework`.

**Citaten worden in vier soorten ingedeeld.** Het citaat moet bij het juiste bestand staan.

| Uitkomst | Wanneer | Telt als bewijs? |
| --- | --- | --- |
| Letterlijk | Staat zo in het genoemde bestand, ook als het model regels code-commentaar samenvoegde | Ja |
| Bijna | Kleine afwijking of licht ingekort: minstens 80% van de woorddrietallen klopt | Ja, met een melding om te kijken of het geen samenvatting is |
| Ander bestand | Staat letterlijk in een ander bestand dan het model noemde | Nee |
| Niet | Niet te vinden; mogelijk samengevat of verzonnen | Nee |

Een samenvatting is niet de bedoeling. Het model wordt daarom gevraagd één aaneengesloten stuk over te nemen.

## Twee vragen uit de eerste ronde

**Waarom stonden sommige citaten niet letterlijk in het bestand?** Agent-Auditor zoekt een citaat letter voor letter op, alleen met witruimte gelijkgetrokken. Het model voegde soms twee regels code-commentaar samen tot één zin. De tekens `//` aan het begin van elke regel kloppen dan niet meer, ook al staat de zin er wel. Een paar keer vatte het model echt samen. In de eigen ronde vond de auditor 46 van de 47 citaten terug. Het ene dat niet klopte, *Geen Unicode-normalisatie*, staat in de kadermethode en niet in de rapportmethode die het model noemde. Dat heet nu *ander bestand*.

**Is "geen controle op kaders die niet in de bron staan" een echt gat?** De database van 30 oktober is daarop doorzocht. ISO en AVG komen 10 keer voor in eigen toetsteksten zonder dat de norm ze noemt. Elke keer is het een grens, zoals "geen volledige ISO 50001-beoordeling geclaimd". Verkeerde eisen zijn er dus niet; wel kan het specifieker. Zie hierboven.

## De auditor draaien

Nodig: Claude Code met een ingelogde sessie. Het draaien telt mee in het gebruik van dat abonnement: vijf aanroepen van elk ongeveer 100.000 tokens.

```text
npm run audit:skills
npm run audit:skills -- --doelstelling OD-2 --uit work/auditor-04
```

Het rapport en de ruwe uitkomst komen in een nieuwe map onder `work/`, buiten Git. Standaard gebruikt de auditor het model *sonnet*. Claude Code doet bij grote invoer een kleine controle met een licht model ernaast; het oordeel komt van het gevraagde model.

## Volgende stap

Een volgende ronde draaien als de skills of controles flink veranderen. Zie [#279](https://github.com/Robert-Worm/omnibus/issues/279).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
