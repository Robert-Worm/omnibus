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

- **Eerst doen:** beperk de toegang. Laat rechten, cache en logs onderzoeken; bewaar het bewijs afgeschermd.
- **Herstellen:** ga pas weer verder als alleen toegestane inhoud bereikbaar is en een onafhankelijke beoordeling klaar is.

Bij de container-route is er geen aparte schijf: zet de vorige commit van de Dockerfile terug en push. Let op bij een route met een aparte schijf. Terugzetten bij de hostingpartij herstelt de schijf niet, en het terugzetten van de schijf haalt ook nieuwere bestanden weg. Kies daarom altijd bewust de hele combinatie van code, database en controlegetallen.

## Wat je vastlegt bij een fout

Leg dit vast zonder onderzoeksinhoud.

- **Bewaar:** het tijdstip, de codeversie (commit), de controlegetallen van release en publicatie, de foutcode en de `X-Request-ID`. De server maakt die ID zelf; een ID die iemand meestuurt, wordt niet vertrouwd.
- **Deel nooit** in een openbaar verslag: databasepaden, zoekopdrachten, ingeleverde pakketten, projecttekst, cookies, headers of volledige adressen.
- **Foutmeldingen van de server:** bij een onverwachte fout antwoordt de server met code 500. Hij schrijft dan één regel naar de foutuitvoer, met `event`, `requestId`, `status` en `time`. Er is geen gewoon toegangslogboek. Sommige fouten heel vroeg in een verzoek komen niet in die uitvoer; een ontbrekende regel bewijst dus niet dat alles goed ging.
- **Start de server niet?** Hij toont dan een vaste, veilige uitleg zonder interne details. Controleer eerst de opties, de database, de publicatie en de webbuild. Voeg bij het zoeken geen volledige lijst van omgevingsvariabelen, headers of databaseinhoud toe.
- **`GET /api/v1/health`** zegt alleen dat de server antwoordt. Of de database heel is, controleer je met de databasecontrole in [stap 4](#4-herstel-naar-een-nieuw-bestand).

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

Terug naar het [beheeroverzicht](README.md).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
