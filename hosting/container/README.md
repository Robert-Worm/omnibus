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

Pas `DATABASE_URL` en `DATABASE_SHA256` in de Dockerfile aan naar de nieuwe release, push, en laat de host opnieuw bouwen. Het controlegetal van de zip staat in `SHA256SUMS.txt` van de release-assistent.

## Goed om te weten

- **Links vanaf andere sites werken.** Wie op een link in een mail of zoekmachine klikt, krijgt de pagina. Andere sites kunnen de gegevens niet zelf opvragen en Omnibus niet in hun eigen pagina tonen; dat weigert de server.
- **De database zit in de image.** Dat kan omdat hij openbaar is; een private database hoort hier nooit in. Zie de [besluitenlijst](../../docs/beheer/besluiten.md).
- **Zonder Docker nabootsen** kan ook: voer de stappen uit de Dockerfile in dezelfde volgorde uit.

## Samengevat

Eén Dockerfile, één kleine app, geen aparte database of schijf. De database komt gecontroleerd uit de GitHub-release.

## Volgende stap

Zie de [checklist live demo](../../docs/beheer/live-demo-checklist.md) voor wat er vóór een openbare demo nog moet gebeuren.

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Routekaart](../../docs/routekaart.md)
