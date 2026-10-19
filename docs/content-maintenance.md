# Inhoud toevoegen en Omnibus overdragen

De gebruikersworkflow en gedeelde viewers blijven de productbasis. Inhoud wordt
apart geanalyseerd, beoordeeld en geïntegreerd. Deze werkwijze omvat rapporten,
wetten/kaders en modellen; de drie soorten hebben verschillende kwaliteitsvragen.

De publisher scheidt ook aflevergegevens van de startbundel. Na de bestaande
bronreviews worden WWKE-issuebeoordelingen via de bestaande kaderlaadgrens
afgeleverd. Rapportgebonden doelen en beheersdoelen laden bij hun eigen rapport;
hun opzoeksleutels blijven in dezelfde volgorde staan. Een exacte JSON-rondgang
bewaakt inhoud én veldvolgorde; te grote
records of onduidelijke laadgrenzen stoppen de publicatie. Dit wijzigt alleen
de afleverpublicatie, niet de bronrelease of het projectformaat. Bestaande
publicaties blijven bruikbaar; een webbuild migreert of activeert geen database.

## Van voorbereidingschat naar lokale applicatie

Rapporten en kaders worden in afzonderlijke chats met hun eigen skill voorbereid.
De gebruiker hoeft daarvoor geen nieuwe viewer te laten bouwen. De lokale
integrator ontvangt het pakket en verzorgt de technische stappen hieronder.

| Stap | Verantwoordelijkheid | Resultaat |
| --- | --- | --- |
| Voorbereiden | De rapport- of kaderchat verwerkt de gekozen bron en laat de vereiste inhoudelijke reviews uitvoeren. | Versiegebonden pakket, echte reviewstatus en verwachte catalogusinhoud. |
| Controleren en bekijken | De integrator controleert de ontvangst, reviewbinding en aansluiting op bestaande gegevensstructuren, maakt een aparte kandidaat en opent de lokale preview. | Verschiloverzicht en een beoordeelbare applicatieversie; de huidige versie blijft staan. |
| In gebruik nemen | Na inhoudelijke en functionele acceptatie kiest de beheerder expliciet de kandidaat. | Nieuwe lokale inhoud, met de vorige publicatie beschikbaar voor herstel. |

De standaard inbox is `work/content-inbox/<pakket-id>/<versie>/` in deze
codecheckout. Een pakket bevat `plan.json`, `intake.json` en de ongewijzigde
bron-/reviewbestanden, bijvoorbeeld onder `payload/`. Dit is een lokale map,
geen uploaddienst of automatische importwachtrij. Gebruik per revisie een nieuwe
map en bewaar deze bij de private inhoudsbackups: Git bevat deze pakketten niet.
Een chat zonder toegang tot deze computer levert de map aan de lokale integrator;
het noemen van een pad maakt de bestanden niet automatisch beschikbaar.

De overdrachtsinstructies en twee voorbeeldplannen staan in
[content-intake.md](content-intake.md#rapport-of-kader-uit-een-afzonderlijke-chat).
De aanleverende chat vermeldt het manifestpad en de hash afzonderlijk. Reviews
zijn gekoppeld aan de exacte eindinhoud: bij dezelfde basis verifieert de ontvanger
het bestaande bewijs, zonder de hele extractie opnieuw uit te voeren. Een
inhoudelijke correctie vraagt wel herbeoordeling van de geraakte inhoud en relaties.

### Past het pakket zonder maatwerk

Controleer vóór een kandidaatbuild de mapping van bron-ID's, norm-/puntrelaties,
groepen of thema's, bronpassages, selectiestatus en About-informatie. Hergebruik
de bestaande rapportadapter en CIO-kaderweergave. Een andere titel of groep is
gegevenswerk, geen reden voor een nieuwe viewer. Een onbekend veld of een nieuwe
betekenis wordt niet stilzwijgend weggelaten om het pakket passend te maken.

Noteer in het bestaande overdrachtsoverzicht of de bestaande mapping volstaat,
welke gegevenscorrectie nodig is, of welk gedeeld contract nog tekortschiet.
Bij dat laatste blijft het betreffende pakket in HOLD totdat de gerichte
adapter-/contractwijziging is beoordeeld en getest. Houd softwarewijziging en
inhoudelijke review apart; voeg geen bron-ID-uitzondering toe als snelle omweg.
De huidige publicatieroute is nog geen generieke import zonder codewijzigingen.

De preview draait lokaal op dezelfde computer als de database. De bestaande
startopdracht onderaan de beheerroute opent geen internettoegang. Bekijk de
preview in een browser op die computer; `127.0.0.1` op een andere computer of
telefoon verwijst niet naar deze applicatie.

### Latere reviewomgeving

EP10 wordt niet uitgevoerd voor de 100-rapportentest. Gebruik de bestaande
brongebonden skills, reviewpakketten en Workbench. Een aparte annotatie-/review-UI
is geen afhankelijkheid voor inhoud toevoegen en krijgt geen voorbereidende
accountrollen of endpoints. Zie [de routekaart](routekaart.md).

## Codecheckout en privé-verwerking

Sinds de code-/datascheiding bevat deze repository de applicatie, adapters,
skills en technische ontvangst-/publicatiehulpmiddelen. De broncollectie,
reviewdossiers en historische extractiebestanden staan in de afzonderlijke
vertrouwde privé-verwerkingsomgeving. Verwijzingen hieronder naar zulke
inhoudsbestanden en bron-specifieke gates horen bij die omgeving; kopieer ze niet
naar Git om een ontbrekende import op te lossen. Een gewone applicatiebuild
controleert de vastgepinde databasepublicatie en herhaalt de bronreviews niet.

De huidige route voor nieuwe inhoud is:

1. Gebruik de passende rapport-, kader- of modelskill en lever een apart pakket
   met oorspronkelijke bronnen, beperkingen en reviewbewijs.
2. Maak uit een expliciete bestands-/rollenlijst een nieuwe intake-envelop met
   [content:prepare](content-intake.md#een-nieuw-manifest-voorbereiden) en controleer
   de overdracht met `content:intake`. Bij een ontvangen pakket gebruik je het
   bestaande manifest en de onafhankelijk ontvangen hash, niet opnieuw berekende
   checksums. Laat daarna
   de vereiste inhoudelijke reviews en bestaande integratiegates uitvoeren in
   de privé-verwerkingsomgeving. Een technisch correct pakket is niet automatisch
   goedgekeurd.
3. Leg de expliciet gekozen bronrelease, schone broncommit en private invoerpaden
   vast in lokale publicatie-instellingen. Maak met
   [data:publish-runtime](../README.md#inhoud-opnieuw-publiceren) en een nieuwe
   uitvoermap de database. De publisher controleert de voltooide database voordat
   hij bouwinstellingen afgeeft; de actieve database wordt niet vervangen.
   Voeg desgewenst eerst `--check` achteraan toe om de gekozen broncommit,
   release, invoerbestanden en uitvoerlocatie alleen-lezen te controleren.
   Dit voert geen privé-code of inhoudelijke review uit en maakt geen publicatie;
   de normale opdracht zonder `--check` blijft nodig.
4. Vergelijk vóór de build de publicaties met
   `npm run data:compare-runtime -- --before <huidige-map>/local-build.json --after <nieuwe-map>/local-build.json`.
   Beide databases worden alleen-lezen gecontroleerd. Beoordeel de toegevoegde,
   gewijzigde en verwijderde pakketten, documenten en runtimegegevens; bewaar
   de uitvoer lokaal bij het pilotbewijs. De vergelijking wijzigt of activeert niets.
   Gaat het alleen om nieuwe pakketten, voeg dan per vooraf gekozen pakket
   `--expect-addition <kind>:<pakket-id>` toe. Die optie geeft `HOLD` en afsluitcode 1
   als een ander pakket wordt toegevoegd, een verwacht pakket ontbreekt of een
   bestaand pakket/brondocument verandert of verdwijnt. Het verschiloverzicht
   blijft beschikbaar, zodat een gerichte correctie mogelijk is. Deze controle
   vervangt niet de beoordeling van nieuwe documenten en runtimeverschillen.
5. Bouw met `npm run build -- --settings <nieuwe-map>/local-build.json --out work/review-01`.
   De reviewmap moet nieuw zijn. Start met `npm start -- --settings <nieuwe-map>/local-build.json --web-root work/review-01 --port 4320`
   op een vrije lokale testpoort; de huidige build blijft staan. Is de database
   overgedragen naar een andere computer of tussentijds gewijzigd, voer dan eerst
   `npm run data:check-runtime -- --settings <nieuwe-map>/local-build.json` uit.
   Voor een zuivere toevoeging kun je stap 4 en de build combineren door
   `--compare-with <huidige-map>/local-build.json --expect-addition <kind>:<pakket-id>`
   aan de buildopdracht met `--out` toe te voegen. Een afwijking stopt vóór de
   build en vóór het maken van de uitvoermap; bij succes blijft het volledige
   verschiloverzicht beschikbaar voor review. De preview start niet automatisch.
6. Controleer de geraakte workflows: bronmarkeringen, selecties, vraagkoppelingen,
   bewaren/heropenen en export. Neem de publicatie pas na acceptatie expliciet
   in gebruik. Bewaar de vorige databasepublicatie en passende build voor herstel.

De testpoort heeft eigen browseropslag. Gebruik een projectkopie om heropenen te
testen en laat het oorspronkelijke onderzoek ongemoeid. Stop de testpreview
na afloop. Zonder `--out` bouwt de gewone opdracht nog steeds in
`database-build`; gebruik die route niet tussendoor als je de huidige build
wilt behouden. Een mislukte kandidaat blijft apart staan en wordt niet hervat
of automatisch goedgekeurd.

Deze beheerroute werkt lokaal en vereist geen WorkOS-aanmelding. Het toevoegen
zonder bron-specifieke code of nieuwe UI-build is nog geen gerealiseerde belofte:
de verdere standaardisering daarvan blijft EP09-S02. Maak geen nieuw CMS of
bron-specifieke viewer om die tussenstap te omzeilen.

### Eerstvolgende rapport en kader

Voer de eerste toevoegingen afzonderlijk uit: één rapportpakket en één wet- of
kaderpakket. Kies vooraf de broneditie, stabiele pakket-ID en nieuwe versie.
Gebruik de bestaande rapport- of kaderskill voor extractie en inhoudelijke
review; vul ontbrekende bewijsstukken niet aan met technische testfixtures.

Noteer vooraf de verwachte pakket-ID's en document-ID's, aantallen normen en
toetspunten, en bedoelde catalogus-/thema-ingangen. Vergelijk de daadwerkelijke
publicatieverschillen met die verwachting. Een verandering van de pakketinhoud
blijft zichtbaar wanneer het aantal records gelijk blijft. Leg iedere
onverwachte wijziging aan een bestaand pakket of verwijdering eerst uit; accepteer
die niet uitsluitend omdat de technische controle slaagt. Het verschiloverzicht
bevat geen norm- of brontekst en controleert niet of nieuwe inhoud goed in de
viewer verschijnt; dat hoort bij de volgende acceptatiestap.

Gebruik bij een zuivere toevoeging de bovenstaande `--expect-addition`-optie
om de pakketgrens automatisch te bewaken. Gebruik de exacte pakketsoort en ID,
niet de leesbare titel, geen jokerteken en geen uit de nieuwe uitvoer afgeleide
goedkeurlijst. De verwachte identiteit komt uit het vooraf gekozen overdrachtspakket.
Bij een bewuste revisie van bestaande inhoud blijft de gewone vergelijking
nodig met een inhoudelijke verklaring en bijpassende review. Laat de optie niet
stil weg om een onverwachte wijziging toch te accepteren. `MATCH` bevestigt
alleen de toevoegingsgrens; het is geen publicatie- of bronkwaliteitsgoedkeuring.

De acceptatie heeft twee delen:

- **Nieuwe inhoud:** controleer of het gekozen pakket in de bedoelde catalogus
  staat, de verwachte normen en toetspunten bevat en de juiste bronpassages,
  beperkingen en selectiestatus toont. Controleer bij het rapport ook de
  thema-/procesingang en bij het kader de gedeelde CIO-viewer. Leg vast welke
  bron-ID's en voorbeelden daadwerkelijk zijn gecontroleerd.
- **Bestaand onderzoek:** vergelijk een projectkopie vóór en na de toevoeging
  op selecties, vraagkoppelingen, eigen tekst, bronmarkeringen en export. De
  bestaande `scripts/review-portable-runtime.mjs` ondersteunt deze vergelijking
  met afzonderlijke browserprofielen. Die bestaande cases bewijzen niet op
  zichzelf dat het nieuwe pakket inhoudelijk of functioneel correct is.

Voor een extra kader in die browservergelijking: zet `REVIEW_FRAMEWORK_TITLE`
op de exacte titel van de knop `Open in viewer` in de kadercatalogus (zonder
die knop-prefix). De proef kiest expliciet de categorie Kaders en neemt één
toetspunt mee naast CIO, WWKE, het rapport en het model. Selecteren, deselecteren
en opnieuw selecteren worden gecontroleerd. Bij heropenen en export blijven
de extra selectie en vraagkoppelingen onderdeel van de vergelijking. Gebruik
`REVIEW_OUT` voor een nieuwe lokale bewijsmap met een bestaande bovenliggende
map; een bestaande uitvoermap wordt dan geweigerd. De proef gebruikt uitsluitend
nieuwe browsercontexten en de expliciete lokale `BASELINE_URL` en `REVIEW_URL`.
Dit blijft een gerichte workflowproef, geen volledige inhoudelijke kaderreview.

Pas na beide acceptaties kies je expliciet de nieuwe publicatie en build.
Automatisch publiceren bij een geslaagde intake, een nieuw CMS en toevoegen
zonder UI-rebuild horen niet bij deze lokale tussenstap. De laatste mogelijkheid
blijft vervolgwerk onder EP09-S02.

De databasecontrole vergelijkt ook de oorspronkelijke release-inventaris,
pakket-/norminhoud, zoekvelden en selectiestatus, documentinhoud, pagina-aantallen,
Unicode-coördinaten en bewijsartefacten met hun vastgelegde identiteiten. Ze leest
één consistente momentopname en verwerkt één pakket of document tegelijk. Een
technische afwijking blokkeert deze acceptatiecontrole; bronkwaliteit en
publicatierechten worden daarmee niet alsnog goedgekeurd. Deze volledige
controle hoort bij inhoudsoverdracht, niet bij iedere browseraanvraag.

## De zes skills gebruiken

De overdraagbare bronbestanden staan in `skills/`. Vanuit deze checkout:

```text
node scripts/install-content-skills.mjs
node scripts/install-content-skills.mjs --install
```

De eerste opdracht controleert alleen. De tweede installeert de zes skills in
de skillsmap van de gebruiker (`CODEX_HOME/skills`, anders `~/.codex/skills`).
Gebruik `--target <skillsmap>` voor een andere omgeving. Bestaande afwijkende
skills worden niet overschreven. Open na installatie een nieuwe chatsessie als
de skillkiezer nog niet is bijgewerkt.

- `$omnibus-add-report`: auditrapport analyseren of een gereviewd rapport integreren.
- `$omnibus-add-framework`: wet of normatief kader analyseren/integreren.
- `$omnibus-add-model`: conceptueel model en interviewvragen toevoegen/beoordelen.
- `$omnibus-build-questions`: centrale vragen, brede/specifieke deelvragen en
  interviewvragen ontwerpen of beoordelen vanuit het onderzoeksobject en de
  bronbasis. Deze aanvullende stap is geen nieuwe bronextractie en integreert
  vragen alleen als dat expliciet is gevraagd.
- `$omnibus-curate-themes`: overvolle thema's/processen onderverdelen rond een
  richtwaarde van 100 bouwstenen en equivalente risico-/toetsinhoud beoordelen.
  Zwakkere varianten kunnen na review alleen uit de thematische/procesweergave
  worden verborgen; rapportinhoud en bestaande onderzoeken blijven intact.
  De skill levert eerst een beslispakket tenzij toepassing expliciet is gevraagd.
  Installeren van de skill activeert nog geen curatielaag in de applicatie.
- `$omnibus-review-audit-quality`: brongebonden inhoudelijke kwaliteitsreview van
  doel, risico, beheersdoelstelling, beheersmaatregel, norm, alle toetspunten en
  opzet/bestaan. De eigen OAK-1.0-schaal geeft onderbouwde cijfers van 1–10 en
  verbeteringen, met plafonds voor bronfouten en onbruikbare toetsen. AI-panel,
  zelfreview en menselijke review worden onderscheiden. Geen automatische
  vrijgave of wijziging van bronpakketten, inhoud of bestaande onderzoeken.

Een afzonderlijke skill toevoegen zonder andere geïnstalleerde skills aan te raken:

```text
node scripts/install-content-skills.mjs --skill omnibus-build-questions
node scripts/install-content-skills.mjs --skill omnibus-build-questions --install
node scripts/install-content-skills.mjs --skill omnibus-curate-themes --install
node scripts/install-content-skills.mjs --skill omnibus-review-audit-quality --install
```

Ook deze gerichte installatie overschrijft geen bestaande afwijkende skill.

### Toegepaste thema-indeling

`lib/theme-curation.json` bevat de versiegebonden onderverdeling van Besturing,
risico’s en verantwoording en Informatie en gegevens. Het gaat uitsluitend om
navigatie: vier respectievelijk drie kleinere thema's met expliciete norm-ID's.
De oorspronkelijke brede thema-ID's en volledige lijsten blijven beschikbaar
voor bestaande projecten; alleen de standaardcatalogus toont de deelthema's.
Proceskoppelingen en rapportinhoud blijven ongewijzigd.

`content-tools/theme-curation-review.json` legt de bronbindingen, toewijzingen,
reviewargumenten en beperkingen vast. Deze eerste toepassing heeft geen
bouwstenen verborgen: de onderzochte overlapkandidaten bleken niet volledig
equivalent. Dit is geen volledige semantische review van alle mogelijke paren.

Bij inhoudswijzigingen controleert `scripts/verify-theme-curation.mjs` of de
geraakte bron en toetspunten nog overeenkomen met de review. De private publicatiecontrole
voert deze controle ook uit. Nieuwe, nog niet ingedeelde leden blijven vindbaar
via het brede thema totdat zij expliciet zijn beoordeeld. Verander een hash niet
zonder de bijbehorende inhoud opnieuw te beoordelen. Voor het werkelijk verbergen
van varianten is nog een afzonderlijke, contextgebonden puntdekkingscontrole nodig;
de huidige gate laat zulke besluiten niet ongemerkt toe.

`scripts/review-theme-curation.mjs` test de nieuwe ingangen, selecties,
bronrapporten en oude/nieuwe projecten in een afzonderlijk browserprofiel.
De toepassing en testresultaten van de eerste curatie staan in
`work/theme-curation-20261015/`. Terugdraaien gebeurt via de vorige build en
bijbehorende onveranderlijke catalogusreferentie, niet via het terugzetten van
gebruikersprojecten of brondata.

Geef bij overdracht de checkout, skills en relevante bron-/reviewpakketten mee.
De skills hebben geen persoonlijke stationspaden nodig. De bestaande rapportkit
en historische gates gebruiken soms nog absolute bewijsankers: draag die
bewijsbestanden plus expliciete padmapping over; verander nooit de oorspronkelijke
checksums om een verhuizing te verbergen. Alleen een HTML-bestand is niet genoeg
om de ontwikkel- en extractiewerkwijze aan iemand anders over te dragen.

Voorbeelden:

```text
Gebruik $omnibus-add-report voor dit rapport. Lever alleen het analysepakket;
wijzig de actieve tool nog niet.

Gebruik $omnibus-add-framework om dit ontvangen kaderpakket te integreren.
Behoud de CIO-viewer en test bronmarkeringen en opgeslagen projecten.

Gebruik $omnibus-add-model om dit model en alle interviewvraagvarianten te
beoordelen. Bewaar bestaande gebruikersvragen en maak onopgeloste punten zichtbaar.

Gebruik $omnibus-build-questions voor de geselecteerde onderdelen van dit kader.
Lever een onderbouwde centrale vraag, brede en specifieke deelvragen en passende
interviewvragen. Laat de bronkoppelingen, overlap en ontbrekende dekking zien.
Wijzig de tool nog niet.

Gebruik $omnibus-curate-themes voor de actieve thema's en processen. Beoordeel
welke lijsten te groot zijn en welke overlappende bouwstenen volledig door een
betere variant worden gedekt. Lever indeling, puntdekking en voor/na-aantallen;
behoud alle bronvarianten in rapporten en wijzig de actieve tool nog niet.

Gebruik $omnibus-review-audit-quality voor de geselecteerde bouwstenen. Beoordeel
brontrouw en de gehele doel-risico-beheersing-norm-toetsketen met OAK-1.0.
Lever een scorekaart, concrete tekstvoorstellen en open bronvragen; verander
de actieve inhoud nog niet.
```

## Technische checks en inhoudelijke acceptatie

### Afgesproken tekstgerichte kwaliteitsronde (16 oktober 2026)

De huidige opdracht betreft de hele tekstketen van actieve rapportnormen in
thema's/processen en actieve wetten/kaders. Gebruik de tekstmodus in
`skills/omnibus-review-audit-quality/references/text-only-batches.md`.
Beoordeel unieke norm-ID's eenmaal, per bron, met scores vóór en na daadwerkelijke
herlezing. Goede inhoud blijft staan. Bronmateriaal, selectiegrenzen en bewuste
fasebeperkingen blijven behouden; geen nieuwe historische gebruikersedities.

Geen brede regressie-, database-, browser- of Excelcontroles per tekstcorrectie.
Eén inhoudelijke reviewer is standaard; geen automatisch parallel panel. Houd
tekstvoorstel en actieve toepassing uit elkaar. Een bestaande publicatiepoort
wordt niet omzeild; eventuele uitrol wordt gebundeld en apart afgehandeld. Deze
afbakening geldt niet als vervanging van kwaliteitscontroles bij nieuwe bronnen
of veranderingen aan programmatuur. Nieuwe lessen gaan gericht terug naar de
extractieskills, niet naar een steeds groter algemeen testprogramma.

Bij de aansluitende review van wetten en kaders gaan de daadwerkelijk gevonden
lessen ook terug naar `omnibus-add-framework` (gebruikersverzoek 16 oktober 2026).
Maak daarvan korte beslisregels voor brongetrouwe extractie: duidelijker uitleg
mag de juridische actor, voorwaarden, uitzonderingen of normkracht niet wijzigen.
Neem rapportlessen niet zonder inhoudelijke toets over als wettelijke vereisten.

De checkout bevat nu een [aanlevercontrole](content-intake.md) voor een afzonderlijk
`intake.json` rond de bestaande bestanden. `npm run content:intake -- <manifest>`
controleert overdrachtsintegriteit zonder de actieve catalogus te wijzigen.
De bijgewerkte skillbronnen in `skills/` verwijzen naar deze controle. Een oudere
gebruikersinstallatie wordt door het installatiehulpmiddel bewust niet overschreven;
controleer verschillen voordat je een bijgewerkte skill installeert.

Technische structuurcontrole, inhoudelijke review, integratieacceptatie en
menselijke acceptatie zijn afzonderlijke beslissingen. Een succesvolle import
wijzigt geen HOLD-status. Gepubliceerde inhoud blijft versiegebonden.

### Technische wijzigingen na een bestaande review

Een andere modulehash betekent niet automatisch gewijzigde norminhoud, maar
mag ook niet worden genegeerd. `lib/review-technical-transitions.mjs` bevat
uitsluitend Node-controles voor drie exact afgebakende wijzigingen: verplaatsing
van ongewijzigde leesfuncties, de Node-controle op broncoördinaten en drie
zichtbare wijzigingen van het label ‘criterium’ naar ‘norm’. Het hulpmiddel
reconstrueert de oorspronkelijke modulebytes en controleert hun oude hash.
De bestaande reviewgate blijft daarna alle normen, groepen en bronrelaties
aan dezelfde oorspronkelijke besluiten toetsen.

Deze bewijzen zijn geen nieuwe inhoudelijke goedkeuring en horen niet in de
browser. Willekeurige extra code, aangepaste bronpassages, verschoven
markeringen, andere voorwaarden of ontbrekende beoordelingen blijven fouten.
De oude reviewbestanden en het historische reviewoverzicht worden niet
herschreven om een nieuwe technische situatie te beschrijven. Bij een nieuwe
wijziging moet de gelijkheid opnieuw worden aangetoond of een echte
inhoudelijke review plaatsvinden; voeg niet alleen een nieuwe toegestane hash toe.

| Soort | Inhoudelijke beoordeling | Integratiebasis |
| --- | --- | --- |
| Rapport | Volledige bronlezingen, reconciliatie, praktische conceptreview, bron- en praktische eindreview | Rapportadapter, normen/toetspunten, historische bevinding, thema/proces, onderzoekcontext en bronbeperkingen |
| Wet of kader | Volledige bronlezingen, reconciliatie, bron-, juridisch/kader- en praktische eindreview | CIO-baseline met exacte passages, adressaten, voorwaarden, uitzonderingen en selectiestatus |
| Model | Theorie/brongebruik en praktische vraagkwaliteit, ieder model/dimensie/vraagvariant | Modeldimensies, indicatoren, niveauvarianten, bronstatus en interpretatiegrenzen |
| Vraagontwerp (aanvullend) | Onderzoeksobject, begrippen, neutraliteit, beantwoordbaarheid en dekking per vraag/variant | Bestaande bron-ID's, vraagvoorstellen en expliciete adoptie; geen nieuwe norm of automatische bronacceptatie |
| Cataloguscuratie (aanvullend) | Herkenbare deelonderwerpen, equivalente scope, volledige puntdekking en beargumenteerde voorkeurskeuze | Omkeerbare, versiegebonden presentatielaag; rapporten, bronacceptatie en bestaande selecties/vragen blijven ongewijzigd |
| Inhoudelijke auditkwaliteit (aanvullend) | Brontrouw, auditrelevantie, onderscheiden begrippen, begrijpelijkheid en uitvoerbare opzet-/bestaanstoetsen | OAK-1.0-scorekaart en verbeterpakket per bouwsteen/punt; vervangt geen bronsoortspecifieke acceptatie |

`npm run quality:models` inventariseert de actuele modelcatalogus zonder deze te
wijzigen. De optionele uitvoer is een nieuwe beoordelingswerkvoorraad:

```text
node scripts/check-model-quality.mjs --out <nieuw-bestand.json>
```

`content-tools/model-quality.mjs` controleert structuur, volledige reviewdekking,
verschillende opgegeven auteurs/reviewers en binding aan de exacte model- en
bronbasis. Het bewijst niet dat de reviewers werkelijk onafhankelijk hebben
gelezen of dat hun argumenten juist zijn. Dat controleert de coördinator.
De huidige modellen worden niet automatisch inhoudelijk goedgekeurd.

## Bestaande interfaces en gedrag behouden

- `app/law-point-source.tsx`: gedeelde wet/kader-bronviewer.
- `app/report-library.tsx`: bronpagina's en markeringen; oorspronkelijke tekst
  en Unicode-codepointposities blijven ongewijzigd.
- `app/viewer-readability.css`, `app/workflow-patterns.tsx` en `LawAboutIntro`:
  gedeelde visuele identiteit; geen stijlen per nieuw pakket.
- `lib/model-library.mjs`, `lib/model-context.mjs`,
  `lib/interview-structure.mjs`: modellen, niveaus en projectcompatibiliteit.
- `scripts/verify-report-release.mjs` en de bestaande bron-specifieke gates:
  exacte ontvangen inhoud en bewijsbindingen, geen nieuwe semantische goedkeuring.

Controleer selectie en deselectie op punt-, norm- en groepsniveau, gedeeltelijke
selectie, vraagkoppelingen en uniek tellen. Controleer bronpassages, pagina's,
bronwissels, About-geheugen, bewaren/heropenen, eigen tekst en alle exportvormen.
Gebruik zowel de nieuwe inhoud als bestaande CIO-, WWKE-, rapport- en modelcases.

## Latere correcties en opmerkingen

### Huidige ontwikkelfase: één actuele praktische tekst

Op verzoek van de eigenaar (16 oktober 2026) worden voor inhoudelijke correcties
geen extra oude projectteksten, parallelle catalogi of nieuwe migratielagen
opgebouwd. Er zijn nog geen gebruikersprojecten waarvoor zo'n garantie nodig is.
Een goedgekeurde correctie wordt de actuele inhoud; bestaande eigen invulvelden
blijven gewone projectinhoud, niet een nieuw centraal historisch archief.

`app/report-quality-revisions.json` bevat uitsluitend de huidige praktische
correcties. `lib/report-quality-revisions.mjs` past ze op de actieve normen en
toetspunten toe. Bij een volgende verbetering wordt de betreffende actuele
correctie vervangen, niet als extra historische variant toegevoegd. De
database levert deze gegevens alleen met het geopende rapport. Letterlijke
bronrapporten, citaten, markeringen en bronbeperkingen blijven ongewijzigd.

De eerste correcties betreffen vijf normen en tien punten. Hun afzonderlijke
bron- en praktische acceptatie staat in `content-tools/report-quality-20261016/`;
de gate bindt zowel de exacte correctie als de twee onafhankelijke besluiten.
Reviewdossiers en tests staan buiten de browserlevering. Dit is een begrensde
inhoudscorrectie, geen nieuwe volledige rapportextractie of menselijke
goedkeuring. Expliciet niet aangeboden toetsfasen blijven niet aangeboden.

De daaropvolgende tekstgerichte rapportcorrecties gebruiken op expliciet verzoek
één inhoudelijke reviewer (`SELF_REVIEW`). De oorspronkelijke panelbesluiten
blijven uitsluitend aan hun eigen ongewijzigde correcties verbonden.
`content-tools/report-quality-text-20261016/acceptance.json` koppelt de nieuwe
tekstwijzigingen aan hun exacte reviewbestanden en actuele inhoud. De gate
bewaakt de bedoelde vervanging en onveranderde bron-/fasegrenzen; hij claimt
geen onafhankelijk panel of nieuwe bronadmissie. Toepassing gebeurt gebundeld
via de bestaande lokale gegevens- en webbuild, zonder brede regressietestronde.

Voor WWKE staan actuele tekstcorrecties in `app/wwke-quality-revisions.json`.
`lib/wwke-content.mjs` biedt de gecorrigeerde ketens aan; de leesbare normvarianten
gebruiken dezelfde correctielaag. De database levert de ketens pas bij openen.
`scripts/verify-wwke-text-review.mjs` bindt vervangingen aan de afgeronde
`SELF_REVIEW`-batches en hun exacte inhoudsbasis. De oorspronkelijke extractie,
bronpassages, selectiestatussen en open bronvragen in `lib/wwke-reviewed/`
blijven ongewijzigd. De bestaande bronpoort blijft afzonderlijk gelden.

### Mogelijke latere beheervoorziening

Een beheerscherm is nog niet gebouwd. Reserveer in het ontwerp een afzonderlijke
reviewlaag: een opmerking verwijst naar pakketversie, stabiel object-ID en waar
nodig bronhash/pagina/span. De opmerking bevat auteur, type probleem, toelichting,
status en afhandeling; zij verandert de bron niet.

Een correctie wordt een voorstel met verschilweergave en nieuwe reviewbasis.
Na beoordeling volgt een nieuwe inhoudsversie. Voor een latere productieomgeving
moet eerst expliciet worden besloten welke versiegaranties gebruikersprojecten
nodig hebben; dat wordt nu niet vooruitlopend ingebouwd. Een handmatig geschreven norm is eigen
inhoud, niet automatisch een verplichting uit een wet. Bron, parafrase en eigen
aanpassing moeten ook in zo'n toekomstige editor zichtbaar onderscheiden blijven.
