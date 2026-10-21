# Storingsdraaiboek

> **In het kort:** zes situaties die het meest waarschijnlijk misgaan, met per situatie hoe je het herkent, wat je eerst doet, hoe je herstelt en wat je daarna regelt.

## Zo gebruik je dit draaiboek

Zoek de situatie die het meest lijkt op wat je ziet. Doe eerst de **eerste handeling**: die voorkomt dat het erger wordt. Herstel daarna rustig. Leg na afloop vast wat er gebeurde, in een issue of in de [besluitenlijst](besluiten.md) als er iets moet veranderen.

Twijfel je? Stop en vraag het na. Een uur wachten is beter dan een verkeerde database online.

## 1. De claimbot reageert niet

| | |
| --- | --- |
| **Herkennen** | Een nieuwe claim krijgt na tien minuten geen welkomstbericht, of `/inleveren` krijgt geen reactie. |
| **Eerste handeling** | Kijk in [Actions](https://github.com/Robert-Worm/omnibus/actions/workflows/voortgang.yml) of de GitHub-workflow *Voortgang bijwerken* is gestart en of hij rood is. |
| **Herstellen** | Rood: open de run en lees de foutmelding. Een tijdelijke fout van GitHub los je op met *Re-run jobs*. Een fout in het script: draai lokaal `npm run test:voortgang`, los het op en push. Niet gestart: start de GitHub-workflow met de hand (*Run workflow*). De bot haalt gemiste claims bij de volgende run vanzelf in. |
| **Nazorg** | Laat de bijdrager in de claim weten dat het opgelost is. |

## 2. Er staat een verkeerde database online

| | |
| --- | --- |
| **Herkennen** | Gebruikers melden ontbrekende of verkeerde inhoud, of de controlegetallen in de release kloppen niet met de zip. |
| **Eerste handeling** | Zet de release op *pre-release* of verwijder de zip, zodat niemand hem nog downloadt. Plaats een korte melding in Discussions. |
| **Herstellen** | Zet de vorige, goede zip terug als nieuwste release. Zet `verwerkt.json` terug naar de vorige stand en push. Maak daarna de juiste database opnieuw volgens [database publiceren](database-publiceren.md). |
| **Nazorg** | Zoek uit welke stap van de releasechecklist is overgeslagen en verbeter de checklist. |

## 3. De release-zip is beschadigd

| | |
| --- | --- |
| **Herkennen** | `npm run data:check-runtime` geeft geen `VERIFIED_RUNTIME_DATABASE`, of de SHA-256 van de download wijkt af van `SHA256SUMS.txt`. |
| **Eerste handeling** | Controleer bij jezelf: download opnieuw en vergelijk het controlegetal. Afwijkend? Haal de zip uit de release. |
| **Herstellen** | Maak de releasebestanden opnieuw met `npm run release:prepare` uit de gecontroleerde database en upload ze opnieuw. |
| **Nazorg** | Pas nooit een controlegetal aan om een controle te laten slagen. |

## 4. Een claim of reactie met ongepaste of vertrouwelijke inhoud

| | |
| --- | --- |
| **Herkennen** | Een claim of reactie bevat persoonsgegevens, vertrouwelijke documenten, reclame of kwetsende tekst. |
| **Eerste handeling** | Verberg de reactie (*Hide* → *Spam* of *Off-topic*) of sluit en vergrendel het issue. Bij vertrouwelijke inhoud: bewerk het bericht en verwijder de inhoud of de bijlage. |
| **Herstellen** | Vertrouwelijke bijlage al gedownload door anderen? Meld het bij de eigenaar van de informatie. Bij herhaling: blokkeer de gebruiker voor de repository. |
| **Nazorg** | Verwijs naar de [gedragscode](../../CODE_OF_CONDUCT.md). |

## 5. Een GitHub-workflow faalt na een push

| | |
| --- | --- |
| **Herkennen** | Een rode regel bij *Documentatie en claimsysteem controleren* of een andere GitHub-workflow in Actions. |
| **Eerste handeling** | Open de run en lees de laatste regels: de controle noemt het bestand en het regelnummer. |
| **Herstellen** | Draai dezelfde controle lokaal (`npm run check:docs`, `npm run test:voortgang` of `npm test`), pas de tekst of code aan en push opnieuw. Schakel nooit een controle uit om groen te krijgen. |
| **Nazorg** | Kwam de fout van een wijziging die de controle had moeten tegenhouden? Breid de controle of de test uit. |

## 6. Een ingeleverd pakket lijkt schadelijke inhoud te bevatten

| | |
| --- | --- |
| **Herkennen** | De automatische pakketcontrole meldt programma's of scripts, of de zip heeft vreemde paden of is ongewoon groot. |
| **Eerste handeling** | Pak het pakket **niet** uit op je gewone computer en voer niets uit. Zet de claim op *ingeleverd* met een vraag aan de bijdrager. |
| **Herstellen** | Vraag om een nieuw pakket zonder de afwijkende bestanden. Is er opzet in het spel? Verwijder de bijlage, sluit de claim en blokkeer de gebruiker. |
| **Nazorg** | Alleen een technische controle is geen goedkeuring: ook een schoon pakket beoordeel je inhoudelijk volgens [pakket controleren](pakket-controleren.md). |

## Samengevat

Eerst voorkomen dat het erger wordt, dan rustig herstellen, en daarna vastleggen wat er moet veranderen. Een controle uitschakelen of een controlegetal aanpassen is nooit de oplossing.

## Volgende stap

Voor back-up en herstel van de database zelf: [storingen en herstel](storingen-en-herstel.md).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
