# Back-up en herstel

<!-- paginatype: taak -->

> **In het kort:** wat je bewaart bij een storing, hoe je een back-up maakt en hoe je herstelt naar een nieuw bestand. Dit gaat vooral over je eigen computer. De proefversie online herstel je door de vorige werkende commit opnieuw uit te rollen.

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

- **Bewaar:** het tijdstip, de codeversie (commit), de controlegetallen van release en publicatie, de foutcode en de `X-Request-ID`. De server maakt die ID zelf; een ID die iemand meestuurt, wordt niet vertrouwd.
- **Deel nooit** in een openbaar verslag: databasepaden, zoekopdrachten, ingeleverde pakketten, projecttekst, cookies, headers of volledige adressen.
- **Foutmeldingen van de server:** bij een onverwachte fout antwoordt de server met code 500. Hij schrijft dan één regel naar de foutuitvoer, met `event`, `requestId`, `status` en `time`. Er is geen gewoon toegangslogboek. Sommige fouten heel vroeg in een verzoek komen niet in die uitvoer; een ontbrekende regel bewijst dus niet dat alles goed ging.
- **Start de server niet?** Hij toont dan een vaste, veilige uitleg zonder interne details. Controleer eerst de opties, de database, de publicatie en de webbuild. Voeg bij het zoeken geen volledige lijst van omgevingsvariabelen, headers of databaseinhoud toe.
- **`GET /api/v1/health`** zegt alleen dat de server antwoordt. Of de database heel is, controleer je met de databasecontrole in [stap 4](#4-herstel-naar-een-nieuw-bestand).

## Het logboek van de online versie

Open bij [Sliplane](https://docs.sliplane.io/services/logging/) de dienst van Omnibus. Daar zie je:

- **Runtime-logs:** wat de server schrijft terwijl hij draait.
- **Build-logs:** wat er gebeurde bij het bouwen van de image.
- **Service events:** of een uitrol lukte of mislukte, en of de gezondheidscontrole faalde.

Je kunt filteren op tijd en zoeken op tekst. Sliplane bewaart hooguit 15.000 regels van de laatste 7 dagen.

| Regel in de runtime-log | Betekenis | Wat je doet |
| --- | --- | --- |
| `Omnibus packaged read-only web runtime: https://…` | De server is gestart | Niets |
| `Runtime start refused. Check explicit start options, …` | De server weigerde te starten: opties, pakket of database klopt niet | Zie [de server start niet](#de-server-start-niet-of-met-een-verkeerde-versie) |
| `{"event":"catalogue_request_failed","requestId":"…","status":500,"time":"…"}` | Eén verzoek liep onverwacht mis | Zoek op de `requestId` die de gebruiker meldt; zie [code 500](#code-500-bij-het-openen-van-een-bron) |

**Wat er niet in staat:** geen adressen, zoekopdrachten, headers, cookies, databasepaden of projecttekst. De server maakt de `requestId` zelf; een ID die iemand meestuurt, komt niet in de log. Tests bewaken dit met een geheime testwaarde in de headers: `local-data/server-security.test.mjs` en `local-data/server-hosting.test.mjs`.

Welke versie draait er? Vraag `/api/v1/version` op, bijvoorbeeld met `curl https://omnibus.sliplane.app/api/v1/version`. `code.revision` is de commit die online staat. Zelf intypen of `curl` werkt. Klik je vanaf een andere site op een link naar `/api/…`, dan krijg je *Cross-site request not allowed*; dat is de beveiliging, geen storing.

## Online terug naar de vorige werkende versie

Bij de container-route zit de database in de image. Terug naar de vorige versie is dus: de code terugzetten en opnieuw laten bouwen.

1. **Zoek de foute commit.** Vergelijk `code.revision` uit `/api/v1/version` met `git log --oneline`. In de service events zie je welke uitrol het laatst lukte.
2. **Zet hem terug** met `git revert --no-edit <commit>` en push naar `main`. Sliplane bouwt en rolt dan automatisch uit. Mislukt het bouwen, dan blijft de huidige versie draaien.
3. **Volg de uitrol** in de service events, of op GitHub onder `Deployments`, tot die gelukt is.
4. **Controleer de versie** vanuit een schone checkout van de nieuwe revert-commit. Gebruik dezelfde Node-versie en lockfile als de container. Neem exact de database, releasehash en publicatiehash van de herstelde container over in een afzonderlijk instellingenbestand. Gebruik niet zomaar de huidige lokale database.

   Kies een nieuwe, nog niet bestaande uitvoermap. Vul beide plaatshouders zelf in; gebruik voor een volgende controle opnieuw een nieuwe map.

   ```text
   npm run build:runtime -- --settings <herstelinstellingen.json> --out <nieuwe-controlemap>
   node scripts/check-web-version.mjs --url https://omnibus.sliplane.app --web-root <nieuwe-controlemap>
   ```

*Gelukt als:* je `MATCH` ziet en `code.revision` de **nieuwe revert-commit** is, niet de oude commit waarvan de inhoud terugkomt. Controleer ook `/api/v1/ready` en open een bron. Alleen een geslaagde gezondheidscontrole bewijst niet dat de juiste combinatie draait.

`build:runtime` is hetzelfde bouwdoel als in de container. De gewone opdracht `build` maakt een lokale preview; die is niet geschikt voor deze versievergelijking.

**Geoefend op 24 oktober 2026** met een onschuldige documentatiecommit:

| Stap | Gepusht | Online | Duur |
| --- | --- | --- | --- |
| Terugzetten (`3b1916c`) | 14:40:10 | 14:40:44 | 34 seconden |
| Herstellen (`686651b`) | 14:42:14 | 14:42:51 | 37 seconden |

Na elke stap was `code.revision` de verwachte commit, gaf de gezondheidscontrole 200 en was de database ongewijzigd. Tijden in UTC. De bouw duurt kort omdat de database al in de image zit. `check-web-version` is bij deze oefening niet gedraaid: de controle is gedaan met `/api/v1/version`.

Gebruik `git revert`, niet `git reset`: zo blijft de foute commit in de geschiedenis staan en kun je later uitzoeken wat er misging.

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
