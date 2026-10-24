# Storingsdraaiboek

<!-- paginatype: naslag -->

> **In het kort:** de zes situaties die het vaakst misgaan. Per situatie: hoe je het herkent, wat je eerst doet, hoe je herstelt en wat je daarna regelt.

## Zo gebruik je dit draaiboek

Zoek de situatie die het meest lijkt op wat je ziet. Doe eerst wat bij **Eerst doen** staat: die voorkomt dat het erger wordt. Herstel daarna rustig. Leg na afloop vast wat er gebeurde, in een issue of in de [besluitenlijst](besluiten.md) als er iets moet veranderen.

Twijfel je? Stop en vraag het na. Een uur wachten is beter dan een verkeerde database online.

## De claimbot reageert niet

- **Herkennen:** een nieuwe claim krijgt na tien minuten geen welkomstbericht, of `/inleveren` krijgt geen reactie.
- **Eerst doen:** kijk in [Actions](https://github.com/Robert-Worm/omnibus/actions/workflows/voortgang.yml) of de GitHub-workflow *Voortgang bijwerken* is gestart en of hij rood is.
- **Herstellen:**
  - Rood: open de run en lees de foutmelding. Een tijdelijke fout van GitHub los je op met *Re-run jobs*. Een fout in het script: draai lokaal `npm run test:voortgang`, los het op en push.
  - Niet gestart: start de GitHub-workflow met de hand (knop `Run workflow`).
  - De bot haalt gemiste claims bij de volgende run vanzelf in.
- **Nazorg:** laat de bijdrager in de claim weten dat het opgelost is.

## Er staat een verkeerde database online

- **Herkennen:** gebruikers melden ontbrekende of verkeerde inhoud, of de controlegetallen in de release kloppen niet met de zip.
- **Eerst doen:** zet de release op *pre-release* of verwijder de zip, zodat niemand hem nog downloadt. Plaats een korte melding in Discussions.
- **Herstellen:**
  - Zet de vorige, goede zip terug als nieuwste release.
  - Zet `verwerkt.json` terug naar de vorige stand en push.
  - Maak daarna de juiste database opnieuw volgens [database publiceren](database-publiceren.md).
  - Online: herstel de vastgelegde combinatie van code en database volgens [online herstel](storingen-en-herstel.md#online-terug-naar-de-vorige-werkende-versie). Controleer de versie, `/api/v1/ready` en een bron. Alleen `/api/v1/health` is niet voldoende.
- **Nazorg:** zoek uit welke stap van de releasechecklist is overgeslagen en verbeter de checklist.

## De release-zip is beschadigd

- **Herkennen:** `npm run data:check-runtime` geeft geen `VERIFIED_RUNTIME_DATABASE`, of de SHA-256 van de download wijkt af van `SHA256SUMS.txt`.
- **Eerst doen:**
  - Controleer bij jezelf: download opnieuw en vergelijk het controlegetal.
  - Afwijkend? Haal de zip uit de release.
- **Herstellen:** maak de releasebestanden opnieuw met `npm run release:prepare` uit de gecontroleerde database en upload ze opnieuw.
- **Nazorg:** pas nooit een controlegetal aan om een controle te laten slagen.

## Een claim of reactie met ongepaste of vertrouwelijke inhoud

- **Herkennen:** een claim of reactie bevat persoonsgegevens, vertrouwelijke documenten, reclame of kwetsende tekst.
- **Eerst doen:** verberg de reactie (*Hide* → *Spam* of *Off-topic*) of sluit en vergrendel het issue. Bij vertrouwelijke inhoud: bewerk het bericht en verwijder de inhoud of de bijlage.
- **Herstellen:**
  - Vertrouwelijke bijlage al gedownload door anderen? Meld het bij de eigenaar van de informatie.
  - Bij herhaling: blokkeer de gebruiker voor de repository.
- **Nazorg:** verwijs naar de [gedragscode](../../CODE_OF_CONDUCT.md).

## Een GitHub-workflow faalt na een push

- **Herkennen:** een rode regel bij *Documentatie en claimsysteem controleren* of een andere GitHub-workflow in Actions.
- **Eerst doen:** open de run en lees de laatste regels: de controle noemt het bestand en het regelnummer.
- **Herstellen:** draai dezelfde controle lokaal (`npm run check:docs`, `npm run test:voortgang` of `npm test`), pas de tekst of code aan en push opnieuw. Schakel nooit een controle uit om groen te krijgen.
- **Nazorg:** kwam de fout van een wijziging die de controle had moeten tegenhouden? Breid de controle of de test uit.

## Een ingeleverd pakket lijkt schadelijke inhoud te bevatten

- **Herkennen:** de automatische pakketcontrole meldt programma's of scripts, of de zip heeft vreemde paden of is ongewoon groot.
- **Eerst doen:** pak het pakket **niet** uit op je gewone computer en voer niets uit. Zet de claim op *ingeleverd* met een vraag aan de bijdrager.
- **Herstellen:**
  - Vraag om een nieuw pakket zonder de afwijkende bestanden.
  - Is er opzet in het spel? Verwijder de bijlage, sluit de claim en blokkeer de gebruiker.
- **Nazorg:** alleen een technische controle is geen goedkeuring: ook een schoon pakket beoordeel je inhoudelijk volgens [pakket controleren](pakket-controleren.md).

## Samengevat

Eerst voorkomen dat het erger wordt, dan rustig herstellen, en daarna vastleggen wat er moet veranderen. Een controle uitschakelen of een controlegetal aanpassen is nooit de oplossing.

## Volgende stap

Voor back-up en herstel van de database zelf: [back-up en herstel](storingen-en-herstel.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
