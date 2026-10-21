# Online bij Sevalla (`hosting/sevalla/`)

> **In het kort:** één Dockerfile die Omnibus met de openbare database bouwt als één image. Zo draait de online versie op één kleine app bij Sevalla, zonder aparte databasedienst of schijf.

## Hoe werkt het?

1. **Bouwen.** Sevalla haalt de code op uit deze openbare repository en bouwt met `hosting/sevalla/Dockerfile`.
2. **Database ophalen.** Tijdens het bouwen haalt `scripts/fetch-release-database.mjs` de database-zip uit de GitHub-release, controleert het controlegetal en de controlegetallen in de zip, en pakt hem uit.
3. **Controleren en verpakken.** De database wordt gecontroleerd (`VERIFIED_RUNTIME_DATABASE`), de app gebouwd en verpakt als runtimepakket.
4. **Starten.** De image start als gewone gebruiker (UID 1000), met alle bestanden alleen-lezen, in openbare alleen-lezen modus.

## Instellingen bij Sevalla

| Instelling | Waarde |
| --- | --- |
| Bron | *Public repository*: `https://github.com/Robert-Worm/omnibus`, tak `main` |
| Bouwen | Dockerfile, pad `hosting/sevalla/Dockerfile`, context `.` |
| Omgevingsvariabele | `PUBLIC_ORIGIN` = het openbare adres van de app, bijvoorbeeld `https://omnibus-xxxx.sevalla.app` (zonder `/` aan het eind) |
| Poort | Sevalla geeft `PORT` door; standaard 8080 |
| Grootte | H1 (0,3 CPU, 0,3 GB): de server gebruikt rond 200 MB bij normaal gebruik |
| Automatisch uitrollen | Uit, zodat je zelf bepaalt wanneer er gebouwd wordt (bouwen kost per minuut) |

## Een nieuwe database online zetten

Pas `DATABASE_URL` en `DATABASE_SHA256` in de Dockerfile aan naar de nieuwe release, push, en start bij Sevalla een nieuwe deployment. Het controlegetal van de zip staat in `SHA256SUMS.txt` van de release-assistent.

## Goed om te weten

- **De database zit in de image.** Dat kan omdat hij openbaar is; een private database hoort hier nooit in. Zie de [besluitenlijst](../../docs/beheer/besluiten.md).
- **Lokaal nabootsen** kan zonder Docker: voer de stappen uit de Dockerfile in dezelfde volgorde uit. Met Docker: `docker build -f hosting/sevalla/Dockerfile -t omnibus .` en `docker run -p 8080:8080 -e PORT=8080 -e PUBLIC_ORIGIN=https://localhost omnibus`.

## Samengevat

Eén Dockerfile, één kleine app, geen aparte database of schijf. De database komt gecontroleerd uit de GitHub-release.

## Volgende stap

Zie de [checklist live demo](../../docs/beheer/live-demo-checklist.md) voor wat er vóór een openbare demo nog moet gebeuren.

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Routekaart](../../docs/routekaart.md)
