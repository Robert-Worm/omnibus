# Storingen en herstel

> **In het kort:** wat je bewaart bij een storing, hoe je een back-up maakt en hoe je herstelt naar een nieuw bestand. Alles lokaal; een online versie bestaat nog niet.

## Bij een storing, in het kort

1. **Leg vast wat er gebeurde:** tijdstip, codeversie, foutmelding en de request-ID. Deel geen onderzoeksinhoud, databasepaden of projecttekst.
2. **Ga terug naar de laatste werkende combinatie** van pakket, database en instellingen. Wijzig nooit een database terwijl hij in gebruik is.
3. **Herstel altijd naar een nieuw bestand.** Controleer en test het herstel, en schakel pas daarna bewust om.

## Een back-up maken

1. Maak de back-up met `npm run data:runtime-backup`, naar een nieuwe map. Een gewone bestandskopie van een geopende database is niet betrouwbaar.
2. Bewaar het controlegetal (SHA-256) van de back-up apart.
3. Zet de back-up op een andere schijf of plek dan de database zelf.

Een back-up van de database bevat geen projecten van gebruikers. Die bewaren gebruikers zelf met **Bewaar project**.

De precieze opdrachten, de herstelproef en de tabel *Handelen bij een storing* staan in de technische referentie hieronder.

## Technische referentie

<details><summary><b>Technische referentie: alle details en opdrachten</b></summary>

Voer de opdrachten uit vanuit de map van de repository, met Node 24 en je eigen bestanden. Vul de plaatshouders tussen `< >` zelf in. Pakket, database, instellingen en bewijs blijven buiten Git.

### Wat je vastlegt bij een fout (zonder onderzoeksinhoud)

- **Bewaar:** het tijdstip, de codeversie (commit), de controlegetallen van release en publicatie, de foutcode en de `X-Request-ID`. De server maakt die ID zelf; een ID die iemand meestuurt, wordt niet vertrouwd.
- **Deel nooit** in een openbaar verslag: databasepaden, zoekopdrachten, ingeleverde pakketten, projecttekst, cookies, headers of volledige adressen.
- **Foutmeldingen van de server:** bij een onverwachte fout antwoordt de server met code 500 en schrijft hij één regel naar de foutuitvoer, met `event`, `requestId`, `status` en `time`. Er is geen gewoon toegangslogboek. Sommige fouten heel vroeg in een verzoek komen niet in die uitvoer; een ontbrekende regel bewijst dus niet dat alles goed ging.
- **Start de server niet?** Hij toont dan een vaste, veilige uitleg zonder interne details. Controleer eerst de opties, de database, de publicatie en de webbuild. Voeg bij het zoeken geen volledige lijst van omgevingsvariabelen, headers of databaseinhoud toe.
- **`GET /api/v1/health`** zegt alleen dat de server antwoordt. Of de database heel is, controleer je met de databasecontrole hieronder.

### Back-up en herstel naar nieuwe bestanden

1. **Leg de werkende combinatie vast:** codeversie, Node-versie, pakket, release en publicatie. Maak een nieuwe, afgeschermde map buiten het pakket. Laat de database en server die draaien met rust.
2. **Maak de back-up.** Kopieer een database die open is nooit met een gewone bestandskopie: die kan half zijn. Gebruik:

   ```text
   npm run data:runtime-backup -- --from "<bron.sqlite>" --to "<nieuwe-map>/backup.sqlite" --release <releasehash> --publication <publicatiehash>
   ```

   De opdracht controleert eerst of de database heel is, of alle verwijzingen kloppen en of de bronnen en controlegetallen overeenkomen. Bestaat het doelbestand al, of staan er nog hulpbestanden van SQLite (`-wal`, `-shm`, `-journal`), dan stopt hij. Gebruik een map die alleen jij beheert.
3. **Bewaar het controlegetal** van de back-up apart, bijvoorbeeld in PowerShell met `Get-FileHash -Algorithm SHA256 -LiteralPath "<backup.sqlite>"` of op macOS/Linux met `shasum -a 256 "<backup.sqlite>"`. Zet back-up en pakket op een andere, beschermde plek. De opdracht versleutelt en uploadt niets; een back-up op dezelfde schijf beschermt niet tegen schijfverlies.
4. **Herstel naar een nieuw bestand.** Controleer eerst het controlegetal van de back-up tegen wat je bewaarde. Klopt het niet, gebruik de back-up dan niet; reken nooit een nieuw verwacht getal uit. Herstel en controleer daarna:

   ```text
   npm run data:runtime-backup -- --from "<backup.sqlite>" --to "<nieuwe-herstelmap>/restored.sqlite" --release <releasehash> --publication <publicatiehash>
   npm run data:check-runtime -- --database "<nieuwe-herstelmap>/restored.sqlite" --release <releasehash> --publication <publicatiehash>
   ```

   Vergelijk release, publicatie, code, aantallen en de controle van de bronnen. Het bestand zelf kan er na herstel iets anders uitzien; de bronnen moeten gelijk zijn. Een geslaagde controle is geen nieuwe inhoudelijke beoordeling.
5. **Test het herstel.** Start het bijbehorende pakket met alleen deze herstelde database, op een vrije poort (bijvoorbeeld 4353); zie het [runtimepakket](runtime-pakket.md). Controleer: de gezondheid, een bron openen met markering, een fictieve selectie, een vraagkoppeling, een project bewaren en openen, en de Excel-export. Stop daarna alleen deze proefserver.
6. **Schakel bewust om.** Vervang pas na de test de hele combinatie van pakket en instellingen. Mislukt het, dan is de vorige combinatie je terugweg. Verander nooit een database die in gebruik is.

### Korte incidentroute

#### De terugweg lokaal oefenen

Een bestaande test oefent het wisselen tussen twee fictieve versies:

```text
node --test --test-concurrency=1 --test-timeout=120000 scripts/hosting-start-integration.test.mjs scripts/start-hosting-options.test.mjs scripts/package-runtime.test.mjs
```

De test start versie A, daarna versie B, en probeert verkeerde combinaties van pakket, database en controlegetallen; die moeten weigeren voordat de server luistert. Daarna start hij versie A opnieuw. Na afloop is alles nog precies zoals het was. Dit bewijst dat de terugweg werkt met fictieve bestanden; het is geen echte wissel bij de hostingpartij.

#### Handelen bij een storing

| Wat je ziet | Wat je eerst doet | Wanneer je weer verdergaat |
| --- | --- | --- |
| De server start niet, of met een verkeerde versie | Laat de werkende versie staan. Vergelijk pakket, instellingen en controlegetallen met wat je bewaarde. | Pakket en databasecontrole slagen samen, en een korte proef slaagt. |
| Code 500 bij het openen van een bron | Noteer tijd en request-ID; kijk in de foutuitvoer en controleer de database. Zet geen bron- of projecttekst in je verslag. | De oorzaak is opgelost, of de vorige combinatie is terug, en de route is getest. |
| De database is beschadigd of weg | Bewaar wat je vond afgeschermd. Herstel de gecontroleerde back-up naar een nieuwe map. Repareer of overschrijf het actieve bestand niet. | Controlegetallen, verwijzingen en de gebruikersproef kloppen. |
| Onverwacht veel verkeer of kosten (later, online) | Bekijk bij de hostingpartij verzoeken, statuscodes en verbruik. Bij misbruik: openbare toegang beperken. Niet zomaar opschalen. | Oorzaak, grenzen en kosten zijn gecontroleerd en de beheerder geeft weer toegang. |
| Verkeerde inhoud openbaar of een gegevenslek (later, online) | Beperk de toegang. Laat rechten, cache en logs onderzoeken; bewaar het bewijs afgeschermd. | Alleen toegestane inhoud is bereikbaar en een onafhankelijke beoordeling is klaar. |

Let op bij latere hosting: terugzetten bij de hostingpartij herstelt de schijf niet, en het terugzetten van de schijf haalt ook nieuwere bestanden weg. Kies daarom altijd bewust de hele combinatie van code, database en controlegetallen.

</details>

## Samengevat

- Noteer tijdstip, commit, hashes en request-ID; deel geen onderzoeksinhoud.
- Herstel altijd naar een nieuw bestand, nooit over de actieve database.
- Controleer na herstel met `npm run data:check-runtime`.

## Volgende stap

Terug naar het [beheeroverzicht](README.md).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
