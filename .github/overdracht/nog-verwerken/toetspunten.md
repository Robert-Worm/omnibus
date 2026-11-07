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
| 6 | 501–600 | RTS 2024/1774 (titel III slot), RTS 2024/1772, RTS 2025/301, ITS 2025/302 (begin) | 79 | 21 | 0 | 69 bronfouten hersteld; 3 ontbrekende toetspunten (zie hieronder). Nog gelijktrekken: relevantiezin RTS 2024/1772 met die van DORA hoofdstuk III (`DEEL6-OPEN.json`) |
| 7 | 601–700 | ITS 2025/302, RTS 2024/1773, RTS 2025/532, ITS 2024/2956 (begin) | 70 | 30 | 0 | 80 bronfouten hersteld. Ter beoordeling: afronding in velden 3.5, 3.7 en 3.10 gelezen als *rekenkundig, 5 naar boven* (Engelse tekst, via springlex; nog tegen EUR-Lex leggen). Veld B_02.01.0050 verwijst in de bron naar het verkeerde veld (`DEEL7-OPEN.json`) |
| 8 | 701–800 | ITS 2024/2956 (slot), RTS 2025/1190, richtsnoeren incidentkosten, NOREA (begin) | 66 | 34 | 0 | 75 bronfouten hersteld; rectificatie 2025/90725 toegepast op registervelden. Ter beoordeling: attest TLPT verwijst naar niet-bestaand artikel 5, lid 3; gelezen als artikel 7, lid 2 (`DEEL8-OPEN.json`) |
| 9 | 801–900 | NOREA DORA in Control | 87 | 13 | 0 | Alle gemelde bronfouten klopten. Bronpassages 5.3 en 8.2-P05 onvolledig (tweede pdf-blok ontbreekt). Werkblad *DORA RTS IM (Major Incidents)* staat niet in de bron: drempels bij 10.1 en 10.2 vervangen door een verwijzing (`DEEL9-OPEN.json`) |
| 10 | 901–1000 | NOREA DORA in Control (vervolg) | | | | |

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
| Richtsnoeren incidentkosten (GL34) | punt 5: geen kosten en verliezen van incidenten vóór of na het referentiejaar | review deel 8 | Geen eigen toetspunt |
| NOREA DORA in Control | 9.1 en 9.6: verwijzing naar RTS 2024/1774, artikel 24, voor CTP's, handelsplatformen en CSD's | review deel 9 | Staat in de control; geen toetspunt. Twijfel: bij 9.6 gaan de testeisen over artikel 25, leden 3 en 4 |
| NOREA DORA in Control | 11.3: significante cyberdreigingen melden aan de toezichthouder | review deel 9 | Staat in de control; geen toetspunt. DORA artikel 19, lid 2, maakt deze melding vrijwillig |
| NOREA DORA in Control | werkblad *DORA RTS IM (Major Incidents)* (drempels bij 10.1 en 10.2) | review deel 9 | Werkblad niet in de bron opgenomen; ophalen of niet |
