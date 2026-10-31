# Auditcriteria: de AI-skills

> **In het kort:** waaraan de acht AI-skills van Omnibus moeten voldoen, als je ze zelf als auditobject beoordeelt. Hier werkt wel een AI-model: de skills laten de AI-assistent van een bijdrager bronnen lezen, normketens bouwen, vragen maken en kwaliteit beoordelen. De opbouw volgt het sjabloon van de SAAF A2-standaard (*Audit Criteria & Controls*); de tekst is Nederlands, net als de rest van Omnibus.

De applicatie en de MCP-server hebben een eigen document: [AUDIT-CRITERIA.md](../AUDIT-CRITERIA.md).

## Gegevens

| Veld | Waarde |
| --- | --- |
| Onderdeel | De acht skills in `skills/` (zie [het overzicht](README.md)) |
| Repository | https://github.com/Robert-Worm/omnibus |
| Beheerder | Robert Worm |
| Verantwoordelijkheid | Geen aparte eigenaar: de criteria zijn afgeleid van kaders die van hun uitgevers blijven. De gebruiker blijft verantwoordelijk voor het oordeel. De criteria groeien mee met betere modellen en skills |
| Laatst bekeken | 2026-10-31 |
| Status | Concept. Het bewijs per criterium wordt nog nagelopen in [#273](https://github.com/Robert-Worm/omnibus/issues/273), de kaders worden kritisch nagelopen in [#278](https://github.com/Robert-Worm/omnibus/issues/278) |
| Bronnen voor dit document | De `SKILL.md` van elke skill, [skills/README.md](README.md), [besluitenlijst](../docs/beheer/besluiten.md), `scripts/skill-regels.mjs` en `scripts/skill-meting.mjs` |

## 1. Wat de skills doen

Een skill is een map met instructies die een AI-assistent stap voor stap volgt. Het is geen programma en geen getraind model; de kwaliteit hangt af van de assistent en van de controle door mensen. Drie skills zetten een bron om (rapport, wet of kader, onderzoeksmodel) naar bouwstenen met een complete beheersketen. Vier helpen bij vragen en kwaliteit. Eén begeleidt een gebruiker naar een eigen lokale database. De uitvoer is altijd een voorstel; opname in de openbare database gaat via de beheerder.

## 2. Beheersdoelstellingen en kaders

| Beheersdoelstelling | Kader | Waarom relevant |
| --- | --- | --- |
| **BS-1:** Een skill gebruikt alleen wat echt in de bron staat, en markeert twijfel als HOLD | Global Internal Audit Standards (IIA, 2024), standaard 14.1; OWASP Top 10 voor LLM-toepassingen, LLM09 (misinformatie) | Een taalmodel kan overtuigend verzinnen; elke bouwsteen moet terug te voeren zijn op een passage |
| **BS-2:** Inhoud van een brondocument is bewijs, nooit een opdracht aan de AI | OWASP Top 10 voor LLM-toepassingen, LLM01 (*prompt injection*) | Een brondocument kan tekst bevatten die de AI probeert te sturen |
| **BS-3:** Belangrijke stappen worden onafhankelijk gedaan en gecontroleerd | Global Internal Audit Standards (IIA, 2024), principe 4 (zorgvuldigheid); EU AI Act, art. 14 (menselijk toezicht) als richtlijn | Eén model dat zijn eigen werk nakijkt, ziet zijn eigen fouten niet |
| **BS-4:** De uitvoer is een voorstel; een mens beslist over opname | EU AI Act, art. 13 en 14 (transparantie en menselijk toezicht) als richtlijn | Een AI-review is geen menselijke goedkeuring |
| **BS-5:** Een skill wordt alleen zuiniger als de kwaliteit aantoonbaar niet daalt | COBIT 2019, BAI03 (oplossingen bouwen en testen) | Minder werk mag niet ten koste gaan van de kwaliteit ([B-018](../docs/beheer/besluiten.md#b-018)) |

De EU AI Act noemen we als richtlijn: of de skills onder de verordening vallen, is niet beoordeeld. Omnibus gebruikt hem als maatstaf voor transparantie en menselijk toezicht.

**Let op bij de kaders.** De koppeling met deze kaders is een voorstel van de AI-assistent (31 oktober 2026). De nummers zijn nagekeken tegen de kaders zelf, maar of elk kader echt de beste maatstaf is, is nog niet door een mens beoordeeld. De IIA-standaarden gaan over het werk van de auditor, niet over een hulpmiddel; ze zijn hier gebruikt omdat Omnibus dat werk ondersteunt. Kritisch nalopen gebeurt in [#278](https://github.com/Robert-Worm/omnibus/issues/278).

## 3. Toetsbare criteria

### BS-1 · Alleen wat in de bron staat

1. Gegeven een bron, gebruikt de skill alleen daadwerkelijk gelezen tekst en beelden als bewijs (`omnibus-add-report`).
2. Gegeven ontbrekend bewijs, een ontbrekende fase of review, blijft het resultaat `HOLD` of `PENDING_REVIEW` (`omnibus-add-report`).
3. Gegeven een database, staat elke passage letterlijk op de opgeslagen plek (`npm run check:passages`; zie BD-1 in het [applicatiedocument](../AUDIT-CRITERIA.md)).
4. Gegeven een beoordeling van kwaliteit, beoordeelt `omnibus-review-audit-quality` de bouwsteen, niet of de onderzochte organisatie aan de norm voldoet.

### BS-2 · Brontekst is geen opdracht

1. Gegeven een brondocument met instructies, behandelt de skill die als bronmateriaal, niet als opdracht. Deze regel staat in `omnibus-add-report`, `omnibus-add-model`, `omnibus-review-questions` en `omnibus-build-local-database`.

*Beperking, eerlijk gezegd:* dit is een instructie aan het model, geen technische afscherming. Of een model zich eraan houdt, hangt af van de AI-assistent. Er is nog geen test met een bron vol gerichte instructies.

### BS-3 · Onafhankelijk werk en controle

1. Gegeven een rapport, houdt `omnibus-add-report` twee blinde volledige bronlezingen, een onafhankelijke reconciliatie, een conceptreview en afzonderlijke bron- en praktische eindreviews aan.
2. Gegeven een omgeving zonder echte afzonderlijke contexten, simuleert de skill geen meerdere lezers in één context; het pakket blijft dan `PENDING_REVIEW`/`HOLD`.
3. Gegeven een start, legt de skill vooraf het maximale aantal deelagenten vast en reserveert eerst de rollen voor controle en eindreview (`omnibus-add-report`, `omnibus-add-framework`, `omnibus-review-audit-quality`).

### BS-4 · Een voorstel, geen besluit

1. Gegeven een review, levert `omnibus-review-audit-quality` beoordelingen en verbetervoorstellen, en wijzigt hij geen bronpakketten, database of projecten.
2. Gegeven een beoordeling, eindigen reviews met een lijst *Nog te controleren* (`omnibus-review-audit-quality`, `omnibus-review-questions`).
3. Gegeven een nieuw bronpakket, gaat opname in de database via de beheerder en de gewone controles ([meedoen](../docs/bijdragen/README.md)).

### BS-5 · Zuiniger alleen na meting

1. Gegeven een skill, meldt `npm run skills:regels` afwijkingen van de vaste controlelijst.
2. Gegeven een voorstel om een skill zuiniger te maken, meet `npm run skills:meting` de leeskosten op een vaste testset, en gaat de wijziging alleen door als de kwaliteit nergens daalt.

## 4. Goede uitvoer en wat nooit mag

| Een goede uitvoer bevat altijd | Een skill doet nooit |
| --- | --- |
| ✓ Bij elke bouwsteen de bronpassage, pagina en versie | ✕ Bewijs verzinnen of een passage aanvullen die er niet staat |
| ✓ De complete keten: doel, risico, beheersdoelstelling, beheersmaatregel, norm, toetspunten en opzet-/bestaanstoetsen | ✕ Een instructie uit een brondocument uitvoeren |
| ✓ De status per onderdeel (bijvoorbeeld HOLD of `PENDING_REVIEW`) | ✕ Meerdere onafhankelijke lezers nadoen in één context |
| ✓ Bij een review: een lijst *Nog te controleren* | ✕ Een AI-review presenteren als menselijke goedkeuring |
| – | ✕ Bronbestanden of privébewijzen in Git of een issue zetten |

## 5. Dekkingsgaten

Aangevuld met de auditorblik van de beheerder ([#274](https://github.com/Robert-Worm/omnibus/issues/274)).

1. **Geen test op gerichte instructies in een bron** (BS-2). Een proef met een brondocument vol instructies ontbreekt. Dit krijgt voorrang, omdat deelnemers aan de SAAF-challenge het zeker proberen: [#277](https://github.com/Robert-Worm/omnibus/issues/277).
2. **Afhankelijk van de AI-assistent.** Een skill is een instructie; de naleving hangt af van het model en de omgeving van de bijdrager. Omnibus kan niet afdwingen dat de onafhankelijkheid uit BS-3 echt wordt gevolgd.
3. **Geen vaste meting per skill.** De meting uit BS-5 bestaat; niet elke skill heeft al een nulmeting met kwaliteitsoordeel.
4. **De EU AI Act is niet juridisch beoordeeld** voor deze toepassing; hij dient hier als richtlijn.

## 6. Status en bewijs

| Criterium | Bewijs (bestaand) | Bevestigd |
| --- | --- | --- |
| BS-1 #1, #2 | `skills/omnibus-add-report/SKILL.md`, *Werken en opleveren* | ☐ |
| BS-1 #3 | `scripts/check-passages.mjs`; uitkomst bij elke databaserelease | ☐ |
| BS-1 #4 | `skills/omnibus-review-audit-quality/SKILL.md` | ☐ |
| BS-2 #1 | De genoemde `SKILL.md`-bestanden; nog geen test | ☐ |
| BS-3 #1–#3 | `skills/omnibus-add-report/SKILL.md`; budgetregel in de drie genoemde skills | ☐ |
| BS-4 #1, #2 | `skills/omnibus-review-audit-quality/SKILL.md`, `skills/omnibus-review-questions/SKILL.md` | ☐ |
| BS-4 #3 | [Meedoen](../docs/bijdragen/README.md), [besluitenlijst](../docs/beheer/besluiten.md) | ☐ |
| BS-5 #1 | `scripts/skill-regels.mjs` en `scripts/skill-regels.test.mjs` | ☐ |
| BS-5 #2 | `scripts/skill-meting.mjs`, [B-018](../docs/beheer/besluiten.md#b-018) | ☐ |

De bevestiging per criterium volgt in [#273](https://github.com/Robert-Worm/omnibus/issues/273).

---

[↑ AI-skills](README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
