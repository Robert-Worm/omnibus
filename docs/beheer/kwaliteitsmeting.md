# Kwaliteitsmeting van de database

<!-- paginatype: data -->

> **In het kort:** hoe goed de inhoud van de openbare database is, gemeten bij elke nieuwe database. Automatisch bijgewerkt door GitHub (`scripts/kwaliteitsmeting.mjs`). Het aantal bronnen en bezoekersaantallen zijn bewust geen maatstaf ([B-028](besluiten.md#b-028)).

## Wat er gemeten wordt

- **Bronpassages letterlijk juist:** elke passage staat letterlijk op de opgeslagen plek in de bron (`check:passages`).
- **Vragen zonder vormfout:** onderzoeks- en interviewvragen zonder vormfout, zoals twee vragen in één zin of een gesloten vraag (`check:questions`). Een vraag met een vormfout staat op HOLD en wordt niet automatisch aangepast; de inhoudelijke beoordeling doet de skill `omnibus-review-questions`.
- **Bouwstenen met complete keten:** elke selecteerbare bouwsteen uit een rapport, wet of kader heeft een bronpassage, norm, doel, risico, beheersdoelstelling, beheersmaatregel, toets en een aanwijzing voor bewijs (`scripts/check-keten.mjs`). Bij een rapport is de bronpassage vaak de passage over het risico. Modelvragen tellen niet mee.
- **Bouwstenen met aannametaal:** eigen geformuleerde normen en toetsen met een gissing, zoals *waarschijnlijk* of *naar verwachting*. Dit is een melding om te beoordelen. Letterlijke brontekst telt niet mee, want die wordt nooit herschreven ([B-029](besluiten.md#b-029)).
- **Bouwstenen met algemene externe verwijzing:** eigen tekst noemt een ander kader, zoals ISO of de AVG, zonder te zeggen welk artikel of onderdeel bedoeld is, terwijl de bron dat kader niet noemt. Verwijzen mag; zeg dan welk deel, of waarom. Dit is een melding om te beoordelen.

De meting gebruikt de database die bij de huidige code hoort, met een gecontroleerd controlegetal. De pagina bevat geen brontekst.

## Uitkomst per database

| Gemeten | Release | Bronpassages letterlijk juist | Vragen zonder vormfout | Vragen op HOLD | Te herschrijven of te schrappen | Bouwstenen met complete keten | Bouwstenen met aannametaal | Bouwstenen met algemene externe verwijzing |
| --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: |
| 2026-10-31 | `ffaf0f56` | 6.462 van 6.462 (100%) | 1.497 van 1.650 (90,7%) | 152 | 1 | 1.017 van 1.017 | 0 | 2 |

## Volgende stap

Hoe een nieuwe database tot stand komt, staat in [database publiceren](database-publiceren.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
