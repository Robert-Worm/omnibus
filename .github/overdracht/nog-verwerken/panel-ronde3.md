# Panelronde 3 (7 november 2026, database v0.1.7, lokaal)

> **In het kort:** acht rollen in de browser. Gemiddelde scores licht omhoog; juridische juistheid het meest. De grootste rem zit nu buiten de toetspunten: normteksten, afbakening, verwijzingen, export en stap 3.

| Onderdeel | 6 nov | 7 nov | Nu |
| --- | --- | --- | --- |
| Nut | 6,0 | 7,4 | 7,6 |
| Beter dan nu | 5,8 | 6,9 | 7,0 |
| Begrijpelijkheid | 5,6 | 5,8 | 5,9 |
| Juridische juistheid | 7,0 | 7,4 | 7,6 |
| Gebruiksgemak | 6,8 | 6,8 | 7,0 |
| Excel-export | 5,3 | 6,3 | 6,1 |

## Door ronde 5–7 veroorzaakt (eerst herstellen)

1. Gesplitste delen erfden alle bronkoppelingen van het oude toetspunt (jurist: tekst van een deel onder artikel 28, lid 4, c–e).
2. Interne codes (*T24-SIMPLIFIED*, *SCOPE-16-1-H*) en werktaal (*retainedHOLDs*, *logicalPointIds*) weer zichtbaar in viewer en export; herkomst nagaan (vermoedelijk context en notities van records die nu gekoppeld zijn).
3. Tegenstrijdige uitsluiting: artikel 39, lid 2, j en 40, lid 1 (RTS 2024/1774) staan nog als *uitgesloten bronclausule* terwijl ze nu toetspunt zijn; nieuw toetspunt *BCP bijwerken* onder de verkeerde norm; bronkoppeling artikel 28–41 te breed (cel loopt over).
4. Plaatshouders *{{onderwerp}}* en *[organisatie]* in vragen.

## Bestaand, hoogste prioriteit

5. Stap 3: standaardvoorstel dekt één kader; bij een combinatie vallen toetspunten weg (tot 87 van 139). Melding valt niet op.
6. Interviewniveau standaard alleen operationeel: *Geen interviewvraag* bij bijna alle punten.
7. Excel-export 10–55 MB door verborgen bronbewijs (`customXml`).
8. Normteksten, afbakening en toetsgrenzen: werktaal, codes, plakfouten (*20-modellen*, *Alleen28(2)*, *artikel 6, 0*, *verzonnen*, *deze pilot*), spelfouten. Zelfde aanpak als de toetspunten: auditorperspectief, brontrouw, review.
9. Bronverwijzingen RTS 2025/301, 2024/1773 en 2025/532 zonder artikelnummer of verminkt.
10. Standaardzinnen (*Geen verplicht apart bewijsdocument…*, *De bron werkt … geen werkingstoets uit*) te vaak; MD-export Toetsuitvoering met lege labels; tijd in UTC.
11. Wensen: velden voor populatie, steekproef, review, actie, eigenaar en deadline; koppeling NOREA-control en RTS-toetspunt over hetzelfde onderwerp; legenda bij Grondslag *W*; artikel 23 DORA ontbreekt; uitleg wie onder artikel 16, lid 1 valt.

Oordelen: `scratchpad/panel3/oordelen/P1…P8.md` (kopie in de werkmappenback-up).

## Stand 8 november (ronde 8, lokaal; niet gepusht)

Besluiten van de beheerder: zie `besluiten.md` (8 november). Verwerkt in `work/dora-ronde8-20261108/`:

| Nr | Wat | Stand |
| --- | --- | --- |
| 1 | Bronkoppelingen per gesplitst deel | Klaar: 249 delen nagelopen door drie aparte agents; 1.287 koppelingen weg die bij een ander deel horen. |
| 2, 8 | Werktaal in hulpteksten | Klaar voor toepassing, notities, toetsgrens en -reden, koppelingsuitleg, interviewafbakening, recordnotities en bronbeperkingen: 2.519 unieke zinnen per zin herschreven (zes agents), 121 bronbeperkingen leesbaar. Norm- en toetspuntteksten niet aangeraakt (besluit: norm blijft bronnorm). |
| 3 | Uitsluiting, norm, brede koppeling | Klaar: 18 nieuwe toetspunten met precieze koppelingen; bronbeslissingen bijgewerkt; *Continuïteitsplannen actualiseren* staat nu onder norm N260. |
| 4 | Plaatshouders | Klaar: één DORA-interviewvraag en één NOREA-route; beide vragen apart herbeoordeeld. |
| 5 | Toetspunten vallen uit de export | Klaar (besluit 8 november): niet-gekoppelde bouwstenen gaan in de export altijd mee onder de centrale vraag; stap 3, het exportscherm en de Markdown zeggen dat. Het project zelf verandert niet. Getest: 71 van 71. |
| 6 | Interviewniveau | Geen standaard op alle niveaus (besluit). Wel: heeft een toetspunt geen vraag op het gekozen niveau maar wel op een ander, dan zegt de export welk niveau. |
| 7 | Grote Excel | Klaar: werkboek wordt gecomprimeerd (deflate); inhoud gelijk. Voorbeeld: 27,6 MB → 3,5 MB. |
| 8 | Fouten in normen | Klaar in v0.1.9: zes normen en één beheersmaatregel hersteld, norm volgt de bron. |
| 9 | Vindplaatsen RTS 1773, 301, 532 | Klaar in de app: artikel, lid en onder uit het record-ID; geen *artikel 1, 0(a)* meer. Alleen weergave; de bron blijft gelijk. |
| 10 | Standaardzinnen, Markdown, tijd | Klaar in de app: algemene bewijszin één keer als toelichting; Toetsuitvoering in Markdown met echte koppen; datum in lokale tijd. |
| 11 | Wensen | Klaar: legenda bij *Grondslag*; RCM met kolom *Eigenaar* en fasekoppen (advies van drie experts: geen deadline, populatie of steekproef in de RCM); NOREA- en RTS/ITS-normen verwijzen naar elkaar (161 koppelingen); artikel 23 DORA als toetspunt (v0.1.10); uitleg artikel 16, lid 1 op *Over*. |

Controles: bronpassages letterlijk, vraagscan gelijk aan ronde 7, toetspuntcontrole gelijk aan ronde 7 op de toetspuntteksten.
