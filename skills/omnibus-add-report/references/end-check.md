# Zelfstandige eindcontrole

Gebruik dit na de [eindontvangst](final-receipt.md). Een voorbereide skillbundel
bevat `scripts/runtime/` en `scripts/runtime-members.mjs`: exacte kopieën van de
openbare Omnibus-controlecode. Node.js 24.21 of nieuwer volstaat voor deze stap.
Een database, internetverbinding en Omnibus-installatie zijn niet nodig.

Een rechtstreeks uit de repository gekopieerde skillmap bevat deze runtime niet.
Vraag de beheerder om de voorbereide bundel. De beheerder maakt die vanuit de
codecheckout met `npm run skills:install -- --target work/skills-uitgifte --skill omnibus-add-report`
en kan daarna de volledige map `work/skills-uitgifte/omnibus-add-report` zippen.
Bestaande, afwijkende skillbestanden worden niet overschreven. De afhankelijkheden
worden bij voorbereiding gekopieerd; er is geen tweede handmatig onderhouden controle.

## Eerst controleren

- De onafhankelijke hulpmiddelenreview omvat de **voorbereide** bundel. Het
  releasebestand noemt ook `scripts/check-final.mjs`, `scripts/runtime-members.mjs`
  en ieder bestand in `scripts/runtime/`. De eindcontrole vergelijkt de uitgevoerde
  code met deze apart vastgelegde release; maak geen vervangende goedkeuring.
- Alle acht fases, echte bronlezingen, herstelpunten en beide eindreviews zijn
  vastgelegd. Houd de oorspronkelijke bestanden en hashes intact.
- Het [intakeplan](../assets/intake-plan.json.example) noemt alle bewijsbestanden,
  ook de baseline, paginabeelden en volledige goedgekeurde hulpmiddelenrelease.
  De hoofdrollen uit het voorbeeld zijn geen volledige bestandslijst.

## Transport voorbereiden

Maak één nieuwe intake vanuit het plan, zonder bestaande intakes te verversen:

```text
node scripts/runtime/scripts/prepare-content-intake.mjs <pakketmap>/plan.json --output <pakketmap>/intake.json
```

**Gelukt als:** `FILES_VERIFIED_REVIEW_REQUIRED` verschijnt. Bewaar de teruggegeven
`manifestSha256` afzonderlijk. Dit bevestigt nog geen inhoudelijke kwaliteit.
Ontbrekende bestanden of overschreden grenzen zijn een blokkade; laat geen bewijs weg.

## Eindcontrole uitvoeren

De coördinator levert een apart invoerbestand met precies `authorIds` en
`sourceEvidence`. `authorIds` bevat de werkelijke auteurs. `sourceEvidence` bevat:

- `firstReceipt` en `finalReceipt`: elk een `fileId` uit de intake en de eerder
  afzonderlijk bewaarde `sha256` van het oorspronkelijke ontvangstbewijs;
- `contracts`: de vastgelegde hashes onder `CONTRACT.md` en `record_contract.py`;
- `release`: `manifest` en `approval`, elk met intake-`fileId` en afzonderlijk
  bewaarde `sha256` van de beoordeelde hulpmiddelenrelease;
- `paths`: `[]` voor deze zelfstandige route met relatieve pakketpaden.

Bewaar ook de SHA-256 van dit invoerbestand buiten het pakket. Neem de bewijsankers
over uit de oorspronkelijke overdracht; leid ze niet opnieuw af om een fout te herstellen.

```text
node scripts/check-final.mjs --intake <pakketmap>/intake.json --expect-sha256 <intakehash> --evidence <controle-invoer.json> --evidence-sha256 <invoerhash>
```

**Gelukt als:** `REPORT_FINAL_CHECKED_REVIEW_REQUIRED` verschijnt met
`sourceMethodValidated: true`. De controle leest alleen en gebruikt dezelfde
passage-, structuur-, lees-, review- en ontvangstregels als de ontvangende Omnibus.
Pakketcode wordt niet uitgevoerd. Ontbrekend of gewijzigd bewijs geeft `HOLD`
en een foutcode; er wordt geen nieuw ontvangstbewijs, review of database gemaakt.

De uitkomst is geen inhoudelijke vrijgave of waarneming van werkelijk leeswerk.
`publishable`, `contentValidated` en `reviewValidated` blijven `false`.
Lever de ongewijzigde bestanden en apart bewaarde hashes aan de ontvanger,
die de [ontvangstcontrole](final-receipt.md#ontvangst-in-omnibus) opnieuw uitvoert.
