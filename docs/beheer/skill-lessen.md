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

Tweede ronde, bekeken op 24 oktober 2026:

| Skill | Licentie | Wat Omnibus ervan kan leren |
| --- | --- | --- |
| [lawve-ai: proposition-audit](https://github.com/lawve-ai/awesome-legal-skills/tree/main/skills/proposition-audit-anthony-searle) | Apache-2.0 | Elke bewering apart: soort (feit, verwijzing, juridische stelling, interpretatie) en gewicht (dragend, ondersteunend, illustratie). Dragende beweringen grondig controleren |
| idem | Apache-2.0 | Het oordeel *aangevuld*: de bron bestaat en steunt de bewering deels, maar er zijn details bij verzonnen |
| [frmoretto/clarity-gate](https://github.com/frmoretto/clarity-gate) | CC BY 4.0 | Controlepunten voor zekerheid: aanname zichtbaar, oud als nieuw gepresenteerd, getallen zonder bron, tegenstrijdige getallen |
| [GarethManning/assessment-validity-checker](https://github.com/GarethManning/education-agent-skills/tree/main/skills/curriculum-assessment/assessment-validity-checker) | CC BY-SA 4.0 | Meet de vraag wat hij moet meten? Wat meet hij ongewild mee, en welk deel van het begrip mist? Alleen het idee |
| [anthropics/mcp-builder](https://github.com/anthropics/skills/tree/main/skills/mcp-builder) | Apache-2.0 | Tien realistische vragen waarmee je test of een AI de MCP-koppeling goed gebruikt |
| [zscole/model-hierarchy-skill](https://github.com/zscole/model-hierarchy-skill) | MIT | Taken vooraf indelen als routine, gemiddeld of complex, en per soort een passend model kiezen |
| [forjd/better-writing](https://github.com/forjd/better-writing) | MIT | Tekst herschrijven zonder feiten toe te voegen, getest met vaste voorbeelden |
| [talkstream/ru-text](https://github.com/talkstream/ru-text) | MIT | Een grote, controleerbare set taalregels voor één taal. Voorbeeld voor een Nederlandse B1-set |

Licenties met *ShareAlike* (SA) of een eigen ‘alleen gebruiken’-licentie, zoals [hedralab/eskill](https://github.com/hedralab/eskill), vragen dat je overgenomen tekst onder dezelfde licentie deelt. Dat past niet bij de licentie van de Omnibus-skills, dus daarvan nemen we alleen ideeën over. Bij CC BY 4.0 mag overnemen met naamsvermelding.

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
| Beweringen sorteren op gewicht: dragende beweringen uit een norm of toetspunt altijd tegen de bron, illustraties alleen steekproefsgewijs | lawve-ai: proposition-audit | Minder leeswerk in de kwaliteitsbeoordeling van [#166](https://github.com/Robert-Worm/omnibus/issues/166) | Een fout in een ‘illustratie’ blijft staan; daarom het oordeel per bron vastleggen |
| Het oordeel *aangevuld* toevoegen aan [`omnibus-review-audit-quality`](../../skills/omnibus-review-audit-quality/README.md) | lawve-ai: proposition-audit | Geen besparing; vangt verzonnen details | Klein |
| Zekerheidscontrole: historisch als actueel, een aanname als feit, een getal zonder bron | frmoretto/clarity-gate | Deels als script te doen, zonder AI | Een script mist betekenis; het blijft een voorcontrole |
| Bij een model nagaan of de vragen samen het hele begrip dekken, en niets anders meten | GarethManning/assessment-validity-checker | Geen besparing; betere operationalisatie | Klein |
| Tien vaste testvragen voor de MCP-koppeling, met een verwacht antwoord | anthropics/mcp-builder | Een AI-test voor [#148](https://github.com/Robert-Worm/omnibus/issues/148) en [#146](https://github.com/Robert-Worm/omnibus/issues/146) zonder handwerk | De vragen raken verouderd bij een nieuwe database |
| Een vaste regel voor de labels Opus 5.5 en ChatGPT Astra ([B-019](besluiten.md#b-019)), naar soort taak | zscole/model-hierarchy-skill | Minder twijfel bij nieuwe issues | Een taak blijkt zwaarder dan gedacht; dan het label aanpassen |

Het aantal volledige lezingen (nu vier) is de grootste kostenpost. Minder lezingen is een besluit van de beheerder en gaat alleen door als de testset laat zien dat de kwaliteit gelijk blijft.

## Volgende stap

Skills versterken in epic [#195](https://github.com/Robert-Worm/omnibus/issues/195) is afgerond: alle negen stories, [#196](https://github.com/Robert-Worm/omnibus/issues/196) tot en met [#204](https://github.com/Robert-Worm/omnibus/issues/204), zijn gesloten met gekoppeld bewijs.

De efficiëntie-experimenten blijven apart en gepauzeerd: epic [#169](https://github.com/Robert-Worm/omnibus/issues/169), het inkorten van instructies in [#172](https://github.com/Robert-Worm/omnibus/issues/172) en [#190](https://github.com/Robert-Worm/omnibus/issues/190) tot en met [#194](https://github.com/Robert-Worm/omnibus/issues/194). De afronding van #195 hervat deze experimenten niet. Meet een idee met [skills meten](skill-meting.md) voordat het in een skill komt.

Testvragen voor de AI-koppeling staan apart in [#186](https://github.com/Robert-Worm/omnibus/issues/186).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
