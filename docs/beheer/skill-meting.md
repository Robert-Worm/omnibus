# Skills meten

<!-- paginatype: taak -->

> **In het kort:** zo meet je wat een skill kost en oplevert: tijd, tokens en een kwaliteitsscore, op een vaste testset van openbare bronnen. Een optimalisatie gaat alleen door als de kwaliteit nergens daalt ([B-018](besluiten.md#b-018)).

## Wat meet je?

| Wat | Hoe | Waar het vandaan komt |
| --- | --- | --- |
| Vaste leeskosten | Tokens van `SKILL.md` en de naslag die de skill altijd laat lezen | `npm run skills:meting` |
| Leeskosten van de bron | Tokens van de tekstlaag van de bron, maal het aantal volledige lezingen in de werkwijze | `npm run skills:meting -- --database <catalogue.sqlite>` |
| Tijd en tokens van een run | Wat je AI-assistent na de run meldt | Jij legt het vast in [de metingen](#metingen) |
| Kwaliteit | OAK-score van 1 tot 10 uit [`omnibus-review-audit-quality`](../../skills/omnibus-review-audit-quality/README.md) | Jij legt het vast in [de metingen](#metingen) |

Tokens in het script zijn een schatting: 3,5 tekens per token voor Nederlandse tekst. Beelden van pagina's tellen niet mee; die kosten meer.

## De testset

Vier openbare bronnen uit de database: klein, middel en groot.

| Skill | Bron | Waarom |
| --- | --- | --- |
| `omnibus-add-report` | LVVN26 | Klein rapport (14 pagina's) |
| `omnibus-add-report` | PROO26 | Middelgroot rapport (19 pagina's, veel tekst) |
| `omnibus-add-report` | IVHO25 | Groot rapport (41 pagina's) |
| `omnibus-add-framework` | TR-CYBER, hoofdtekst | Kort kader (6 pagina's) |

De testset staat ook in `scripts/skill-meting.mjs`. Verander hem alleen met een nieuw besluit; anders zijn metingen niet te vergelijken.

## Stap voor stap

1. **Meet de vaste kosten.** Draai `npm run skills:meting -- --database local-data/runtime/catalogue.sqlite`.
2. **Draai de skill op elke bron uit de testset**, in een nieuwe chat, met hetzelfde model. Noteer de tijd en het aantal tokens dat je AI-assistent meldt.
3. **Beoordeel het resultaat** met `omnibus-review-audit-quality`. Gebruik de totaalscore.
4. **Leg de run vast** als regel in [de metingen](#metingen).
5. **Vergelijk** een nieuwe versie met de vorige op dezelfde bronnen. Daalt de score bij één bron, dan gaat de wijziging niet door.

*Gelukt als:* elke bron uit de testset een regel heeft voor de oude en de nieuwe versie.

## Nulmeting

Gemeten op 24 oktober 2026, met de skills uit deze repository.

**Vaste leeskosten per skill** (tokens, geschat)

| Skill | Altijd | Alleen als nodig |
| --- | ---: | ---: |
| `omnibus-add-framework` | 8.319 | 0 |
| `omnibus-add-model` | 5.430 | 0 |
| `omnibus-add-report` | 8.206 | 0 |
| `omnibus-build-questions` | 8.283 | 0 |
| `omnibus-curate-themes` | 5.033 | 2.826 |
| `omnibus-review-audit-quality` | 7.433 | 2.591 |
| `omnibus-review-questions` | 5.605 | 0 |

**Leeskosten van de bron** (tokens, alleen de tekstlaag)

| Bron | Pagina's | Eén lezing | Vier lezingen |
| --- | ---: | ---: | ---: |
| LVVN26 | 14 | 7.741 | 30.964 |
| PROO26 | 19 | 13.625 | 54.500 |
| IVHO25 | 41 | 33.839 | 135.356 |
| TR-CYBER, hoofdtekst | 6 | 3.215 | 12.860 |

Wat dit laat zien:

- **De bron lezen kost het meest.** De werkwijze voor rapporten en kaders laat de bron vier keer volledig lezen: twee lezers, een reconciliator en een eindreviewer. Bij een rapport van 41 pagina's is dat ruim zestien keer zoveel als de instructies.
- **Elke beurt van een AI-assistent stuurt de hele context opnieuw mee.** De echte kosten van een run zijn daarom een veelvoud van deze tabel. Die zie je pas in een gemeten run.

## Metingen

Nog geen runs vastgelegd. Voeg een run toe als regel in deze tabel, nieuwste onderaan:

```text
| Datum | Skill | Bron | Versie | Model | Minuten | Tokens | Score |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| 2026-11-02 | omnibus-add-report | LVVN26 | 2b59cb3 | voorbeeldmodel | 95 | 1.240.000 | 7,8 |
```

`npm run skills:meting -- --metingen` vat de vastgelegde runs samen.

## Samengevat

Meet vaste kosten met het script, draai de skill op de vier bronnen van de testset, beoordeel met de OAK-score en leg elke run vast. Daalt de score bij één bron, dan gaat de wijziging niet door.

## Volgende stap

Lees welke ideeën uit andere skillverzamelingen we meten in [lessen uit andere skills](skill-lessen.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
