# Vraagpakket en aansluiting op Omnibus

## Overdrachtsvorm

Een vraagpakket is een afzonderlijk ontwerp-/reviewartefact, geen rechtstreeks
importeerbaar projectbestand en geen nieuw bronextractiepakket. Lever bij voorkeur
een machineleesbaar JSON-bestand plus een korte leesbare beoordeling als de
opdracht om bestanden vraagt. Volg een bestaand pakketschema als de checkout dat
inmiddels bevat; claim anders niet dat onderstaande afspraken een actieve importer
hebben. Gebruik geen fictieve checksums of bron-ID's om velden gevuld te krijgen.

Minimaal vastleggen:

- pakket-ID, versie, datum, auteur, status en gevraagde handeling;
- onderzoekskaart: object, eenheid, doel, begrippen, scope, periode/fasen,
  respondentrollen, aannames en open punten;
- bronbasis per bron: soort, stabiel ID, versie, bestaande inhoudshash indien
  beschikbaar, exacte vindplaats en actieve/selecteerbare status;
- vragen: eigen stabiel pakket-ID, type (`central`, `subquestion`, `interview`),
  tekst, oudervraag waar passend, onderzocht begrip, scope en antwoordbasis;
- voor deelvragen: `broad` of `specific` waar van toepassing; niet automatisch
  gelijkstellen aan het projectschema of de opgeslagen menuvoorkeur;
- voor interviewvragen: rol/niveau, afzonderlijke doorvragen, bewijsverzoeken en
  niveauvarianten; reden als een gevraagd niveau niet zinvol te bedienen is;
- cyclervarianten apart van niveauvarianten, met dezelfde inhoudelijke koppelingen;
- dekkingsmatrix per vraag: exacte bron-/norm-/toetspunt-/indicator-identiteit,
  reden van de relatie, gedekte invalshoek, ontbrekende dekking en overlap;
- per vraag/variant een reviewbesluit, argumentatie en resterende beperkingen.

Vermeld voor wetten, kaders en thema's/processen/teams expliciet of de centrale
vraag en beide deelvraagniveaus aanwezig en beoordeeld zijn. Een rapportaanlevering
vermeldt welke overkoepelende plannen geraakt worden, met hun bestaande versie,
de voorgestelde aanvulling en de dekking vóór en na die aanvulling. Ontbrekende
bronbasis of een niet-passende tweedeling blijft een zichtbaar reviewpunt.

Gebruik `DRAFT`, `REVISE`, `HOLD` of `READY_FOR_REVIEW` voor ontwerpstatus.
Een zelfbeoordeling is geen onafhankelijke acceptatie. Leg ontvangen acceptatie
apart vast met reviewer en exacte pakketversie; wijzig geen eerdere bronreviews.

### Dekking uitlegbaar houden

Een koppeling zegt: dit punt levert relevante informatie voor deze vraag. Zij
bewijst niet dat het punt de vraag volledig beantwoordt of dat aan de norm is
voldaan. Norm-, toetspunt-, modelindicator- en projectmateriaal-ID's zijn
verschillende identiteiten. Bewaar hun onderlinge mapping expliciet.

Voor een selectie S en een voorgestelde vraag met benodigde punten Q:

- gedekt door selectie: de doorsnede van Q en S;
- ontbrekend: Q zonder S;
- totaaldekking van gekozen vragen: de unieke vereniging van hun gedekte punten;
- punten uit S zonder vraagkoppeling: expliciet zichtbaar, niet automatisch weglaten.

Rapporteer onbekende of ingetrokken ID's apart; tel ze niet als geldige dekking.
Bij vragen zonder normbasis, zoals een kwalitatieve modelvraag, is een expliciete
construct-/indicatorrelatie mogelijk. Verzin daarvoor geen juridische norm.

## Huidige integratiepunten ontdekken

Inspecteer de actuele code vóór integratie; onderstaande locaties zijn routewijzers,
geen toestemming om een oud schema blind te kopiëren:

- `lib/research-proposals.mjs`: centrale/deelvraagvoorstellen en mapping naar
  geselecteerde materialen; een bronplan is nog geen vraag in een gebruikersproject.
- `lib/theme-workspaces.mjs`, `lib/cio-question-detail.mjs` en
  `lib/foundations/registry.mjs`: bronsoortspecifieke vraagplannen. De registry
  bevat ook historische inhoud; controleer de actieve catalogus afzonderlijk.
- `lib/research-plan.mjs`: projectvragen en links. De huidige project-ID's hebben
  vorm `q-<nummer>`; het veld `parent_id` bepaalt de hiërarchie. Pakket-ID's zijn
  niet zonder conversie project-ID's. `subquestionDetail` is een voorkeur op de
  centrale vraag, geen nieuw vrij te vullen subtypeveld op iedere deelvraag.
- `lib/interview-structure.mjs`, `lib/model-context.mjs`: model-/interviewstructuur,
  onderzoeksobject en niveauvarianten. Gebruik bestaande selectie- en adoptiepaden.
- `lib/research-question-formulations.mjs`: beperkte formuleringcyclers; maak
  onondersteunde inhoud niet passend met een generieke tekstvervanging.

Voeg broninhoud toe via de bestaande inhoudslaag, niet als nieuwe ingebedde dataset
in de viewer. Respecteer de laad-op-aanvraag-opzet en versiegebonden projecten.
Een vraagontwerpopdracht hoeft geen nieuwe runtime, databasekolom of UI te bouwen.

## Verificatie bij expliciet gevraagde integratie

1. Controleer alle genoemde ID's tegen de gekozen catalogusversie; blokkeer
   onbekende, ingetrokken of niet-selecteerbare koppelingen.
2. Controleer per vraag en variant de betekenis, niet alleen schema of trefwoorden.
3. Test voorstellen vóór adoptie: niets vooraf geselecteerd, broad/specific
   gecombineerd mogelijk, overlap uniek geteld, cycler behoudt bronrelaties.
4. Test adoptie, verwijderen en teruggaan naar de vragenkeuze; de materiaalselectie
   verandert alleen op een expliciete daartoe bedoelde gebruikersactie.
5. Test een bewaard/heropend project met eigen formuleringen en handmatige links:
   nieuwe voorstellen mogen die niet vervangen. Test tevens een deels geladen
   catalogus, ontbrekende bron en opnieuw proberen na een laadfout.
6. Test bij interviewwijzigingen relevante niveaus, selectie, vraagkoppelingen en
   exportinhoud zonder de bestaande viewer of werkvormopmaak te vervangen.

Gebruik bestaande tests waar mogelijk. Scheid in het verslag technische checks,
zelfreview, onafhankelijke inhoudelijke review en nog niet uitgevoerde controles.
