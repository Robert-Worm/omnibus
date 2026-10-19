# Panel, bewijs en herhaalbare oplevering

## Vier senior-auditorperspectieven

Dit zijn reviewrollen, geen fictieve personen, diploma's of ervaringsjaren.

1. **Bron en normatieve betekenis:** exacte passage/context, actor, modaliteit,
   uitzonderingen, editie, provenance en grenzen van eigen afleidingen.
2. **Auditrelevantie en beheerslogica:** is dit een risico dat een auditor binnen
   deze scope zou onderzoeken? Kloppen doel, risico, gewenste beheerssituatie en
   interventie? Onderbouw relevantie; verzin geen ernst- of kanscijfer.
3. **Toetsontwerp en bewijs:** zijn elk toetspunt en opzet/bestaan uitvoerbaar,
   proportioneel en geschikt voor het beoogde oordeel? Is er betekenisvol bewijs?
4. **Praktische overdracht en taal:** kan een auditor die deze casus niet kent
   zelfstandig uitleggen wat er wordt bedoeld en beginnen met toetsen? Geen
   onnodige synoniemen, jargon, cirkelredenering of dubbel werk.

Iedere rol leest dezelfde bronbasis en de volledige keten, niet alleen één kolom.
Bij een gedelegeerd panel krijgen reviewers de rubric en input, maar niet de
scores, gewenste uitkomst of conceptreparaties van andere reviewers. Bewaar hun
oorspronkelijke bevindingen vóór de coördinator samenvoegt. Meerdere AI-contexten
zijn een onafhankelijk ingerichte AI-review, geen menselijke auditorvalidatie.

Zonder echte aparte reviewers: label `SELF_REVIEW`, bespreek de vier perspectieven
en benoem de beperking. Claim geen panelconsensus. Bij een echt panel registreer
reviewer/context-ID, rol, inputhash, tijd en daadwerkelijke beoordelingsomvang.
Een technische reviewer-ID bewijst niet dat iemand onafhankelijk heeft gelezen.

Laat verschillen van twee of meer punten en **ieder** meningsverschil over een
bronfout of toetsbaarheid expliciet bespreken. Eén punt verschil mag ook relevant
zijn. De coördinator motiveert de eindscore vanuit bewijs; neem niet blind het
gemiddelde of de meerderheid. Materiële onbesliste vragen blokkeren het totaal.

## Revieweenheid en dekking

Review één norm/bouwsteen met alle eigen toetspunten en gebruikte varianten als
eenheid. Gebruik de stabiele IDs en noteer de beoordeelde app-/bron-/inhoudsversie.
Voor een grote batch: geef totaal, gelezen aantal en selectiegrond. Een steekproef
mag fouten vinden, maar krijgt geen cijfer voor de hele catalogus. Verzamel per
bouwsteen een bronkaart en per punt een kwaliteitsoordeel. Geen samenvatting als
vervanging van de daadwerkelijke bronpassage.

Lees de getoonde algemene formulering én de bronvariant waar aanwezig. Controleer
dat generaliseren geen specifieke plicht, uitzondering of beperking uitwist.
Een historische bevinding kan context geven maar wordt geen conclusie over de
nieuwe gebruiker. Vraagvoorstellen toets je op hun verband met de normketen;
een volledige interview-/onderzoeksvraagreview blijft de vraagkwaliteitmethode.

## Opleveren

Zet voor de gebruiker vooraan:

- De reviewstatus, totaalscore indien verantwoord, broncijfer en laagste onderdeel.
- Een korte scorekaart van de tien onderdelen, met één concrete reden per cijfer.
- De belangrijkste herstelpunten, gerangschikt: bronfout → ontbrekende toetsinhoud
  → uitvoerbaarheid → verduidelijking. Behoud expliciet wat al goed is.
- Werkelijke dekking en reviewvorm; geen fictieve panelleden of verwachte scorewinst.

Bewaar in een apart reviewpakket (niet in bevroren bronpakketten):

1. **Basis:** OAK-versie, app-/dataversie, scope, exacte beoordeelde payload en
   bronbestanden met uit echte bytes berekende hashes; ID-lijst en varianten.
2. **Bronkaart per veld/punt:** bron-ID, editie, pagina/artikel/span, relevante
   passage/context, bronstatus, letterlijk/parafrase/afleiding/toetsontwerp,
   reden waarom dit de uitwerking draagt, open vragen en beperkingen.
3. **Ruwe reviews:** eigen scores, bevindingen en onzekerheid per reviewer.
4. **Besluit:** gemotiveerde geconsolideerde score, plafonds/vlaggen, puntenmatrix,
   verschillen tussen reviewers, opgeloste en open kwesties.
5. **Verbeterpakket:** veld/punt-ID, oude tekst, probleem, bronlocatie,
   vervangingsvoorstel, type wijziging, welke relaties opnieuw moeten worden
   gecontroleerd. Geen nieuwe bronclaims of stille wijzigingen in actieve data.

Voor een losse fictieve oefencasus mag dit een compact antwoord met de exacte
invoer/casus-ID zijn. Applicatietoegang en bronbestandsregistratie zijn dan niet
vereist. Ontbrekende hashes of echte broncontrole niet nabootsen.

Als bestaande bronlezing ontbreekt, vraag die gericht op of lever een onvolledige
review. Een ander rapport, nieuwere weteditie of samenvatting is geen ongemerkt
vervangend bewijs. Hertoets alleen gewijzigde onderdelen plus hun afhankelijke
keten; behoud versiegebonden oude scores, zet niet alleen nieuwe hashes op oude reviews.

## Rekenbestand voor één bouwsteen

`scripts/score.mjs` leest alleen JSON en rekent; het leest/wijzigt geen applicatie
of database. Aanroep: `node <skill>/scripts/score.mjs review.json` (uitvoer naar
stdout). Gebruik `node --test <skill>/scripts/score.test.mjs` voor zelftests.

Vereiste invoer:

```json
{
  "rubricVersion": "OAK-1.0",
  "itemId": "bestaand-norm-id",
  "sourceVerified": true,
  "coverageComplete": true,
  "werkingIncluded": false,
  "expectedPointIds": ["bestaand-punt-id"],
  "ratings": {
    "bron": {"score": 8, "reason": "Passage, context en voorwaarden gecontroleerd."},
    "doel": {"score": 8, "reason": "Herkenbaar resultaat binnen de scope."},
    "risico": {"score": 8, "reason": "Gebeurtenis en gevolg passend onderbouwd."},
    "beheersdoelstelling": {"score": 8, "reason": "Beschrijft de te bereiken beheerssituatie."},
    "beheersmaatregel": {"score": 8, "reason": "Beschrijft een passende uitvoerbare interventie."},
    "norm": {"score": 8, "reason": "Maatstaf en voorwaarden zijn begrijpelijk."},
    "toetspunten": {"score": 8, "reason": "Laagste puntscore; dekking apart gecontroleerd."},
    "opzet": {"score": 8, "reason": "Laagste opzettoets-score."},
    "bestaan": {"score": 8, "reason": "Laagste bestaanstoets-score."},
    "samenhang": {"score": 8, "reason": "Schakels en taal sluiten op elkaar aan."}
  },
  "pointScores": [{
    "id": "bestaand-punt-id",
    "toetspunten": {"score": 8, "reason": "Afzonderlijk toetsbaar aspect."},
    "opzet": {"score": 8, "reason": "Inrichting, vergelijking en bewijs benoemd."},
    "bestaan": {"score": 8, "reason": "Feitelijke invoering aantoonbaar onderzocht."}
  }],
  "flags": []
}
```

Dit is een **structuurvoorbeeld**, geen echte review of argumentatie om over te
nemen. Iedere reden in een werkelijk pakket verwijst naar concrete inhoud in de
bronkaart. Een score `null` zonder expliciete uitzondering betekent nog niet
beoordeeld, nooit 0 of N.v.t.
Bij `sourceVerified:false` moet `ratings.bron.score` null zijn.
Als werking is opgenomen, voeg `werking` toe aan ratings en elk punt.
Alleen voor niet-toepasselijke werking bij een individueel punt is
`{"score":null,"notApplicable":true,"reason":"Concrete scopegrond"}` toegestaan.
Het werkingscijfer is het laagste cijfer van de toepasselijke punten. Zonder enig
toepasselijk punt moet `werkingIncluded:false` zijn; weglaten is dan geen tekort.
Laat de hele dimensie weg wanneer werking niet is opgenomen; label dat in de
review. Ontbrekende verplichte opzet/bestaan is laag scoren, niet weglaten.

Vlagvorm: `{"code":"SOURCE_MISMATCH","reason":"Concreet verschil met artikel/passage en impact"}`.
Codes: `SOURCE_MISMATCH` (plafond 3), `FALSE_ASSURANCE` (4),
`UNEXECUTABLE_TEST` (5), `CRITICAL_CHAIN_GAP` (5), `UNRESOLVED_SOURCE` (geen totaal).
Onvolledige puntdekking of niet-beoordeelde velden geeft eveneens geen totaal.
Een norm zonder toetspunten is een toetslacune (maximaal 5), niet een hoge score.

Het hulpmiddel controleert rekenregels, verplichte cijfers/redenen, punt-ID-dekking
en laagste-puntscores. Het bewijst **niet** dat bronlezing, revieweridentiteit,
reasoning of foutvlaggen juist zijn. Bewaar de bronkaart en ruwe reviews ernaast.

## Batchsamenvatting

Toon aantal bronfouten, onvolledige beoordelingen, herzieningsgevallen, spreiding
en laagste scores. Een complete batch mag een beschrijvend gemiddelde tonen,
naast broncijfer en verdeling; een hoge gemiddelde score geeft nooit een
vrijgave over de lage of onbeoordeelde gevallen heen. Geef bij steekproeven alleen
het cijfer van de werkelijk beoordeelde selectie. Geef geen statistische zekerheid
of foutmarge zonder een daarvoor geschikte opzet.
