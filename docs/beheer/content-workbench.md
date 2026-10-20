# Content Workbench

> **In het kort:** een lokaal werkbord voor de beheerder om de verwerking van veel bronnen bij te houden. Voor bijdragers is er het [claimsysteem op GitHub](../bijdragen/README.md); de Workbench is het interne overzicht ernaast.

De Workbench draait alleen op je eigen computer (`127.0.0.1`). Er is geen account of extra dienst nodig. Het is geen publiek systeem en verandert niets aan de applicatie of de database.

## Starten en importeren

Gebruik de bestaande Node 24-installatie en repositorydependencies. Er is geen
extra dienst, account, frontendbuild of betaalde dependency nodig. Maak eerst de
map `work/content-workbench` en importeer een expliciet gekozen UTF-8 CSV:

```text
npm run content:backlog-import -- --database work/content-workbench/backlog.sqlite --csv <absoluut-pad-naar-CSV> --label "Rijksmap rapporten"
npm run content:backlog-import -- --database work/content-workbench/backlog.sqlite --csv <absoluut-pad-naar-subset-CSV> --label "IIA non-assurance"
npm run content:workbench -- --database work/content-workbench/backlog.sqlite --port 4326
```

Open `http://127.0.0.1:4326/` op dezelfde computer. Omnibus op 4318 blijft apart
beschikbaar. De server bindt alleen aan `127.0.0.1`; open geen firewallpoort en
plaats er geen publiek toegankelijke proxy of tunnel voor. Stop met Ctrl+C.
De gegevens blijven na herstart bewaard. Dit is een lokaal beheerdershulpmiddel:
iedereen met toegang tot deze computer kan het lokale register gebruiken.
Het is geen publieke multi-userdienst.

Een typische import bestaat uit de 9.116 rapporten van de Rijksmap en de subset
van 542 aanbevolen ADR-rapporten (zie de [werklijsten](../bijdragen/README.md#welke-bron-kies-je)). Alle subsetrecords
sluiten aan op de volledige lijst; zij worden niet dubbel geteld. Dit is geen
claim over het actuele aantal documenten op een externe website. Er zijn geen
bronnen gedownload en de oorspronkelijke exports zijn niet gewijzigd.

## Dagelijks gebruik

1. Kies een collectie en zoek op titel, ministerie of primair risico. De
   non-assurancecollectie is bij openen voorgeselecteerd als zij aanwezig is.
2. Open een bron. Bekijk samenvatting, bronlink en de oorspronkelijke velden onder
   ‘Oorspronkelijke gegevens en herkomst’. Externe links openen alleen na een klik.
3. Kies werkstap, afhandeling en prioriteit. Leg altijd een reden of volgende
   actie vast; vermeld vanaf review ook een pakket-, review- of chatverwijzing.
4. Bekijk de werkstroom of filter een kolom. Het bord toont maximaal zes kaarten
   per kolom; ‘Bekijk alle’ opent de gepagineerde lijst.
5. Klik op een overzichtsaantal om de bijbehorende documenten te zien. De totale
   en bewijs-aantallen wissen eerdere filters; ‘In deze selectie’ en een
   kolomaantal behouden de huidige selectie. Wetten/kaders en modellen openen
   voorlopig een afzonderlijke alleen-lezen publicatielijst, geen nieuw werkbord.

```text
Te beoordelen → Beoordeeld → In wachtrij → In verwerking → In review → Kandidaat gemeld
```

Dit zijn handmatige werkstappen, geen afgedwongen inhoudelijke goedkeuringen.
Daarnaast toont de werkstroom **Actief in Omnibus** op basis van de laatste
geverifieerde actieve publicatie. Een nieuwe, beoordeelde of kandidaat-gemelde
bron komt daar zichtbaar te staan zonder de opgeslagen werkstatus te wijzigen.
Een expliciete wachtrij, verwerking, review, blokkade, herstel of uitsluiting
blijft op de handmatige plek staan; de publicatiebadge blijft erbij zichtbaar.
Vervalt het publicatiebewijs bij hercontrole, dan valt de weergave terug op de
bewaarde handmatige stap. De browser kan ‘Actief in Omnibus’ niet zelf toekennen.
Terugzetten voor herstel is mogelijk met een reden; de historie blijft staan.
Geblokkeerd, herstel nodig en niet geschikt zijn aparte afhandelingslabels.
‘Te beoordelen’ betekent aanvankelijk **geen werkstatus vastgelegd**, niet
**nog nooit verwerkt**. Gekoppelde publicaties worden apart als bewijs getoond.
‘Beoordeeld’ is hier de geschiktheid/werkselectie, niet een geslaagde normreview.

Een handmatig ingevulde dossierverwijzing wordt als tekst bewaard en niet geopend of geverifieerd.
Werkstatus start geen AI-opdracht en verandert geen bronpakket. Inhoudelijke
review, HOLD, kandidaatcontrole en acceptatie blijven via de bestaande
[inhoudsinbox](pakket-controleren.md) lopen. Er is bewust geen knop ‘Publiceren’.
Er wordt geen kunstmatige score of percentage ‘klaar’ getoond.

Bij gelijktijdige wijzigingen wordt een verouderde opslag geweigerd. Heropen
dan het dossier; de andere wijziging wordt niet overschreven. Vernieuwen haalt
ook nieuwe imports op; buiten een geopend dossier gebeurt dit elke 30 seconden
zolang de pagina zichtbaar is. Prioriteit is handmatig, met hoge prioriteit eerst.

## Gegevens en herkomst

- `content-workbench/store.mjs`: private opslag, import, begrensde zoekopdrachten
  en voortgangshistorie. `server.mjs`: lokale HTTP-grens. `web/`: zelfstandige UI.
- Alleen semicolon-CSV, maximaal 32 MB, 50.000 gegevensrijen, 80 kolommen en
  100.000 tekens per veld. `titel` en een bruikbare `url` of `url_bestand` zijn
  vereist. Ongeldige import wordt volledig geweigerd. Spreadsheetformules en
  HTML blijven letterlijke tekst; de import voert niets uit.
- Identiteit is gebaseerd op genormaliseerde bron-URL, titel en datum.
  Gelijke records uit meerdere collecties delen één werkstatus. Een gedeelde URL
  met verschillende titel/datum blijft afzonderlijk en krijgt een overlapmelding.
  Een titel-/datumwijziging kan daarom een nieuw bronrecord opleveren; geen
  automatische fuzzy merge. De oorspronkelijke waarden blijven in de herkomst.
- Iedere unieke combinatie van collectielabel en bestandshash is een snapshot.
  Dezelfde import opnieuw uitvoeren verandert niets. Nieuwe snapshots behouden
  oude rijen en werkhistorie; collecties zijn de vereniging van hun snapshots,
  geen vervangende synchronisatie. Basisvelden komen uit de eerste import;
  latere oorspronkelijke veldvarianten blijven in het dossier zichtbaar.
- Tabellen `sources`, `imports`, `import_rows`, `progress`, `events` staan
  uitsluitend in de aparte Workbench-database. Een bestaande broncatalogus wordt
  als Workbench-database geweigerd. De workbench leest of schrijft geen projecten,
  wachtwoorden of providerinstellingen. Alleen de aparte bewijsopdracht leest
  expliciet aangewezen catalogusdatabases; zij opent die uitsluitend alleen-lezen.
- `work/` wordt door Git genegeerd. Ook een codepush bewaart deze database niet.
  Gebruik de aparte backupopdracht hieronder; kopieer geen draaiend SQLite-bestand
  met alleen een gewone bestandskopie. Bewaar ook de CSV-exports; alleen die opnieuw
  importeren herstelt geen werknotities. Gebruik nooit de broncatalogus als hersteldoel.

## Lokale backup en herstelproef

Maak een nieuwe backupmap onder een bestaande, afgeschermde lokale bovenmap:

```text
npm run content:workbench-backup -- backup --from work/content-workbench/backlog.sqlite --to work/workbench-backup-20261018
```

De Workbench mag hierbij openblijven. De SQLite-backup-API neemt een consistente
snapshot inclusief vastgelegde wijzigingen in het journal. De opdracht controleert
de databaseversie, integriteit en verwijzingen en schrijft daarna `backup.json`
naast `backlog.sqlite`. Bestaande mappen worden niet overschreven. Bij uitval kan
een onvolledige map achterblijven: zonder geldig herstelbewijs is dit geen backup.
Bewaar de getoonde `receiptSha256` apart van de backup; bereken die niet opnieuw
uit een beschadigd of gewijzigd exemplaar om een herstel te laten slagen.

Herstel altijd naar een **nieuw** bestand, niet over de actieve database:

```text
npm run content:workbench-backup -- restore --from work/workbench-backup-20261018 --to work/workbench-restored-20261018.sqlite --expect-sha256 <bewaarde-receiptSha256>
npm run content:workbench -- --database work/workbench-restored-20261018.sqlite --port 4327
```

Het herstel controleert de bewaarde bewijshash, exacte databasebytes, versie,
integriteit, verwijzingen en aantallen voordat het nieuwe bestand wordt geleverd.
Bestaande doelbestanden en achtergebleven SQLite-journalbestanden worden geweigerd.
Controleer in de aparte proefweergave herkomst, notities, historie en bewijsdatums.
Stop die proef daarna. Wisselen van de actieve database blijft een bewuste
beheerhandeling; deze opdrachten activeren niets en wijzigen geen broncatalogus.

Deze backup bevat alle Workbench-tabellen, inclusief importherkomst, voortgang,
notities, historie en gekoppelde bewijssnapshots. Ze bevat **niet** de bron-PDF's,
inhoudspakketten, Omnibus-catalogus, projectbestanden of het externe bewijsplan.
Bewaar het bewijsplan en zijn bron-/reviewarchieven afzonderlijk zodat een latere
`content:link-evidence` mogelijk blijft. Herstel vernieuwt geen reviewstatus:
de oorspronkelijke controledatum blijft staan totdat opnieuw wordt gecontroleerd.

Backup en herstelbestand zijn privé en blijven buiten Git. De opdracht versleutelt
niets en uploadt niets: gebruik zelf beschermde opslag en een afzonderlijke veilige
kopie. Een kopie op dezelfde schijf beschermt niet tegen verlies van die schijf.
Dit is de lokale Workbench-herstelroute, geen oplossing voor een latere online versie.

## Controle en afbakening

`npm run test:workbench` voert lint en 22 opslag-/HTTP-/bewijs-/hersteltests uit met synthetische
gegevens. Deze controle is onderdeel van `npm test`. Voor een lokale browserproef
zijn een bestaande Playwright-installatie en browser nodig: zet
`PLAYWRIGHT_MODULE` op het modulepad en `BROWSER_EXECUTABLE` op het uitvoerbare
browserbestand, voer daarna `node content-workbench/browser-smoke.mjs` uit.
De browserproef maakt en verwijdert alleen een eigen tijdelijke database.

Getest: idempotente import, herkomst, overlap, atomiciteit, voortgang/persistentie,
verouderde wijzigingen, broncatalogusweigering, Host/Origin/CSRF, begrensde invoer,
lijst/bord, dossier, zoek-/prioriteitsfilters en smalle schermen. De code rendert
brontekst met `textContent`; geen HTML-injectie, willekeurige bestandstoegang,
externe scriptdependency of browseropslag met brongegevens.

Nog niet gebouwd: automatische skilluitvoering, algemene reviewadapters voor
wetten/kaders/modellen (hun publicatie-inventaris is wel zichtbaar), nieuwe wet-/kader-/modelinvoer, normannotaties,
automatische waarde-/overlapscores. De huidige vervolgstappen staan in
[de routekaart](../routekaart.md).

## Intake, review en publicatie koppelen

```text
npm run content:link-evidence -- --database work/content-workbench/backlog.sqlite --plan work/content-workbench/evidence-plan.json
```

Deze opdracht is een **bewijsmomentopname**, geen achtergrondpublicatie. De browser
kan deze controles niet starten en geen bewijsstatus schrijven. Er worden geen
bestanden gedownload, pakketscripts uitgevoerd of nieuwe inhoudsreviews gemaakt.
De server blijft alleen het lokale werkregister lezen; de broncatalogus wordt
niet tijdens iedere pagina-aanvraag opnieuw gecontroleerd.

Het private plan heeft `format: "omnibus-workbench-evidence"`, `version: 1`,
`publications` en `intakes`. Het wordt niet geüpload. Paden zijn relatief aan het
planbestand; alle bestaande objectvelden zijn verplicht tenzij hieronder anders
aangegeven. Onbekende velden en meer dan één actieve publicatie worden geweigerd.

| Onderdeel | Velden |
| --- | --- |
| Publicatie | `label`, `kind` (`active` of `candidate`), `settings`, `release`, `publication`, optioneel `mappings` |
| Expliciete koppeling | `packageId`, `packageVersion`, `sourceId` (Workbench-ID), `reason` |
| Rapportintake | `label`, `manifest`, `manifestSha256`, `packageId`, `packageVersion`, `sourceId`, `reason`, optioneel `historicalReport` en `reviews` |
| Historische rapportreview, optionele lijst `archives` | `label`, `directory`, `receipt`, `receiptSha256`, `packageId`, `sourceId`, `reason` |

De release-/publicatiehashes en intakemanifesthash komen uit het al behouden
overdrachtsbewijs, niet uit een pakket dat zichzelf goedkeurt. Een gewijzigde
pin vereist een nieuw onderbouwd plan. Gebruik `active` uitsluitend voor de
daadwerkelijk gekozen lokale publicatie; de controle bewijst haar integriteit,
niet dat een willekeurig draaiend browservenster dezelfde versie gebruikt.

- **Publicatie:** hergebruikt de bestaande integriteitscontrole voor de expliciet
  vastgepinde database, bronrelease, runtimepublicatie en alle bezorggegevens.
  Rapportmetadata wordt binnen dezelfde alleen-lezen transactie uitgelezen.
  Gelijke titel en publicatiedatum moeten één unieke backlogmatch geven; alleen
  Unicode, witruimte en hoofdletters worden genormaliseerd. Dit is een
  metadata-identiteitskoppeling, geen vergelijking van het remote PDF-bestand.
  Onzekere matches blijven zichtbaar als ongekoppeld. Expliciete koppelingen
  bevatten de exacte pakketversie, bestaande bron-ID en een reden. Een gewijzigde
  pakketversie mag niet ongemerkt de oude koppeling overnemen.
- **Ontvangst:** voert de bestaande volledige intakecontrole opnieuw uit tegen
  de behouden manifesthash, inclusief alle bestanden en het expliciete historische
  rapportprofiel waar nodig. Ontvangst bewijst geen inhoudelijke goedkeuring.
- **Reviewbinding:** `reviews` noemt geselecteerde reviewbestanden binnen dat
 zelfde geverifieerde rapportmanifest. De SOURCE- en PRACTICAL-adapter controleert
  verplichte doelhashes, aanvullende doelen, alle REVIEW-BASIS-bestanden, rollen,
  verschillende revieweridentiteiten en dezelfde basis. Een algemeen APPROVE
  met afwijkende individuele besluiten of open herstelpunten wordt geweigerd.
  De getoonde besluiten zijn behouden revieweruitspraken, geen nieuwe beoordeling
  of onafhankelijk bewezen identiteit. Menselijke validatie wordt niet afgeleid.
  Reviewbinding aan een intake is niet automatisch reviewbinding aan een latere
  catalogustekst. Andere reviewformaten krijgen geen veronderstelde goedkeuring.
- **Historische rapportreview:** de bestaande afzonderlijk behouden ontvangstpin
  bindt alle receipt-bestanden, beide SOURCE/PRACTICAL-reviews en hun volledige
  REVIEW-BASIS. Alle genoemde bestanden worden opnieuw gehasht. Rapport-ID,
  verschillende reviewers, besluiten en dezelfde reviewbasis worden gecontroleerd.
  De reviewbasis-hash is de historische versie-identiteit, niet de huidige
  catalogusversie. Dit verleent alleen een historische reviewbadge: geen volledige
  intake, nieuw PDF-onderzoek of goedkeuring van latere tekstcorrecties. Er worden
  geen extra kopieën van de archieven gemaakt. Afwijkende archiefformaten blijven
  ongekoppeld; de oorspronkelijke bron- en uitzonderingsgates blijven bestaan.

Een geslaagde ontvangst met mislukte reviewbinding blijft alleen een gecontroleerde
ontvangst. HOLD/REVISE-besluiten worden niet veranderd. Het plan wordt als één
nieuwe momentopname opgeslagen met uitkomsten per onderdeel: een mislukte
hercontrole vervangt de eerdere positieve badge voor dat onderdeel; de oudere
controle blijft bewaard in `evidence_runs`/`evidence_links`. Handmatige werkstatus,
redenen en blokkades worden nooit door bewijscontroles aangepast. Bewaar daarom
alle gewenste onderdelen in het plan: weggelaten onderdelen horen niet meer bij
de nieuwste momentopname. Ongeldige plannen worden vóór verwerking geweigerd en
maken geen nieuwe momentopname; oude uitkomsten blijven herkenbaar aan hun datum.

Na bron- of pakketwijzigingen moet de opdracht opnieuw worden uitgevoerd.
‘Vernieuwen’ in de browser haalt alleen de laatst opgeslagen controle op en
herverifieert geen bestanden. De controledatum is altijd zichtbaar.

‘Gekoppeld bewijs’ filtert de lijst en het bord. Versies, koppelmethode,
reviewbesluiten en controledatum staan in het brondossier. Een identieke versie
die actief én in een kandidaat staat, krijgt in de compacte lijst alleen de
actieve badge; het dossier bewaart beide publicatieverwijzingen.

## Samengevat

- Importeer de werklijsten als CSV en houd per bron de werkstap bij.
- Werkstappen zijn handmatige notities, geen goedkeuringen.
- Maak back-ups met `content:workbench-backup` en herstel naar een nieuw bestand.

## Volgende stap

Terug naar het [beheeroverzicht](README.md).
