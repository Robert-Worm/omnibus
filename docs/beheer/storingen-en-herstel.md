# Storingen en herstel

> **In het kort:** wat je bewaart bij een storing, hoe je een back-up maakt en hoe je herstelt naar een nieuw bestand. Alles lokaal; een online versie bestaat nog niet.

Voer de opdrachten uit in je checkout, met Node 24 en je eigen, expliciet gekozen bestanden. Vul de plaatshouders zelf in. Pakket, database, instellingen en bewijs blijven buiten Git.

## Diagnose zonder onderzoeksinhoud

- Bewaar tijdstip, codecommit, lokaal gebruikte release-/publicatiepin, foutstatus
  en `X-Request-ID`. De server maakt een nieuwe willekeurige ID; een meegestuurde
  request-ID wordt niet vertrouwd. Deel geen databasepaden, queries, intake,
  projecttekst, cookies, headers of volledige URLs in een openbaar incident.
- Onverwachte synchrone requestfouten geven een generiek 500-antwoord en één
  JSON-regel op stderr: `event`, `requestId`, `status`, `time`. Er is geen standaard
  accesslog. Vroege HTTP-parserweigeringen, 100-continue-weigeringen en afgebroken
  streams vallen buiten deze foutlog; een ontbrekende regel bewijst geen succes.
- Een startweigering toont veilige vaste hulptekst, geen exception/stack/pad.
  Controleer eerst de argumenten en de aparte database, publicatie en webbuild.
  Voeg bij diagnose geen algemene dump van process.env, requestheaders of SQLite toe.
- `GET /api/v1/health` bevestigt uitsluitend dat deze lokale HTTP-handler antwoordt.
  Gebruik de databasecontrole hieronder voor integriteit. Die is een operatoractie,
  geen endpoint en geen lichte readinessprobe.

## Backup en herstel naar nieuwe bestanden

1. Noteer de werkende combinatie van codecommit, Node-versie, pakketmanifest,
   release- en publicatiehash. Maak een nieuwe afgeschermde uitvoermap buiten de
   pakketmap/webroot. Laat een bestaande database of server ongemoeid.
2. Maak een consistente SQLite-backup; kopieer een geopende database niet met een
   gewone bestandskopie. De backup-API neemt vastgelegde WAL-wijzigingen mee.

   ```text
   npm run data:runtime-backup -- --from "<bron.sqlite>" --to "<nieuwe-map>/backup.sqlite" --release <releasehash> --publication <publicatiehash>
   ```

   De opdracht controleert SQLite-integriteit, foreign keys, de geselecteerde
   bronidentiteiten/inhoud en publicatie-/afleverhashes vóór aflevering. Een bestaand
   doel of achtergebleven `-wal`, `-shm` of `-journal` blokkeert de opdracht. Gebruik
   een door deze operator exclusief beheerde nieuwe map; dit is geen bescherming
   tegen een gelijktijdige kwaadwillende schrijver met dezelfde filesystemrechten.
3. Bewaar de SHA-256 van het afgeronde bestand apart in het private herstelbewijs
   (PowerShell: `Get-FileHash -Algorithm SHA256 -LiteralPath "<backup.sqlite>"`).
   Kopieer backup en codepakket naar afzonderlijke beschermde opslag. De opdracht
   versleutelt, uploadt en plant niets. Een bestand op dezelfde disk is geen
   bescherming tegen diskverlies. Ruwe operatoruitvoer kan private paden bevatten.
4. Controleer bij herstel de backup-SHA-256 tegen dat eerder bewaarde bewijs.
   Herbereken geen verwachte hash om een afwijkend bestand toch te accepteren.
   Gebruik vervolgens dezelfde snapshotfunctie met een **nieuwe** bestemming:

   ```text
   npm run data:runtime-backup -- --from "<backup.sqlite>" --to "<nieuwe-herstelmap>/restored.sqlite" --release <releasehash> --publication <publicatiehash>
   npm run data:check-runtime -- --database "<nieuwe-herstelmap>/restored.sqlite" --release <releasehash> --publication <publicatiehash>
   ```

   Vergelijk release/publicatie/contract, aantallen en bronhashcontrole. SQLite kan
   bij backup de fysieke bestandsindeling veranderen; bronidentiteiten moeten
   gelijk blijven. Een intacte publicatie verleent geen nieuwe inhoudelijke review.
5. Start het bijbehorende geverifieerde runtimepakket tegen uitsluitend dit herstel,
   op een vrije lokale poort (bijvoorbeeld 4353). Gebruik de startinstructie uit
   [runtime-pakket.md](runtime-pakket.md). Controleer health, bron openen/markeren,
   fictieve selectie, vraagkoppeling, projectdownload/heropenen en Excel. Stop alleen
   deze eigen proefserver. De volledige gebruikersproef is geen gevolg van alleen
   een geslaagde databasecontrole.
6. Schakel pas na review de hele combinatie van pakket en instellingen bewust om.
   Bij mislukking blijft de vorige combinatie de terugweg. Verander geen actieve
   database in-place en laat een oude build nooit stil een nieuwe publicatie kiezen.

Workbench is een afzonderlijke private database met een eigen backupbewijs en
herstelcommando; volg [Workbench-herstel](content-workbench.md). Bewaar ook het
externe bewijsplan en bron-/reviewarchieven. Een runtimebackup bevat geen
browserprojecten, oorspronkelijke PDF-archieven of Workbench. Gebruikers bewaren
projecten via de bestaande projectdownload; er is geen serveraccountopslag.

## Korte incidentroute

### De terugweg lokaal oefenen

De bestaande integratietest oefent een wissel tussen twee afzonderlijke,
fictieve versies. Vanuit de codecheckout, met Node 24:

```text
node --test --test-concurrency=1 --test-timeout=120000 scripts/hosting-start-integration.test.mjs scripts/start-hosting-options.test.mjs scripts/package-runtime.test.mjs
```

De proef start pakket A en daarna pakket B op dezelfde lokale testpoort.
Vervolgens probeert zij verkeerde combinaties van pakket, database en
versie-identiteiten. Die moeten weigeren voordat een server gaat luisteren.
Daarna start zij de volledige combinatie A opnieuw, en herhaalt die start.
Bij iedere geslaagde start worden de startpagina, gereedheid, toegestane inhoud en
weigering van de andere bronversie gecontroleerd. Na afsluiten is de testpoort
vrij en zijn alle pakketbestanden, instellingen en databasebytes behouden.

Dit gebruikt alleen tijdelijke fictieve bestanden; de actieve installatie wordt
niet omgeschakeld. Het bewijst de terugweg via de bestaande pakketstart, niet
automatisch herstel na een storing. Het vervangt ook geen echte imagewissel,
proxy-/cachecontrole, diskherstel of terugschakelproef op Sevalla.

### Handelen bij een storing

| Signaal | Eerste handeling | Voorwaarde voor hervatten |
| --- | --- | --- |
| Startweigering/verkeerde release | Laat de werkende versie staan; vergelijk pakket, instellingen en expliciete pins met het herstelbewijs. Controleer de kandidaat alleen-lezen. | Pakket en databasecontrole slagen samen; lokale smokeproef geslaagd. |
| 500 bij bronlezen | Noteer tijd en request-ID; controleer beperkte stderr en de aparte database. Gebruik geen bron-/projecttekst in het incidentverslag. | Oorzaak verholpen of hele vorige combinatie hersteld; relevante route getest. |
| Beschadigde/ontbrekende database | Bewaar het incidentmateriaal privé; herstel de gecontroleerde backup naar een nieuwe map. Geen overschrijven of reparatie van het actieve bestand. | Hashes/relaties en gebruikersproef kloppen. |
| Onverwacht verkeer/verbruik bij latere hosting | Beheerder beoordeelt providerrequests, bytes, statuscodes en compute. Bij misbruik publieke toegang via beheer beperken; geen blind opschalen, disk verwijderen of data in logs zetten. | Oorzaak, limieten en kosten gecontroleerd; nieuwe publieke toegang bewust goedgekeurd. |
| Verkeerde publieke bron/gegevenslek bij latere hosting | Beheerder beperkt toegang en laat bronrechten, cache en providerlogs onderzoeken; bewaar minimaal incidentbewijs afgeschermd. | Alleen toegestane inhoud bereikbaar, cachegedrag getoetst en onafhankelijke review afgerond. |

Providerrollback herstelt geen disk en gebruikt actuele runtimeinstellingen.
Providerdiskherstel draait de gehele disk terug en kan nieuwere bestanden verwijderen.
Maak de combinatie van code, data, pins en beheerbesluit daarom expliciet.

## Samengevat

- Noteer tijdstip, commit, hashes en request-ID; deel geen onderzoeksinhoud.
- Herstel altijd naar een nieuw bestand, nooit over de actieve database.
- Controleer na herstel met `npm run data:check-runtime`.

## Volgende stap

Terug naar het [beheeroverzicht](README.md).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
