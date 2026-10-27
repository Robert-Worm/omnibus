# De eindset voor beide reviewers vastleggen

Gebruik dit na de conceptreview en vastgelegde herstelronde, vóór beide
eindreviews. De coördinator legt vast **welke bestanden** beoordeeld worden.
Het hulpmiddel schrijft geen inhoudelijke beoordeling en geeft geen vrijgave.

## Voorwaarden

- De [bronvoorbereiding](source-preparation.md), [baseline en taxonomie](selection-baseline.md),
  [eerste ontvangst](first-submissions.md) en [fasebewijzen](stage-receipts.md) zijn aanwezig.
  Alle fases tot en met `repairs` zijn afgerond; de eindreviews zijn nog niet gestart.
- Bewaar de echte ontvangsthash van `freeze-first` en de eindhash van `repairs`
  buiten het pakket. Een ontbrekend bewijs mag niet achteraf worden nagebouwd.
- De onafhankelijk goedgekeurde hulpmiddelenrelease bevat ook
  `references/report-kit/REVIEW-CONTRACT.json.example`, exact gelijk aan het
  meegeleverde bestand. Het hulpmiddel kopieert dit schema naar
  `REVIEW-CONTRACT.json` als dat nog ontbreekt. Een bestaande kopie moet identiek zijn.
- Alle eindbestanden, oorspronkelijke inzendingen, leeslogs, beeldbewijzen,
  herstelverantwoording en issues zijn aanwezig. Aanvullende context die de
  reviewers nodig hebben, staat op een vaste relatieve plek in het pakket.

## Basis maken

Voer vanuit de geïnstalleerde skillmap uit:

```text
node scripts/stage-receipts.mjs review-basis --packet <pakketmap> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <bewaarde-invoerhash> --baseline-freeze-sha256 <bewaarde-baselinehash> --first-receipt-sha256 <bewaarde-eerste-ontvangsthash> --repairs-sha256 <bewaarde-hersteleindhash>
```

Neem extra inhoudelijke afhankelijkheden mee met herhaald
`--extra <relatief-pad>`. Geef geen verwijzing naar de basis zelf, de veranderende
fase-index of nog te maken eindreviews mee.

**Gelukt als:** `READY_FOR_SUBSTANTIVE_REVIEWS_NOT_APPROVED` verschijnt.
`REVIEW-BASIS.json` bindt de vaste afhankelijkheden, de vijf inhoudelijke
eindbestanden, de bron-PDF, de oorspronkelijke ontvangst, baseline, taxonomie en
fasebewijzen. Alle oorspronkelijke bestanden blijven ongewijzigd. De uitvoer
bevat `target_hashes` voor de zes bestaande reviewtargets, inclusief de basis zelf.
Bewaar `receipt.sha256` en deze targethashes buiten het pakket.

## Onafhankelijke eindreviews

Geef beide reviewers de exacte eindset, basis en alle toegestane afhankelijkheden
volgens hun [rolinstructies](report-package.md#invoer-en-uitvoer-per-rol).
Voeg bij `start`, `finish` en `check` voor `source_final_review` en
`practical_final_review` de optie
`--review-basis-sha256 <bewaarde-reviewbasishash>` toe aan de gebruikelijke
[faseopdracht](stage-receipts.md#per-fase). Zij gebruiken dezelfde zes targethashes.
Een veranderde afhankelijkheid blokkeert ook de afronding van een al gestarte review.

De basis en eerdere bewijzen worden niet overschreven. Is na vastlegging een
inhoudelijke wijziging nodig, behoud dan dit pakket en gebruik een nieuwe
pakketversie met de vereiste herbeoordeling. Bij een onderbreking blijven eventuele
gedeeltelijke administratieve bestanden beschikbaar voor onderzoek.

Deze stap bevestigt bestandsintegriteit en samenhang, geen bronlezing of kwaliteit.
`publishable`, `contentValidated` en `reviewValidated` blijven `false`.
Na beide eindreviews kun je [de ontvangstketen afsluiten](final-receipt.md).
De zelfstandige inhoudelijke eindcontrole volgt nog; de bestaande bron-, review-
en toelatingscontroles blijven verplicht. Bewaar het pakket privé.
