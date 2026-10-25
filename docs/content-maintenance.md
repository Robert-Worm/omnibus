# Bestaande inhoud verbeteren

<!-- paginatype: naslag -->

> **In het kort:** een inhoudelijke correctie krijgt een nieuwe pakketversie, nieuwe reviews van alle geraakte bouwstenen en dezelfde controles als nieuwe inhoud. De huidige database verandert pas na een afzonderlijk publicatiebesluit.

## Van beoordeling naar correctie

Bewaar de oude bron, beoordelingsbasis, reviews en publicatie ongewijzigd. Werk in een nieuwe genegeerde map onder `work/`. Verbeter de inhoud in een nieuwe pakketversie. Een hoge kwaliteitsscore keurt een wijziging niet goed; bronlezing, onderbouwing en afzonderlijke reviewbesluiten blijven nodig.

1. **Bepaal wat opnieuw moet worden beoordeeld.** Gebruik [reviewwijzigingen](beheer/reviewwijzigingen.md) met de volledige oude en nieuwe beoordelingsbasis. Neem bronversies, documenthashes, passages, context, toepasselijkheid, HOLD en alle betekenisdragende relaties mee. Ook afhankelijke bouwstenen komen opnieuw op de lijst.
2. **Beoordeel de nieuwe basis.** Bewaar de nieuwe inhoudelijke review en haar bewijs onder een nieuwe verwijzing. Neem oude besluiten alleen over voor werkelijk ongewijzigde eenheden. Een gewijzigde relatie of broneditie vereist review van de geraakte keten. Ontbrekend bewijs, een onopgeloste vraag of HOLD stopt de route.
3. **Maak de correctieoverdracht.** Voer `check:review-changes -- --correction` uit zoals beschreven bij [een beoordeelde correctie overdragen](beheer/reviewwijzigingen.md#een-beoordeelde-correctie-overdragen). Beschrijf per gewijzigde of afhankelijke bouwsteen concreet wat verbeterd of opnieuw beoordeeld is. Bewaar de uitvoer bij het dossier.
4. **Controleer het nieuwe pakket.** Neem de nieuwe inhoud, oorspronkelijke bronnen, actuele reviews, correctieoverdracht en overige verplichte stukken op in het gewone intakeplan. Gebruik voor de correctieoverdracht de rol `supporting`; zij vervangt geen verplichte review. Maak een nieuw manifest en controleer de apart bewaarde manifesthash met [pakket controleren](beheer/pakket-controleren.md). `FILES_VERIFIED_REVIEW_REQUIRED` is alleen een geslaagde bestandscontrole.
5. **Doorloop de bestaande inhoudelijke toelating.** Gebruik de bronafhankelijke reviewroute uit [inhoud toevoegen](beheer/inhoud-toevoegen.md). Verifieer dat de aangeboden inhoud, bronbytes en relaties exact overeenkomen met de beoordeelde basis. De correctiehelper en intake maken geen toelatingsbesluit. Een lokale controledatabase blijft HOLD en is geen vervanging voor deze stap.
6. **Maak en vergelijk een afzonderlijke kandidaat.** Volg [database publiceren](beheer/database-publiceren.md). De private publicatieopdracht draait de bestaande inhoudelijke controles; er is geen overslaan-optie. Vergelijk de expliciet vastgelegde oude en nieuwe publicatie. Controleer dat de gewijzigde pakketten, bronnen, reviews en overige verschillen door het correctiedossier worden verklaard. Een onverwacht verschil stopt de route. Controleer de bronpassages en vragen en voer de gewone aparte testbuild uit.
7. **Vul de gewone releasenotities aan.** Bereid de release voor met `release:prepare`. Neem daarna het gecontroleerde `releaseNotes`-fragment op in het gemaakte concept `releasenotities.md`. Controleer het tegen de publicatievergelijking. Vermeld de concrete verbetering en geraakte bron-/normidentiteiten; alleen “verbeteringen in bestaande inhoud” of een issuenummer is onvoldoende. Bewaar hashes en reviewbewijs in het lokale dossier. Upload of activeer pas na het afzonderlijke besluit.

## Vergelijken bij een correctie

```text
npm run data:compare-runtime -- --before work/huidig/local-build.json --after work/kandidaat/local-build.json
```

Een correctie verandert een bestaand pakket. Gebruik hiervoor geen `--expect-addition`: die optie verwacht uitsluitend toevoegingen en geeft terecht HOLD bij bestaande inhoudswijzigingen. De gewone uitkomst `RUNTIME_DIFFERENCES_REVIEW_REQUIRED` vraagt beoordeling van alle verschillen en is geen goedkeuring. Vergelijk bron- en inhoudsbindingen ook met het correctiedossier; de gewone vergelijking toont metadata, geen normteksten.

Bij een nieuwe broneditie moeten de oorspronkelijke bronbytes, editie, documenthash en exacte passages opnieuw gecontroleerd zijn. De helper kan de binding in JSON controleren, maar kan de daadwerkelijke bronlezing niet vervangen. Verander nooit een opgeslagen hash of review onder een oud akkoord om een controle te laten slagen.

## Wat de fictieve proef bewijst

De [gerichte correctieproef](../content-tools/review-change-set-correction.test.mjs) gebruikt twee fictieve normen en één fictieve bron. Eén maatregel wordt concreter; de tweede norm hangt daarvan af. De bronbytes blijven in deze doorgaande proef gelijk. Een aparte controle behandelt een gewijzigde fictieve broneditie.

```text
node --test content-tools/review-change-set.test.mjs content-tools/review-change-set-correction.test.mjs
```

De proef maakt alleen nieuwe uitvoer in een unieke `work/reviewed-correction-*`-map en bewaart die voor controle. Zij gebruikt de bestaande intake, `validateSemanticReview`, database-import, `publishRuntime`, runtimecontrole, publicatievergelijking en releasevoorbereiding. De gewone notities worden daarna aangevuld zoals in stap 7. De oude oefendatabase en pakketbestanden blijven ongewijzigd. Alle database-records blijven herkenbaar fictief met status HOLD.

De proef controleert de verkeerde oude basis, een score zonder reviews, een hergebruikte reviewverwijzing en een niet opnieuw beoordeelde afhankelijkheid. Ook HOLD, gewijzigd bronbewijs, gewijzigde relaties en ontbrekend bewijs worden gecontroleerd. Die gevallen leveren geen correctieoverdracht op. De helper schrijft nooit een database of publicatie.

**Synthetische publicatie is geen echte contentvrijgave.** De testreviews en minimale runtimegegevens zijn fictieve softwaretestgegevens. De proef voert de private auteursopdracht niet uit en bewijst geen menselijke goedkeuring, echte brontoelating of werkende viewer. Zij bewijst de technische verbinding tussen de genoemde bestaande functies. De private bronafhankelijke toelating, volledige publicatieopdracht, testbuild en het publicatiebesluit blijven vereist bij echte inhoud. Gebruik de testcode nooit als importer voor een bronpakket.

## Volgende stap

Controleer het nieuwe pakket via [pakket controleren](beheer/pakket-controleren.md) en volg daarna de bestaande inhoudelijke toelating.

---

[↑ Wegwijzer](README.md) · [Begrippen](begrippen.md) · [Routekaart](routekaart.md)
