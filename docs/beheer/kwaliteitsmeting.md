# Kwaliteitsmeting van de database

<!-- paginatype: data -->

> **In het kort:** hoe goed de inhoud van de openbare database is, gemeten bij elke nieuwe database. Automatisch bijgewerkt door GitHub (`scripts/kwaliteitsmeting.mjs`). Het aantal bronnen en bezoekersaantallen zijn bewust geen maatstaf ([B-028](besluiten.md#b-028)).

## Wat er gemeten wordt

- **Bronpassages letterlijk juist:** elke passage staat letterlijk op de opgeslagen plek in de bron (`check:passages`).
- **Vragen zonder vormfout:** onderzoeks- en interviewvragen zonder vormfout, zoals twee vragen in één zin of een gesloten vraag (`check:questions`). Een vraag met een vormfout staat op HOLD en wordt niet automatisch aangepast; de inhoudelijke beoordeling doet de skill `omnibus-review-questions`.
- **Bouwstenen met risico en bewijsaanwijzing:** elke selecteerbare bouwsteen uit een rapport, wet of kader noemt het risico en een aanwijzing voor bewijs in de opzet- of bestaanstoets (`scripts/check-keten.mjs`). Modelvragen tellen niet mee.
- **Bouwstenen met aannametaal:** eigen geformuleerde normen en toetsen met een gissing, zoals *waarschijnlijk* of *naar verwachting*. Dit is een melding om te beoordelen. Letterlijke brontekst telt niet mee, want die wordt nooit herschreven ([B-029](besluiten.md#b-029)).

De meting gebruikt de database die bij de huidige code hoort, met een gecontroleerd controlegetal. De pagina bevat geen brontekst.

## Uitkomst per database

| Gemeten | Release | Bronpassages letterlijk juist | Vragen zonder vormfout | Vragen op HOLD | Te herschrijven of te schrappen | Bouwstenen met risico en bewijsaanwijzing | Bouwstenen met aannametaal |
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
| 2026-10-31 | `ffaf0f56` | 6.462 van 6.462 (100%) | 1.497 van 1.650 (90,7%) | 152 | 1 | 1.017 van 1.017 | 0 |

## Volgende stap

Hoe een nieuwe database tot stand komt, staat in [database publiceren](database-publiceren.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
