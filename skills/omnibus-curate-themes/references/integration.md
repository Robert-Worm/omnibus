# Integratie en overdracht

## Eerst de huidige implementatie verifiëren

Onderstaande kaart beschrijft de checkout bij het maken van de skill. Controleer
de actuele code; behandel dit niet als een gegarandeerd bestaande curatie-API.

| Onderdeel | Huidige plek en betekenis |
| --- | --- |
| Thema's en proceskoppelingen | `lib/content-discovery.mjs`: `discoveryThemes`, `discoveryProcesses`, `reportThemeScope`, `discoveryItems`; expliciete lidmaatschappen, deels afgeleid via proces en rapportscope |
| Navigatiegroepen en lijsten | `lib/discovery-navigation.mjs`: `themeFamilies`, `processFamilies`, `discoveryWorkspaces`, `groupedDiscovery`; themagroep is niet hetzelfde als geopende themalijst |
| Actieve samengestelde catalogus | `lib/application-catalogue.mjs`: `baseFramework`, `discoveryViews`, `reportViews`, `catalogueRouting`, `projectCatalogueKeys` |
| Normen en kindpunten | `lib/report-point-catalogue.mjs`: `blocks`, `points`, `legacy_line_id`, stabiele punt-IDs en bronrelaties |
| Afzonderlijk rapport | `lib/report-workspaces.mjs`: broncontainer met eigen oorspronkelijke `lineIds`; geen curatiefilter hier |
| Oude/open werkruimtes | `lib/theme-workspaces.mjs`: herstel van IDs, relaties en vraagvoorstellen; onbekende thema-IDs worden nu verwijderd bij herstel |
| Bronacceptatie | `lib/product-scope.mjs`: HOLD/retain en projecten opschonen; NIET gebruiken om catalogusduplicaten te verbergen |
| Databaseprojectie | `scripts/database-catalogue.mjs`, `local-data/web-resources.mjs`; navigatie heeft een apart lui geladen resource |

Bij creatie van deze skill bestaat nog geen algemene laag voor verborgen
voorkeursvarianten. De skill en inventaris alleen activeren die dus niet.
Als toepassing wordt gevraagd, moet de implementatie de bedoelde weergavescope
ondersteunen; geen snelle globale filter op `baseFramework.lines`, broncatalogi of
`admittedLines`. Dat zou ook rapportviews en bewaarde onderzoeken kunnen beschadigen.

## Beslispakket

Gebruik nieuwe bestanden in een aparte werkmap; overschrijf geen vrijgegeven
bronpakketten. Een pakket bevat een korte leesbare samenvatting en gestructureerde
besluiten (bijvoorbeeld JSON). Dit is een overdrachtscontract, geen bestaand
database-importformaat of nieuw `content:intake`-type.

Leg vast:

- pakket-ID/versie, datum, opdracht en analyse/toepassingsstatus;
- app-/databaserelease, taxonomieversie en hashes van de gebruikte records,
  toetspunten, broncontext en mappings; auteur/reviewer en werkelijke reviewstatus;
- richtwaarde en getelde eenheid, scope en ongewijzigde bronstatus;
- per nieuw/bestaand thema: ID, naam, definitie, inclusie/exclusie, ouder,
  voorganger-IDs, expliciete leden en gemotiveerde overlappen;
- per kandidaat: betrokken bouwsteen-/punt-/rapport-IDs, bronversies,
  vergelijking van risico/norm/toetsinhoud/context en het besluit;
- bij verberging: verborgen ID, behouden ID, exacte betrokken weergave-IDs,
  mapping van ALLE verborgen selecteerbare punten naar behouden punten,
  bewijs per equivalentie en waarom de voorkeur aantoonbaar beter of gelijk is;
- afzonderlijke besluiten voor gedeeltelijke overlap en onzekerheid: niets
  stilzwijgend weglaten uit de review;
- voor/na-aantallen per thema/proces en unieke totalen (geen som van overlap),
  bronrapportbereik en achterblijvende overvolle of ongeclassificeerde lijsten;
- impact op legacy-thema's, links, opgeslagen projecten en vraagvoorstellen;
- activerings-/terugdraaiplan en uitgevoerde tests met echte resultaten.

Een generieke score zonder argumenten of een gelijkenispercentage is geen
equivalentiebewijs. Een lager zichtbaar aantal is geen kwaliteitsbewijs.

## Alleen bij opgedragen toepassing

1. Maak de presentatielaag reproduceerbaar en omkeerbaar; bewaar het vorige
   curatiepakket. Gebruik versiegebonden stabiele IDs en expliciete memberships,
   geen ad-hoc filters op titel of positie.
2. Verifieer dat elke verborgen variant naar een zichtbare vertegenwoordiger
   in dezelfde context wijst, met complete puntdekking. Ontbrekende IDs,
   bronwijzigingen, cycli, scopeverschillen of reviewlacunes blokkeren dat besluit.
3. Houd broninhoud en bronacceptatie ongewijzigd. Eventuele inhoudscorrectie is
   een afzonderlijke bronsoortspecifieke wijziging met een nieuwe reviewbasis.
4. Werk alle relevante thema-/procesingangen bij, niet alleen de tegelweergave:
   zoeken, filters, aantallen, selecteer alles, groeps-/puntselectie en nieuwe
   vraagvoorstellen. Laat de rapportcatalogus en bronviews volledig.
5. Scheid zichtbaar ontdekken van ophalen voor een bestaand onderzoek. Behouden
   selectie-IDs en vraaglinks moeten hun oorspronkelijke bronvariant laden,
   ook als die niet meer in de standaard themalijst staat. Behoud legacy-open-IDs
   via een expliciete migratie/alias; map een oud breed thema niet willekeurig
   naar slechts één nieuw deelthema. De huidige restorefilter is hier een risico.
6. Voer de wijziging door in de versioneerde dataprojectie/releaseprocedure.
   Geen directe ongecontroleerde database-edit. Lees de actuele build/import-
   instructies eerst op bijwerkingen. Behoud lui laden: geen runtime-vergelijking
   van alle rapportteksten of alle-parenberekening in de browser.
7. Houd de bestaande gedeelde matrix, detailtabs, bronmarkeringen, About-panelen
   en navigatie. Pas categorieën en inhoud aan, ontwerp geen nieuwe viewer.

## Minimale acceptatie

- Unieke aantallen kloppen op tegel, zoekresultaat, geopende lijst en groepsselectie;
  ouders met overlap tellen de vereniging, bouwstenen en toetspunten blijven apart.
- Een verborgen variant verdwijnt alleen uit de bedoelde thema-/proceslijst;
  zijn rapport toont alle oorspronkelijke normen en punten, met exacte bronnen.
- Een behouden norm met meerdere punten blijft compleet; gedeeltelijke overlap
  leidt niet tot verlies van het unieke punt of misleidende select-all-aantallen.
- Selectie/deselectie en vraagadoptie gebruiken de juiste scope. Een nieuwe
  themavraag selecteert niet ongemerkt verborgen alternatieven of extra punten.
- Open een vóór curatie opgeslagen project met een later verborgen bouwsteen:
  eigen tekst, puntselecties, vraaglinks, snapshots en alle exportvormen behouden
  dezelfde inhoud. Test ook bewaren/heropenen en laden via alleen zo'n ID.
- Oud thema-ID/deeplink blijft navigeerbaar; samengestelde themaweergave, rapport
  wisselen, bronmarkeringen en About-geheugen blijven werken.
- Nieuwe/gewijzigde bron maakt alleen geraakte curatiebesluiten ongeldig;
  onbeslist blijft zichtbaar. Test rollback zonder projectinhoud terug te draaien.
- Database- en browserweergave zijn gelijk; geen nieuwe eager corpus-download,
  browserfouten of onbedoelde wijzigingen in CIO/WWKE/modelviewers.

De technische inventarischeck vervangt deze inhoudelijke en gebruikscontroles niet.
