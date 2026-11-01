# Controle op verzonnen output

<!-- paginatype: naslag -->

> **In het kort:** hoe Omnibus opspoort dat een taalmodel iets verzon. We vergeleken twee SAAF-hulpmiddelen met onze eigen controles. Eén idee nemen we over, zonder taalmodel: een getal, termijn, bedrag of artikel in eigen tekst moet in de bron staan. Vastgelegd op 1 november 2026 ([#280](https://github.com/Robert-Worm/omnibus/issues/280)).

## Wat we vergeleken

| Hulpmiddel | Wat het doet | Hoe |
| --- | --- | --- |
| SAAF *judging-found-controls* | Kijkt per gevonden beheersmaatregel of hij echt in het beleidsdocument staat: ja of nee, met pagina en de letterlijke alinea | Eén taalmodelaanroep per maatregel, met het hele document erbij |
| SAAF *hallucination-detection-agent* | Haalt controleerbare beweringen uit een bevinding (artikel, maatregelnaam, termijn, getal) en houdt ze tegen een kennisbank: gedekt, niet te controleren of waarschijnlijk verzonnen | Twee taalmodelaanroepen per bevinding; een melding houdt de bevinding niet tegen |
| Omnibus `check:passages` | Elke bronpassage staat letterlijk op de opgeslagen plek in de bron | Script, zonder taalmodel, bij elke database |
| Omnibus `check:keten` | Elke selecteerbare bouwsteen heeft een bronpassage en een complete keten; meldt aannametaal en vage verwijzingen | Script, zonder taalmodel, bij elke database |
| Omnibus `check:certainty` | Meldt in normen en toetspunten mogelijke overdrijving en getallen zonder bron ([zekerheidscontrole](../claim-certainty.md)) | Script, zonder taalmodel, op aanvraag |
| Omnibus `omnibus-review-audit-quality` | Beoordeelt inhoudelijk of norm, toets en vraag kloppen en bruikbaar zijn | Skill, met een taalmodel, bij een nieuw pakket |

Beide SAAF-hulpmiddelen vragen een eigen API-sleutel. Dat past niet bij Omnibus: de beheerder gebruikt geen API-sleutel.

## Wat ze toevoegen

**judging-found-controls voegt weinig toe.** Het zoekt bij elke maatregel de alinea die hem onderbouwt. Omnibus legt die passage al vast bij het maken van een bouwsteen, en `check:passages` controleert zonder taalmodel dat hij letterlijk op de plek staat. Dat is strenger en kost niets. Of de norm ook echt volgt uit de passage, beoordelen de twee blinde lezingen en de reviews van de skills.

**hallucination-detection-agent voegt één idee toe.** Een verzonnen artikelnummer of termijn valt op als je de concrete beweringen uit de tekst haalt en ze één voor één opzoekt. Onze controles keken naar de passage, niet naar de getallen in de eigen tekst eromheen. `check:certainty` doet dat al voor getallen in normen en toetspunten, maar niet voor artikelnummers, en niet voor risico's en toetsplannen.

Twee keuzes nemen we ook over:

- **Een melding, geen blokkade.** De auditor beslist. Dat past bij hoe `check:keten` aannametaal meldt.
- **Liever *niet te controleren* dan *verzonnen*.** Een te snelle beschuldiging maakt de controle onbetrouwbaar. Daarom telt een grens niet mee, en een artikel dat elders in dezelfde bron staat ook niet.

## Wat we overnemen

`check:keten` meldt nu een bouwsteen met een getal of artikel dat niet in de bron staat. Het werkt zo:

1. Het script haalt uit de eigen tekst een termijn (*binnen 30 dagen*), een percentage, een bedrag en een artikelverwijzing (*artikel 15a*). De eigen tekst is de norm, het doel, het risico, de beheersdoelstelling, de maatregel en de toetsen. Letterlijk overgenomen brontekst telt niet mee.
2. Het zoekt elke bewering op in de bronpassage, de context en de vindplaats van die bouwsteen.
3. Een artikel telt ook als het elders in dezelfde bron voorkomt. Een wet verwijst vaak naar een ander artikel van dezelfde wet.
4. Een zin met *geen*, *niet* of *zonder* is een grens en telt niet. Een voorbeeld is *gebruik geen benchmark van 30 dagen*.

Er is geen taalmodel nodig: geen kosten en geen sleutel. De uitkomst staat in het rapport van `check:keten` en als kolom in de [kwaliteitsmeting](kwaliteitsmeting.md).

**Op de database van 30 oktober:** 1 melding bij 1.017 bouwstenen. Eén bouwsteen uit het CIO-besluit noemt in de toets *artikel 4c*. Dat artikel bestaat niet. Bedoeld is artikel 4, onderdeel c. De inhoud klopt dus, maar de verwijzing is onnauwkeurig. Dat is precies het soort fout waarvoor dit bedoeld is.

## Wat we niet overnemen

- **Een taalmodel als vaste rechter.** Een oordeel per bouwsteen kost bij 1.017 bouwstenen veel gebruik en is zelf niet foutloos. De inhoudelijke beoordeling blijft bij de skills, per nieuw pakket.
- **Een kennisbank met externe kaders.** Omnibus legt eigen tekst naast de eigen bron, niet naast een algemene verzameling ISO- of AVG-teksten. Een verwijzing naar een ander kader controleert `check:keten` al op specifiekheid.
- **Een score per bevinding.** Omnibus geeft bewust geen score per norm ([B-029](besluiten.md#b-029)).

De werkwijze komt uit [SAAF-Project/hallucination-detection-agent](https://github.com/SAAF-Project/hallucination-detection-agent) en [SAAF-Project/judging-found-controls](https://github.com/SAAF-Project/judging-found-controls). Er is geen code overgenomen; de controle is in eigen code nagebouwd, met bronvermelding volgens [B-027](besluiten.md#b-027).

## Volgende stap

De ene melding staat bij de bouwsteen uit het CIO-besluit; de verwijzing wordt verbeterd bij de volgende inhoudelijke ronde van die bron. Bekijk nieuwe meldingen bij elke [kwaliteitsmeting](kwaliteitsmeting.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
