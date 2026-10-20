# Een afzonderlijke database ontvangen en controleren

Deze lokale beheerhulp controleert een gesloten SQLite-back-up tegen vooraf
vertrouwde hashes en het bijpassende runtimepakket. De hulp doet geen
netwerkoverdracht, schrijft geen actieve instellingen en start de app niet.
Gebruik haar pas nadat de beheerder de overdracht heeft toegestaan.

## Eerst vastleggen

- Maak een gesloten back-up met de bestaande
  [back-uproute](../../docs/beheer/storingen-en-herstel.md).
- Leg de SHA-256 van de afgeronde back-up, de SHA-256 van het bijpassende
  `runtime-package.json`, de release en de publicatie afzonderlijk vast.
  Een hash uit dezelfde onbewezen inbox is geen onafhankelijk herkomstbewijs.
- Gebruik aparte lokale afzender-, pakket- en ontvangermappen, exclusief beheerd
  door de operator. De ontvangende oudermap moet bestaan en buiten alle webroots
  liggen. Controleer vrije ruimte, rechten en dat niemand naar de invoer schrijft.
  Geen links, junctions, hardlinks naar de bron of netwerkpaden.

## Ontvangen

```sh
node hosting/data-transfer/receive-local-backup.mjs \
  --from '<afzendermap>/backup.sqlite' \
  --package '<geverifieerd-runtimepakket>' \
  --out '<ontvangerouder>/nieuwe-release' \
  --backup-sha256 '<vertrouwde-backup-hash>' \
  --package-sha256 '<vertrouwde-manifest-hash>' \
  --release '<release-hash>' \
  --publication '<publicatie-hash>'
```

Alle vier hashes moeten 64 kleine-letter-hextekens bevatten. De uitvoermap moet
nieuw zijn. Bestaande bestanden worden niet vervangen.

De hulp controleert de hashes en het pakket, kopieert naar `.catalogue.partial`,
voert de bestaande volledige databasecontrole uit en controleert de hashes
opnieuw. Pas daarna verschijnt `catalogue.sqlite` via een exclusief aangemaakte
lokale hardlink; de partial-naam wordt verwijderd. Het bestandssysteem moet
hardlinks ondersteunen. Er is geen zwakkere terugval naar overschrijven.

Alleen afsluitcode 0 met `VERIFIED_LOCAL_RECEIPT` en de verwachte identiteiten
levert een kandidaat op voor de afzonderlijke startcontrole. Een match verleent
geen inhoudelijke goedkeuring. Houd de uitvoer privé.

Bij een fout blijven bron, pakket en bestaande doelen behouden. Nieuwe partials
blijven beschikbaar voor inspectie; start ze niet. Gebruik voor een nieuwe poging
een nieuwe map en vervang nooit een verwachte hash door de ontvangen hash.

## Grenzen en tests

Dit is geen transport-, encryptie- of ondertekeningssysteem. Het garandeert geen
duurzaamheid bij stroomuitval en beschermt niet tegen een gelijktijdige aanvaller
met dezelfde schrijfrechten. Afwezigheid van SQLite-sidecars bewijst niet dat
niemand schrijft. Rechten, ontvangstkanaal en back-upbewaarplaats blijven
beheerdersverantwoordelijkheden.

```sh
node --test --test-concurrency=1 --test-timeout=120000 hosting/data-transfer/receive-local-backup.test.mjs
```

De tests gebruiken alleen fictieve gegevens en tijdelijke mappen. De
[imagecontrole](../image-verification/README.md) test ook de aansluiting van een
ontvangen synthetische back-up op de pakketstart. Voor een echte host blijft de
[eerste-startcontrole](../first-start/README.md) apart nodig.
