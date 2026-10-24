# De image lokaal controleren (`hosting/image-verification/`)

> **In het kort:** dit hulpmiddel bouwt de image op je eigen testcomputer en controleert hem, alleen met fictieve gegevens. Zo weet je dat de image klopt voordat hij online gaat.

> [!NOTE]
> **Stand:** dit hoort bij de uitgebreide route, met de database op een aparte schijf. Die ligt klaar voor een niet-openbare database. De proefversie online gebruikt de eenvoudigere [container-route](../container/README.md).

## Waar staat dit?

| Onderdeel | Status | Toelichting |
| --- | --- | --- |
| Hulpmiddel om de image te bouwen en te controleren | ✅ Klaar | Getest |
| Proef met een echte database | ➖ Niet van toepassing | Dit hulpmiddel gebruikt alleen fictieve gegevens |
| Werking bij de hostingpartij | ➖ Niet van toepassing | Hoort bij de [online versie](../container/README.md) |

## Wat wordt er gecontroleerd?

- **Dat de image klopt:** het juiste platform, de juiste Node-versie, en alleen de bedoelde bestanden.
- **Dat de image veilig draait:** zonder beheerrechten, met beperkte middelen, en zonder schrijfrechten op de database.
- **Dat Omnibus weigert te starten** bij ontbrekende of verkeerde gegevens.
- **Dat de webserver goed reageert:** zestien bestaande controles via het eigen netwerkadres van de computer.
- **Dat stoppen en opruimen goed gaan,** zonder dat de testgegevens veranderen.

## Wat heb je nodig?

Een aparte Linux-testcomputer met Node 24, Python 3 en Podman (zonder beheerrechten). De opdrachten zijn alleen voor Linux; op Windows of macOS werkt dit hulpmiddel niet.

## Technische details

<details><summary><b>Alle technische details en opdrachten</b></summary>

Met deze hulp bouwt de beheerder een echte image en controleert hem. Daarbij gebruikt hij alleen fictieve gegevens; je geeft geen echte database mee. De hulp gebruikt de bestaande pakketmaker, de Dockerfile-template en de bestaande HTTP-controles. Start je hem zonder argumenten, dan toont hij alleen uitleg. Hij installeert en repareert niets.

### Wat je nodig hebt

- Een aparte testomgeving met Linux/amd64, Node 24 en Python 3.
- Podman, al geïnstalleerd en zonder rootrechten (*rootless*). Verder: UID/GID `1000:1000`, cgroup v2, werkende overlay-opslag en ondersteuning voor grenzen aan geheugen, CPU en processen.
- Een officiële Node 24-image op `bookworm-slim`, apart gecontroleerd en vastgezet op de juiste SHA-256-digest. Kijk vóór elke vrijgave of er beveiligingsupdates zijn. Een tag die kan veranderen is niet genoeg.
- Genoeg ruimte voor eigen image-opslag en een nieuwe, privé uitvoermap.

De hulp weigert een container als root, de *privileged* modus, het netwerk van de host en onbegrensde middelen. Je installeert en beheert de testomgeving zelf, apart van deze hulp. Zie de officiële [Podman-instructies](https://podman.io/docs/installation).

### Uitvoeren

Vanuit je kopie van de code, als gebruiker met UID/GID 1000:

```bash
node hosting/image-verification/verify-image.mjs --help
node hosting/image-verification/verify-image.mjs --run \
  --node-image 'node:24.<minor>.<patch>-bookworm-slim@sha256:<geverifieerde-digest>' \
  --out /tmp/omnibus-iv-1
```

Vul de plaatshouders voor de image eerst in. De bovenliggende map moet bestaan; de uitvoermap moet nieuw zijn. Kies een kort pad: de hulp staat voor de Podman-runroot, inclusief `/container-run`, hooguit 50 bytes toe.

De hulp haalt alleen de genoemde officiële basis-image op. Dat gebeurt zonder inloggegevens voor de registry en met aparte lokale opslag. Het bouwen zelf gebruikt `--pull=never --network=none`. Er wordt niets geüpload en niets bij een hostingpartij ingericht.

De eerste keer kan het omzetten van gebruikers-ID's in de imagelagen even duren. Het voorbereiden van de container mag hooguit vijf minuten duren. Voor starten en afsluiten gelden aparte tijdsgrenzen.

### Wat wordt gecontroleerd?

- **De basis:** platform, Node-versie, SQLite en UID/GID. De pakketbestanden zijn van root, byte voor byte gelijk, en niet schrijfbaar.
- **Alle imagelagen:** er zitten alleen de bedoelde applicatiebestanden in. Een bewust weggelaten fictieve tekst (*canary*) mag nergens terugkomen.
- **Een aparte schijf met data, alleen-lezen:** Linux moet weigeren als iets wil schrijven. Ontbrekende of ongeldige data en verkeerde pins moeten de start tegenhouden.
- **Zestien bestaande HTTP-controles,** via één willekeurige IPv4-poort op de eigen computer.
- **Afsluiten:** SIGTERM, netjes stoppen, de eigen containers opruimen, en daarna fictieve data en instellingen die byte voor byte gelijk zijn gebleven.

Elke container krijgt een alleen-lezen bestandssysteem, geen *capabilities*, `no-new-privileges`, 512 MiB geheugen, één CPU en hooguit 128 processen. Alleen de HTTP-proef krijgt netwerk, zonder rootrechten; de poort luistert alleen op `127.0.0.1`. De testcontext is bewust vervuild. Gebruik hem dus nooit als echte context.

`result.json` begint met `passed: false`. Dat verandert alleen als alles is uitgevoerd én het opruimen lukte. Bewaar het resultaat, de logs van de opdrachten, `layers.log` en `image.docker.tar` privé, buiten Git.

Elke run krijgt een eigen label voor zijn containers. De hulp ruimt niet alles in één keer op (geen *prune*); images blijven in de eigen opslag staan. Valt de run hard uit? Dan bekijkt en ruimt de operator alleen deze run op, met de opslagpaden uit de privélogs.

### Snelle tests zonder container

```bash
node --test --test-concurrency=1 --test-timeout=60000 hosting/image-verification/verify-image.test.mjs
python3 hosting/image-verification/inspect-layers.test.py
```

Deze tests controleren de hulpmiddelen. Ze controleren ook of een [ontvangen back-up](../data-transfer/README.md) aansluit op het pakket. Ze vervangen geen echte imagebuild of proef met een schijf.

Een imageproef op je eigen computer bewijst niet dat je de bronnen mag gebruiken, dat er geen kwetsbaarheden zijn, of dat het bij een hostingpartij werkt. De [eerste vulling van de schijf](../first-start/README.md), de rechten bij de hostingpartij, TLS en probes en de herstelproef blijven aparte stappen bij de hostingpartij; zie [pad A van de routekaart](../../docs/routekaart.md#pad-a--online-versie).

</details>

## Samengevat

De image wordt lokaal gebouwd en uitgebreid gecontroleerd, alleen met fictieve gegevens. Dat bewijst dat de image technisch klopt, niet dat hij bij de hostingpartij werkt.

## Volgende stap

Lees hoe een database op de server wordt [ontvangen en gecontroleerd](../data-transfer/README.md).

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Begrippen](../../docs/begrippen.md) · [Routekaart](../../docs/routekaart.md)
