# Lessen uit andere skillverzamelingen

<!-- paginatype: naslag -->

> **In het kort:** drie openbare skillverzamelingen, wat er sterk aan is voor het lezen en verwerken van documenten, en welke ideeën Omnibus wil meten. We nemen alleen iets over als de licentie het toestaat en [de testset](skill-meting.md) het bevestigt.

## De verzamelingen

Bekeken op 24 oktober 2026.

| Verzameling | Licentie | Sterk voor Omnibus |
| --- | --- | --- |
| [anthropics/skills](https://github.com/anthropics/skills) | Per skill: de meeste Apache-2.0. De skills voor pdf, docx, pptx en xlsx: alle rechten voorbehouden | `skill-creator`: een skill testen met en zonder wijziging, per run tokens en tijd vastleggen, en twee uitkomsten blind laten vergelijken. Lange naslag pas lezen als die nodig is |
| [openai/skills](https://github.com/openai/skills) | Per skill Apache-2.0. De verzameling is verouderd; opvolger is [openai/plugins](https://github.com/openai/plugins) | `pdf`: lees de tekst met een tekstextractor en maak alleen een afbeelding van een pagina als opmaak of beeld ertoe doet. Een korte `SKILL.md` met een duidelijke ‘wanneer gebruiken’ |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | Per rol het lichtste model dat de taak aankan; elke deelagent krijgt alleen wat hij nodig heeft; het aantal beurten weegt zwaarder dan de prijs per token. Eerst laten zien dat iets misgaat, dan pas de instructie schrijven |

De skills met ‘alle rechten voorbehouden’ nemen we niet over, ook niet in delen.

## Ideeën om te meten

| Idee | Bron | Wat het kan besparen | Risico voor de kwaliteit |
| --- | --- | --- | --- |
| De bron één keer omzetten naar tekst, gedeeld door alle lezers; alleen pagina's met beeld of tabellen ook als afbeelding | openai/skills `pdf` | Beelden van pagina's kosten veel meer tokens dan tekst | Een tabel of figuur zonder tekstlaag wordt gemist als de selectie van pagina's niet klopt |
| Per rol een passend model: een script of licht model voor mechanisch werk (citaatposities, ID's), het sterkste model voor reconciliatie en eindreview | obra/superpowers | Minder dure beurten | Een licht model maakt meer beurten of fouten; daarom meten |
| Elke rol krijgt alleen wat hij nodig heeft: een bronlezer de bron en het uitvoercontract, niet de hele werkwijze | obra/superpowers, anthropics/skills | Kleinere context in elke beurt | Een lezer mist een regel die hij wel nodig had |
| Naslag opsplitsen per fase: de bronfase leest geen lessen voor de praktische fase | anthropics/skills | Enkele duizenden tokens per beurt | Klein |
| Een reeks vergelijkbare rapporten met één gedeelde voorbereiding: thema's en bestaande normen één keer | eigen idee, zie [#173](https://github.com/Robert-Worm/omnibus/issues/173) | De voorbereiding niet per rapport opnieuw | Een rapport krijgt minder eigen aandacht; elk pakket houdt een eigen controle |

Het aantal volledige lezingen (nu vier) is de grootste kostenpost. Minder lezingen is een besluit van de beheerder en gaat alleen door als de testset laat zien dat de kwaliteit gelijk blijft.

## Volgende stap

Meet een idee met [skills meten](skill-meting.md) voordat het in een skill komt.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
