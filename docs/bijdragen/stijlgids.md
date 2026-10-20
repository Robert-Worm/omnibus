# Stijlgids voor de documentatie

> **In het kort:** zo schrijf je een pagina die past bij de rest van Omnibus: dezelfde opbouw, dezelfde woorden, dezelfde schema's. De belangrijkste regels controleert `npm run check:docs` automatisch.

## Voor wie schrijf je?

Voor een auditor of onderzoeker zonder technische achtergrond, die de pagina één keer leest en daarna aan de slag wil. Ook beheer- en techniekpagina's moeten te volgen zijn voor iemand die nieuw is in het project.

## Opbouw van een pagina

Elke pagina in `docs/` heeft dezelfde vier delen:

| Deel | Wat erin staat |
| --- | --- |
| `> **In het kort:**` | Direct onder de titel: in één of twee zinnen wat je hier leert of doet |
| De uitleg | Koppen met `##`, in de volgorde waarin de lezer ze nodig heeft |
| `## Samengevat` | De kern in een paar zinnen of een korte lijst |
| `## Volgende stap` | Eén duidelijke link naar wat de lezer hierna doet |

Daarna volgt een lijn (`---`) en de navigatieregel:

```text
[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
```

Een `README.md` in een map begint ook met *In het kort*. De wegwijzer en de begrippenlijst hebben geen *Samengevat*.

## Toon en taal

- **Schrijf op B1-niveau.** Korte zinnen, gewone woorden, één gedachte per zin.
- **Spreek de lezer aan met *je*.** Niet *u*, niet *de gebruiker*.
- **Schrijf actief.** *De beheerder controleert het pakket*, niet *het pakket wordt gecontroleerd*.
- **Begin met wat de lezer doet of krijgt.** Achtergrond en uitzonderingen komen daarna.
- **Leg een vakwoord uit** bij het eerste gebruik op een pagina, of link naar de [begrippenlijst](../begrippen.md).
- **Breek regels niet af.** Schrijf een alinea als één regel; GitHub zet de tekst zelf om.

### Vaste woorden

| Gebruik | Niet |
| --- | --- |
| toetsingskader, met bij het eerste gebruik: *in de applicatie: referentiekader* | normenkader of auditkader (voor het eindresultaat) |
| bouwsteen, norm, toetspunt | item, criterium (in uitleg voor gebruikers) |
| bron | document, input |
| claimen, inleveren, vrijgeven | check-out, check-in (alleen als uitleg tussen haakjes) |
| database | catalogus, corpus |
| beheerder | maintainer, integrator |
| pakket | bundle, package |
| controle | check, gate |
| bewijs | evidence |
| testgegevens | fixtures |

Termen uit GitHub zelf (*issue*, *pull request*, *release*, *Discussions*) en namen van opdrachten blijven zoals ze zijn.

### Te vermijden

- **Interne projectcodes** zoals `EP13-S01` of `K06` zonder uitleg. Noem wat er bedoeld wordt; zet de code er hooguit tussen haakjes achter.
- **Onnodig Engels**, zoals *workflow*, *handoff*, *deploy* of *intake*. Gebruik *werkwijze*, *overdracht*, *online zetten* en *inname*.
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

## Statusiconen

| Icoon | Betekenis |
| --- | --- |
| ✅ | Klaar, of in de database |
| 🔄 | Bezig, of in bewerking |
| 📦 | Ingeleverd, wacht op controle |
| ⬜ | Gepland, of open |
| 🔒 | Niet beschikbaar: niet openbaar, of toestemming nodig |
| 🔁 | Mogelijk dubbel met een ander rapport |
| ⚠️ | Let op |

## Tabellen, opdrachten en links

- **Tabellen** voor keuzes en overzichten ("Je wilt… / Lees"). Hooguit vier kolommen.
- **Opdrachten** in een codeblok met één taal per blok: `text` voor opdrachten die overal werken, `powershell` of `bash` als het verschilt. Geef dan beide.
- **De installatieopdracht** is altijd `npm ci --ignore-scripts --no-audit --no-fund`.
- **Links** binnen de repository zijn relatief (`../begrippen.md`). Link naar een kop met een anker (`#volgende-stap`); de controle meldt kapotte ankers.
- **Afbeeldingen** krijgen een beschrijvende alt-tekst en staan in `docs/images/`.

## Samengevat

Vier vaste delen per pagina, korte zinnen met *je*, vaste woorden, getallen tussen markeringen en schema's in de vaste kleuren. Draai `npm run check:docs` voordat je iets instuurt.

## Volgende stap

Ga terug naar [ontwikkelen](ontwikkelen.md) en lees hoe je [documentatie controleert](ontwikkelen.md#documentatie-controleren).

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
