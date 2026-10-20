# Eigen documenten gebruiken

> **In het kort:** je kunt een eigen rapport, wet of kader omzetten naar bouwstenen voor Omnibus met een AI-skill. Er is nog geen knop om een pdf direct in de applicatie te laden; dat staat bovenaan de [routekaart](../routekaart.md).

## Wat kan nu wel, en wat nog niet?

| | Nu | Later |
| --- | --- | --- |
| De meegeleverde database gebruiken | ✅ | |
| Een eigen document omzetten naar normen en toetspunten, met een AI-skill | ✅ | |
| Dat document openbaar toevoegen aan de database | ✅ via [meedoen](../bijdragen/README.md) | |
| Een eigen document direct in Omnibus laden | | 🔜 [routekaart](../routekaart.md), stap 1 |
| Een eigen, private database naast de openbare koppelen | | 🔜 [routekaart](../routekaart.md), stap 2 |

## Hoe zet je een document om?

```mermaid
flowchart LR
    A["Bron kiezen<br/>die je mag gebruiken"] --> B["Skill uitvoeren<br/>met je AI-assistent"] --> C["Controleren<br/>bronpassages en twijfels"] --> D["Pakket<br/>met bouwstenen"]
```

1. **Kies een bron die je mag verwerken.** Noteer de precieze versie of editie.
2. **Gebruik de passende skill** met je AI-assistent:
   - rapport → [`omnibus-add-report`](../../skills/omnibus-add-report/README.md)
   - wet of kader → [`omnibus-add-framework`](../../skills/omnibus-add-framework/README.md)
   - onderzoeksmodel → [`omnibus-add-model`](../../skills/omnibus-add-model/README.md)
3. **Controleer het resultaat.** De skill laat bij elke norm de bronpassage zien en markeert twijfels.
4. **Je hebt nu een pakket** met normen, toetspunten en bronverwijzingen.

Wil je dat pakket met anderen delen? Lever het in via [een bron verwerken](../bijdragen/bron-verwerken.md). De beheerder controleert het en neemt het op in de volgende database.

## Let op

- **Rechten.** Openbaar beschikbaar is niet hetzelfde als vrij te gebruiken. Wetten en Europese regels mag je gebruiken; voor ISO, COBIT en vergelijkbare normen heb je toestemming van de uitgever nodig. Zie de [werklijst wetten en kaders](../bijdragen/werklijst-wetten-en-kaders.md).
- **Vertrouwelijkheid.** Zet geen vertrouwelijke documenten in GitHub, in een issue of in een pull request.
- **AI in de cloud.** Gebruik je een AI-dienst in de cloud, dan verlaat het document je computer. Controleer of dat mag volgens het beleid van je organisatie.
- **AI maakt fouten.** AI kan verplichtingen verkeerd lezen of uitzonderingen missen. Controleer de bronpassages altijd zelf. Een score of technische controle is geen juridisch advies.

## Samengevat

- Een eigen document omzetten kan nu al, met een AI-skill.
- Direct laden in de applicatie komt nog.
- Let op rechten, vertrouwelijkheid en de grenzen van AI.

## Volgende stap

Bekijk de [AI-skills](../../skills/README.md) en kies de skill die bij je document past.
