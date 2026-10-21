# Stijlgids voor de documentatie

<!-- paginatype: naslag -->

<!-- check-docs: geen-woordcontrole -->

> **In het kort:** zo schrijf je een pagina die past bij de rest van Omnibus. Deel 1, deze pagina, gaat over taal, woorden en schema's. Deel 2, de [bouwstenen](bouwstenen.md), gaat over de opbouw: paginatypen, tabellen, statuslabels en meldingen. De belangrijkste regels controleert `npm run check:docs` automatisch.

## Voor wie schrijf je?

Voor een auditor of onderzoeker zonder technische achtergrond, die de pagina één keer leest en daarna aan de slag wil. Ook beheer- en techniekpagina's moeten te volgen zijn voor iemand die nieuw is in het project.

## Opbouw van een pagina

Elke pagina in `docs/` is van een vast type, zoals een taakpagina of een naslagpagina. Elk type heeft een vaste volgorde: *In het kort* bovenaan, *Volgende stap* en de navigatieregel onderaan. Welke onderdelen er per type tussen staan, lees je bij de [paginatypen](bouwstenen.md#paginatypen).

## Toon en taal

- **Schrijf op B1-niveau.** Korte zinnen, gewone woorden, één gedachte per zin.
- **Spreek de lezer aan met *je*.** Niet *u*, niet *de gebruiker*.
- **Schrijf actief.** *De beheerder controleert het pakket*, niet *het pakket wordt gecontroleerd*.
- **Begin met wat de lezer doet of krijgt.** Achtergrond en uitzonderingen komen daarna.
- **Leg een vakwoord uit** bij het eerste gebruik op een pagina, of link naar de [begrippenlijst](../begrippen.md).
- **Breek regels niet af.** Schrijf een alinea als één regel; GitHub zet de tekst zelf om.
- **Houd zinnen onder de 25 woorden.** De documentatiecheck waarschuwt bij langere zinnen in `docs/`. Splits een lange zin in twee, of maak van een opsomming een lijst.

### Vaste woorden

| Gebruik | Niet |
| --- | --- |
| referentiekader | toetsingskader, auditkader, onderzoekskader of normenkader (voor het eindresultaat) |
| bouwsteen, norm, toetspunt | item, criterium (in uitleg voor gebruikers) |
| bron | document, input |
| claimen, inleveren, vrijgeven | check-out, check-in (alleen als uitleg tussen haakjes) |
| database | catalogus, corpus |
| beheerder | maintainer, integrator |
| pakket | bundle, package |
| controle | check, gate |
| bewijs | evidence |
| testgegevens | fixtures |

### Moeilijke woorden

| Gebruik | Niet |
| --- | --- |
| met, via | middels, door middel van |
| om | teneinde |
| over | inzake, met betrekking tot |
| en, ook | alsmede |
| daarom | derhalve, dientengevolge |
| moeten | dienen te |
| volgens | conform, overeenkomstig |
| controleren | verifiëren, valideren (in uitleg voor gebruikers) |
| toevoegen, opnemen | integreren |
| invoeren, bouwen | implementeren |
| helpen, mogelijk maken | faciliteren |
| als, wanneer | indien |
| nodig | benodigd, noodzakelijk |

De documentatiecheck waarschuwt bij de woorden uit de kolom *Niet* die bijna nooit nodig zijn, zoals *middels*, *teneinde*, *alsmede*, *derhalve* en *indien*.

Termen uit GitHub zelf (*issue*, *pull request*, *release*, *Discussions*) en namen van opdrachten blijven zoals ze zijn.

### Te vermijden

- **Interne projectcodes** zoals `EP13-S01` of `K06` zonder uitleg. Noem wat er bedoeld wordt; zet de code er hooguit tussen haakjes achter.
- **Onnodig Engels**, zoals *workflow*, *handoff* of *deploy*. Gebruik *werkwijze*, *overdracht* en *online zetten*. *Intake* is goed als je het intakegesprek of de intake van een onderzoek bedoelt.
- **Beloftes over de toekomst** buiten de [routekaart](../routekaart.md).

## Getallen

Aantallen die met de database veranderen, schrijf je niet met de hand. Zet ze tussen markeringen, dan vult het voortgangsscript ze in:

```text
De database bevat <!--n:rapporten-->27<!--/n--> rapporten.
```

Beschikbaar: `rapporten`, `kaders`, `modellen`, `alle`, `aanbevolen` en `aanbevolenInDatabase`. Zie [database publiceren](../beheer/database-publiceren.md#een-release-uitbrengen).

## Schema's

Gebruik Mermaid, met deze vaste kleurregel als laatste regel van elk schema:

```text
classDef default fill:#eaf2f8,stroke:#01689b,color:#15233b;
```

- Stappen nummer je in het vak zelf: `"1 · Code ophalen"`.
- Houd een schema klein: hooguit zes vakken op een rij. Meer nodig? Splits het.
- Zet onder het schema dezelfde stappen als genummerde lijst. Niet iedereen kan het schema zien.

## Statuslabels

Een status is altijd icoon plus woord, zoals ✅ Klaar of ⬜ Open. De vaste lijst staat bij de [statuslabels](bouwstenen.md#statuslabels).

## Tabellen, opdrachten, meldingen en links

- **Tabellen** volgen een van de zes [vaste vormen](bouwstenen.md#tabellen). Hooguit vier kolommen.
- **Opdrachten** volgen de regels bij [opdrachten](bouwstenen.md#opdrachten): altijd een taal, en bij verschil per systeem beide varianten.
- **Meldingen** zoals waarschuwingen en tips volgen de regels bij [meldingen](bouwstenen.md#meldingen).
- **De installatieopdracht** is altijd `npm ci --ignore-scripts --no-audit --no-fund`.
- **Links** binnen de repository zijn relatief (`../begrippen.md`). Link naar een kop met een anker (`#volgende-stap`); de controle meldt kapotte ankers.
- **Afbeeldingen** krijgen een beschrijvende alt-tekst en staan in `docs/images/`. Schermafbeeldingen van de applicatie maak je met `npm run docs:screenshots`, niet met de hand; zie [schermafbeeldingen vernieuwen](ontwikkelen.md#schermafbeeldingen-vernieuwen).

## Samengevat

Korte zinnen met *je*, vaste woorden, getallen tussen markeringen en schema's in de vaste kleuren. Voor de opbouw gebruik je de [bouwstenen](bouwstenen.md). Draai `npm run check:docs` voordat je iets instuurt.

## Volgende stap

Ga terug naar [ontwikkelen](ontwikkelen.md) en lees hoe je [documentatie controleert](ontwikkelen.md#documentatie-controleren).

---

[↑ Meedoen](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
