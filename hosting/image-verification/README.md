# Een runtime-image lokaal controleren

Deze beheerhulp bouwt en controleert een echte image met uitsluitend fictieve
gegevens. Zij hergebruikt de bestaande pakketmaker, Dockerfile-template en
HTTP-controles. Je geeft geen echte database mee. Zonder argumenten toont de
hulp alleen uitleg; zij installeert of repareert niets.

## Vereisten

- Een afzonderlijke Linux/amd64-testomgeving met Node 24 en Python 3.
- Een bestaande rootless Podman-installatie, UID/GID `1000:1000`, cgroup v2,
  werkende overlayopslag en ondersteuning voor de resourcegrenzen.
- Een afzonderlijk gecontroleerde officiële Node 24-patch voor `bookworm-slim`,
  vastgezet op de juiste SHA-256-digest. Herbeoordeel beveiligingsupdates vóór
  iedere vrijgave; een veranderlijke tag is onvoldoende.
- Voldoende ruimte voor eigen imageopslag en een nieuwe private uitvoermap.

De helper staat geen rootcontainer, privileged mode, hostnetwerk of onbeperkte
resources toe. Installatie en beheer van de testomgeving gebeuren afzonderlijk.
Zie de officiële [Podman-instructies](https://podman.io/docs/installation).

## Uitvoeren

Vanuit de codecheckout, als gebruiker met UID/GID 1000:

```sh
node hosting/image-verification/verify-image.mjs --help
node hosting/image-verification/verify-image.mjs --run \
  --node-image 'node:24.<minor>.<patch>-bookworm-slim@sha256:<geverifieerde-digest>' \
  --out /tmp/omnibus-iv-1
```

Vervang de imageplaceholders vóór uitvoering. De oudermap moet bestaan en de
uitvoermap moet nieuw zijn. Kies een kort pad: de helper begrenst de
Podman-runroot, inclusief `/container-run`, op 50 bytes.

Alleen de genoemde officiële base-image wordt opgehaald, met lege
registrycredentials en afzonderlijke lokale opslag. De daadwerkelijke build
gebruikt `--pull=never --network=none`. Er wordt niets geüpload of op Sevalla
ingericht. De eerste gebruikers-ID-omzetting van imagelagen kan enige tijd kosten;
containervoorbereiding is begrensd op vijf minuten. De runtime-start- en
shutdowncontroles blijven afzonderlijk begrensd.

## Wat wordt gecontroleerd?

- Platform, Node-versie, SQLite en UID/GID; root-eigendom en bytegelijkheid van
  het pakket, zonder schrijfrechten.
- Alle geëxporteerde imagelagen: alleen de bedoelde applicatiebestanden en
  nergens de bewust uitgesloten fictieve canarytekst.
- Een afzonderlijke alleen-lezen datamount: Linux moet een schrijvende open
  weigeren. Ontbrekende of ongeldige data en verkeerde pins moeten start weigeren.
- Zestien bestaande HTTP-controles via één dynamische IPv4-loopbackpoort.
- SIGTERM, afsluiten, opruimen van de eigen containers en bytegelijke
  synthetische data en instellingen na afloop.

Containers krijgen een alleen-lezen rootfs, geen capabilities,
`no-new-privileges`, 512 MiB, één CPU en maximaal 128 processen. Alleen de
HTTP-proef heeft rootless netwerk; de hostpoort bindt uitsluitend aan
`127.0.0.1`. Gebruik de bewust vervuilde testcontext nooit als productiecontext.

`result.json` begint met `passed: false`. Alleen volledige uitvoering met
geslaagde opruiming kan dat veranderen. Bewaar resultaat, commandologs,
`layers.log` en `image.docker.tar` privé, buiten Git. Elke run gebruikt een
uniek containerlabel. Er is geen globale prune; images blijven in de eigen
opslag staan. Bij harde uitval moet de operator uitsluitend deze run inspecteren
en opruimen, met de opslagpaden uit de private logs.

## Snelle tests zonder container

```sh
node --test --test-concurrency=1 --test-timeout=60000 hosting/image-verification/verify-image.test.mjs
python3 hosting/image-verification/inspect-layers.test.py
```

Deze tests toetsen de helpers en de aansluiting van een
[ontvangen back-up](../data-transfer/README.md) op het pakket. Zij vervangen
geen echte imagebuild of mountproef.

Een lokale imageproef bewijst geen bronrechten, kwetsbaarheidsvrijheid of werking
op Sevalla. De [eerste diskvulling](../first-start/README.md), providerrechten,
TLS/probes en herstelproef blijven aparte stappen van de
[demo-vrijgavechecklist](../../docs/demo-release-checklist.md).
