# Samenwerking tussen de AI-assistenten

<!-- paginatype: naslag -->

> **In het kort:** twee AI-assistenten werken aan Omnibus: Claude Opus 5.5 en ChatGPT Astra. Ze praten niet rechtstreeks met elkaar. Ze geven werk aan elkaar door via GitHub: met labels, een vaste overdrachtsnotitie en het issue *Overdracht*.

## Wie doet wat?

| Assistent | Soort werk | Ook |
| --- | --- | --- |
| Claude Opus 5.5 | Pagina's, epics en stories, besluiten, skills zoeken, kleine afgebakende scripts | Volgt het werk van Astra en stelt regels voor als iets misgaat |
| ChatGPT Astra | Bronnen verwerken, grote reviews, gemeten runs, code in de applicatie | Meldt als een regel of story niet werkt |

De verdeling per soort werk staat in [wie pakt welk werk op?](handboek.md#wie-pakt-welk-werk-op) ([B-019](besluiten.md#b-019)).

## De labels

Elk open issue heeft labels voor wie, prioriteit en status:

| Soort | Labels | Betekenis |
| --- | --- | --- |
| Wie | `Opus 5.5`, `ChatGPT Astra` | Wie het werk oppakt; bij een gedeelde story beide |
| Prioriteit | `P1`, `P2`, `P3` | P1 blokkeert ander werk of de beheerder; P2 is het volgende; P3 komt later |
| Status | `klaar`, `bezig`, `wacht-op-ander`, `wacht-op-beheerder` | Of het nu op te pakken is, en zo niet, op wie het wacht. Precies één per issue |
| Rood | `rood` | De tests op `main` falen; dit issue gaat voor alles |

## Het issue Overdracht

Het issue met het label `overdracht` toont per assistent de drie belangrijkste taken met status `klaar`, en altijd alle P1-taken en rode tests. Ook zie je wat bezig is en wat op de beheerder wacht. Bovenaan staat of de tests op `main` groen zijn. GitHub werkt het vanzelf bij als een label verandert, na elke testrun en elke ochtend. Daarbij houdt elk issue één status: de laatst gezette blijft staan.

Je zegt tegen een assistent: *pak de volgende taak uit Overdracht*.

## Zo pak je een taak op

1. Kijk bovenaan *Overdracht*: zijn de tests rood, herstel dat dan eerst.
2. Pak de bovenste taak met jouw label en status `klaar`. Zet de status op `bezig`; `klaar` gaat dan vanzelf weg.
3. Haal de nieuwste stand op (`git pull --rebase`) en lees de laatste overdrachtsnotitie in het issue.
4. Werk de taak af met kleine commits. Draai de tests voor het deel dat je wijzigt, en vóór de overdracht `npm test`.

## De overdrachtsnotitie

Is jouw deel af, zet dan deze notitie als reactie in het issue:

```text
**Overdracht** · <jouw naam> → <de ander, of de beheerder>
- Klaar: <wat er af is, met commit>
- Volgende: <wat er nog moet gebeuren, en door wie>
- Testen: <hoe je controleert dat het werkt>
- Let op: <een bestand of test die de ander ook raakt; anders "niets">
```

Zet daarna de labels goed: het werklabel van wie verder gaat, en status `klaar`. Wacht het op een besluit, dan `wacht-op-beheerder`. Is alles af, sluit dan het issue.

## Vaste afspraken

- **Rood eerst.** Wie `main` rood maakt, herstelt dat vóór nieuw werk. De andere assistent past zijn werk niet aan om een rode test te omzeilen.
- **Nooit tegen een regel in.** Botst een test met een regel uit de documentatiecheck of de stijlgids, maak de test dan passend; meld het in de overdrachtsnotitie.
- **Eén wijziging tegelijk per bestand.** Raak je een bestand dat de ander net wijzigde, noem dat onder *Let op*.
- **Geen werk van de ander overnemen.** Zie je een fout in het werk van de ander, zet dan een reactie in het issue. Herstel zelf alleen een rode test of een kapotte link.
- **Elke commit noemt zijn issue.** Zet het nummer in de commitboodschap, bijvoorbeeld `(#86)`. Zo zie je in het issue welke commits erbij horen. Alleen kleine onderhoudscommits zonder issue mogen zonder.
- **Beschrijf wat er is.** Een plan hoort in een story, niet in de documentatie.

## Volgen en verbeteren

Bij het begin van een sessie bekijkt Opus 5.5 de commits van Astra sinds de laatste overdracht. Opus controleert of de tests groen zijn en of de afspraken zijn gevolgd. Vindt Opus een patroon dat steeds misgaat, dan stelt Opus een nieuwe afspraak voor op deze pagina. De beheerder beslist.

## Volgende stap

Bekijk het issue met het label [overdracht](https://github.com/Robert-Worm/omnibus/issues?q=is%3Aopen+label%3Aoverdracht).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
