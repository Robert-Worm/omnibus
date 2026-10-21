# Begrippen

<!-- paginatype: naslag -->

<!-- check-docs: geen-woordcontrole -->

> **In het kort:** de woorden die je in Omnibus en in deze documentatie tegenkomt, in gewone taal uitgelegd.

## Onderzoek en inhoud

| Begrip | Betekenis |
| --- | --- |
| **Referentiekader** | De set normen en toetspunten waarmee je een organisatie, proces of onderwerp onderzoekt, gekoppeld aan je onderzoeksvragen. Elders heet dit ook wel toetsingskader of auditkader; in Omnibus heet het altijd referentiekader. |
| **Norm** | Waar de organisatie aan zou moeten voldoen. |
| **Toetspunt** | Een concrete controle bij een norm: wat je bekijkt om te beoordelen of de norm wordt gehaald. |
| **Bouwsteen** | Alles wat je in Omnibus kunt kiezen: normen, toetspunten en modelvragen. |
| **Bron** | Waar een bouwsteen vandaan komt: een rapport, een wet, een kader of een onderzoeksmodel. |
| **Bronpassage** | Het stuk tekst in de bron waarop een bouwsteen is gebaseerd. Omnibus markeert het in de oorspronkelijke tekst. |
| **Vraaggestuurd** | Een onderzoek dat begint bij een vraag van de opdrachtgever. |
| **Risk-based** | Een onderzoek dat begint bij signalen of zorgen, en eerst de risico's verkent. |
| **Werkvorm** | De indeling van het Excel-bestand: normtoetsing, risico-controlmatrix of interviewleidraad. |
| **ADR** | Auditdienst Rijk, de interne auditdienst van de rijksoverheid. |

## Bijdragen

| Begrip | Betekenis |
| --- | --- |
| **Claimen (check-out)** | Een bron op je naam zetten, zodat niemand anders er tegelijk aan werkt. |
| **Inleveren (check-in)** | Je verwerkte bron teruggeven aan de beheerder, met `/inleveren` in je claim. |
| **Vrijgeven** | Je claim opgeven, met `/vrijgeven`. De bron komt dan weer vrij. |
| **Skill** | Een werkwijze voor je AI-assistent: een map met instructies die de assistent stap voor stap volgt. Je roept hem aan met de naam, zoals `$omnibus-add-report`. |
| **Concept** | Wat een bijdrager inlevert: bouwstenen met bronpassages, nog niet formeel gecontroleerd. |
| **HOLD** | Een punt dat nog niet goed genoeg onderbouwd is, omdat bewijs of een controle ontbreekt. HOLD-punten blijven zichtbaar en worden nooit stilletjes goedgekeurd. |
| **Aanbevolen rapport** | Een van de <!--n:aanbevolen-->542<!--/n--> adviesrapporten van de ADR. Die leveren veel bruikbare normen op. |

## Techniek

| Begrip | Betekenis |
| --- | --- |
| **Database** | Het bestand met alle verwerkte bronnen (`catalogue.sqlite`). Staat los van de code, bij de releases. |
| **Release** | Een uitgave op GitHub. De database staat als zip bij een release. |
| **Hash (controlegetal)** | Een lange code die verandert als een bestand verandert. Omnibus gebruikt het om te controleren dat database en applicatie bij elkaar horen. |
| **Pakket** | Een map met een verwerkte bron en alles wat erbij hoort, zoals de bronpassages en reviews. |
| **Manifest** | Een lijst van de bestanden in een pakket, met hun controlegetallen (`intake.json`). |
| **MCP** | Model Context Protocol: een standaard waarmee AI-assistenten hulpmiddelen zoals Omnibus kunnen gebruiken. |
| **Runtimepakket** | Omnibus zonder ontwikkelomgeving, klaar om op een andere computer of server te draaien. |

## Volgende stap

Terug naar de [wegwijzer](README.md).

---

[↑ Wegwijzer](README.md) · [Routekaart](routekaart.md)
