# Het voorbeeldpakket

<!-- paginatype: naslag -->

> **In het kort:** een echt conceptpakket van een bijdrager, gemaakt met `omnibus-add-report`. Hier staat wat erin zit en waarom het een bruikbaar concept is. Om zelf een bron te verwerken heb je deze pagina niet nodig; volg dan [een bron verwerken](bron-verwerken.md).

## Over het voorbeeld

Voor [issue #11](https://github.com/Robert-Worm/omnibus/issues/11) is een concept gemaakt met `omnibus-add-report`, op basis van [Hoofdlijnen auditrapporten ADR 2018](https://www.rijksoverheid.nl/documenten/2019/04/24/hoofdlijnen-auditrapporten-adr-2018). Deze bron staat in de [werklijst rapporten](werklijst-rapporten.csv), onder `2019-hoofdlijnen-auditrapporten-adr-2018`. Het is een openbaar gepubliceerde hoofdlijnennotitie van de Auditdienst Rijk met bevindingen en goede praktijkvoorbeelden. Het voorbeeld bevat echte bronpassages en eigen norm- en toetsvoorstellen.

De PDF en de officiële publicatiepagina noemen **24 april 2019**; de werklijst noemt 23 april. De PDF-datum bepaalt de gebruikte broneditie. De eerste online publicatiedatum is niet onafhankelijk vastgesteld. Het voorblad vermeldt **TER BESPREKING**. Die status blijft behouden: de publicatie wordt niet als een afzonderlijk vastgesteld assurancerapport voorgesteld.

**Download:** [voorbeeldpakket ADR 2018, versie 1](https://github.com/Robert-Worm/omnibus/releases/download/voorbeeld-adr-2018-v1/omnibus-voorbeeld-adr-2018-v1.zip) (circa 95 KiB), met [afzonderlijk SHA-256-controlegetal](https://github.com/Robert-Worm/omnibus/releases/download/voorbeeld-adr-2018-v1/omnibus-voorbeeld-adr-2018-v1.zip.sha256). De [bijbehorende release](https://github.com/Robert-Worm/omnibus/releases/tag/voorbeeld-adr-2018-v1) licht de controle en status toe. Begin na het uitpakken bij `LEESMIJ.md`.

De hele bron is gelezen. De praktische uitwerking bevat één norm met twee toetspunten over voortgangsinformatie bij de invoering van privacyregels. De punten gaan over verschillen tussen overlappende rapportages verklaren en de gemelde status onderbouwen. De overige bevindingen blijven verantwoord in de bronbank en de inclusiebesluiten. Het voorbeeld beweert niet alle onderwerpen uit het rapport tot normen uit te werken.

## Welke bestanden zitten erin?

Begin bij `LEESMIJ.md`. De bestanden hieronder vormen samen één concept; een losse norm zonder haar broncontext is geen volledige overdracht.

| Bestand | Wat je erin vindt en controleert |
| --- | --- |
| `LEESMIJ.md` | Leesvolgorde, pakketversie, afbakening en de nog open beoordeling. |
| `bron.json` | Titel, datum, officiële downloadlink, exacte PDF-hash, tekstextractiemethode en hergebruikrechten. Hiermee herken je de gebruikte broneditie. |
| `source.txt` | De ongewijzigde tekstextractie van alle zeven pagina's. Afbrekingen en bronformuleringen zijn behouden. |
| `source-text.json` | Dezelfde tekst per pagina, met paginagrenzen en hashes. Posities in citaten verwijzen naar deze vastgelegde extractie. |
| `RECONCILED-SOURCE.json` | De bronbank: bevindingen en afzonderlijke context, criteria en aanbevelingen. Ook positieve voorbeelden en bronbeperkingen blijven zichtbaar. |
| `APP-FINAL.json` | De uitgewerkte conceptnormen en toetspunten, met doel, risico, voorgestelde beheersing, vragen en uitvoerbare toetsen. `FINAL` betekent hier de overgedragen versie, niet goedgekeurde database-inhoud. |
| `CATALOGUE.json` | Het voorgestelde thema, de groepering en gemotiveerde proceskoppeling. Dit is een navigatievoorstel; het bewijst geen volledige dekking. |
| `INCLUSION-DECISIONS.json` | Per bronrecord waarom het een bouwsteen onderbouwt, alleen context biedt of buiten de praktische selectie blijft. |
| `APP-SOURCE-LINKS.json` | Welke bronrecords iedere norm onderbouwen. Controleer zowel deze koppelingen als het omgekeerde verband in de inclusiebesluiten. |
| `context.json` | Uitleg over het rapport, onderzoeksperiode en reikwijdte, plus de betekenis van de eigen voorstellen. |
| `beperkingen.md` | Bronbeperkingen en open HOLD-punten, waaronder formele toelating en beheerdersbevestiging. |
| `controle.md` | Wat daadwerkelijk is gelezen, gereviewd en technisch gecontroleerd; onderscheid tussen AI-review, zipcontrole en menselijke beoordeling. |
| `CHECKSUMS.sha256` | Controlegetallen van de overige bestanden. Deze helpen wijzigingen herkennen; ze keuren de inhoud niet goed. Bewaar de hash van de ontvangen zip apart. |

## Wat maakt dit een bruikbaar concept?

De ADR beschrijft historische bevindingen over 2018 en ontwikkelingen tot april 2019. In het voorbeeld blijven die herkenbaar als bronbevinding. Een voorgestelde norm voor een nieuw onderzoek is apart gelabeld; de oude bevinding bewijst geen huidige tekortkoming of actuele wettelijke verplichting. Ook een destijds genoemd voornemen is geen bewijs dat een maatregel later is uitgevoerd.

De tekst wordt hergebruikt op basis van de [CC0-verklaring van Rijksoverheid](https://www.rijksoverheid.nl/service/copyright). De bronvermelding blijft behouden en de eigen uitwerking wordt niet voorgesteld als instemming van de ADR of Rijksoverheid. De zip bevat een link en hash van de PDF; de oorspronkelijke PDF, logo's en pagina-afbeeldingen worden niet mee verspreid. Grafiekbeschrijvingen zijn herkenbare eigen transcripties, geen gekopieerde afbeeldingen.

## Welke controle is nog nodig?

De automatische controle bij `/inleveren` kijkt naar de zip en herkenbare onderdelen. Dat is een andere stap dan de formele controle door de beheerder, met `content:prepare` en `content:intake`. Die vraagt meer stukken, zoals reviews. Dit voorbeeld is een **concept van een bijdrager**, nog geen formeel goedgekeurd pakket. Daarom zit er geen `intake.json` of goedkeuringsbewijs in.

De zip is gecontroleerd met dezelfde bestandscontrole als bij `/inleveren`: alle 13 bestanden zijn leesbaar en de verwachte onderdelen zijn aanwezig. Ook de interne controlegetallen en letterlijke bronverwijzingen zijn gecontroleerd. De beheerder heeft op 24 oktober 2026 bevestigd dat dit het geaccepteerde voorbeeld is; zie [issue #11](https://github.com/Robert-Worm/omnibus/issues/11). Deze acceptatie betreft het voorbeeld van een bijdragersconcept.

De zip bewaart de voorbereidingsstatus van vóór publicatie. Daarom noemen de bestanden nog open publicatie en beheerdersacceptatie. De release en issue #11 geven de latere status; de gecontroleerde pakketinhoud blijft ongewijzigd. De inhoud blijft een concept voor verdere verwerking. Voor database-integratie zijn de formele toelatingsstukken en beoordeling nog nodig.

Wie het ontvangen voorbeeld opnieuw verpakt, bewaart alle bestanden en bestandsnamen, controleert eerst de meegeleverde hashes en maakt daarna een gewone zip van de pakketmap. Voeg geen ruwe reviewdossiers, lokale paden of uitvoerbare hulpmiddelen toe. Een inhoudelijke correctie krijgt een nieuwe versie met een nieuwe beoordeling.

## Volgende stap

Verwerk zelf een bron: [een bron verwerken](bron-verwerken.md).

---

[↑ Meedoen](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
