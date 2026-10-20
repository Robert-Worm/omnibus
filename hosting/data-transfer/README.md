# Een database ontvangen en controleren (`hosting/data-transfer/`)

> **In het kort:** dit hulpmiddel controleert een database op de server tegen vooraf vastgelegde controlegetallen. Het verplaatst zelf niets en start Omnibus niet.

## Waar staat dit?

| Onderdeel | Status |
| --- | --- |
| Hulpmiddel om een ontvangen database te controleren | ✅ Klaar en getest met fictieve gegevens |
| De manier waarop de database naar de server gaat | ⬜ Nog niet gekozen; hangt af van de hostingpartij |

## Hoe werkt het?

1. **Vooraf vastleggen.** De beheerder legt vier controlegetallen (hashes) vast: van de database, van het runtimepakket, van de release en van de publicatie.
2. **Ontvangen.** Het hulpmiddel kopieert de database naar een nieuwe map, onder een tijdelijke naam.
3. **Controleren.** Het controleert de vier getallen en de hele database, en daarna de getallen nog een keer.
4. **Vrijgeven.** Pas als alles klopt, krijgt de database zijn echte naam. Je ziet dan `VERIFIED_LOCAL_RECEIPT`.

Klopt er iets niet, dan blijft alles staan zoals het was. Gebruik dan een nieuwe map voor een nieuwe poging, en pas nooit een controlegetal aan.

## Goed om te weten

- Een geslaagde controle zegt dat de database compleet en ongewijzigd is. Het is geen goedkeuring van de inhoud.
- Het hulpmiddel versleutelt of verstuurt niets. Hoe de database veilig naar de server gaat, regelt de beheerder apart.

## Technische details

<details><summary><b>Alle technische details en opdrachten</b></summary>

Deze lokale beheerhulp controleert een gesloten SQLite-back-up tegen vooraf vertrouwde hashes en het bijpassende runtimepakket. De hulp doet geen netwerkoverdracht, schrijft geen actieve instellingen en start de app niet. Gebruik haar pas nadat de beheerder de overdracht heeft toegestaan.

### Eerst vastleggen

- Maak een gesloten back-up met de bestaande [back-uproute](../../docs/beheer/storingen-en-herstel.md).
- Leg de SHA-256 van de afgeronde back-up, de SHA-256 van het bijpassende `runtime-package.json`, de release en de publicatie afzonderlijk vast. Een hash uit dezelfde onbewezen inbox is geen onafhankelijk herkomstbewijs.
- Gebruik aparte lokale afzender-, pakket- en ontvangermappen, exclusief beheerd door de operator. De ontvangende oudermap moet bestaan en buiten alle webroots liggen. Controleer vrije ruimte, rechten en dat niemand naar de invoer schrijft. Geen links, junctions, hardlinks naar de bron of netwerkpaden.

### Ontvangen

Deze opdracht is voor de Linux- of macOS-shell op de server. Op Windows zet je alle delen op één regel, zonder de `\` aan het eind.

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

Alle vier hashes moeten 64 kleine-letter-hextekens bevatten. De uitvoermap moet nieuw zijn. Bestaande bestanden worden niet vervangen.

De hulp controleert de hashes en het pakket, kopieert naar `.catalogue.partial`, voert de bestaande volledige databasecontrole uit en controleert de hashes opnieuw. Pas daarna verschijnt `catalogue.sqlite` via een exclusief aangemaakte lokale hardlink; de partial-naam wordt verwijderd. Het bestandssysteem moet hardlinks ondersteunen. Er is geen zwakkere terugval naar overschrijven.

Alleen afsluitcode 0 met `VERIFIED_LOCAL_RECEIPT` en de verwachte identiteiten levert een kandidaat op voor de afzonderlijke startcontrole. Een match verleent geen inhoudelijke goedkeuring. Houd de uitvoer privé.

Bij een fout blijven bron, pakket en bestaande doelen behouden. Nieuwe partials blijven beschikbaar voor inspectie; start ze niet. Gebruik voor een nieuwe poging een nieuwe map en vervang nooit een verwachte hash door de ontvangen hash.

### Grenzen en tests

Dit is geen transport-, encryptie- of ondertekeningssysteem. Het garandeert geen duurzaamheid bij stroomuitval en beschermt niet tegen een gelijktijdige aanvaller met dezelfde schrijfrechten. Afwezigheid van SQLite-sidecars bewijst niet dat niemand schrijft. Rechten, ontvangstkanaal en back-upbewaarplaats blijven beheerdersverantwoordelijkheden.

```sh
node --test --test-concurrency=1 --test-timeout=120000 hosting/data-transfer/receive-local-backup.test.mjs
```

De tests gebruiken alleen fictieve gegevens en tijdelijke mappen. De [imagecontrole](../image-verification/README.md) test ook de aansluiting van een ontvangen synthetische back-up op de pakketstart. Voor een echte host blijft de [eerste-startcontrole](../first-start/README.md) apart nodig.

</details>

## Samengevat

Vier vooraf vastgelegde controlegetallen, een kopie onder een tijdelijke naam, een volledige controle, en pas daarna de echte naam. Bij een fout blijft alles onaangeroerd.

## Volgende stap

Lees hoe de [eerste start](../first-start/README.md) op de server gaat.

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Routekaart](../../docs/routekaart.md)
