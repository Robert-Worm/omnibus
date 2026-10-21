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

Deze hulp is voor de beheerder, op de eigen computer. Hij controleert een gesloten SQLite-back-up. Hij vergelijkt die met hashes (controlegetallen) die je vooraf vertrouwt, en met het bijpassende runtimepakket.

De hulp doet bewust weinig. Hij stuurt niets over het netwerk, schrijft geen actieve instellingen en start de app niet. Gebruik hem pas als de beheerder de overdracht heeft toegestaan.

### Eerst vastleggen

- **Maak een gesloten back-up** met de bestaande [back-uproute](../../docs/beheer/storingen-en-herstel.md).
- **Leg vier dingen apart vast:** de SHA-256 van de afgeronde back-up, de SHA-256 van het bijpassende `runtime-package.json`, de release en de publicatie. Neem een hash niet over uit dezelfde map waarin de back-up binnenkwam. Zo'n hash is geen onafhankelijk bewijs van herkomst.
- **Gebruik aparte mappen** voor afzender, pakket en ontvanger. Alleen de operator beheert ze. De bovenliggende map van de ontvanger moet al bestaan en buiten elke webroot liggen.
- **Controleer vooraf:** genoeg vrije ruimte, de juiste rechten, en dat niemand naar de invoer schrijft. Gebruik geen links, junctions, hardlinks naar de bron of netwerkpaden.

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

Elk van de vier hashes bestaat uit 64 tekens: cijfers en kleine letters a tot f. De uitvoermap moet nieuw zijn. Bestaande bestanden worden nooit vervangen.

Zo werkt de hulp, stap voor stap:

1. Hij controleert de hashes en het pakket.
2. Hij kopieert de back-up naar `.catalogue.partial`.
3. Hij voert de bestaande volledige databasecontrole uit en controleert de hashes opnieuw.
4. Pas dan maakt hij `catalogue.sqlite` aan, via een nieuwe lokale hardlink. De naam met *partial* verdwijnt.

Het bestandssysteem moet hardlinks ondersteunen. Lukt dat niet, dan valt de hulp niet terug op overschrijven.

**Wanneer is het gelukt?** Alleen bij afsluitcode 0, met `VERIFIED_LOCAL_RECEIPT` en de verwachte identiteiten. Dan heb je een kandidaat voor de aparte startcontrole. Een geslaagde controle is geen goedkeuring van de inhoud. Houd de uitvoer privé.

**Ging er iets mis?** Bron, pakket en bestaande doelen blijven dan staan. Nieuwe partials blijven bewaard, zodat je ze kunt bekijken; start ze niet. Probeer opnieuw met een nieuwe map. Vervang nooit een verwachte hash door de hash die je ontving.

### Grenzen en tests

Wat deze hulp níet doet:

- Hij is geen systeem voor transport, versleuteling of ondertekening.
- Hij garandeert niet dat alles bewaard blijft bij stroomuitval.
- Hij beschermt niet tegen een aanvaller die tegelijk dezelfde schrijfrechten heeft.
- Ontbrekende SQLite-sidecars (hulpbestanden naast de database) bewijzen niet dat niemand schrijft.

Rechten, het ontvangstkanaal en de bewaarplaats van back-ups blijven de verantwoordelijkheid van de beheerder.

```sh
node --test --test-concurrency=1 --test-timeout=120000 hosting/data-transfer/receive-local-backup.test.mjs
```

De tests gebruiken alleen fictieve gegevens en tijdelijke mappen. De [imagecontrole](../image-verification/README.md) test ook of een ontvangen fictieve back-up aansluit op de start van het pakket. Voor een echte server blijft de [eerste-startcontrole](../first-start/README.md) apart nodig.

</details>

## Samengevat

Vier vooraf vastgelegde controlegetallen, een kopie onder een tijdelijke naam, een volledige controle, en pas daarna de echte naam. Bij een fout blijft alles onaangeroerd.

## Volgende stap

Lees hoe de [eerste start](../first-start/README.md) op de server gaat.

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Routekaart](../../docs/routekaart.md)
