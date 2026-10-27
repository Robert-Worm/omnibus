# De volledige ontvangstketen vastleggen

Gebruik dit na de twee onafhankelijke eindreviews. Het hulpmiddel controleert
fasebewijzen en legt de ontvangen bestanden vast. Het schrijft geen beoordeling,
bevestigt geen inhoudelijke kwaliteit en laat geen gegevens toe tot een database.

## Vastgelegde uitvoering controleren

Alle acht [fases](stage-receipts.md) zijn afgerond tegen dezelfde
[reviewbasis](review-basis.md). Beide eindreviews noemen exact de zes targethashes,
de werkelijke reviewer en `APPROVE`, zonder openstaande issues. Een verklaring
van onafhankelijkheid vervangt de aparte lezingen en reviews niet.

De coördinator maakt een privé `attestation.json` op basis van waargenomen uitvoering:

- `packet_id`, `report_id` en `candidate`: gelijk aan de oorspronkelijke opdracht;
- `coordinator`: de werkelijke coördinator;
- `actual_agent_separation_verified`: alleen `true` na controle van de scheiding;
- `identity_verification_basis`: waarop die controle berust;
- `actors`: de acht fasenamen met de werkelijke gespreks-/agentidentiteit;
- `stage_end_hashes`: dezelfde fasenamen met hun afzonderlijk bewaarde eindhashes.

De praktische reviewer mag zowel concept- als eindreview uitvoeren. De auteur
en hersteller beoordelen hun eigen werk niet. Bronlezers, reconciliator en
bron-eindreviewer blijven gescheiden volgens de bestaande rolinstructies.
Bewaar de SHA-256 van deze verklaring buiten het pakket. Het hulpmiddel maakt
de verklaring niet zelf en kan daadwerkelijke onafhankelijkheid niet waarnemen.

## Ontvangst vastleggen

Voer vanuit de skillmap uit, met de gebruikelijke release-, invoer- en baselinehashes:

```text
node scripts/stage-receipts.mjs record-final --packet <pakketmap> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <invoerhash> --baseline-freeze-sha256 <baselinehash> --review-basis-sha256 <reviewbasishash> --first-receipt-sha256 <eerste-ontvangsthash> --attestation attestation.json --attestation-sha256 <verklaringshash>
```

**Gelukt als:** `FINAL_CUSTODY_RECORDED_NOT_APPROVED` verschijnt. Het hulpmiddel
schrijft `STAGES.json` als samenvatting van de bestaande fasebewijzen,
`stage-receipts/final.json` als afsluitend bewijs en `CUSTODY-FINAL.json` als
verwijzing daarnaar. Bronbestanden, reviews en eerdere bewijzen blijven ongewijzigd.
Bewaar de teruggegeven `receipt.sha256` afzonderlijk. Bestaande eindbewijzen
worden niet overschreven; bij een onderbreking blijven aanwezige bestanden behouden.

Bij ontvangst kan dezelfde skill opnieuw controleren, zonder nieuwe bewijzen te maken:

```text
node scripts/stage-receipts.mjs check-final --packet <pakketmap> --release-sha256 <manifesthash> --approval-sha256 <goedkeuringshash> --input-freeze-sha256 <invoerhash> --baseline-freeze-sha256 <baselinehash> --review-basis-sha256 <reviewbasishash> --first-receipt-sha256 <eerste-ontvangsthash> --final-receipt-sha256 <eindontvangsthash>
```

**Gelukt als:** `FINAL_CUSTODY_CHECKED_NOT_APPROVED` verschijnt. Gewijzigde inhoud,
verklaringen, fasebewijzen of verwijzingen blokkeren deze controle.

## Wat dit bewijs niet vervangt

`publishable`, `contentValidated` en `reviewValidated` blijven `false`.
Het ontvangstformaat heet `standalone-stage-custody-v1`; dit is nog geen
`PASS_FOR_PARENT_REVIEW`. De aansluiting van dit nieuwe formaat op de bestaande
inhoudelijke eindcontrole en toelatingscontrole volgt nog. Die controles blijven
verplicht; een groen ontvangstbewijs mag ze niet vervangen. Houd het pakket privé.
