# Back-up en herstel

<!-- paginatype: taak -->

> **In het kort:** wat je bewaart bij een storing, hoe je een back-up maakt en hoe je herstelt naar een nieuw bestand. Online kun je opnieuw bouwen, of een eerder gebouwde image gebruiken als die vooraf is bewaard en de host die kan starten.

## Bij een storing, in het kort

1. **Leg vast wat er gebeurde:** tijdstip, codeversie, foutmelding en de request-ID. Deel geen onderzoeksinhoud, databasepaden of projecttekst.
2. **Ga terug naar de laatste werkende combinatie** van pakket, database en instellingen. Wijzig nooit een database terwijl hij in gebruik is.
3. **Herstel altijd naar een nieuw bestand.** Controleer en test het herstel, en schakel pas daarna bewust om.

## Stap voor stap: back-up en herstel

Voer de opdrachten uit vanuit de map van de repository, met Node 24 en je eigen bestanden. Vul de plaatshouders tussen `< >` zelf in. Pakket, database, instellingen en bewijs blijven buiten Git.

### 1. Leg de werkende combinatie vast

Noteer codeversie, Node-versie, pakket, release en publicatie. Maak een nieuwe, afgeschermde map buiten het pakket. Laat de database en server die draaien met rust.

### 2. Maak de back-up

Kopieer een database die open is nooit met een gewone bestandskopie: die kan half zijn. Gebruik:

```text
npm run data:runtime-backup -- --from <bron.sqlite> --to "<nieuwe-map>/backup.sqlite" --release <releasehash> --publication <publicatiehash>
```

De opdracht controleert eerst of de database heel is, of alle verwijzingen kloppen en of de bronnen en controlegetallen overeenkomen. Bestaat het doelbestand al, of staan er nog hulpbestanden van SQLite (`-wal`, `-shm`, `-journal`), dan stopt hij. Gebruik een map die alleen jij beheert.

### 3. Bewaar het controlegetal

Bewaar het controlegetal van de back-up apart, bijvoorbeeld in PowerShell met `Get-FileHash -Algorithm SHA256 -LiteralPath <backup.sqlite>` of op macOS/Linux met `shasum -a 256 <backup.sqlite>`. Zet back-up en pakket op een andere, beschermde plek. De opdracht versleutelt en uploadt niets; een back-up op dezelfde schijf beschermt niet tegen schijfverlies.

### 4. Herstel naar een nieuw bestand

Controleer eerst het controlegetal van de back-up tegen wat je bewaarde. Klopt het niet, gebruik de back-up dan niet; reken nooit een nieuw verwacht getal uit. Herstel en controleer daarna:

```text
npm run data:runtime-backup -- --from <backup.sqlite> --to "<nieuwe-herstelmap>/restored.sqlite" --release <releasehash> --publication <publicatiehash>
npm run data:check-runtime -- --database "<nieuwe-herstelmap>/restored.sqlite" --release <releasehash> --publication <publicatiehash>
```

Vergelijk release, publicatie, code, aantallen en de controle van de bronnen. Het bestand zelf kan er na herstel iets anders uitzien; de bronnen moeten gelijk zijn. Een geslaagde controle is geen nieuwe inhoudelijke beoordeling.

**Gelukt als:** `data:check-runtime` slaagt voor de herstelde database.

### 5. Test het herstel

Start het bijbehorende pakket met alleen deze herstelde database, op een vrije poort (bijvoorbeeld 4353); zie het [runtimepakket](runtime-pakket.md). Controleer: de gezondheid, een bron openen met markering, een fictieve selectie, een vraagkoppeling, een project bewaren en openen, en de Excel-export. Stop daarna alleen deze proefserver.

### 6. Schakel bewust om

Vervang pas na de test de hele combinatie van pakket en instellingen. Mislukt het, dan is de vorige combinatie je terugweg. Verander nooit een database die in gebruik is.

## Wat je doet per storing

Elke situatie heeft dezelfde kaart. Wat je in elk geval vastlegt, staat bij [wat je vastlegt bij een fout](#wat-je-vastlegt-bij-een-fout).

### De server start niet, of met een verkeerde versie

- **Eerst doen:** laat de werkende versie staan. Vergelijk pakket, instellingen en controlegetallen met wat je bewaarde.
- **Herstellen:** ga pas weer verder als pakket en databasecontrole samen slagen, en een korte proef slaagt.

### Code 500 bij het openen van een bron

- **Eerst doen:** noteer tijd en request-ID; kijk in de foutuitvoer en controleer de database. Zet geen bron- of projecttekst in je verslag.
- **Herstellen:** ga pas weer verder als de oorzaak is opgelost of de vorige combinatie terug is, en de route getest is.

### De database is beschadigd of weg

- **Eerst doen:** bewaar wat je vond afgeschermd. Herstel de gecontroleerde back-up naar een nieuwe map. Repareer of overschrijf het actieve bestand niet.
- **Herstellen:** ga pas weer verder als controlegetallen, verwijzingen en de gebruikersproef kloppen.

### Onverwacht veel verkeer of kosten (online)

- **Eerst doen:** bekijk bij de hostingpartij verzoeken, statuscodes en verbruik. Bij misbruik: openbare toegang beperken. Niet zomaar opschalen.
- **Herstellen:** ga pas weer verder als oorzaak, grenzen en kosten gecontroleerd zijn en de beheerder weer toegang geeft.

### Verkeerde inhoud openbaar of een gegevenslek (online)

- **Eerst doen:** beperk de toegang. Alleen de beheerder, Robert Worm, heeft toegang tot Sliplane en kan de site offline halen; waarschuw hem. Laat rechten, cache en logs onderzoeken; bewaar het bewijs afgeschermd.
- **Herstellen:** ga pas weer verder als alleen toegestane inhoud bereikbaar is en een onafhankelijke beoordeling klaar is.

Bij de container-route is er geen aparte schijf: zie [online terug naar de vorige werkende versie](#online-terug-naar-de-vorige-werkende-versie). Let op bij een route met een aparte schijf. Terugzetten bij de hostingpartij herstelt de schijf niet, en het terugzetten van de schijf haalt ook nieuwere bestanden weg. Kies daarom altijd bewust de hele combinatie van code, database en controlegetallen.

## Wat je vastlegt bij een fout

Leg dit vast zonder onderzoeksinhoud.

- **Bewaar:** het tijdstip, de codeversie (commit), de controlegetallen van release en publicatie, de foutcode en de `X-Request-ID`. Bij een geweigerde bronaanvraag staat die in de foutmelding als **Verzoekreferentie**. De client toont alleen een ID in het vaste UUIDv4-formaat van de server; ontbrekende of afwijkende waarden blijven weg. De server maakt die ID zelf; een ID die iemand meestuurt, wordt niet vertrouwd.
- **Deel nooit** in een openbaar verslag: databasepaden, zoekopdrachten, ingeleverde pakketten, projecttekst, cookies, headers of volledige adressen.
- **Foutmeldingen van de server:** bij een onverwachte fout antwoordt de server met code 500. Hij schrijft dan één regel naar de foutuitvoer, met `event`, `requestId`, `status` en `time`. Ook een verkeerd controlegetal of een wijziging tijdens het lezen van een content-batch geeft deze fout. De inhoud wordt dan niet verstuurd. Er is geen gewoon toegangslogboek. Sommige fouten heel vroeg in een verzoek komen niet in die uitvoer; een ontbrekende regel bewijst dus niet dat alles goed ging.
- **Start de server niet?** Hij toont met `Failed check` welke controle faalde, volgens de tabel hieronder. Voeg bij het zoeken geen volledige lijst van omgevingsvariabelen, headers of databaseinhoud toe.
- **`GET /api/v1/health`** zegt alleen dat de server antwoordt. Of de database heel is, controleer je met de databasecontrole in [stap 4](#4-herstel-naar-een-nieuw-bestand).

## Het logboek van de online versie

Open bij [Sliplane](https://docs.sliplane.io/services/logging/) de dienst van Omnibus. Daar zie je:

- **Runtime-logs:** wat de server schrijft terwijl hij draait.
- **Build-logs:** wat er gebeurde bij het bouwen van de image.
- **Service events:** of een uitrol lukte of mislukte, en of de gezondheidscontrole faalde.

Je kunt filteren op tijd en zoeken op tekst. Sliplane bewaart hooguit 15.000 regels van de laatste 7 dagen.

Daarnaast controleert GitHub elk kwartier of de online versie gezond is (`.github/workflows/gezondheid.yml`). Na drie mislukte pogingen komt er een issue met het label `storing`, en GitHub mailt je. Dat issue sluit vanzelf zodra de site weer gezond is. Handmatig controleren: `node .github/scripts/gezondheid.mjs`.

| Regel in de runtime-log | Betekenis | Wat je doet |
| --- | --- | --- |
| `Omnibus packaged read-only web runtime: https://…` | De server is gestart | Niets |
| `Runtime start refused. Failed check: …` | De server weigerde te starten bij de genoemde controle | Zie de controletabel hieronder en [de server start niet](#de-server-start-niet-of-met-een-verkeerde-versie) |
| `{"event":"catalogue_request_failed","requestId":"…","status":500,"time":"…"}` | Eén verzoek liep onverwacht mis | Zoek op de `requestId` die de gebruiker meldt; zie [code 500](#code-500-bij-het-openen-van-een-bron) |

**Wat er niet in staat:** geen adressen, zoekopdrachten, headers, cookies, databasepaden of projecttekst. De server maakt de `requestId` zelf; een ID die iemand meestuurt, komt niet in de log. Tests bewaken dit met een geheime testwaarde in de headers: `local-data/server-security.test.mjs` en `local-data/server-hosting.test.mjs`.

De startmeldingen van het runtimepakket, de lokale preview en de lokale catalogus gebruiken dezelfde vaste namen. Ze benoemen de controle, niet de oorspronkelijke fouttekst.

| `Failed check` | Controleer |
| --- | --- |
| `start-options` of `settings` | De startopties of het aparte instellingenbestand |
| `node-version` | Of Node 24 wordt gebruikt |
| `package-location` of `package-integrity` | De pakketmap, de afzonderlijke database en de controlegetallen van het pakket |
| `web-build` | Het webmanifest, het runtimecontract en de gekozen release en publicatie |
| `database-open` | Of de afzonderlijke database alleen-lezen geopend kan worden |
| `publication` | Of de vastgelegde publicatie in de database aanwezig en ongewijzigd is |
| `web-readiness` | De volledige startcontrole van webbestanden, publicatie, bronverwijzingen en databasestand |
| `listener` | Of de luisterpoort op het ingestelde adres beschikbaar is |
| `startup` | Een niet nader ingedeelde startfout; controleer de hele combinatie |

Welke versie draait er? Vraag `/api/v1/version` op, bijvoorbeeld met `curl https://omnibus.rijksmap.nl/api/v1/version`. `code.revision` is de commit die online staat. Zelf intypen of `curl` werkt. Klik je vanaf een andere site op een link naar `/api/…`, dan krijg je *Cross-site request not allowed*; dat is de beveiliging, geen storing.

## Online terug naar de vorige werkende versie

Bij de container-route zitten code, webbuild en database samen in de image. De huidige GitHub-route bouwt opnieuw. Dat vraagt toegang tot Docker Hub, npm en de database-zip op GitHub. Een vaste digest voorkomt dat de basisimage ongemerkt verandert; hij bewaart geen kopie en maakt bouwen niet onafhankelijk van die diensten.

### De basisimage staat vast

Beide stappen in `hosting/container/Dockerfile` gebruiken Node **24.21.0**, Debian Bookworm slim, met deze digest van de image-index voor meerdere platforms:

```text
node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
```

Gecontroleerd op **24 oktober 2026** via de [officiële Docker Hub-metadata](https://hub.docker.com/v2/repositories/library/node/tags/24.21.0-bookworm-slim) en de registry `registry-1.docker.io/v2/library/node`. De berekende hashes van index, platformmanifesten en configuraties kwamen overeen. De configuraties voor Linux amd64, arm64/v8 en ppc64le noemen alle `NODE_VERSION=24.21.0`. De amd64-manifestdigest is `sha256:51b1100cc2a83d370c6a60952e3f2989c8a43159d0e38586e090f3b3326efefd`; die verschilt van de gezamenlijke indexdigest.

Controleer bij een bewuste update opnieuw de [registry-index](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/):

```text
docker buildx imagetools inspect docker.io/library/node:24.21.0-bookworm-slim
```

Vergelijk de bovenste `Digest` met de pin en controleer de Node-versie in de platformconfiguratie. Pas beide bouwstappen samen aan en voer de tests uit. Een gewijzigde tag is geen toestemming om de pin te vervangen. Volgens [Docker](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions) blijft een digest vast; daardoor moet je ook beveiligingsupdates bewust beoordelen en verwerken.

### Herstellen door opnieuw te bouwen

1. **Zoek de foute commit.** Vergelijk `code.revision` uit `/api/v1/version` met `git log --oneline`. In de service events zie je welke uitrol het laatst lukte.
2. **Zet hem terug** met `git revert --no-edit <commit>` en push naar `main`. Sliplane bouwt en rolt dan automatisch uit. Mislukt het bouwen, dan blijft de huidige versie draaien.
3. **Volg de uitrol** in de service events, of op GitHub onder `Deployments`, tot die gelukt is.
4. **Controleer de versie** vanuit een schone checkout van de nieuwe revert-commit. Gebruik dezelfde Node-versie en lockfile als de container. Neem exact de database, releasehash en publicatiehash van de herstelde container over in een afzonderlijk instellingenbestand. Gebruik niet zomaar de huidige lokale database.

   Kies een nieuwe, nog niet bestaande uitvoermap. Vul beide plaatshouders zelf in; gebruik voor een volgende controle opnieuw een nieuwe map.

   ```text
   npm run build:runtime -- --settings <herstelinstellingen.json> --out <nieuwe-controlemap>
   node scripts/check-web-version.mjs --url https://omnibus.rijksmap.nl --web-root <nieuwe-controlemap>
   ```

*Gelukt als:* je `MATCH` ziet en `code.revision` de **nieuwe revert-commit** is, niet de oude commit waarvan de inhoud terugkomt. Controleer ook `/api/v1/ready` en open een bron. Alleen een geslaagde gezondheidscontrole bewijst niet dat de juiste combinatie draait.

`build:runtime` is hetzelfde bouwdoel als in de container. De gewone opdracht `build` maakt een lokale preview; die is niet geschikt voor deze versievergelijking.

**Geoefend op 24 oktober 2026** met een onschuldige documentatiecommit:

| Stap | Gepusht | Online | Duur |
| --- | --- | --- | --- |
| Terugzetten (`3b1916c`) | 14:40:10 | 14:40:44 | 34 seconden |
| Herstellen (`686651b`) | 14:42:14 | 14:42:51 | 37 seconden |

Na elke stap was `code.revision` de verwachte commit, gaf de gezondheidscontrole 200 en was de database ongewijzigd. Tijden in UTC. Deze tijden bewijzen niet dat herstel bij uitval van een externe dienst lukt. `check-web-version` is bij deze oefening niet gedraaid: de controle is gedaan met `/api/v1/version`.

Gebruik `git revert`, niet `git reset`: zo blijft de foute commit in de geschiedenis staan en kun je later uitzoeken wat er misging.

### Als opnieuw bouwen mislukt

1. **Bewaar de foutmelding en de bedoelde commit.** Kijk in de build-logs welke stap faalt: basisimage ophalen, `npm ci`, database downloaden of een controle. Deel geen geheimen of databasepaden.
2. **Controleer wat nog draait.** Volgens [Sliplanes uitleg over een mislukte uitrol](https://docs.sliplane.io/services/deploying-a-service/#what-happens-if-a-new-deploy-fails) blijft de bestaande uitrol draaien als de build mislukt. Dat kan nog steeds de foute versie zijn. Controleer `/api/v1/version` en `/api/v1/ready`. Beperk bij onveilige inhoud de toegang; zie de storingskaart hierboven.
3. **Gebruik alleen een al bewaarde, gecontroleerde image als terugweg.** De lokale route staat hieronder. Voor Sliplane gelden daarnaast de voorwaarden onder [een bewaarde image bij Sliplane](#een-bewaarde-image-bij-sliplane).
4. **Is die image niet beschikbaar?** Dan is herstel zonder bouwen niet beschikbaar. Laat de huidige dienst staan voor zover dat veilig is en meld de blokkade aan de beheerder. Probeer de revert-build pas opnieuw als de externe dienst hersteld is. Omzeil geen checksum, databasecontrole of lockfile; vervangen door `latest` lost het herstelprobleem niet op.

### Een gebouwde image bewaren en lokaal terugzetten

Deze Docker-route vereist vooraf een geteste, volledige Omnibus-image op een computer met Docker en hetzelfde Linux-platform als het hersteldoel. Alleen een codecommit, de Node-basisimage of een databaseback-up is onvoldoende. De onderstaande opdrachten zijn een handleiding; hiermee is geen archief van de online versie gemaakt of herstel geoefend. Heeft een ingevuld pad spaties? Zet dat pad tussen dubbele aanhalingstekens.

1. **Bewaar de werkende image vóór een volgende uitrol.** Leg de volledige image-ID, het platform, de oorspronkelijke commit en het antwoord van `/api/v1/version` vast. Gebruik daarna de image-ID uit de eerste opdracht, niet een veranderlijke tag. Kies een nieuw archiefpad:

   ```text
   docker image inspect --format '{{.Id}} {{.Os}}/{{.Architecture}}' <werkende-image>
   docker image save --output <nieuw-imagearchief.tar> <image-id>
   ```

   [Docker save](https://docs.docker.com/reference/cli/docker/image/save/) bewaart de imagelagen. Bewaar het archief en zijn SHA-256 apart op een beschermde plek, zoals in stap 3 van het databaseherstel. Dit archief bevat ook de database; het blijft buiten Git en openbare uploads. Bewaar instellingen apart zonder geheimen openbaar te maken. Een image-ID, registrydigest en archiefhash zijn verschillende controlegetallen.

2. **Controleer het archief vóór gebruik.** Vergelijk SHA-256 met het vooraf bewaarde getal. Stop bij verschil of ontbrekend bewijs. Laad alleen het gecontroleerde archief en controleer de oorspronkelijke image-ID en het platform:

   ```text
   docker image load --input <nieuw-imagearchief.tar>
   docker image inspect --format '{{.Id}} {{.Os}}/{{.Architecture}}' <image-id>
   ```

   [Docker load](https://docs.docker.com/reference/cli/docker/image/load/) herstelt de image zonder nieuwe build. Voor deze lokale route zijn Docker Hub, npm en de GitHub-release niet nodig.

3. **Haal de oorspronkelijke webbuild uit de image voor de controle.** Kies een unieke containernaam en een nog niet bestaande uitvoermap met een bestaande bovenliggende map. De container wordt [aangemaakt zonder te starten](https://docs.docker.com/reference/cli/docker/container/create/); [Docker cp](https://docs.docker.com/reference/cli/docker/container/cp/) leest ook uit een gestopte container:

   ```text
   docker create --pull=never --network=none --name <controlecontainer> <image-id>
   docker cp <controlecontainer>:/app/omnibus-runtime/database-build <bewaarde-webbuild>
   docker rm <controlecontainer>
   ```

4. **Start alleen een lokale proef.** Kies een vrije lokale poort en vul die op beide plaatsen in. [De optie `--pull=never`](https://docs.docker.com/reference/cli/docker/container/run/#pull) weigert een ontbrekende image. Koppel geen bestaande database of volume aan:

   ```text
   docker run --rm --pull=never --read-only --cap-drop=ALL --security-opt=no-new-privileges -p 127.0.0.1:<vrije-poort>:8080 -e PUBLIC_ORIGIN=http://127.0.0.1:<vrije-poort> <image-id>
   ```

   Controleer in een tweede terminal, vanuit de bijbehorende codecheckout met Node 24:

   ```text
   node scripts/check-web-version.mjs --url http://127.0.0.1:<vrije-poort> --web-root <bewaarde-webbuild>
   ```

   *Gelukt als:* `MATCH`, de **oorspronkelijke commit** uit het bewaarde versiebewijs, dezelfde release en publicatie, `/api/v1/ready` geslaagd en de gebruikersproef uit stap 5 geslaagd. Er is hier geen nieuwe revert-commit. Een ontbrekende codeversie is geen bevestiging. Stop daarna de proef met Ctrl+C. Dit schakelt de online dienst niet om.

### Een bewaarde image bij Sliplane

De officiële documentatie is gecontroleerd op 24 oktober 2026. [Restart](https://docs.sliplane.io/services/service-settings/#restart-or-redeploy) herstart de huidige container; dat kiest geen eerdere image. Voor de huidige GitHub-route beschrijft Sliplane geen herstel uit een lokaal tar-archief of gegarandeerd bewaarde vorige image.

Sliplane ondersteunt wel [uitrollen vanuit een OCI-registry](https://docs.sliplane.io/services/deploying-a-service/#deploy-from-a-registry). Daarvoor moet de volledige vorige Omnibus-image **vooraf** beschikbaar zijn in een bereikbare, goedgekeurde registry. Gebruik een unieke releasetag die niet wordt overschreven en leg de bijbehorende digest vast. De documentatie noemt een image-adres met tag; zij bevestigt geen digestveld. Controleer daarom vooraf dat de tag nog bij de bewaarde digest hoort en vergelijk na uitrol met de webbuild uit die image.

Een bestaande GitHub-dienst kan [niet rechtstreeks van bron wisselen](https://docs.sliplane.io/services/service-settings/#settings); Sliplane verwijst hiervoor naar `Deploy Copy`. Een aparte dienst, instellingen en het omschakelen van het adres vragen dus voorbereiding en een bewuste beheerderskeuze. Ook met een bewaarde image blijft de registry nodig. Dit is geen herstelroute bij uitval van diezelfde registry.

**Huidige grens:** er is voor deze handleiding geen vooraf bewaarde Omnibus-image of ingerichte registry-route aangetoond. Er is niets gepubliceerd, omgeschakeld of live hersteld. Totdat de beheerder die route apart laat inrichten en oefenen, blijft online herstel afhankelijk van opnieuw bouwen. Als de beheerder dat voldoende vindt, moet het besluit in [#215](https://github.com/Robert-Worm/omnibus/issues/215) uitdrukkelijk noemen dat herstel kan wachten op Docker Hub, npm of GitHub. Deze handleiding neemt dat besluit niet namens de beheerder.

## De terugweg lokaal oefenen

Een bestaande test oefent het wisselen tussen twee fictieve versies:

```text
node --test --test-concurrency=1 --test-timeout=120000 scripts/hosting-start-integration.test.mjs scripts/start-hosting-options.test.mjs scripts/package-runtime.test.mjs
```

De test start versie A, daarna versie B, en probeert verkeerde combinaties van pakket, database en controlegetallen; die moeten weigeren voordat de server luistert. Daarna start hij versie A opnieuw. Na afloop is alles nog precies zoals het was. Dit bewijst dat de terugweg werkt met fictieve bestanden; het is geen echte wissel bij de hostingpartij.

## Goed om te weten

- Een back-up van de database bevat geen projecten van gebruikers. Die bewaren gebruikers zelf met **Bewaar project**.
- Een gewone bestandskopie van een geopende database is niet betrouwbaar. Gebruik altijd `npm run data:runtime-backup`, naar een nieuwe map.
- Zet de back-up op een andere schijf of plek dan de database zelf, en bewaar het controlegetal (SHA-256) apart.

## Samengevat

- Noteer tijdstip, commit, hashes en request-ID; deel geen onderzoeksinhoud.
- Herstel altijd naar een nieuw bestand, nooit over de actieve database.
- Controleer na herstel met `npm run data:check-runtime`.

## Volgende stap

Gaat het om claims, releases of GitHub? Kijk dan in het [storingsdraaiboek](draaiboek.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
