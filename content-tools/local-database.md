# Eigen modelpakketten lokaal laden

> **In het kort:** laad gecontroleerde modelpakketten in een nieuwe lokale database. Met een vastgelegd eigenaarbesluit en een bestaande, gecontroleerde basispublicatie kun je de modellen in de gewone Omnibus-viewer gebruiken. Zonder die vrijgave krijg je alleen een controledatabase in HOLD. De bestaande database verandert niet.

## Welke pakketten werken?

| Bronsoort | Intake en bestandscontrole | Lokale controledatabase | Zelfstandige viewerpublicatie |
| --- | --- | --- | --- |
| Model (`model-review-1`) | Ja | Ja, met behoud van bronbinding, reviewbewijs en modelvelden | Ja, met eigenaarbesluit en gepinde basispublicatie |
| Rapport (`report-kit-1.1`) | Ja | Nee, zelfstandige inhouds- en reviewvalidator ontbreekt | Nee |
| Wet of kader (`framework-cio-0.1+addendum-01`) | Ja | Nee, zelfstandige inhouds- en reviewvalidator ontbreekt | Nee |

Een geldige intake bewijst voor alle drie de soorten alleen dat de opgegeven bestanden, rollen en controlegetallen kloppen. Een rapport- of kaderpakket kan die controle halen en vervolgens terecht door de lokale bouwer worden geweigerd. Een selectie met zo'n pakket wordt als geheel geweigerd vóór databaseaanmaak.

### Wanneer mag een model in de lokale viewer?

De bestaande [modelreviewcontrole](model-quality.mjs) controleert verschillende reviewer-ID's, de afzonderlijke beoordelingen en hun binding aan de exacte model- en bronbasis. Het resultaat is `READY_FOR_INTEGRATION_REVIEW`. Volgens de [bestaande reviewwerkwijze](../skills/omnibus-add-model/references/question-quality.md#reviewbewijs) verifieert de coördinator daarnaast de onafhankelijkheid en werkelijke bronlezing buiten het JSON. Alleen verschillende `actorId`-waarden zijn daarvoor geen bewijs.

De lokale pakketroute kan nu een afzonderlijk vrijgavebesluit van de lokale eigenaar controleren en bewaren. Dat besluit is gebonden aan de exacte intake, reviewbasis, auteurs en het vastgelegde verificatiebewijs. De opdracht neemt het besluit niet zelf en bewijst niet dat de eigenaar de bron werkelijk heeft gelezen.

Op 25 oktober 2026 heeft de beheerder besloten dat de eigenaar van een eigen lokale database een pakket definitief mag toelaten. De onafhankelijke reviews en broncontroles moeten daarvoor zijn uitgevoerd en vastgelegd. Dit geeft geen bevoegdheid om de openbare Omnibus-database te wijzigen. Ontbrekend bewijs en open HOLD blijven een blokkade; de eigenaar kan die niet overslaan. Geef voor de viewerroute ook een bestaande basispublicatie mee met `--base`, zoals hieronder beschreven.

De bestaande [runtimepublisher](../scripts/prepare-runtime-publication.mjs) gebruikt een expliciet gepinde private auteurscheckout. Voor deze lokale modelroute is die niet nodig: de gedeelde catalogusgegevens komen uit de gecontroleerde basisdatabase. De [publicatiehelper](../local-data/runtime-publication.mjs) blijft een controledatabase in HOLD weigeren, ook wanneer de aanroeper zelf `VERIFIED_APPLICATION_RELEASE` invult. Gebruik de volledige bouwopdracht; pas geen status aan om die grens te omzeilen.

Fictieve reviewerrecords in softwaretests bewijzen alleen de werking van de controles. Zij zijn nooit bewijs dat echte inhoud is beoordeeld. Een succesvolle bouw bevestigt evenmin dat jouw concrete vragen inhoudelijk goed zijn; daarvoor blijven de brongebonden reviews nodig.

## 1. Zet de pakketten klaar

Gebruik Node 24.21.0 en de openbare Omnibus-code. Deze opdracht heeft geen extra installatie of private auteursomgeving nodig. Zet je pakketten in een eigen map onder `work/`. Bewaar de manifesthash van elk pakket apart; neem geen nieuwe hash over om een fout te omzeilen.

Een modelpakket gebruikt het bestaande [intakecontract](../docs/beheer/pakket-controleren.md) `model-review-1`. Het bevat:

- Precies één JSON-bestand met de rol `viewer-content`: het model met dimensies en vragen.
- Precies één JSON-bestand met de rol `review-basis`: de volledige uitkomst van `prepareModelReview` uit [model-quality.mjs](model-quality.mjs), gemaakt voor dat model en die bronnen.
- Precies één JSON-bestand met de rol `review`: een lijst met de bestaande theorie- en praktijkreview, gebonden aan die basis.
- Alle oorspronkelijke bronnen met de rol `source`. De `id` en hash van elke bron staan ook in `sourceEvidence` van de reviewbasis. Neem alle bronnen op.
- De brontekst met de rol `source-text`, als UTF-8 `.txt`. Elke tekst blijft één tekstbestandpagina. Dit zijn geen paginanummers uit een pdf. Een tekstbestand mag ook de oorspronkelijke bron zijn.
- De overige verplichte rollen: `contract`, `context` en `limitations`.

Maak geen reviews om de opdracht te laten slagen. De bestaande controle beoordeelt de structuur en binding van reviews. Zij kan niet bewijzen wie de reviewers zijn of dat zij de bron werkelijk hebben gelezen. Zie [de bestaande modelwerkwijze](../skills/omnibus-add-model/README.md).

De model-JSON moet ook de bestaande [modelvelden van de viewer](../lib/model-library-types.ts) bevatten: onder meer `kind`, `version`, `source`, `selected` en per dimensie en vraag `question`, `probes` en `included`. De bouwer gebruikt dezelfde structuurcontrole als het heropenen van een project. Ontbrekende velden worden niet ingevuld en tekst wordt niet aangepast. Een beschermd model waarvoor cataloguscontext nodig is, blijft zonder die context in HOLD.

## Rapporten en kaders: reviewbestanden controleren

De lokale opdracht controleert ook de bestandskoppelingen van bestaande rapport- en kaderreviews. Gebruik daarvoor hetzelfde pakketplan en dezelfde `--check`-opdracht als hieronder. De oorspronkelijke reviewbestanden blijven ongewijzigd; maak geen nieuw akkoord om een bestand passend te krijgen.

- **Rapport:** `REVIEW-BASIS.json` gebruikt het bestaande veld `files`. De twee eindreviews gebruiken `target_hashes` voor de zes eindbestanden uit de rapportkit. De controle vergelijkt ook de vastgelegde pdf- en teksthash en de beoordelingen per item en veld.
- **Kader:** `REVIEW-BASIS.json` gebruikt het bestaande veld `target_hashes`. Bron-, kader/juridische en praktische eindreview moeten dezelfde basis beoordelen. De controle vergelijkt de objectdekking, verplichte beoordelingsaspecten en aantallen bronrelaties per toetspunt.
- Alle genoemde bestanden moeten in de gecontroleerde intake staan. Een pakket mag in een submap zoals `payload/` staan. Verwijzingen binnen de bevroren basis blijven relatief aan die pakketmap. De controle zoekt niet op alleen een bestandsnaam en leest geen verwijzingen buiten het pakket.

Bij correcte koppelingen vermeldt de foutuitvoer `SOURCE_INTEGRATION_REQUIRED` met een samenvatting onder `reviewEvidence`. `reviewBindingsValidated` is dan `true`, maar het pakket blijft **HOLD** en de opdracht eindigt met exitcode 1. Ook met `--out`, `--base` of een eigenaarbesluit wordt geen database gemaakt. Een ontbrekend of gewijzigd bestand, andere eindbasis, auteur als reviewer, dubbel reviewobject of onopgelost reviewpunt stopt eerder met de concrete oorzaak.

Deze tussencontrole bevestigt alleen de gecontroleerde bestandskoppelingen en verklaarde objectbeoordelingen. Zij controleert nog niet de volledige bronmethode, letterlijke bronpassages, lees- en bevriezingsbewijzen, inhoudelijke kwaliteit of de aansluiting op de viewer. Daarom blijven `sourceMethodValidated`, `reviewValidated`, `viewerShapeValidated`, `newContentApproval` en `publishable` hier `false`. De bestaande volledige bronafhankelijke toelating blijft verplicht. Rapporten en kaders kunnen via deze lokale opdracht nog niet in de viewer worden geladen; de modelroute hieronder werkt wel.

Historische dossiers met absolute verwijzingen worden niet automatisch omgeschreven. Bewaar het originele bewijs en gebruik de bestaande bronafhankelijke integratieroute. De controle maakt geen nieuwe goedkeuringshashes of reviewredenen.

## 2. Kies je pakketten

Maak naast de pakketmappen een bestand `packages.json`. Noem alleen de pakketten die je wilt opnemen. Zo komt een oude of afgekeurde versie niet ongemerkt mee.

```json
{
  "format": "omnibus-local-database",
  "schemaVersion": 1,
  "packages": [
    {
      "intake": "mijn-model/intake.json",
      "sha256": "VUL_HIER_DE_APART_BEWAARDE_MANIFESTHASH_IN",
      "authorIds": ["DE_WERKELIJKE_AUTEUR_ID"]
    }
  ]
}
```

Vervang de voorbeeldwaarden. Gebruik bij `authorIds` de werkelijke auteuridentiteiten uit het reviewdossier. De reviewers moeten van de auteurs en van elkaar verschillen. Paden naar intakes zijn relatief aan `packages.json`. Voor een tweede pakket voeg je een tweede item toe. Kies per model één versie.

### Een besluit van de lokale eigenaar meegeven

Dit is alleen nodig als de eigenaar de onafhankelijke reviews en broncontroles daadwerkelijk heeft geverifieerd. Zonder besluit blijft de bestaande controle-/reviewroute ongewijzigd werken.

Bewaar eerst het verificatieverslag in het pakket, met de intake-rol `supporting`. Het verslag beschrijft de gecontroleerde onafhankelijkheid, werkelijke bronlezing en brongetrouwheid, met verwijzingen naar het bewijs. Een willekeurig tekstbestand of ingevuld voorbeeld is geen inhoudelijke verificatie. Maak daarna de definitieve intake en bewaar haar hash apart. Het eigenaarbesluit staat **buiten** de intake, zodat geen wederzijdse hashverwijzing ontstaat.

Het besluit is een JSON-bestand met deze velden:

| Veld | Vereiste inhoud |
| --- | --- |
| `format`, `schemaVersion`, `scope`, `decision` | `omnibus-local-owner-admission`, `1`, `local-database-only`, `ADMIT` |
| `ownerId`, `decidedAt` | Werkelijke lokale eigenaar en het besluittijdstip in UTC, bijvoorbeeld `2026-10-25T12:00:00.000Z` |
| `package`, `intakeSha256`, `basisHash`, `authorIds` | Exacte pakketmetadata uit de intake, apart bewaarde intakehash, hash van de beoordeelde basis en dezelfde auteurs als in het pakketplan |
| `verificationEvidenceIds` | Niet-lege lijst van bestands-ID's uit die intake met rol `supporting`; leesbare UTF-8-verslagen, geen paden naar losse bestanden |
| `confirmations` | `reviewerIndependence`, `actualSourceReading` en `sourceFidelity`, elk `true` na de daadwerkelijke verificatie |
| `unresolvedIssues` | Lege lijst; met een open punt is geen lokale toelating mogelijk |

Voeg aan het betreffende pakket in `packages.json` één veld toe:

```json
"admission": {
  "file": "besluiten/mijn-model.json",
  "sha256": "VUL_HIER_DE_APART_BEWAARDE_HASH_VAN_HET_BESLUIT_IN"
}
```

Het pad is relatief aan het pakketplan. Zowel `--check` als de bouwopdracht controleert opnieuw de huidige pakket- en besluitbytes. Een gewijzigd pakket, andere auteurs, ontbrekend bewijs of een hergebruikt besluit voor een ander pakket wordt geweigerd. HOLD of afwijzing in het model of de reviews blijft blokkeren. De opdracht wist of herschrijft die statussen nooit.

De uitkomst noemt het vastgelegde besluit onder `ownerAdmissions`. De database bewaart de oorspronkelijke besluitbytes als bijlage. Zonder `--base` blijft de uitvoer een controledatabase: `RUNTIME_PROJECTION_REQUIRED` bij complete eigenaarbesluiten, anders `INTEGRATION_REVIEW_REQUIRED`. Met `--base` moeten alle pakketten een geldig besluit hebben. De lokale route verleent nooit toestemming voor openbare publicatie; `publishable` blijft `false`.

## 3. Kies een controledatabase of viewerpublicatie

### Gebruiken in de bestaande viewer

Gebruik het `local-build.json` van de basisdatabase. Dat bestand legt de database, release en publicatiehash vast. De opdracht leest deze basis alleen en weigert ontbrekende of gewijzigde bron- en publicatiegegevens.

```text
node scripts/build-local-database.mjs --plan work/eigen-pakketten/packages.json --base work/basis/local-build.json --out work/eigen-viewer-01
npm run build:runtime -- --settings work/eigen-viewer-01/local-build.json --out work/eigen-viewer-web-01
npm run dev:database -- --settings work/eigen-viewer-01/local-build.json --web-root work/eigen-viewer-web-01 --port 4328
```

Open daarna `http://127.0.0.1:4328/`. De eerste opdracht maakt de nieuwe database. De volgende twee bouwen en openen de bestaande applicatie lokaal; daarvoor zijn de gewone applicatieafhankelijkheden nodig. Geen van deze opdrachten kiest een andere database voor een al draaiende Omnibus.

Bij `LOCAL_VIEWER_DATABASE_CREATED` zijn `catalogue.sqlite`, `local-database-result.json` en `local-build.json` aanwezig. `runtime.status` is `LOCAL_READY`, met reikwijdte `local-database-only`. De basispakketten en brontekst blijven gelijk; uitsluitend de toegelaten modellen en hun bewijs komen erbij. Een bestaand model wordt nooit vervangen. De viewer, het laden per model, selecteren en projectherstel gebruiken dezelfde code als de gewone applicatie; het projectformaat verandert niet. Open een bewaard project met deze lokale publicatie om de eigen modellen weer beschikbaar te hebben.

Alleen verwijzingen voor gegevensoverdracht krijgen de nieuwe releasehash. Bronpassages, paginaversies, modelteksten en bewijsbestanden worden niet herschreven. De lokale vrijgave geldt alleen voor de toegevoegde pakketten, niet als nieuwe inhoudelijke beoordeling van de basiscollectie.

### Alleen een controledatabase

Voer vanuit de map met de Omnibus-code één opdracht uit:

```text
node scripts/build-local-database.mjs --plan work/eigen-pakketten/packages.json --out work/eigen-database-01
```

De uitvoermap moet nieuw zijn, buiten de pakketmappen liggen en een bestaande bovenliggende map hebben. Een bestaande map of database wordt altijd geweigerd. Ook een lege map wordt niet hergebruikt.

Bij succes staan er twee bestanden:

| Bestand | Inhoud |
| --- | --- |
| `catalogue.sqlite` | Modellen, brontekst, oorspronkelijke pakketbestanden en reviews, ongewijzigd bewaard |
| `local-database-result.json` | Aantallen pakketten, records, bestanden, bronpagina's en reviewonderdelen; hashes van de database, release, het plan en elke intake |

`LOCAL_CATALOGUE_CREATED_REVIEW_REQUIRED` betekent dat de controledatabase is gemaakt. Je kunt haar lokaal onderzoeken via de bestaande [databaselezer](../local-data/repository.mjs). De opdracht gebruikt dezelfde intake-, modelreview- en database-integriteitscontroles als de bestaande hulpmiddelen. Het model staat als één record in de database; daarin blijven alle dimensies, vragen en eigen statussen bewaard. Alle records blijven in HOLD. De oorspronkelijke bestanden staan verliesloos in de database als bijlagen.

**Zonder `--base` is dit geen viewerpublicatie.** `publishable`, `contentValidated`, `reviewValidated` en `newContentApproval` blijven `false`. Alleen de structuur van de reviews is gecontroleerd. `runtime.status` blijft `HOLD`. Er wordt geen `local-build.json` gemaakt en geen actieve database gekozen. Voor de viewer gebruik je de oorspronkelijke pakketten, hun vrijgavebesluiten en de bouwopdracht met `--base`; de controledatabase wordt niet omgelabeld.

`viewerShapeValidated: true` bevestigt alleen dat de modelvelden de gedeelde structuurcontrole halen. Het bewijst geen inhoudelijke goedkeuring, complete publicatie of uitgevoerde viewerproef.

### Alleen de invoer controleren

Wil je de pakketten controleren zonder bestanden te maken? Gebruik:

```text
node scripts/build-local-database.mjs --plan work/eigen-pakketten/packages.json --check
```

Deze controle is optioneel: de bouwopdracht controleert de invoer zelf. `--check` leest alle gekozen pakketten en voert dezelfde intake-, bron-, review- en modelstructuurcontroles uit. Bij succes verschijnt `LOCAL_PACKAGES_CHECKED_REVIEW_REQUIRED`, met de planhash, pakketversies, intakehashes en aantallen pakketten, bestanden, bronteksten en reviewonderdelen. Er wordt geen database of resultaatbestand gemaakt. Combineer `--check` niet met `--out`.

Met `--base work/basis/local-build.json` controleert `--check` ook de eigenaarbesluiten en basispublicatie, zonder te schrijven. Het resultaat is dan `LOCAL_VIEWER_INPUTS_CHECKED` en `runtime.status: NOT_BUILT`.

Een geslaagde controle bevestigt alleen de gecontroleerde invoer. Zij test geen uitvoermap, databaseaanmaak of inhoudelijke toelating. De bouwopdracht leest en controleert alle actuele bestanden opnieuw; een eerder controleresultaat kan nooit als pakketplan of goedkeuring dienen.

## 4. Los een HOLD op

Bij een fout stopt de opdracht met exitcode 1, `HOLD`, de stap en een concrete oorzaak. Dit geldt ook voor `--check`; beide opdrachten stoppen bij de eerste fout. Als één pakket faalt, wordt geen deel van de selectie geladen. Bij een latere schrijf- of eindcontrolefout kan een onvolledige uitvoermap achterblijven; gebruik die niet en kies bij een nieuwe poging een nieuwe map.

| Melding | Wat je doet |
| --- | --- |
| `INPUT_CHECK` | Controleer het plan, de paden en de nieuwe uitvoermap. |
| `PACKAGE_CHECK[2]` | Het tweede pakket faalt. Vraag de exacte ontbrekende bestanden of een nieuwe beoordeelde pakketversie op. |
| `BASE_PUBLICATION_CHECK` | Controleer de expliciete basispins en eigenaarbesluiten. Een bestaand model-ID kan niet opnieuw worden toegevoegd. |
| `Source review` | Een bestand, reviewkoppeling of objectbeoordeling ontbreekt of wijkt af. Vraag het oorspronkelijke bewijs of een nieuwe, daadwerkelijk gereviewde versie; vervang geen vastgelegde hashes. |
| `SOURCE_INTEGRATION_REQUIRED` / `No standalone content/review validator` | De reviewkoppelingen zijn gecontroleerd, maar de volledige bronafhankelijke toelating en vieweraansluiting ontbreken nog voor rapporten en kaders. Houd het pakket apart. |
| `DATABASE_WRITE` of `FINAL_VERIFICATION` | Controleer de genoemde fout en beschikbare schijfruimte. Gebruik geen gedeeltelijke uitvoer. |

Er is geen optie om controles over te slaan. De opdracht voert nooit code uit een pakket uit. Grenzen: maximaal 64 pakketten, samen 64 MiB aan bestanden, manifesten en eigenaarbesluiten, en 8 MiB per gelezen JSON-bestand. Voor de viewer geldt ook de bestaande limiet van 100 modellen, 500 dimensies per model, 100 vragen per dimensie en 2 MiB per laaddeel. De bestaande strengere intakegrenzen blijven gelden. Houd pakketten en uitvoer lokaal en buiten Git.

## Testen met fictieve gegevens

```text
node --test content-tools/local-database.test.mjs content-tools/local-model-runtime.test.mjs content-tools/local-source-review.test.mjs
```

Deze tests maken eigen fictieve pakketten in `work/`, controleren goede en afgekeurde invoer en ruimen hun eigen testmappen op. Ze toetsen ook dat de basis gelijk blijft, laadverwijzingen kloppen en de bestaande herstelregels onbruikbare modellen weigeren. De testreviews zijn uitsluitend softwaretestgegevens.

De lokale browserproef van 25 oktober 2026 doorliep de pakketroute met een fictief model: openen in de bestaande viewer, een vraag kiezen en aanpassen, de bouwsteen terugvinden in het kader, herladen en hetzelfde projectbestand openen in een lege browsersessie. Model, vraagtekst en selectie bleven behouden. Dit is een softwareproef, geen inhoudelijke vrijgave van echte bronnen.

---

[↑ Hulpmiddelen voor de beheerder](README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
