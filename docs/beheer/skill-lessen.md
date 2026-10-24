# Lessen uit andere skillverzamelingen

<!-- paginatype: naslag -->

> **In het kort:** openbare skillverzamelingen, wat er sterk aan is voor het lezen en verwerken van documenten, en welke ideeën Omnibus wil meten. We nemen alleen iets over als de licentie het toestaat en [de testset](skill-meting.md) het bevestigt.

## De verzamelingen

Bekeken op 24 oktober 2026.

| Verzameling | Licentie | Sterk voor Omnibus |
| --- | --- | --- |
| [anthropics/skills](https://github.com/anthropics/skills) | Per skill: de meeste Apache-2.0. De skills voor pdf, docx, pptx en xlsx: alle rechten voorbehouden | `skill-creator`: testen met en zonder wijziging, tokens en tijd per run vastleggen, uitkomsten blind vergelijken. Naslag pas lezen als die nodig is |
| [openai/skills](https://github.com/openai/skills) | Per skill Apache-2.0. Verouderd; opvolger is [openai/plugins](https://github.com/openai/plugins) | `pdf`: lees de tekstlaag en maak alleen een afbeelding van een pagina als beeld ertoe doet. Korte `SKILL.md` |
| [obra/superpowers](https://github.com/obra/superpowers) | MIT | Per rol het lichtste geschikte model; elke deelagent krijgt alleen wat hij nodig heeft. Minder beurten telt zwaarder dan een lagere prijs per token |

De skills met ‘alle rechten voorbehouden’ nemen we niet over, ook niet in delen.

## Uit de lijst awesome-agent-skills

Uit [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) zijn de skills gekozen die iets zeggen over bronnen lezen, bewijs, reviews, vragen of kosten. Bekeken op 24 oktober 2026.

| Skill | Licentie | Wat Omnibus ervan kan leren |
| --- | --- | --- |
| [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | MIT | Profielen *quick*, *standard* en *deep*: meer of minder breedte, nooit een lagere bewijsdrempel. Een budget in aantal agents |
| idem | MIT | Een dekkingslogboek per run. Een eerdere bevinding telt alleen mee als de bron niet is veranderd; de rest wordt opnieuw werk |
| [GiaSip/giasip-research](https://github.com/GiaSip/giasip-skills/tree/main/skills/giasip-research) | MIT | Verzamelaars concluderen niet; elk heeft een vast maximum aan zoekstappen. Het rapport eindigt met een lijst ‘nog te controleren’ |
| idem | MIT | Eigen meting van de makers: de skill groeien van 0 naar 433 regels gaf geen betere precisie en kostte 6 tot 13 keer meer |
| [hqhq1025/skill-optimizer](https://github.com/hqhq1025/skill-optimizer) | MIT | Een vaste controlelijst voor skills: beschrijving begint met ‘wanneer’, veiligheidsregels bovenaan, geen verhalende lessen in `SKILL.md` |
| [deusyu/translate-book](https://github.com/deusyu/translate-book) | MIT | Parallelle deelagenten delen één woordenlijst. Een manifest met hashes per stuk: alleen gewijzigde stukken opnieuw doen |
| [muratcankoylan/context-optimization](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/tree/main/skills/context-optimization) | MIT | Lange tooluitvoer inkorten tot een verwijzing met kernpunten, zodra die is verwerkt |
| [massimodeluisa/recursive-decomposition-skill](https://github.com/massimodeluisa/recursive-decomposition-skill) | MIT | Een groot document eerst omzetten en in stukken verdelen; per stuk een deelagent, daarna samenvoegen |
| [deanpeters/discovery-interview-prep](https://github.com/deanpeters/Product-Manager-Skills/tree/main/skills/discovery-interview-prep) | CC BY-NC-SA 4.0 | Vraag naar wat iemand deed, niet naar wat hij zou doen. Alleen het idee; de tekst nemen we niet over |
| [trailofbits/skills](https://github.com/trailofbits/skills) | CC BY-SA 4.0 | `ask-questions-if-underspecified`: eerst vragen bij een onduidelijke opdracht. Alleen het idee; de tekst nemen we niet over |

Licenties met *ShareAlike* (SA) vragen dat je overgenomen tekst onder dezelfde licentie deelt. Dat past niet bij de licentie van de Omnibus-skills, dus daarvan nemen we alleen ideeën over.

## Ideeën om te meten

| Idee | Bron | Wat het kan besparen | Risico voor de kwaliteit |
| --- | --- | --- | --- |
| De bron één keer omzetten naar tekst, gedeeld door alle lezers; alleen pagina's met beeld of tabellen ook als afbeelding | openai/skills `pdf` | Beelden van pagina's kosten veel meer tokens dan tekst | Een tabel of figuur zonder tekstlaag wordt gemist als de selectie van pagina's niet klopt |
| Per rol een passend model: een script of licht model voor mechanisch werk (citaatposities, ID's), het sterkste model voor reconciliatie en eindreview | obra/superpowers | Minder dure beurten | Een licht model maakt meer beurten of fouten; daarom meten |
| Elke rol krijgt alleen wat hij nodig heeft: een bronlezer de bron en het uitvoercontract, niet de hele werkwijze | obra/superpowers, anthropics/skills | Kleinere context in elke beurt | Een lezer mist een regel die hij wel nodig had |
| Naslag opsplitsen per fase: de bronfase leest geen lessen voor de praktische fase | anthropics/skills | Enkele duizenden tokens per beurt | Klein |
| Een reeks vergelijkbare rapporten met één gedeelde voorbereiding: thema's en bestaande normen één keer | eigen idee, zie [#173](https://github.com/Robert-Worm/omnibus/issues/173) | De voorbereiding niet per rapport opnieuw | Een rapport krijgt minder eigen aandacht; elk pakket houdt een eigen controle |
| Profielen per bron: *standaard* voor een kort of eenvoudig rapport, *diep* met vier lezingen voor een groot of gevoelig rapport | cloudflare/security-audit-skill | Minder lezingen waar dat kan | Een bron krijgt het verkeerde profiel; daarom een vaste regel en meten |
| Bij een nieuwe database alleen opnieuw beoordelen wat is veranderd, op basis van hashes | cloudflare/security-audit-skill, deusyu/translate-book | De kwaliteitsbeoordeling van [#166](https://github.com/Robert-Worm/omnibus/issues/166) hoeft niet elke keer helemaal | Een oude beoordeling blijft staan terwijl de context wel veranderde |
| Een vast budget per run, in aantal deelagenten, dat vooraf wordt vastgelegd | cloudflare/security-audit-skill | Geen onverwacht dure runs | Bij een te klein budget blijft het werk onaf; dan HOLD, nooit stil afkappen |
| De skills door de controlelijst van skill-optimizer halen: lessen naar naslag, kern in `SKILL.md` | hqhq1025/skill-optimizer, GiaSip | Kortere instructies in elke beurt | Een les die ertoe deed, wordt minder gelezen |

Het aantal volledige lezingen (nu vier) is de grootste kostenpost. Minder lezingen is een besluit van de beheerder en gaat alleen door als de testset laat zien dat de kwaliteit gelijk blijft.

## Volgende stap

Meet een idee met [skills meten](skill-meting.md) voordat het in een skill komt.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
