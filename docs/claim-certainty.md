# Zekerheidscontrole op normen en toetspunten

<!-- paginatype: naslag -->

> **In het kort:** deze voorcontrole meldt mogelijke zekerheidsproblemen in normen en toetspunten. Het private rapport helpt bij review; de database blijft ongewijzigd.

## Zo gebruik je deze pagina

Deze beperkte voorcontrole geeft aanwijzingen voor review. Een tekstpatroon is geen waarheidsbeslissing. Het hulpmiddel wijzigt geen normen, bewijs, database, selecties, bestaande HOLD-statussen, rubriek of skills. Een melding krijgt in het **scanrapport** HOLD; de bestaande inhoud krijgt geen nieuwe status.

## Uitvoeren

Gebruik de door het project ondersteunde Node-versie met `node:sqlite`:

```text
node scripts/check-certainty.mjs --database catalogue.sqlite --release <release-sha256> --uit work/certainty-review.md
node --test lib/claim-certainty.test.mjs scripts/check-certainty.test.mjs
```

De database en release zijn verplicht. Er is geen automatische keuze voor de actieve of nieuwste release. De scanner opent SQLite alleen-lezen, gebruikt een leestransactie en selecteert uitsluitend pakketten uit die release. Pakketinhoud wordt als JSON gelezen, nooit als code geïmporteerd. De oorspronkelijke documenten worden niet opnieuw opgehaald of geïnterpreteerd.

Het rapport moet een **nieuw** `.md`-bestand in de eigen genegeerde `work/`-map zijn. Bestaande bestanden worden nooit overschreven, ook niet via een hardlink. Directorylinks mogen de uitvoer niet buiten die map brengen. Het rapport bevat bron-/record-ID's, pakketversies, velden, zinnummers, signaalcodes, bronbindingen en hashes van de onderzochte invoer. Het bevat geen normtekst, brontekst, titels, gevonden getalwaarden of databasepad. Onveilige ID's worden gehasht. De console toont alleen totalen; foutmeldingen tonen geen JSON- of SQLite-inhoud.

Exitcode `0`: scan voltooid zonder HOLD. Exitcode `2`: scan voltooid met HOLD. Exitcode `1`: scan mislukt, geen nieuw rapport vrijgegeven. Ook exitcode `0` betekent geen inhoudelijke goedkeuring: bekijk de dekking en ontbrekende bronnen.

## Wat wordt gelezen?

- Rapportnormen: `criterion.text` met eigen `evidence_ids`.
- Rapporttoetspunten: `text` en aanwezige `generic_variant.text`, via `source_links`. Een expliciete variantbinding gaat vóór de puntbinding.
- Wetten en kaders met bronbank: `text` met `source_record_ids`, `source_clauses[].record_id` of `source_links[].record_id`.
- Platte kadernormen: `auditNorm` met de bestaande `sourceText`-snapshot, mits `sourceHash` en `sourceControlId` aanwezig zijn.

Bindingen worden alleen binnen hetzelfde pakket opgelost. Rapporten gebruiken `quote`; bronbankrecords gebruiken de afzonderlijke `source_spans[].quote`. Ontbrekende of dubbelzinnige expliciete bindingen leveren een apart HOLD-signaal. De scanner zoekt nooit elders in de bron naar een gunstiger onderbouwing en neemt geen algemene contextbinding over als bewijs voor een norm.

Vragen, modeldimensies, doelen, risico's, opzet-/bestaanplannen, vrije toelichtingen, bronbank-`assertion` en volledige runtimepresentaties vallen buiten deze scan. Het rapport telt records zonder ondersteund tekstveld en velden zonder leesbare claim/bron apart. Het bestaan van een bronbinding bewijst niet dat de opgeslagen passage letterlijk of inhoudelijk klopt. Bestaande passage- en broncontroles blijven nodig; dit hulpmiddel vervangt ze niet.

## Signalen en begrenzing

| Signaal | Wanneer volgt review? |
| --- | --- |
| `historisch-als-actueel` | Een vergelijkbare bronzin beschrijft een historische situatie; de claim bevat een actuele formulering zonder tijdsafbakening. |
| `aanname-als-feit` | Een vergelijkbare bronzin noemt onzekerheid die de claim niet herkenbaar behoudt. |
| `getal-zonder-bron` | De hoeveelheid ontbreekt in vergelijkbare gekoppelde context, of de context/kwalificatie is onvoldoende vergelijkbaar. |
| `tegenstrijdige-getallen` | Vergelijkbare context met dezelfde eenheid bevat een andere eenvoudige hoeveelheid. Ook passende én afwijkende bronzinnen blijven zichtbaar. |
| `binding-ontbreekt` | Een expliciet verwezen bronrecord ontbreekt, is dubbelzinnig of levert geen passage. |

Een getal-signaal bewijst niet dat de hoeveelheid nergens onderbouwd is.

Voor historische en aanname-signalen zijn minimaal twee gedeelde inhoudswoorden en 75% overlap ten opzichte van de grootste woordset nodig. Deze drempel is een ontwerpkeuze, geen gevalideerde maat. Herkenbare normatieve instructies, vragen, onzekerheidsmarkeringen en expliciete voorstellen voorkomen deze signalen. Zinnen worden afzonderlijk bekeken: een kwalificatie in een vorige zin geldt niet automatisch voor de volgende.

Getallen worden alleen herkend met een beperkte eenhedenlijst: percentages, euro's, tijdseenheden en gangbare aantallen zoals dossiers of medewerkers. Losse jaartallen, artikelnummers, versienummers en identificaties worden niet als hoeveelheden behandeld. `2020 medewerkers` is wel een hoeveelheid. Getallen met dezelfde waarde maar een andere context zijn geen bevestiging van elkaar. Verschillende expliciete jaren worden niet als rechtstreeks tegenstrijdig vergeleken. Eenheden worden niet omgerekend; getallen worden niet afgerond. Decimale komma/punt, Nederlandse duizendtallen en enkele synonieme kwalificaties worden herkend. Expliciete voorstellen (`PROPOSED`, `ANALYST_PROPOSAL`, `AUDIT_PROPOSAL` of een tekstmarkering) zijn geen bronfeit en worden vrijgesteld van de getalvergelijking. Die vrijstelling bevestigt hun geschiktheid niet.

Beperkingen: vrije parafrases, impliciete aannames, getallen in woorden, onbekende eenheden, negatieve getallen en complexe tabellen/formules kunnen worden gemist. Bereiken, afgeleide berekeningen, uitzonderingen, populaties, noemers en meerdere hoeveelheden vragen menselijke interpretatie. Herkende complexiteit leidt niet tot een automatische uitspraak dat cijfers elkaar tegenspreken. Geen signaal betekent alleen dat deze beperkte regels niets hebben gevonden, niet dat een claim actueel, juist of volledig is.

## Vaste synthetische meting

`lib/claim-certainty.test.mjs` bevat 34 vaste, fictieve gevallen (set `synthetisch-v1`). Ze zijn geïnspireerd op de gegevensvormen van Omnibus en bevatten geen echte bronpassages. Voor elk geval staat het verwachte reviewresultaat vast. Twee bekende beperkingen blijven in de meting: een vrije parafrase van een historische situatie en tegenstrijdige getallen in woorden.

| Verwachte review / uitkomst | Aantal |
| --- | ---: |
| Signaal terecht gevonden (TP) | 14 |
| Onterechte melding (FP) | 0 |
| Terecht geen melding (TN) | 18 |
| Verwacht signaal gemist (FN) | 2 |

Op deze set is precisie 14/14 en recall 14/16 (87,5%). De voorbeelden zijn voor ontwikkeling gekozen, geen onafhankelijke of representatieve steekproef. Deze cijfers voorspellen de prestaties op echte bronnen niet. Aanvullende tests controleren bronbindingen, release-isolatie, database-integriteit, gegevenslekken en uitvoergrenzen; die zijn geen extra inhoudelijke meetgevallen.

## Herkomst en attributie

De methodische inspiratie is **Clarity Gate**, door **Francesco Marinoni Moretto**, Copyright (c) 2025 Francesco Marinoni Moretto, onder **CC BY 4.0**. Geraadpleegd op 24 oktober 2026, repositoryversie `88eaf21b0e38c95959429a1a5f9b4cec72f01a43`:

- [Clarity Gate, beschrijving en negen controlepunten](https://github.com/frmoretto/clarity-gate/blob/88eaf21b0e38c95959429a1a5f9b4cec72f01a43/README.md).
- [Licentievermelding van de maker](https://github.com/frmoretto/clarity-gate/blob/88eaf21b0e38c95959429a1a5f9b4cec72f01a43/LICENSE).
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) en [volledige licentie](https://creativecommons.org/licenses/by/4.0/legalcode).
- [Omnibus-issue #199](https://github.com/Robert-Worm/omnibus/issues/199).

Aanpassing door Omnibus: een beperkte Nederlandstalige voorcontrole voor normen en toetspunten met expliciete bestaande bronbindingen. De algemene ideeën over zichtbare onzekerheid, tijd en getalconsistentie zijn toegepast op deze context. Er is geen upstream-code overgenomen, geïnstalleerd of uitgevoerd, en er zijn geen documenten of prompts integraal gekopieerd. De implementatie en fictieve tests zijn nieuw geschreven. Dit is geen implementatie of certificering van het volledige Clarity Gate-protocol en geen onderschrijving door de oorspronkelijke maker. Er worden geen garanties op inhoudelijke juistheid gegeven.

Deze methodische uitleg en bewerking worden onder **CC BY 4.0** gedeeld; de repositorylicentie beperkt de rechten op het toegeschreven CC BY-materiaal niet. De zelfstandig geschreven software blijft onder de repositorylicentie vallen.

## Volgende stap

Lees de [reviewskill voor auditkwaliteit](../skills/omnibus-review-audit-quality/SKILL.md) en beoordeel signalen met de exacte passage en omliggende context. Leg een besluit afzonderlijk vast.

---

[↑ Wegwijzer](README.md) · [Begrippen](begrippen.md) · [Routekaart](routekaart.md)
