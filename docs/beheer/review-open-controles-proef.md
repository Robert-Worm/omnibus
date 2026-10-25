# Praktijkproef: open controles zichtbaar houden

<!-- paginatype: naslag -->

> **In het kort:** de proef van 25 oktober 2026 past de bestaande rol- en uitvoerregels van #197 toe op LVVN26. De enige open bronvraag blijft zichtbaar in beide reviews. Een tekort in de eerste OAK-slotsectie is hersteld en onafhankelijk hergetoetst. De skills zelf hoefden niet te veranderen.

## Bron en afbakening

Gebruikt is LVVN26 uit de [vaste testset](skill-meting.md#de-testset): de definitieve rapporteditie van 12 mei 2026, met 14 pagina's en PDF-SHA-256 `26c6574628161edcba9d3072021fcccff39e7be5696c64653b0b7e1059cadccc`. De codebasis was `a223bfeec7360d25b5314f4a23b40450ecd5cb63`. Bron, runtimepublicatie, geselecteerde inhoud en instructies zijn vooraf met hashes vastgelegd in een private, genegeerde werkmap.

De review betreft uitsluitend **LVVN26-K01 en LVVN26-K01/TP01**: één van tien normen, met het enige bijbehorende punt. Ook de aparte doel- en beheersdoellagen, vraag, doorvragen en toetsinstructies zijn beoordeeld. Er was geen afzonderlijke algemene variant. De runtime is uitsluitend gelezen. Deze gedragsproef is geen nieuwe rapportextractie, bronvrijgave of volledige kostenmeting volgens B-018. De eerdere nulmeting blijft ongewijzigd.

## Werkelijk uitgevoerde rollen

Er zijn zes afzonderlijke interne agentcontexten gebruikt, naast de coördinator. De bronlezers kregen alleen de bron en methode-instructies, geen bestaande interpretaties. Zij verzamelden zonder eigen normvoorstellen of actuele organisatieconclusies. Er zijn geen extra chats gemaakt.

| Rol | Uitvoering en bewijs |
| --- | --- |
| Twee blinde bronlezers | Ieder las alle 14 tekst- en beeldpagina's. Samen 28 bronnotities met vindplaats, citaat en kwalificatie; eerste inzendingen bevroren vóór vergelijking. |
| Onafhankelijke reconciliator | Alle pagina's gelezen; 28 notities verantwoord in 17 vergelijkingsregels; 61 citaatfragmenten exact gecontroleerd. Eén open bronvraag behouden. |
| OAK-reviewer | Volledige gekozen keten en bron gelezen. Vier perspectieven in één `SELF_REVIEW`; ketenscore 7,9, geen rapportscore. Eén voorstel niet toegepast. |
| Vraagreviewer | Volledige bron gelezen; zeven gebruikseenheden: zes behouden, één herschrijven. Hoofdvraag ook op interviewgebruik beoordeeld; voorstel passeert vormcontrole. |
| Onafhankelijke eindcontrole | Alle pagina's gelezen; bronnotities, vergelijking, keten, reviews, hashes en slotsecties gecontroleerd. Eerste afwijking en hercontrole apart bewaard. |

## Open controles en herstel

**BQ01** is een echte, door een blinde lezer gemelde bronvraag over de tijdsgrens van het bronbewijs. De reconciliatie sluit deze niet zonder bewijs. Beide reviews nemen hetzelfde ID op in **Nog te controleren**. Historisch gebruik blijft begrensd mogelijk; een onbewezen actualiteitsclaim krijgt een voorwaardelijke HOLD. De echte uitvoering bevat nul actieve HOLD's en één voorwaardelijke HOLD. Die aantallen zijn niet aangevuld met fictieve brongebreken.

De eerste OAK-eindversie had een uitvoerafwijking (**FC01**): niet-gelezen achterliggende stukken stonden in de hoofdtekst, terwijl de slotsectie slechts algemeen naar de beperkingen verwees. Dezelfde reviewer leverde een afzonderlijke tweede versie met concrete stukken, vindplaatsen en statussen. De onafhankelijke hertoets bevestigde het herstel. De eerste versie, scores en oorspronkelijke inhoud zijn behouden; dit vroeg geen nieuwe skillregel.

Een **afzonderlijke fictieve tegenproef** verwijderde alleen BQ01 uit de slotsectie van een kopie van het reconciliatieverslag. De controle wees die kopie af, hoewel BQ01 elders nog stond. Dit is bewijs over de uitvoercontrole, geen bevinding over de bron.

## Uitkomst voor #197

| Acceptatiecriterium | Uitkomst |
| --- | --- |
| Rollen en vaste slotsectie staan in de skills | Voldaan: [rapportmethode](../../skills/omnibus-add-report/references/report-method.md), [OAK](../../skills/omnibus-review-audit-quality/SKILL.md) en [vraagreview](../../skills/omnibus-review-questions/SKILL.md) bevatten de bestaande regels. |
| Elke HOLD staat ook in Nog te controleren | Voldaan: BQ01 en voorwaardelijke HOLD in beide finale reviews; niet-gelezen bewijs in herstelde OAK-slotsectie. Fictieve weglating afgewezen. |
| Getoetst op één bron uit de testset | Voldaan: dezelfde LVVN26-editie, gescheiden rollen, echte lezingen en ketenreview. Geen volledige B-018-nulmeting. |

Een algemene verwijzing naar beperkingen volstaat niet. Benoem in de slotsectie elk open punt en niet-gelezen bewijsstuk met vindplaats en gevolg. De bronvergelijking liet daarnaast zien waarom een bronvoorwaarde niet als frequentie mag worden naverteld. Beide lessen pasten al binnen de bestaande instructies. Er is geen aangetoonde noodzaak om die te herschrijven.

## Volgende stap

Laat de beheerder de overdracht beoordelen en #197 sluiten. Eventuele inhoudelijke voorstellen volgen afzonderlijk de [reviewwijzigingen](reviewwijzigingen.md); deze proef past ze niet toe.

## Nog te controleren

- **BQ01 blijft open:** voor later tijdgebonden hergebruik is aanvullend actualisatiebewijs nodig. De methodeproef sluit die bronvraag niet.
- **OAK01 en QR01:** de voorstellen voor de geselecteerde keten en zelfstandig interviewgebruik zijn niet toegepast of vrijgegeven. Bij toepassing volgt herbeoordeling van de gewijzigde inhoud en relaties.
- Achterliggende referentiedocumenten en technische bron-/publicatievalidatie vallen buiten deze semantische proef; de concrete beperkingen staan in het private reviewdossier. Er is geen rapport-, catalogus-, kostenbesparings- of menselijke goedkeuringsclaim.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
