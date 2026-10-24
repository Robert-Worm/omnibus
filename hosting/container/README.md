# Online zetten in een container (`hosting/container/`)

> **In het kort:** één Dockerfile die Omnibus met de openbare database bouwt als één image. Zo draait de online versie als één app bij een containerhost, zonder aparte databasedienst of schijf. Gekozen host: Sliplane (vaste prijs, verkeer inbegrepen). Draait sinds 21 oktober 2026 op [omnibus.sliplane.app](https://omnibus.sliplane.app).

## Hoe werkt het?

1. **Bouwen.** De host haalt de code op uit deze openbare repository en bouwt met `hosting/container/Dockerfile`.
2. **Database ophalen.** Tijdens het bouwen haalt `scripts/fetch-release-database.mjs` de database-zip uit de GitHub-release, controleert het controlegetal van de zip en van elk bestand erin, en pakt hem uit.
3. **Controleren en verpakken.** De database wordt gecontroleerd (`VERIFIED_RUNTIME_DATABASE`), de app gebouwd en verpakt als runtimepakket.
4. **Starten.** De image start als gewone gebruiker (UID 1000), met alle bestanden alleen-lezen, in openbare alleen-lezen modus.

## Op je eigen computer draaien

Heb je [Docker](https://www.docker.com/products/docker-desktop/)? Dan heb je verder niets nodig, ook geen kopie van de code:

```text
docker build -t omnibus -f hosting/container/Dockerfile https://github.com/Robert-Worm/omnibus.git#main
docker run --rm -p 8080:8080 omnibus
```

Open daarna `http://localhost:8080`. Het bouwen duurt de eerste keer een paar minuten; daarna start Omnibus in een paar seconden. Wil je een andere poort, bijvoorbeeld 3000? Gebruik `-p 3000:8080 -e PUBLIC_ORIGIN=http://localhost:3000`.

Gewoon `http://` mag alleen voor `localhost` en `127.0.0.1`. Voor elk ander adres is `https://` verplicht.

## Instellingen bij de host

| Instelling | Waarde |
| --- | --- |
| Bron | `https://github.com/Robert-Worm/omnibus`, tak `main` |
| Bouwen | Dockerfile `hosting/container/Dockerfile`, context `.` |
| Omgevingsvariabele | `PUBLIC_ORIGIN` = het openbare adres van de app, bijvoorbeeld `https://omnibus.sliplane.app` (zonder `/` aan het eind) |
| Poort | `PORT`; standaard 8080 |
| Geheugen | De server gebruikt rond 200 MB bij normaal gebruik |
| Gezondheidscontrole | Pad `/api/v1/health` |
| Automatisch uitrollen | Aan: elke push naar `main` bouwt en rolt opnieuw uit (ongeveer een halve minuut) |

## Een nieuwe database online zetten

Pas `DATABASE_URL` en `DATABASE_SHA256` aan in de Dockerfile én in `scripts/database-release.mjs` (de installatieopdracht); een test bewaakt dat ze gelijk zijn. Push, laat de host opnieuw bouwen en controleer de online versie. Het controlegetal van de zip staat in `SHA256SUMS.txt` van de release-assistent.

## Controleren welke versie bezoekers krijgen

`/api/v1/health` zegt alleen dat de server reageert. `/api/v1/version` toont daarnaast het controlegetal van de webbestanden en, apart daarvan, de twee database-identiteiten. Deze kleine, alleen-lezen reactie bevat geen lokale paden, broninhoud of instellingen. Ze beschrijft de bestanden bij het starten; wijzig een draaiende image niet achteraf.

Vergelijk met de **precies verwachte build**, niet met een build voor een andere database of de lokale AI-koppeling:

```text
node scripts/check-web-version.mjs --url https://omnibus.sliplane.app --web-root runtime-build
```

`MATCH` betekent dat de webbestanden en database-identiteiten overeenkomen. `MISMATCH` of een ontbrekend versieantwoord is geen geslaagde uitrol, ook niet bij een groene gezondheidscontrole. De controle verandert niets aan de host of database. Controleer bij een afwijking de build- en startlogs van de host; een GitHub-status alleen bewijst niet waarom een uitrol achterblijft.

Een schone lokale Git-build voegt ook het commitnummer toe. In een container zonder Git kun je dat expliciet meegeven met het build-argument `OMNIBUS_CODE_REVISION` (volledige commit-hash). Bij Sliplane gebruikt de build anders het door de host geleverde [`SLIPLANE_COMMIT_HASH`](https://docs.sliplane.io/services/deploying-a-service/#environment-variables). De bestaande controle weigert ongeldige commitnummers. De server leest dit nummer uit de gebouwde bestanden, niet uit een later gewijzigde omgevingsvariabele.

Zonder een build-argument, of bij lokaal gewijzigde code, blijft het commitnummer onbekend. Het controlegetal van de webbestanden blijft dan wel beschikbaar. Dit is versieherkenning, geen cryptografisch ondertekend herkomstbewijs of vervanging van de tests.

## Goed om te weten

- **Links vanaf andere sites werken.** Wie op een link in een mail of zoekmachine klikt, krijgt de pagina. Andere sites kunnen de gegevens niet zelf opvragen en Omnibus niet in hun eigen pagina tonen; dat weigert de server.
- **De database zit in de image.** Dat kan omdat hij openbaar is; een private database hoort hier nooit in. Zie de [besluitenlijst](../../docs/beheer/besluiten.md).
- **Zonder Docker nabootsen** kan ook: voer de stappen uit de Dockerfile in dezelfde volgorde uit.

## Samengevat

Eén Dockerfile, één kleine app, geen aparte database of schijf. De database komt gecontroleerd uit de GitHub-release.

## Volgende stap

Wat er voor de online versie gepland is, staat in [pad A van de routekaart](../../docs/routekaart.md#pad-a--online-versie).

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
