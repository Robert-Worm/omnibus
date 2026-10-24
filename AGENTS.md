# Instructies voor AI-agents en bijdragers

Dit bestand beschrijft de vaste afspraken voor iedereen die met een AI-agent aan Omnibus werkt (Codex, Claude Code of vergelijkbaar). De regels gelden net zo goed voor mensen.

## Grens tussen code en data

Deze repository bevat alleen de code. De openbare database staat apart, als zip bij de releases; de oorspronkelijke bronnen en reviewdossiers blijven privé. `code-snapshot.json` legt vast welke private en inhoudsgebonden onderdelen bewust zijn weggelaten. Voeg die nooit geforceerd toe en haal ze niet automatisch op.

`test:code-only` en `test:runtime` gebruiken zelfstandige, fictieve testdata. De ondersteunde web- en agentbuilds vragen expliciet om een database, een release en een hash van de runtimepublicatie; ze mogen geen private auteursmodules importeren of tijdens het compileren brondata schrijven. Houd uitvoerbare logica in de inhoudsadapters en data buiten Git. Het runtimecontract bevat alleen module-identiteiten en exports. Reviews van bronintegriteit blijven in de private voorbereidingsstraat. Vervang ontbrekend bewijs nooit door lege testdata. Niets uploaden of publiceren zonder toestemming.

## Gedeelde viewers voor wetten en kaders

De bestaande viewer voor het CIO-stelsel is het standaardontwerp voor elke nieuwe wet en elk nieuw kader. Hergebruik is een harde eis; bedenk geen nieuwe opmaak per bron.

- Hergebruik de bestaande matrix, selectie, detailtabbladen en de opmaak van het tabblad Over. Pas de brondata aan, niet het visuele interactiemodel, tenzij de beheerder uitdrukkelijk om een ontwerpwijziging vraagt.
- Beschrijvende bladermatrices voor thema's/processen en wetten/kaders gebruiken één kolom `Norm` met de titel en de criteriumtekst. Voer geen aparte kolom `Toetscriterium` opnieuw in, ook niet via herstelde voorkeuren. Noem het bijbehorende detailblok `Norm`; laat het interne criteriumveld, de herkomst, de bronlinks en het exportschema ongewijzigd.
- Brontabbladen gebruiken `LawPointSourceLayout` en `LawSourceDocument` uit `app/law-point-source.tsx`. Die hergebruiken `CriterionSourceLayout` en `ReportLibrary` voor uitleg en volledige brontekst naast elkaar, gemarkeerde passages, paginanavigatie en tabbladen op smalle schermen. Maak geen aparte viewer die alleen citaten toont.
- Houd kaderspecifieke bewijsconversie in een bronadapter. Gebruik `lawReaderPassages` om exacte Unicode-codepoint-offsets te valideren. Verzin nooit een markering en vervang nooit stilletjes een andere broneditie.
- Houd bewijs uit de oorspronkelijke publicatie en uit de geconsolideerde versie gescheiden. Tekst die alleen in XML bestaat, moet duidelijk als zodanig herkenbaar zijn en mag niet worden gemarkeerd in een niet-gerelateerde pdf-pagina.
- Behoud onveranderlijke extractiepakketten, opgeslagen bewijssnapshots, selectiegrenzen en de HOLD-status als je de presentatie wijzigt.
- WWKE-groepen, normen en losse punten selecteren gebruikt dezelfde directe onderzoeksselectie als de knop "alles selecteren" bovenaan. Open voor gewone selectie geen dialoog voor toepasselijkheidsbeoordeling. Behoud bestaande beoordelingen en aanpassingen van gebruikers; direct selecteren bevestigt nooit juridische toepasselijkheid. Sectoruitzonderingen en niet-selecteerbare punten blijven beschermd.
- Benoem bij selectie-aantallen de eenheid en de reikwijdte. Navigatie naar het hele referentiekader mag geen onbenoemd aantal van alleen de huidige bron tonen. Vertaal technische extractietermen alleen in uitleg voor de gebruiker, nooit in broncitaten of opgeslagen bewijs.
- Geopende viewers gebruiken de compacte navigatie uit `app/viewer-readability.css`; houd alle vier de werkstappen, bronbestemmingen en het wisselen van route bereikbaar. Hergebruik `CompactContextText` voor de vier toelichtende contextpanelen bij wetten en thema's/processen. Lange tekst mag inklappen achter een toegankelijke, omkeerbare knop "Lees verder"; klap nooit normtekst, toetspunten of broncitaten in en herschrijf ze niet via dit onderdeel.
- Ruimte onder paginakoppen en de identiteit van panelen zijn gedeeld in `app/viewer-readability.css`. Houd de afstand tussen titel en vlak gelijk in de catalogus en in geopende viewers. Panelen Over voor wetten, thema's/processen en modellen hergebruiken `LawAboutIntro` en de gedeelde typografie, en nemen geen kopstijlen over uit model- of exportschermen.
- Beslisschermen hergebruiken `WorkflowIntro` en `WorkflowOutcome` uit `app/workflow-patterns.tsx`, met de vastgestelde keuzekaarten. Zet taakkeuzes vóór optionele technische instellingen; maak voor export geen aparte genummerde mini-werkstroom. Werkpanelen blijven compacter dan instapkeuzes. Kleur- en lettertypekeuzes voor werkboeken horen alleen in de echte werkboekpreview, nooit in koppen of navigatie van de interface. Gedeelde CSS gebruikt gedefinieerde kleurtokens (ook voor zichtbare toetsenbordfocus en donkere modus).
- Onthoud per viewerfamilie het tabblad Over in `project.view.aboutViews`, ook bij navigeren tussen stappen, wisselen van bron en herladen. Expliciete acties om een norm te tonen mogen terugkeren naar de normlijst; gewone navigatie mag deze voorkeur niet resetten. Deze presentatiestatus wijzigt nooit selecties, vraagkoppelingen of bewijssnapshots.
- Controleer zowel CIO als het toegevoegde kader: exacte markeringen, wisselen tussen bronbijdragen en pagina's, navigatie op smalle schermen, de integriteit van opgeslagen projecten en het ontbreken van browserfouten. Tests moeten het hergebruik van gedeelde onderdelen afdekken, zodat latere adapters niet ongemerkt afwijken.

## Responsieve viewers als standaard

- Gebruik `CompactMatrix` voor matrices en `DeferredViewerSection` voor lange lijsten/groepen. Ze bouwen bediening buiten beeld pas op bij naderen. Nieuw toegevoegde bronnen erven dit gedrag; maak geen eigen laadmechanisme per bron.
- Stel alleen de presentatie uit. Zoeken, aantallen, volledige groepsselectie, HOLD/toepasselijkheid, vraagkoppelingen en exports blijven op de volledige toegestane gegevens werken, nooit op de gemonteerde rijen. Filters en expliciete verwijzingen moeten ook latere resultaten direct bereikbaar maken.
- Laat eenmaal geopende onderdelen gemonteerd; behoud eigen tekst, focus en uitgeklapte bediening. Behoud de toetsenbordknop om een uitgesteld onderdeel te openen en de volledige weergave zonder IntersectionObserver.
- Brontekst blijft via de gedeelde bronviewer per pagina laden, met exacte versie- en passagecontrole. Het openen van een overzicht mag niet alle onderliggende bronbestanden ophalen.
- De gedeelde kaderviewer gebruikt `foundationOverviewKey` voor alleen bladeren. Bouw de overzichtsgegevens uit de bestaande bronadapters; behoud alle zoekvelden, groepsindelingen, aantallen en HOLD-statussen. Details, Over en selectie laden eerst het volledige kader via `prepareDetails`. Overzichtsregels met `displayOnly` mogen nooit in een project of export belanden. Nieuwe toegelaten kaders volgen deze route automatisch; onbekende viewerfamilies houden de volledige laadroute als fallback.
- Projectcompressie gebruikt de gedeelde achtergrondopslag. Voeg geen synchrone volledige projectcompressie toe aan gewone navigatie. Behoud de bewaarbeveiligingen, synchrone afsluitfallback en herkenbare opslagstatus.
- WWKE-overzichten en volledige bronweergave delen dezelfde filter- en rijopbouw. Behoud doelgroepafhankelijke normtekst, sectoruitzonderingen, contextpunten en HOLD; selectie wacht op volledige gegevens en bevestigt nooit juridische toepasselijkheid.
- De modelcatalogus gebruikt een apart, uit de publicatie opgebouwd overzicht met dezelfde zoektekst en aantallen. Overzichtsrecords blijven buiten `modelLibrary` en opgeslagen projecten; eigen modelteksten en selecties hebben voorrang in de weergave. Laad en herstel volledige modellen vóór het openen van de viewer, niet voor alleen bladeren in de catalogus.
- Gebruik `modelContentKeys` voor modelviewers, projectherstel en de exportworker: alleen gevraagde modellen plus gedeelde herstel-/formuleringsgegevens. De build deelt de bestaande publicatie verliesloos op; nieuwe modellen krijgen dezelfde laadroute zonder een handmatige ID-lijst. Houd de volledige laadroute voor agent/offline-lezers intact. Lees canonieke vraagtemplates pas na het laden van het model, niet eenmalig bij module-initialisatie.
- Controleer nieuwe viewers met een omvangrijke collectie, zoeken naar late items, selectie buiten beeld, herladen en smalle schermen. De gedeelde contracttests staan in `lib/viewer-rendering.test.mjs`.

## Samenwerken met de andere AI-assistent

Claude Opus 5.5 en ChatGPT Astra werken allebei aan Omnibus. Lees bij het begin van een sessie [samenwerking tussen de AI-assistenten](docs/beheer/samenwerking-ai.md) en het vastgezette issue *Overdracht*.

- Rode tests op `main` gaan voor nieuw werk.
- Pak alleen issues op met jouw werklabel en status `klaar`; zet de status op `bezig`.
- Noem in elke commitboodschap het issuenummer, bijvoorbeeld `(#86)`.
- Sluit je deel af met de overdrachtsnotitie uit die pagina en zet de labels goed.

## Versiebeheer

- Maak kleine commits voor samenhangende, afgeronde verbeteringen, met controles die passen bij de wijziging. Bekijk eerst de werkmap en de gestagede diff; neem geen ongerelateerde wijzigingen mee.
- Houd inloggegevens, private onderzoeksprojecten, live databases, archieven met originele documenten, runtimepublicaties en gegenereerde build- en testuitvoer buiten Git. Gereviewde inhoud en herkomst horen bij de apart beheerde datarelease; herschrijf nooit bewijs alleen om de opmaak gelijk te trekken.
- Geen push, upload of publicatie zonder uitdrukkelijke toestemming van de beheerder. Een lokale commit is geen back-up van genegeerde data en geen goedkeuring voor productie of beveiliging.
