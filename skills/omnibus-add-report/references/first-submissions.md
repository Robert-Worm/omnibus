# Eerste inzendingen vastleggen vóór vergelijking

De coördinator gebruikt `freeze-first` van
[stage-receipts.mjs](../scripts/stage-receipts.mjs) nadat beide blinde lezers hun
eerste definitieve inzending hebben ingeleverd. Dit legt ontvangst vast; het
vergelijkt of herschrijft geen bevindingen en verleent geen inhoudelijke goedkeuring.

## Voorwaarden

- Beide lezingen zijn werkelijk uitgevoerd in afzonderlijke contexten. Hun
  [fasebewijzen](stage-receipts.md) zijn afgerond en de eindhash van iedere lezer
  is buiten het pakket bewaard.
- Iedere lezer heeft de originele `result.json`, `READ-LOG.json` en
  `VISUAL-EVIDENCE.json` in zijn eigen `output/` ingeleverd. Leeslogs noemen de
  werkelijke identiteit, bronchecksums, volledige tekst- en beeldpaginadekking
  en een concrete beschrijving van de uitvoering.
- De oorspronkelijk vastgelegde `PILOT-CONTROL.json`, `BASELINE-FREEZE.json`,
  `SELECTION.json`, `INPUT-FREEZE.json` en `RELEASE-BINDING.json` zijn aanwezig.
  Leg [selectie en baseline](selection-baseline.md) vóór de lezingen vast en geef
  de bewaarde hash mee als `--baseline-freeze-sha256 <bewaarde-baselinehash>`.
  Maak geen lege vervangers om de ontvangstcontrole te laten slagen.
- Er is nog geen vergelijking, reconciliatie of praktische uitwerking begonnen.
  De coördinator bevestigt dit op basis van waargenomen uitvoering, niet omdat
  een script geen latere bestanden vindt.

De goedgekeurde hulpmiddelenrelease omvat de uitgevoerde fasehulp en
`references/report-kit/contracts/record_contract.py`. Alleen deze meegeleverde
recordvalidator wordt uitgevoerd; nooit code uit een inzending. Gebruik de
vertrouwde Python-interpreter uit je lokale hulpmiddelenomgeving.

## Uitvoeren

Voer vanuit de skillmap uit en vervang de waarden tussen `<...>`:

```text
node scripts/stage-receipts.mjs freeze-first --packet <pakketmap> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <bewaarde-invoerhash> --baseline-freeze-sha256 <bewaarde-baselinehash> --reader-a-sha256 <bewaarde-eindhash-A> --reader-b-sha256 <bewaarde-eindhash-B> --coordinator <identiteit> --identity-observation "<hoe de afzonderlijke uitvoering is waargenomen>" --comparison-not-started --python <python-interpreter>
```

**Gelukt als:** de uitvoer `FIRST_SUBMISSIONS_FROZEN_BEFORE_COMPARISON` meldt.
Bewaar de teruggegeven `receipt.sha256` buiten het pakket vóór je met vergelijken
begint. Een ontvangstbewijs bevestigt bestanden en vastgelegde herkomst, niet
dat de bronlezing inhoudelijk volledig of juist is. Alle onafhankelijke reviews
en bestaande toelatingscontroles blijven vereist. De drie velden `publishable`,
`contentValidated` en `reviewValidated` blijven `false`.

De opdracht schrijft uitsluitend:

- `FIRST-SUBMISSIONS.json`: de checksums van beide eerste inzendingen en hun logs;
- `stage-receipts/first.json`: de oorspronkelijke ankers en beide fasebewijzen;
- `CUSTODY-FIRST.json`: de verwijzing met checksum naar dat ontvangstbewijs.

De oorspronkelijke inzendingen en logs blijven byte voor byte behouden. De
controle weigert ontbrekende of veranderde bestanden, ongeldige bronrecords en
niet-letterlijke contexten/supplementen. Volledige paginadekking en afzonderlijke
lezersidentiteiten zijn vereist; inhoudelijke beoordeling blijft afzonderlijk nodig.

Bij een fout of onderbreking mag je niet doorgaan met vergelijken. Een bestaande
bevriezing of een gedeeltelijk geschreven ontvangstbewijs wordt niet overschreven.
Bewaar het origineel, onderzoek de oorzaak en bereid zo nodig een nieuwe
pakketversie voor. Voer de lezingen niet achteraf opnieuw op als dezelfde eerste
inzending. Bewaar alle gegenereerde bewijzen privé bij het pakket.
