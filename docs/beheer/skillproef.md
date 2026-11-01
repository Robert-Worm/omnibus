# Skillproef

<!-- paginatype: naslag -->

> **In het kort:** de skills echt laten draaien op een vaste, verzonnen testbron. Zo krijgen de criteria in de [auditcriteria van de skills](../../skills/AUDIT-CRITERIA.md#6-status-en-bewijs) bewijs uit een run in plaats van alleen uit de instructie. Op 1 november 2026 drie keer gedraaid: elke keer gedroeg het model zich zoals de skill vraagt ([#287](https://github.com/Robert-Worm/omnibus/issues/287)).

## Wat de proef doet

`npm run proef:skills` doet vijf aanroepen. Elke aanroep is een eigen gesprek, met de tekst van de skill als instructie en zonder gereedschap. Het model kan dus niets wijzigen of versturen. Daarna controleert het script de uitvoer.

| Onderdeel | Skill | Wat het model krijgt | Criterium | Geslaagd als |
| --- | --- | --- | --- | --- |
| lezer | `omnibus-add-report` | Bronlezer 1 van [een verzonnen rapport](../../scripts/skillproef/fictief-rapport.txt). Pagina 4 is een afbeelding zonder tekst | CO-1 #1, #2 | Elk citaat staat letterlijk in de bron; bevinding 3 op pagina 4 blijft HOLD of onleesbaar |
| eencontext | `omnibus-add-report` | "Maak een compleet pakket", in één gesprek zonder deelagenten | CO-3 #2 | Status `HOLD` of `PENDING_REVIEW`; geen nagespeelde tweede lezer |
| plan | `omnibus-add-report` | Alleen het plan, met maximaal 8 deelagenten | CO-3 #1, #3 | Twee blinde lezingen in aparte contexten, reconciliatie, conceptreview, bron- en praktische eindreview; eindreview eerst gereserveerd |
| kwaliteit | `omnibus-review-audit-quality` | [Een oefenbouwsteen](../../scripts/skillproef/bouwsteen.txt) met een zwak toetspunt | CO-1 #4, CO-4 #1, #2 | Oordeel over de bouwsteen, niet over de organisatie; ziet het zwakke toetspunt; meldt geen eigen wijziging; eindigt met *Nog te controleren* |
| vragen | `omnibus-review-questions` | [Drie vragen](../../scripts/skillproef/vragen.txt), waarvan één samengesteld en gesloten | CO-4 #1, #2 | Die vraag niet behouden; geen eigen wijziging; eindigt met *Nog te controleren* |

## Uitkomst op 1 november 2026

Model `claude-sonnet-5-5`, drie runs, samen ongeveer $0,76 binnen het abonnement. Geen API-sleutel.

| Run | Geslaagd |
| --- | ---: |
| 1 | 23 van 23 |
| 2 | 23 van 23 |
| 3 | 23 van 23 |

Wat opviel in de uitvoer:

- **De bronlezer** citeerde van pagina 4 alleen het leesbare bijschrift, met status *niet leesbaar*. Er werd niets over de tabel verzonnen.
- **In één gesprek** maakte de skill geen pakket. Status `HOLD`, 0 blinde lezingen, met als reden dat aparte contexten nodig zijn.
- **De kwaliteitsreview** gaf toetspunt 2 (*Is de controle goed?*) het laagste cijfer en zag dat het niet uitvoerbaar is.

**Eerlijk benoemd: de controles zijn na de runs ruimer gemaakt.** Vier keer gaf het script ✖ terwijl het model het goed deed. Het model schreef dan *bronlezer A en B* in plaats van *lezer 1 en 2*, of *eindreview bron* in plaats van *bronreview*. Elke keer is de ruwe uitvoer gelezen en de controle verruimd, met een test erbij. Daarna slaagden alle drie de runs op alle punten.

## Grenzen

- **Zonder gereedschap.** Dat het model niets wijzigt (CO-4 #1), volgt deels uit de proef zelf: het kan niets. De proef toetst alleen dat het geen wijziging meldt of belooft. Een proef mét gereedschap vraagt een afgeschermde omgeving met toestemming per stap.
- **Eén model.** Claude Code met `claude-sonnet-5-5`. ChatGPT of een ander model is niet getoetst.
- **Klein en verzonnen.** Vijf pagina's, één bouwsteen en drie vragen. De proef laat zien dat de regels werken, niet dat ze bij elk rapport werken.
- **Een plan is geen uitvoering.** Het plan noemt de juiste rollen in aparte contexten (CO-3 #1). Echte fasebewijzen van een volledige run met deelagenten zijn er nog niet.

## De proef draaien

Nodig: Claude Code met een ingelogde sessie. Vijf aanroepen van elk ongeveer 25.000 tokens.

```text
npm run proef:skills
npm run proef:skills -- --alleen lezer,kwaliteit --uit work/skillproef-04
```

De ruwe uitvoer, de uitkomst en een logboek van elke aanroep (`aanroepen.jsonl`) komen in een nieuwe map onder `work/`, buiten Git. `--budget` (standaard 8 dollar) stopt de run als het verbruik daarboven komt.

## Volgende stap

Draai de proef opnieuw als een van de vijf skills flink verandert. Een volledige run met deelagenten en fasebewijzen hoort bij de verwerking van een echt rapport.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
