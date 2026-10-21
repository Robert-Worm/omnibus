# Begrippen

<!-- paginatype: naslag -->

<!-- check-docs: geen-woordcontrole -->

> **In het kort:** de woorden die je in Omnibus en in deze documentatie tegenkomt, in gewone taal uitgelegd.

## Onderzoek en inhoud

| Begrip | Betekenis |
| --- | --- |
| <a id="referentiekader"></a>Referentiekader | De normen en toetspunten waarmee je een organisatie, proces of onderwerp onderzoekt, gekoppeld aan je onderzoeksvragen. Elders heet dit toetsingskader of auditkader. |
| <a id="norm"></a>Norm | Waar de organisatie aan zou moeten voldoen. |
| <a id="toetspunt"></a>Toetspunt | Een concrete controle bij een norm: wat je bekijkt om te beoordelen of de norm wordt gehaald. |
| <a id="bouwsteen"></a>Bouwsteen | Alles wat je in Omnibus kunt kiezen: normen, toetspunten en modelvragen. |
| <a id="bron"></a>Bron | Waar een bouwsteen vandaan komt: een rapport, een wet, een kader of een onderzoeksmodel. |
| <a id="bronpassage"></a>Bronpassage | Het stuk tekst in de bron waarop een bouwsteen is gebaseerd. Omnibus markeert het in de oorspronkelijke tekst. |
| <a id="vraaggestuurd"></a>Vraaggestuurd | Een onderzoek dat begint bij een vraag van de opdrachtgever. |
| <a id="risk-based"></a>Risk-based | Een onderzoek dat begint bij signalen of zorgen, en eerst de risico's verkent. |
| <a id="werkvorm"></a>Werkvorm | De indeling van het Excel-bestand: normtoetsing, risico-controlmatrix of interviewleidraad. |
| <a id="adr"></a>ADR | Auditdienst Rijk, de interne auditdienst van de rijksoverheid. |

## Bijdragen

| Begrip | Betekenis |
| --- | --- |
| <a id="claimen"></a>Claimen (check-out) | Een bron op je naam zetten, zodat niemand anders er tegelijk aan werkt. |
| <a id="inleveren"></a>Inleveren (check-in) | Je verwerkte bron teruggeven aan de beheerder, met `/inleveren` in je claim. |
| <a id="vrijgeven"></a>Vrijgeven | Je claim opgeven, met `/vrijgeven`. De bron komt dan weer vrij. |
| <a id="skill"></a>Skill | Een werkwijze voor je AI-assistent: een map met instructies die de assistent stap voor stap volgt. Je roept hem aan met de naam, zoals `$omnibus-add-report`. |
| <a id="concept"></a>Concept | Wat een bijdrager inlevert: bouwstenen met bronpassages, nog niet formeel gecontroleerd. |
| <a id="hold"></a>HOLD | Een punt dat nog niet goed genoeg onderbouwd is, omdat bewijs of een controle ontbreekt. HOLD-punten blijven zichtbaar en worden nooit stilletjes goedgekeurd. |
| <a id="aanbevolen-rapport"></a>Aanbevolen rapport | Een van de <!--n:aanbevolen-->542<!--/n--> adviesrapporten van de ADR. Die leveren veel bruikbare normen op. |

## Techniek

| Begrip | Betekenis |
| --- | --- |
| <a id="database"></a>Database | Het bestand met alle verwerkte bronnen (`catalogue.sqlite`). Staat los van de code, bij de releases. |
| <a id="release"></a>Release | Een uitgave op GitHub. De database staat als zip bij een release. |
| <a id="hash"></a>Hash (controlegetal) | Een lange code die verandert als een bestand verandert. Omnibus gebruikt het om te controleren dat database en applicatie bij elkaar horen. |
| <a id="pakket"></a>Pakket | Een map met een verwerkte bron en alles wat erbij hoort, zoals de bronpassages en reviews. |
| <a id="manifest"></a>Manifest | Een lijst van de bestanden in een pakket, met hun controlegetallen (`intake.json`). |
| <a id="mcp"></a>MCP | Model Context Protocol: een standaard waarmee AI-assistenten hulpmiddelen zoals Omnibus kunnen gebruiken. |
| <a id="runtimepakket"></a>Runtimepakket | Omnibus zonder ontwikkelomgeving, klaar om op een andere computer of server te draaien. |

## Volgende stap

Terug naar de [wegwijzer](README.md).

---

[↑ Wegwijzer](README.md) · [Routekaart](routekaart.md)
