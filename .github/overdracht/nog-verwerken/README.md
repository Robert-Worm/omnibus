# Nog verwerken na herstel van GitHub-toegang

> **In het kort:** wat lokaal is veranderd terwijl het GitHub-account geblokkeerd was, en wat daarna op GitHub moet gebeuren.

Op 6 november 2026 is het GitHub-account van de beheerder geblokkeerd. Het werk gaat lokaal door op de branch `toetspunten-auditor`. Deze map houdt bij wat er verandert en waarom, zodat alles daarna in één keer gestructureerd op GitHub kan worden verwerkt.

| Bestand | Inhoud |
| --- | --- |
| [besluiten.md](besluiten.md) | Besluiten van de beheerder, met datum en reden |
| [github.md](github.md) | Issues, checklists, reacties en releases die nog moeten worden bijgewerkt |
| [toetspunten.md](toetspunten.md) | Voortgang van de herschrijving per deel van ongeveer 100 toetspunten, met de lessen |
| [documentatie.md](documentatie.md) | Pagina's en bestanden die naar deze wijzigingen moeten verwijzen of ze moeten uitleggen |

Werkwijze bij herstel: eerst `git push` van de branch, dan per regel in `github.md` de actie, rustig verspreid (niet meer dan een paar API-acties per minuut). Daarna deze map leegmaken in een aparte commit.
