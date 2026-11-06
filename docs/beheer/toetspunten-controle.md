# Controle op volledige en leesbare toetspunten

<!-- paginatype: naslag -->

> **In het kort:** een toetspunt moet op zichzelf kloppen. Wat in de bronpassage en in de toets van opzet, bestaan en werking staat, hoort ook in het toetspunt. De tekst moet leesbaar zijn, zonder werknotities of nummers die aan elkaar zijn geschreven. `npm run check:toetspunten` spoort dat op zonder taalmodel. De eerste meting, op de DORA-kaders, is van 6 november 2026 ([B-035](besluiten.md#b-035)). Dezelfde dag zijn de meldingen hersteld in een nieuwe database; zie [Herstel van 6 november 2026](#herstel-van-6-november-2026).

## Waarom

Bij een DORA-toetspunt bleek de norm uitgebreid en het toetspunt kort. De nuance stond wel in de bronpassage en kwam terug in de toetsen. Maar wie het toetspunt selecteert, ziet haar niet. Een toetspunt moet volledig zijn: het is wat de auditor kiest en exporteert.

## Wat de controle meldt

| Soort | Wat er mis kan zijn | Voorbeeld |
| --- | --- | --- |
| onvolledig | De bronpassage en de toets noemen onderdelen die in geen toetspunt bij deze norm staan. Een ander toetspunt bij dezelfde norm telt mee | Toetspunt *op de brongebonden risicobasis*; de toets noemt *algeheel risicoprofiel, schaal en complexiteit* |
| vaag | Het toetspunt telt of verwijst zonder te noemen | *met de vereiste inhoud*, *de vier gegevenskwaliteiten*, *de bedoelde normen* |
| verwijzing | Het toetspunt leunt op een artikelnummer in plaats van te zeggen wat er moet | *getest overeenkomstig artikel 8(2)(b)(v–vii)* |
| aaneen | Een nummer zonder spatie | *artikel8(2)*, *titelIII*, *uiterlijk24 uur* |
| werktaal | Een notitie uit de uitwerking in tekst die de lezer ziet | *dit voorstel*, *brongebonden*, *HOLD*, *zie P02*, *kalenderroute*, *deze batch* |
| engels | Engelse zinsdelen in Nederlandse tekst | *shall*, *unresolved* |

De controle kijkt naar alle velden die de lezer bij een toetspunt ziet: toetspunt, norm, doel, risico, beheersing, de drie toetsen, bewijs en in de viewer de toepassing, de bijdrage en de context van de bepaling.

Een melding is een signaal voor review, geen oordeel. *Onvolledig* vergelijkt woorden en geeft ook vals alarm, bijvoorbeeld bij een andere formulering van hetzelfde. In een steekproef van vijf meldingen waren er drie terecht. *Aaneen* en *werktaal* zijn bijna altijd terecht.

## Uitkomst op de DORA-kaders

Database van 4 november (review02), de 18 DORA-bronnen en NOREA, 1.337 selecteerbare toetspunten.

| Soort | Toetspunten met melding |
| --- | ---: |
| onvolledig | 283 |
| vaag | 86 |
| verwijzing | 147 |
| aaneen | 998, waarvan 274 in het toetspunt of de toets |
| werktaal | 1.180, waarvan 291 in het toetspunt of de toets |
| engels | 0 |

Drie dingen vallen op:

- **Nummers zonder spatie komen in de hele uitwerking voor.** De database telt ruim 10.000 keer *artikel* direct gevolgd door een cijfer. Dat is geen losse typefout maar een fout in de verwerking. De bronpassages zelf hebben het niet.
- **Standaardzinnen van de uitwerking staan in de viewer.** Bij *Bijdrage aan dit toetspunt* stond vaak een vaste zin, zoals *Afzonderlijk toetsbaar onderdeel; te lezen met de aanhef en toepassingscontext uit de bronbinding*. Ruim 10.000 van de 11.000 koppelingen hadden zo'n zin. Onder *Toepassing van dit toetspunt* stond de selectiereden, zoals *uitsluitend afzonderlijke kandidaat voor integratiereview; geen actieve toelating*. Dat klopte niet meer en hielp de lezer niet.
- **De toepassing gebruikt veel werkwoorden**: *normadressaat*, *taakdrager*, *deelroute*, *meldroute*, verwijzingen naar interne ID's als *P02*.

## Wat al is aangepast

In de viewer:

- de selectiereden en de splitsingsreden staan niet meer bij een toetspunt;
- de herleiding bij een bronkoppeling (*Bijdrage aan dit toetspunt*) staat niet meer in de viewer: dat waren werknotities. Een standaardzin die bij vijf of meer toetspunten van dezelfde bron terugkomt, staat ook niet meer bij de betrokken partijen of de context. Alles blijft in het bewijsdossier en de Excel-export;
- een dubbele regel bij een bronkoppeling (zelfde tekst als de bepaling) staat er één keer;
- de documentnaam boven de bron is leesbaar (*Oorspronkelijke publicatie*, niet *rts-original-nl.pdf*);
- de brontekst heeft meer ruimte tot de rand, zodat de markering niet tegen het kader loopt.

De inhoud zelf verandert niet door de viewer.

## Herstel van 6 november 2026

In de database van 6 november zijn de DORA-toetspunten zelf hersteld ([#301](https://github.com/Robert-Worm/omnibus/issues/301)). Zo is het gedaan:

1. **Spaties tussen woord en nummer**: vast script, zonder taalmodel. ID's en hashes blijven ongemoeid.
2. **Toetspunten met een melding** (654): herschreven per batch van 20, met bron, toetsen en de andere toetspunten bij de norm ernaast. Daarna beoordeelde een ander taalmodelexemplaar elke batch onafhankelijk. Het zag de brontekst en beoordeelde brontrouw, volledigheid, afbakening en leesbaarheid. Alleen goedgekeurde tekst is overgenomen; bij een afkeuring de verbetering van de reviewer, of anders de oude tekst.
3. **Werktaal in losse zinnen** (toepassing, normen, toetsen, bewijs, context bij de bronbepaling): per zin herschreven en per zin beoordeeld op gelijke betekenis.
4. **Interviewvragen**: de reviewer beoordeelde per vraag of die nog bij het herschreven toetspunt past. Vragen die niet passen (48), worden niet meer aangeboden. De tekst van vragen is niet aangepast.

De brontekst, de selectie van toetspunten en de documenten zijn niet veranderd. De bouw controleert dat.

| Soort | 4 november | 6 november |
| --- | ---: | ---: |
| onvolledig | 283 | 125 |
| vaag | 86 | 15 |
| verwijzing | 147 | 1 |
| aaneen | 998 | 0 |
| werktaal | 1.180 | 10 |

Wat nog openstaat:

- **Onvolledig (125)**: deze controle vergelijkt woorden en geeft ook vals alarm. De meeste meldingen gaan over een andere formulering van hetzelfde. De toetspunten die op 4 november deze melding hadden, zijn allemaal herschreven en beoordeeld.
- **Werktaal (10)**: vooral in het veld *doel*. Dat komt uit de laag met organisatiedoelen, die niet in deze ronde zat. Drie zinnen keurde de reviewer af zonder zekere verbetering; die zijn blijven staan.
- **Kanttekeningen van reviewers**: bij een paar toetspunten steunt de verbetering op kennis van de reviewer buiten het meegeleverde bronfragment. Die staan in het reviewdossier. Dat dossier bewaart de beheerder buiten de repository; de database bevat de hash van elk bestand erin.

## Tweede ronde: brontrouw en de export (6 november)

Een panelbeoordeling ([epic #313](https://github.com/Robert-Worm/omnibus/issues/313)) vond twee dingen: een paar herschreven toetspunten waren ruimer dan de bron, en de Excel-export toonde werktaal die deze controle niet zag. Zo is het opgepakt:

1. **Brontrouw** ([#302](https://github.com/Robert-Worm/omnibus/issues/302)): alle 531 herschreven toetspunten opnieuw naast de bron gelegd, met één vraag: zegt het toetspunt precies wat de bron zegt? 65 meldingen. Een tweede reviewer legde elke melding naast de volledige wettekst: 57 overgenomen, 3 aangepast, 5 afgewezen omdat de wettekst de bestaande tekst steunt. 60 toetspunten zijn gecorrigeerd.
2. **De controle leest wat de export toont** ([#303](https://github.com/Robert-Worm/omnibus/issues/303)): ook de broncontext (toepassing, grens per toets, beperkingen van het kader), en een algemene spatieregel voor elk woord direct gevolgd door een nummer.
3. **Werktaal in die velden**: 487 zinnen herschreven of weggehaald (alleen notities over de uitwerking zelf), elke zin apart beoordeeld.

| Soort | Na eerste ronde, met de nieuwe regels | Na tweede ronde |
| --- | ---: | ---: |
| aaneen | 677 | 0 |
| werktaal | 1.249 | 18 |
| engels | 171 | 129 |

Wat nog openstaat:

- **Engels (129)**: vrijwel alles in de NOREA-kaders, waar de toepassing Engelse zinsdelen uit het NOREA-werkboek aanhaalt. Een citaat vertalen we niet zonder besluit.
- **Werktaal (18)**: vooral afkortingen voor bijlagepunten (*B13*, *B14*) en een code in een verwijzingsveld.
- **Te beslissen door een mens**: bij `RTS1774-N102-P01` zegt de Nederlandse wettekst *voor de medewerkers:* zonder te zeggen of alleen eigen medewerkers bedoeld zijn. Het toetspunt noemt ook medewerkers van ICT-dienstverleners.
- **Vraagplannen en de licentieregel van NOREA** zijn niet herschreven; vraagplannen vallen onder [#311](https://github.com/Robert-Worm/omnibus/issues/311).

## Wat er misging en wat we leren

Zes oorzaken, met de les die nu in de skills staat.

| Wat er misging | Les | Waar vastgelegd |
| --- | --- | --- |
| Bij het splitsen van een norm in toetspunten bleef het toetspunt kort. De voorwaarden gingen naar de toetsen en de toepassing | Een toetspunt moet los gelezen kloppen. Elke voorwaarde, uitzondering en opsomming gaat mee naar het toetspunt | Kaderskill, werkwijze *Toetspunt zelfstandig* |
| De reviews keken vooral of de tekst trouw was aan de bron, niet of het toetspunt zelf volledig was | Lees een toetspunt eerst los, en leg dan bron en toets ernaast. Een ontbrekende nuance begrenst de score op 5 | Reviewskill en rubric |
| Velden voor het dossier en voor de lezer liepen door elkaar. Selectieredenen en standaardzinnen kwamen in de viewer | Lezerstekst en dossier zijn gescheiden. De viewer toont alleen lezerstekst | Kaderskill; viewer |
| Werktaal en nummers zonder spatie vielen in de reviews niet op. Schrijver en reviewer waren allebei een taalmodel met dezelfde gewoonten | Een vaste controle zonder taalmodel vangt wat een model zelf niet ziet | `check:toetspunten`, verplicht voor de overdracht |
| De bestaande metingen telden of elk veld gevuld was, niet of het bruikbaar was | Meet ook wat de lezer ervaart | Kwaliteitsmeting en auditcriteria (CO-1 #6) |
| Bij het uitschrijven van een verwijzing viel soms een beperking weg (*die toegang hebben tot*, *de in artikel 16, lid 1, bedoelde*). De reviewer vergeleek met de oude tekst, niet met de bron | Toets tegen de bron. Laat een correctie die steunt op kennis buiten de meegeleverde bron naast de volledige wettekst leggen | Kaderskill, *Verwijzing uitschrijven zonder iets te verliezen*; reviewrubric |

Waar de spaties tussen woord en nummer precies verdwijnen, is nog niet bekend. Dat zoekt [#301](https://github.com/Robert-Worm/omnibus/issues/301) uit.

## Zo draai je hem

```bash
npm run build:agent -- --settings local-data/runtime/local-build.json
npm run check:toetspunten -- --catalogue agent-build/<release>/catalogue.sqlite --bron DORA,NOREA --uit toetspunten.md --csv toetspunten.csv
```

Laat `--bron` weg voor alle bronnen. Het CSV-bestand heeft één regel per melding, met toetspunt, bron, soort, veld en wat er gevonden is.

## Volgende stap

Haal de werktaal uit de organisatiedoelen. Draai de controle bij elke nieuwe uitwerking, vóór de overdracht. Doel: geen *aaneen* en geen *werktaal*, en elke melding *onvolledig*, *vaag* en *verwijzing* beoordeeld.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
