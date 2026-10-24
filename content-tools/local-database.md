# Eigen modelpakketten lokaal laden

> **In het kort:** één opdracht zet gecontroleerde modelpakketten in een **nieuwe lokale controledatabase**. Je krijgt aantallen en controlegetallen. De inhoud blijft in HOLD voor gebruik in de viewer: de inhoudelijke integratie moet nog worden beoordeeld.

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

## 3. Maak de nieuwe database

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

**Dit is nog geen viewerpublicatie.** `publishable`, `contentValidated`, `reviewValidated` en `newContentApproval` blijven `false`. Alleen de structuur van de reviews is gecontroleerd. `runtime.status` blijft `HOLD`. Er wordt geen `local-build.json` gemaakt en geen actieve database gekozen. De bestaande runtimecontrole weigert deze controledatabase totdat de vereiste integratieroute beschikbaar en afgerond is.

`viewerShapeValidated: true` bevestigt alleen dat de modelvelden de gedeelde structuurcontrole halen. Het bewijst geen inhoudelijke goedkeuring, complete publicatie of uitgevoerde viewerproef.

### Alleen de invoer controleren

Wil je de pakketten controleren zonder bestanden te maken? Gebruik:

```text
node scripts/build-local-database.mjs --plan work/eigen-pakketten/packages.json --check
```

Deze controle is optioneel: de bouwopdracht controleert de invoer zelf. `--check` leest alle gekozen pakketten en voert dezelfde intake-, bron-, review- en modelstructuurcontroles uit. Bij succes verschijnt `LOCAL_PACKAGES_CHECKED_REVIEW_REQUIRED`, met de planhash, pakketversies, intakehashes en aantallen pakketten, bestanden, bronteksten en reviewonderdelen. Er wordt geen database of resultaatbestand gemaakt. Combineer `--check` niet met `--out`.

Een geslaagde controle bevestigt alleen de gecontroleerde invoer. Zij test geen uitvoermap, databaseaanmaak of inhoudelijke toelating. HOLD blijft gelden. De bouwopdracht leest en controleert alle actuele bestanden opnieuw; een eerder controleresultaat kan nooit als pakketplan of goedkeuring dienen.

## 4. Los een HOLD op

Bij een fout stopt de opdracht met exitcode 1, `HOLD`, de stap en een concrete oorzaak. Dit geldt ook voor `--check`; beide opdrachten stoppen bij de eerste fout. Als één pakket faalt, wordt geen deel van de selectie geladen. Bij een latere schrijf- of eindcontrolefout kan een onvolledige uitvoermap achterblijven; gebruik die niet en kies bij een nieuwe poging een nieuwe map.

| Melding | Wat je doet |
| --- | --- |
| `INPUT_CHECK` | Controleer het plan, de paden en de nieuwe uitvoermap. |
| `PACKAGE_CHECK[2]` | Het tweede pakket faalt. Vraag de exacte ontbrekende bestanden of een nieuwe beoordeelde pakketversie op. |
| `No standalone content/review validator` | Rapporten en wetten/kaders hebben nog geen zelfstandige integratiecontrole in deze route. Houd het pakket apart en volg de bestaande inhoudelijke werkwijze. |
| `DATABASE_WRITE` of `FINAL_VERIFICATION` | Controleer de genoemde fout en beschikbare schijfruimte. Gebruik geen gedeeltelijke uitvoer. |

Er is geen optie om controles over te slaan. De opdracht voert nooit code uit een pakket uit. Grenzen: maximaal 64 pakketten, samen 64 MiB aan bestanden en manifesten, en 8 MiB per gelezen JSON-bestand. De bestaande strengere intakegrenzen blijven gelden. Houd pakketten en uitvoer lokaal en buiten Git.

## Testen met fictieve gegevens

```text
node --test content-tools/local-database.test.mjs
```

Deze tests maken eigen fictieve pakketten in `work/`, controleren goede en afgekeurde invoer en ruimen hun eigen testmappen op. De testreviews zijn uitsluitend softwaretestgegevens.

---

[↑ Hulpmiddelen voor de beheerder](README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
