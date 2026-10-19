# Routekaart

Waar Omnibus nu staat en wat er nog komt. Dit zijn voornemens, geen beloftes; volgorde en details kunnen veranderen.

## Wat er nu is

- Een werkende lokale applicatie met de vier werkstappen: onderzoeksvraag, bronnen verkennen, normen en toetspunten selecteren, en een toetsingskader opbouwen en exporteren naar Excel.
- Viewers voor rapporten, wetten, kaders en modellen, met exacte bronmarkeringen in de originele tekst.
- Lokale projecten in de browser, met download en import van projectbestanden.
- Een lokale AI-koppeling via MCP (STDIO), waarmee een eigen AI-client de catalogus kan doorzoeken en conceptonderzoek kan voorbereiden, zonder de brondatabase te wijzigen.
- Zes herbruikbare AI-skills voor het toevoegen van rapporten, kaders en modellen, het opbouwen van vragen, het samenstellen van thema's en het reviewen van auditkwaliteit.
- Een gescheiden data- en codeomgeving: de database staat los van de code bij de [releases](https://github.com/Robert-Worm/omnibus/releases/latest); de oorspronkelijke bronverzameling blijft privé.

## Bewust buiten scope

- Accounts, inloggen, gebruikersbeheer, organisaties en rollen.
- Projecten opslaan in de cloud of delen via accounts.
- Betalingen, abonnementen of betaalde exportgrenzen.

Opnieuw toevoegen vraagt een nieuw, expliciet besluit.

## Volgende stappen

1. **Eenvoudiger starten met eigen documenten.** Nieuwe bronnen gaan nu nog via de skills en een aparte verwerkingsomgeving. Het doel is een route waarin je met eigen bronnen kunt beginnen, zie [eigen documenten](own-content.md).
2. **Online versie.** De applicatie is voorbereid op hosting met de bestaande SQLite-database, maar draait nog nergens online. Eerst moeten opslag, back-up, herstel en prestaties in de praktijk bewezen zijn ([runtimepakket](runtime-pakket.md), [herstel](runtime-herstel.md)).
3. **Gebruikersacceptatie.** Een onafhankelijke beveiligingsreview, een test met schermlezers en een acceptatie van de Excel-export in desktopprogramma's.
4. **Meer bronnen.** De collectie groeit gecontroleerd, rapport voor rapport, via de bestaande voorbereidings- en reviewstraat. Iedereen kan helpen; zie de [voortgangslijst](voortgang.md).
5. **Rijkere AI-koppeling.** De lokale MCP-koppeling uitbreiden, bijvoorbeeld met koppelingen naar andere open datasets zoals de [Rijksmap](https://github.com/Robert-Worm/rijksmap).

De afspraken waaraan de applicatie moet blijven voldoen, staan in de [acceptatiecontracten](acceptatiecontracten.md).
