# Skills meten

<!-- paginatype: taak -->

> **In het kort:** zo meet je wat een skill kost en oplevert: tijd, tokens en een kwaliteitsscore, op een vaste testset van openbare bronnen. Een optimalisatie gaat alleen door als de kwaliteit nergens daalt ([B-018](besluiten.md#b-018)).

## Wat meet je?

| Wat | Hoe | Waar het vandaan komt |
| --- | --- | --- |
| Vaste leeskosten | Tokens van `SKILL.md` en de naslag die de skill altijd laat lezen | `npm run skills:meting` |
| Leeskosten van de bron | Tokens van de tekstlaag van de bron, maal het aantal volledige lezingen in de werkwijze | `npm run skills:meting -- --database <catalogue.sqlite>` |
| Tijd en tokens van een run | Begin/eindtijden en beschikbare verzoektelemetrie van de werkelijk gebruikte contexten | Jij legt het vast in [de metingen](#metingen) |
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
2. **Draai de skill op elke bron uit de testset**, in een nieuwe chat, met hetzelfde model. Begin met één pilot. Leg vooraf broneditie en SHA-256, repositoryversie en hashes van de gebruikte skills/naslag, model, rolverdeling en maximaal aantal deelagenten vast. Noteer per daadwerkelijk uitgevoerde fase context-ID, begin/eindtijd en beschikbare verzoektelemetrie. Behoud de twee blinde lezers, onafhankelijke reconciliatie, conceptreview en afzonderlijke eindreviews. Een bestaande bronbank telt niet als nieuwe extractie.
3. **Beoordeel het resultaat** met `omnibus-review-audit-quality`. Alleen volledige bron- en ketendekking levert een totaalscore op. Bewaar ruwe onafhankelijke oordelen; los materiële verschillen met bewijs op. Een steekproefscore of gemiddelde van onbesliste tegenstrijdige oordelen is geen rapportscore.
4. **Leg de run vast** als regel in [de metingen](#metingen).
5. **Vergelijk** een nieuwe versie met de vorige op dezelfde bronnen. Daalt de score bij één bron, dan gaat de wijziging niet door.

*Gelukt als:* elke bron uit de testset een regel heeft voor de oude en de nieuwe versie.

Bewaar bronbestanden, fasebewijzen, ruwe reviews en verzoeklogs uitsluitend in een private, genegeerde werkmap. De openbare tabel bevat alleen de samenvatting. Onbeschikbaar verbruik of een ontbrekende score is `null`, met de reden bij de registratie. Noteer input, cache-input, output en redeneertokens afzonderlijk waar beschikbaar: cache-input zit al in input en redeneertokens zitten al in output. Subscriptioncredits zijn geen eurofactuur. Kosten zonder werkelijke factuur- of verzoekgegevens blijven `null`; de tekstschatting hierboven blijft apart.

Scheid voorbereiding, inhoudelijke uitvoering en technisch onderhoud. Een vastgelopen intake krijgt HOLD en telt niet als een voltooide run. Geen fase achteraf reconstrueren, ontbrekend bewijs vervangen of kitcontroles aanpassen om de meting te laten slagen.

`vergelijk(oud, nieuw)` verlangt aan beide kanten precies één regel per vaste bron/skill, een geldige score van 1–10, één repositoryversie per reeks en hetzelfde model. Lege, onvolledige, dubbele en gemengde reeksen worden geweigerd. Kies de oude en nieuwe versie expliciet vóór de vergelijking. Dit controleert de meettabel; het bewijst geen bronlezing, juiste hashes of onafhankelijke review. Die bewijzen blijven onderdeel van het private dossier. Lagere scores bij één bron blokkeren de vergelijking, ook bij minder tokens.

## Geschatte leeskosten

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

- **In tekst kost de bron het meest.** De werkwijze voor rapporten en kaders laat de bron vier keer volledig lezen: twee lezers, een reconciliator en een eindreviewer. Bij een rapport van 41 pagina's is dat ruim zestien keer zoveel als de instructies. In de werkelijke runs nam de coördinator met herhaalde context 36 tot 47 procent van de tokens; zie [de metingen](#metingen).
- **Werkelijk verbruik vraagt verzoektelemetrie.** Herhaalde context, cache, uitvoer en beelden staan niet volledig in deze tekstschatting. Leid daaruit geen werkelijke tokens of kosten af.

## Metingen

De nulmeting is af: alle vier bronnen uit de testset zijn volledig verwerkt op codebasis `5e37b68`. Per bron zijn twee blinde lezingen, reconciliatie, praktische conceptreview, afzonderlijke eindreviews en vier onafhankelijke OAK-perspectieven uitgevoerd ([#170](https://github.com/Robert-Worm/omnibus/issues/170)). `Agents` telt de technische deelcontexten zonder coördinator; dat zijn geen aantallen onafhankelijke beoordelaars. `Tokens` is inclusief cache-input en uitvoer.

| Datum | Skill | Bron | Versie | Model | Agents | Minuten | Tokens | Score |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| 2026-10-25 | omnibus-add-report | LVVN26 | c1c0586 | gpt-6-astra | 0 | null | null | null |
| 2026-10-26 | omnibus-add-report | LVVN26 | 5e37b68 | gpt-6-astra | 11 | 225,39 | 108.437.098 | 8,2 |
| 2026-10-26 | omnibus-add-report | PROO26 | 5e37b68 | gpt-6-astra | 13 | 340,69 | 76.480.394 | 8,0 |
| 2026-10-26 | omnibus-add-report | IVHO25 | 5e37b68 | gpt-6-astra | 11 | 261,91 | 112.610.490 | 8,5 |
| 2026-10-26 | omnibus-add-framework | TR-CYBER-20261016-cybersecurity-doc1 | 5e37b68 | gpt-6-astra | 18 | 280,09 | 125.849.220 | 8,0 |
| 2026-10-27 | omnibus-add-report | LVVN26 | 5609166 | gpt-6-astra | 8 | 57,03 | null | 8,5 |

Wat de bouwstenen opleverden, en het deel van de tokens dat cache-input was:

- **LVVN26:** 11 normketens, 21 toetspunten; 104.609.664 tokens cache-input, 605.229 uitvoer.
- **PROO26:** 15 normketens, 15 toetspunten; 73.676.032 cache-input, 426.230 uitvoer.
- **IVHO25:** 11 normketens, 24 toetspunten; 108.712.320 cache-input, 687.972 uitvoer.
- **TR-CYBER, hoofdtekst:** 19 normketens, 32 toetspunten; 121.642.496 cache-input, 712.965 uitvoer.

**Meetgrenzen.** Lees de cijfers alleen met deze grenzen:

- **Model:** gpt-6-astra, gemengd *xhigh* en *High*, op verzoek van de beheerder. Een verschil met een latere meting is dus geen bewezen effect van *High* of van een andere instructie.
- **Scores** beoordelen de gemaakte bouwstenen, niet de onderzochte organisaties. Het zijn gemiddelden van beslechte normoordelen, geen publicatiebesluit.
- **LVVN26 blijft inhoudelijk HERZIEN.** Norm L09 scoort 6,0: een vergelijking door de auditor bewijst de eigen rapportagecontrole van de organisatie niet. L06 scoort 7,7. Het gemiddelde verbergt die blokkade niet.
- **PROO26** bevat een onderbreking van 191,26 minuten. Vanaf de hervatting duurde de run 135,04 minuten; vergelijk 340,69 dus niet met actieve verwerkingstijd.
- **IVHO25** toont alleen de inhoudelijke uitvoering. Met de aparte voorbereiding door de coördinator erbij is het 115.972.926 tokens, waarvan 111.943.808 cache-input en 714.133 uitvoer. Bij LVVN26 en TR-CYBER zitten voorbereiding en coördinatie al in de cijfers.
- **Niet meegeteld:** automatische goedkeuringsreviews en administratie na de meetgrens. Eurokosten zijn `null`: er is geen factuur.
- **Privé:** voorstellen, ruwe oordelen en meetlogs staan in een afgeschermde werkmap. Bronnen en de bestaande database zijn niet gewijzigd.

**Eerste bevinding** ([#172](https://github.com/Robert-Worm/omnibus/issues/172)): de coördinator neemt 36 tot 47 procent van het tokenvolume voor zijn rekening, vooral herhaalde, gecachte context. Dat is geen aandeel in eurokosten. Het eerste onderzoek richt zich op compactere rolopdrachten en alleen de nodige dossierdelen in de context. De blinde lezingen, onafhankelijke reviews en brondekking blijven.

**Eerdere pilot van 25 oktober 2026 (HOLD).** De eerste LVVN26-pilot is de regel met versie `c1c0586`. Die liep vast bij de intake: het auteursregister ontbrak in de openbare checkout, en een tweede proef weigerde de bron met `Report already active`. Er is toen geen lezing, review of score gemaakt. Alleen de voorbereiding is gemeten: 2.636.733 tokens in een venster van bijna tien minuten.

`npm run skills:meting -- --metingen` vat de vastgelegde runs samen.

### Begrensde bijdragersproef van 27 oktober 2026

Voor [#225](https://github.com/Robert-Worm/omnibus/issues/225) is uitsluitend **LVVN26, een rapport van 14 pagina's**, opnieuw verwerkt. Alle acht inhoudelijke deelcontexten gebruikten **Astra High**. De proef gebruikte de meegeleverde openbare rolinstructies en hulpmiddelen; de private rapportkit is niet uitgevoerd. Twee blinde lezers, een onafhankelijke reconciliator, een auteur en vier afzonderlijke reviewperspectieven leverden nieuwe resultaten. De praktische reviewer deed ook de concept- en eindreview; de bronreviewer las alle tekstpagina's en paginabeelden. De eerste onafhankelijke oordelen zijn bewaard vóór de beslechting van verschillen.

De opbrengst is **10 normketens en 16 toetspunten**, met een beschrijvend gemiddelde van **8,5** en een bereik van **6,0–9,0**. Negen ketens zijn bruikbaar voor vervolgreview. **L06 blijft HERZIEN:** de norm accepteert een concrete aanpak van capaciteitstekorten als alternatief voor passende capaciteit, terwijl het beheersdoel daadwerkelijke dekking vraagt. Een herstelplan heft een tekort niet op. Het hoge gemiddelde maakt deze norm niet geschikt voor vrijgave.

De vergelijking met de eerdere **8,2** is beperkt tot dit rapport. De PDF is dezelfde; de tekstextractie en indeling verschillen (eerder 11 ketens en 21 punten). Normnummers zijn daardoor niet rechtstreeks vergelijkbaar. De eerdere run gebruikte deels *xhigh* en deels *High*. Deze proef bewijst geen modelvoordeel of kwaliteitsbehoud voor de volledige vierbronnentest van B-018.

De **57,03 minuten** lopen vanaf de eerste daadwerkelijke bronlezing tot de vastgelegde eindbeslechting, inclusief tussentijdse wachttijd. Voorbereiding, de aparte korte startcontrole, technische tests en publicatieadministratie vallen erbuiten. De eerdere 225,39 minuten bevatten ook voorbereiding; dit verschil is geen zuivere snelheidsmeting. Werkelijk tokenverbruik en eurokosten blijven **`null`**, omdat verzoektelemetrie voor deze proef ontbreekt.

De gewone intake weigerde LVVN26 terecht omdat het rapport al actief is in de vastgelegde vergelijkingscollectie. Daarom is alleen de bestaande route voor een analyseproef gebruikt. Er is geen bron uit het register verwijderd, geen toelatingsbewijs nagebootst en geen database gewijzigd. Deze proef bewijst nog niet dat een nieuw bijdragerspakket de volledige ontvangst en toelating doorloopt. **#225 blijft daarom open.**

Twee concrete lessen:

- De bronvoorbereiding neemt de volledige kwaliteitsregels op in `TASK.md`. De rolinstructie verduidelijkt nu dat een apart `QUALITY.md` dan niet ontbreekt. De gemeten instructies op versie `5609166` zijn tijdens de proef ongewijzigd gebleven.
- Beoordeel een bestaand tekort en de aanpak daarvan afzonderlijk. Een goede toetsbeschrijving herstelt een te ruime norm niet. De L06-bevinding blijft zichtbaar; er is geen extra reparatieronde gestart om de gemeten score te verhogen.

Bronnen, ruwe beoordelingen en meetbestanden blijven privé. De bestaande database en applicatieworkflows zijn ongewijzigd. Er is geen tweede rapport verwerkt.

### Gerichte correctie van L06

Op 27 oktober 2026 is, na een afzonderlijke opdracht, alleen **L06 met beide bijbehorende toetspunten** herzien. Dezelfde bestaande bewijzen zijn hergebruikt; er is geen nieuw rapport verwerkt. Drie velden zijn aangepast: de norm, de tekst van het tweede toetspunt en de beslisgrens bij bestaan. Ze onderscheiden nu het oordeel over passende capaciteit van het oordeel over tekortafhandeling. Een herstelplan maakt een capaciteitstekort niet tot een voldoende uitkomst.

Eén inhoudelijke reviewer op **Astra High** las de gewijzigde keten en geraakte relaties opnieuw. De nieuwe score is **8,8**, bron **9**, laagste onderdeel **8**, met status `BRUIKBAAR_VOOR_VERVOLGREVIEW`. Dit is **`SELF_REVIEW`**, geen nieuwe onafhankelijke panelbeoordeling. Het oorspronkelijke panelcijfer **6** en het proefgemiddelde **8,5** blijven staan voor de oorspronkelijke versie; er is geen nieuw rapportgemiddelde berekend.

De herstelversie bevat uitsluitend de gewijzigde keten en de bijbehorende voorstel- en bronlinkfragmenten. Vier herhalingen van de gewijzigde tekst zijn daarin gelijkgetrokken. De oorspronkelijke bestanden en database blijven intact. De rapportskill heeft de korte les over herstelplannen meegekregen, maar daarmee is geen nieuwe volledige skillmeting of toelating uitgevoerd. De herstelversie blijft privé en is niet in de actieve tool opgenomen; **#225 blijft open** voor de nog ontbrekende volledige ontvangst- en kwaliteitsproef. Werkelijk tokenverbruik en kosten van deze tekstherstelronde zijn onbekend.

## Samengevat

Meet vaste kosten met het script, draai de skill op de vier bronnen van de testset, beoordeel met de OAK-score en leg elke run vast. Daalt de score bij één bron, dan gaat de wijziging niet door.

## Volgende stap

Lees welke ideeën uit andere skillverzamelingen we meten in [lessen uit andere skills](skill-lessen.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
