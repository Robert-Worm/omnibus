# Herschrijving toetspunten vanuit de auditor

Spelregels: skill-sectie *Toetspunt vanuit de auditor* in `skills/omnibus-add-framework/references/framework-method.md`. Werkmap (niet in Git): `work/toetspunten-auditor/`.

Werkwijze per deel van ~100: twee schrijvers (elk de helft), twee tweede reviewers naast de volledige wettekst, controle en samenvatting door Claude, lessen naar de skill, dan het volgende deel.

| Deel | Toetspunten | Bronnen | Overgenomen | Aangepast | Afgewezen | Lessen in skill |
| --- | --- | --- | --- | --- | --- | --- |
| 1, ronde 1 | 1–100 van 1.337 | DORA 2022/2554 | 30 | 70 | 0 | 18 bronfouten hersteld; relevantie in vaste zinnen. Toetspunten bleven herschikte wetszinnen (48 woorden gemiddeld) |
| 1, ronde 2 | 1–100 | DORA 2022/2554 | 92 | 8 | 0 | Elementen eerst; bewering vanuit object of actor. Open: 11 onvolledige bronpassages, 5 splitsingen, 8 mogelijke dubbels (`work/toetspunten-auditor/DEEL1-OPEN.json`) |
| 2 | 101–200 | DORA 2022/2554 (rest), RTS 2024/1774 (begin) | 83 | 17 | 0 | 35 bronfouten hersteld; vaste relevantiezinnen per hoofdstuk. Open: 26 onvolledige bronpassages, 15 splitsingen, 6 dubbels (`DEEL2-OPEN.json`) |
| 3 | 201–300 | RTS 2024/1774 (titel II) | 95 | 5 | 0 | 43 bronfouten hersteld, vooral ontbrekende actor of aanhef; toetspunten werden langer (31 naar 39 woorden) doordat de actor terugkwam. Open: 1 splitsing, 6 dubbels (`DEEL3-OPEN.json`) |
| 4 | 301–400 | RTS 2024/1774 (titel II) | 92 | 8 | 0 | 84 bronfouten hersteld (vooral toestand in plaats van eis aan beleid of procedure). Database: leescontext van artikel 22, onder d, toont nog de tekst van vóór rectificatie 2025/90420 (`DEEL4-OPEN.json`) |
| 5 | 401–500 | RTS 2024/1774 (titel II slot, titel III begin) | 96 | 4 | 0 | 78 bronfouten hersteld; panelpunt artikel 28, lid 2, onder i opgelost. Open: ontbrekende aanhef in ~70 bronpassages (`DEEL5-OPEN.json`) |
| 6 | 501–600 | RTS 2024/1774 (titel III), RTS 2024/1772 | | | | |

**Daarna, voor de nieuwe database**
- [ ] Relevantie als nieuw veld in het datamodel (`relevance` bij een toetspunt), met registratie in de afgeleide-releasepijplijn.
- [ ] Viewer: relevantie-icoon rechtsboven in het toetspunt (aanwijzen, klikken, toetsenbord).
- [ ] Export: kolom *Relevantie* in Excel en Markdown.
- [ ] `check:toetspunten`: vormregels (geen gebiedende wijs, een actor, geen gewone vindplaats in de tekst).
- [ ] Panelronde in de browser.

**Ontbrekende toetspunten (selectiewijziging, besluit beheerder nodig)**

| Bron | Bepaling | Gevonden in | Toelichting |
| --- | --- | --- | --- |
| RTS 2024/1774 | artikel 40, lid 1 (jaarlijkse test bedrijfscontinuïteitsplannen, vereenvoudigd kader) | panel 6 november (P4) en review deel 6 | Geen toetspunt; alleen lid 2 en 3 gedekt. Voorsteltekst in `work/toetspunten-auditor/deel6/review6-a.json` |
| RTS 2024/1774 | artikel 33, derde alinea (sterke authenticatie, vereenvoudigd kader) | review deel 6 | Eigen plicht (*gebruiken*), geen toetspunt |
| RTS 2024/1774 | artikel 39, lid 2, onder j (plannen bijwerken) | review deel 6 | In geen toetspunt gedekt |
