# Controle op volledige en leesbare toetspunten

<!-- paginatype: naslag -->

> **In het kort:** een toetspunt moet op zichzelf kloppen. Wat in de bronpassage en in de toets van opzet, bestaan en werking staat, hoort ook in het toetspunt. De tekst moet leesbaar zijn, zonder werknotities of nummers die aan elkaar zijn geschreven. `npm run check:toetspunten` spoort dat op zonder taalmodel. De eerste meting, op de DORA-kaders, is van 6 november 2026 ([B-035](besluiten.md#b-035)).

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
- een standaardzin die bij vijf of meer toetspunten van dezelfde bron terugkomt, staat niet meer bij *Bijdrage aan dit toetspunt* of bij de context. Ze blijven in het bewijsdossier en de Excel-export;
- een dubbele regel bij een bronkoppeling (zelfde tekst als de bepaling) staat er één keer;
- de documentnaam boven de bron is leesbaar (*Oorspronkelijke publicatie*, niet *rts-original-nl.pdf*);
- de brontekst heeft meer ruimte tot de rand, zodat de markering niet tegen het kader loopt.

De inhoud zelf verandert niet door de viewer. Het herstel in de toetspunten volgt in [#301](https://github.com/Robert-Worm/omnibus/issues/301).

## Wat er misging en wat we leren

Vijf oorzaken, met de les die nu in de skills staat.

| Wat er misging | Les | Waar vastgelegd |
| --- | --- | --- |
| Bij het splitsen van een norm in toetspunten bleef het toetspunt kort. De voorwaarden gingen naar de toetsen en de toepassing | Een toetspunt moet los gelezen kloppen. Elke voorwaarde, uitzondering en opsomming gaat mee naar het toetspunt | Kaderskill, werkwijze *Toetspunt zelfstandig* |
| De reviews keken vooral of de tekst trouw was aan de bron, niet of het toetspunt zelf volledig was | Lees een toetspunt eerst los, en leg dan bron en toets ernaast. Een ontbrekende nuance begrenst de score op 5 | Reviewskill en rubric |
| Velden voor het dossier en voor de lezer liepen door elkaar. Selectieredenen en standaardzinnen kwamen in de viewer | Lezerstekst en dossier zijn gescheiden. De viewer toont alleen lezerstekst | Kaderskill; viewer |
| Werktaal en nummers zonder spatie vielen in de reviews niet op. Schrijver en reviewer waren allebei een taalmodel met dezelfde gewoonten | Een vaste controle zonder taalmodel vangt wat een model zelf niet ziet | `check:toetspunten`, verplicht voor de overdracht |
| De bestaande metingen telden of elk veld gevuld was, niet of het bruikbaar was | Meet ook wat de lezer ervaart | Kwaliteitsmeting en auditcriteria (CO-1 #6) |

Waar de spaties tussen woord en nummer precies verdwijnen, is nog niet bekend. Dat zoekt [#301](https://github.com/Robert-Worm/omnibus/issues/301) uit.

## Zo draai je hem

```bash
npm run build:agent -- --settings local-data/runtime/local-build.json
npm run check:toetspunten -- --catalogue agent-build/<release>/catalogue.sqlite --bron '^(DORA|NOREA)' --uit toetspunten.md --csv toetspunten.csv
```

Laat `--bron` weg voor alle bronnen. Het CSV-bestand heeft één regel per melding, met toetspunt, bron, soort, veld en wat er gevonden is.

## Volgende stap

Herstel de meldingen in de bron van de uitwerking en draai de controle opnieuw. Doel: geen *aaneen* en geen *werktaal* in toetspunt en toets, en elke melding *onvolledig*, *vaag* en *verwijzing* beoordeeld.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
