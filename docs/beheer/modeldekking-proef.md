# Proef met modeldekking

<!-- paginatype: naslag -->

> **In het kort:** de proef van 25 oktober 2026 voor [#200](https://github.com/Robert-Worm/omnibus/issues/200) is afgerond. SERVQUAL en COM-B hebben inhoudelijke aandachtspunten; de modellen zijn hiermee niet vrijgegeven.

## Zo gebruik je deze pagina

De codes verwijzen naar bestaande dimensies, indicatoren en vragen. Modelteksten, bronpassages, ruwe lezingen, voorstellen en controlegetallen blijven in het private dossier.

## Wat is onderzocht?

Basis: `a223bfeec7360d25b5314f4a23b40450ecd5cb63` en één vastgezette databasepublicatie, uitsluitend gelezen. Werkelijke modelgegevens, cycleruitvoer, bronnen en instructies zijn met SHA-256 vastgelegd.

| Model | Dimensies en indicatoren | Hoofdvragen en niveaus | Cyclerstanden |
| --- | --- | --- | --- |
| SERVQUAL | 5 dimensies, 10 indicatoren | 10 hoofdvragen; standaardtekst en alle 3 niveaus | 120, inclusief 30 beginstanden |
| COM-B | 3 dimensies, 6 indicatoren | 30 hoofdvragen; standaardtekst en alle 3 niveaus | 360, inclusief 90 beginstanden |

Ook centrale vragen, dimensievragen, vijf SERVQUAL-deelvragen en alle doorvragen zijn beoordeeld. De onderzoeksvraagcycler leverde daarnaast 31 SERVQUAL-standen en 4 ongewijzigde COM-B-standen. Onderwerpvervanging is gecontroleerd met een proces, organisatieonderdeel en concreet gedrag. Een passende teamnaam bakent het gedrag nog niet af.

Twee afzonderlijke AI-contexten beoordeelden dezelfde inhoud: theorie/brongebruik en praktische vraagkwaliteit. Hun ruwe oordelen en de afweging van verschillen bleven apart. Dit is geen menselijke of psychometrische validatie.

De [vraagcriteria](../../skills/omnibus-review-questions/references/criteria.md#4-operationalisatie) en [modelrubriek](../../skills/omnibus-add-model/references/question-quality.md) uit `49ce66e` zijn toegepast en ongewijzigd behouden. Een illustratief voorbeeld is geen voorafgaande goedkeuring van de hele dimensie.

## Bronbasis en grenzen

SERVQUAL: oorspronkelijke [publicatiescan uit 1988](https://zenodo.org/records/14579730), met dezelfde hash als de vermelde editie. De aanvullende [tekst uit 1991](https://go.gale.com/ps/i.do?asid=6ecb0a38&id=GALE%7CA12417917&it=r&p=AONE&u=googlescholar&v=2.1) mist tabellen. Controle van die volledige publicatie blijft **HOLD**.

COM-B: primaire [artikeltekst uit 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3096582/), met eigen hash. De historische PDF is niet verkregen; diens hash en paginering blijven onbevestigd. Supplementen zijn niet als gelezen aangemerkt.

De eigen kwalitatieve vragen leveren geen gevalideerde schaal, score, bewezen oorzaak of afnemersoordeel op.

## Uitkomst per dimensie

**Behouden:** bruikbaar binnen de afbakening. **Herschrijven:** herstelvoorstel, nog niet toegepast. **HOLD:** dekking of gebruik nog onvoldoende bevestigd. Hoofdvragen en doorvragen zijn apart beoordeeld.

| Dimensie | Ontbrekende dekking | Ongewild meemeten | Uitkomst en betrokken codes |
| --- | --- | --- | --- |
| SERVQUAL · zichtbare kenmerken (`SQ-TANGIBLES`) | Presentatie van personeel heeft geen herkenbare vraag. De bestaande vragen bestrijken een smallere selectie. | Geen technische werking in de onderzochte formuleringen. Interne antwoorden blijven gescheiden van afnemersoordeel. | **HOLD** op volledige dekking. `SQ-TANGIBLES-Q01` en `SQ-TANGIBLES-Q02` behouden voor hun beperkte invalshoek; afbakening herzien. |
| SERVQUAL · betrouwbare uitvoering (`SQ-RELIABILITY`) | Geen gat gevonden binnen de afgebakende interne module. | Juistheid van een resultaat is geen bewijs van tevredenheid. Doorvragen bewaken dat onderscheid. | **Behouden:** `SQ-RELIABILITY-Q03` en `SQ-RELIABILITY-Q04`. |
| SERVQUAL · reageren en helpen (`SQ-RESPONSIVENESS`) | Eerste reactie, moment van handelen en vervolginformatie komen aan bod. | Reageren mag niet worden uitgelegd als voltooiing van een toezegging. | **Behouden:** `SQ-RESPONSIVENESS-Q05` en `SQ-RESPONSIVENESS-Q06`, met hun doorvragen en eigen rolcontext. |
| SERVQUAL · deskundig contact (`SQ-ASSURANCE`) | Geen gat gevonden binnen de eigen module voor handelen en bekende reacties. | Zonder de kennisgerichte doorvragen kan de brede hoofdvraag ook reageren en helpen raken. Vertrouwen wordt niet namens afnemers ingevuld. | **Behouden als vraag mét doorvragen:** `SQ-ASSURANCE-Q07` en `SQ-ASSURANCE-Q08`. |
| SERVQUAL · persoonlijke aandacht (`SQ-EMPATHY`) | Informatie vernemen en meewegen hebben ieder een vraag. | Persoonlijke aandacht wordt geen verplichting om wensen te vervullen of regels te doorbreken. | **Behouden:** `SQ-EMPATHY-Q09` en `SQ-EMPATHY-Q10`. |
| COM-B · kunnen (`COMB-C`) | `COMB-C-I02` noemt emotionele en gedragsvaardigheden; `COMB-C-Q06` tot en met `COMB-C-Q10` vragen vooral cognitieve vaardigheden uit. | Uitvoering alleen bewijst geen bekwaamheid. Fysieke vragen vereisen een relevante lichamelijke handeling; hulpmiddelen raken ook gelegenheid. | **HOLD** op volledige dekking van `COMB-C-I02`. Dimensieonderzoeksvraag herzien op breedte. Doorvragen van `COMB-C-Q05` **herschrijven**; overige hoofdvragen behouden binnen hun afbakening. |
| COM-B · gelegenheid (`COMB-O`) | Beide indicatoren hebben passende ingangen; geen afzonderlijk gat vastgesteld. | Beschikbaarheid blijft onderscheiden van eigen vaardigheid, prioriteit en reactie. | Hoofdvragen **behouden**. Gesloten doorvragen van `COMB-O-Q05`, `COMB-O-Q07` en `COMB-O-Q08` **herschrijven**. |
| COM-B · motivatie (`COMB-M`) | Beide indicatoren zijn vertegenwoordigd. De ingang naar eerdere ervaringen vraagt verduidelijking. | `COMB-M-Q10` kan bewuste terugblik oproepen zonder die te onderscheiden van een spontane associatie. | Doorvragen van `COMB-M-Q10` **herschrijven** om het onderscheid te onderzoeken. Ook doorvragen van `COMB-M-Q05`, `COMB-M-Q06`, `COMB-M-Q07` en `COMB-M-Q08` **herschrijven**; hoofdformuleringen behouden. |

Geen cyclerstand introduceerde een afzonderlijk nieuw gebrek; bestaande gebreken blijven doorwerken. COM-B vraagt op elk niveau naar eigen handelen. Gelijke niveauzinnen zijn daar niet automatisch fout.

## Verschillen en vormcontrole

De vorm-HOLD bij `SQ-RQ02` en `COMB-C` is opgelost: samenhangende vraagdelen. Het afzonderlijke advies om de COMB-C-onderzoeksvraag inhoudelijk te verbreden blijft staan.

De reviewers verschilden over vijf identieke SERVQUAL-dimensievragen: ongeschikte deelvragen tegenover herhaalde centrale context. Code-inspectie bevestigt gebruik van `SQ-RQ01` tot en met `SQ-RQ05` in de gewone voorstelroute. Die route is hierdoor niet fout. Zelfstandig gebruik van de duplicaten als deelvragen blijft **HOLD**.

De acht praktische herschrijfvoorstellen zijn vormelijk gecontroleerd. Bij `COMB-M-Q06` en `COMB-M-Q07` moet opener taal het onderscheid tussen bewust en automatisch handelen behouden.

## Nog te controleren

Open blijven de dekkingsclaims bij `SQ-TANGIBLES` en `COMB-C-I02`, zelfstandig gebruik van de vijf duplicaatvelden en bovengenoemde bronbeperkingen.

Alle voorstellen vragen inhoudelijke herbeoordeling, ook de aanvullende doorvragen voor `COMB-M-Q10`. Deze review keurt geen toekomstige correctie goed.

## Afsluitingsadvies voor #200

| Acceptatiecriterium | Uitkomst | Bewijs |
| --- | --- | --- |
| Aangevulde criteria met goed en slecht voorbeeld | Voldaan | `49ce66e` aanwezig en toegepast; geen aangetoonde instructiefout. |
| Proef op twee modellen, uitkomst per dimensie | Voldaan | Beide modellen, alle acht dimensies, hoofdvragen, niveaus, doorvragen en beschikbare cyclerstanden zijn beoordeeld. Bevindingen en HOLD zijn hierboven zichtbaar. |
| Geen tekst uit de ShareAlike-ideeënbibliotheek overgenomen | Voldaan voor deze proef | Eigen tekst; ideeënrepository niet geopend. Bestaande voorbeelden intact. |

Advies: sluit #200 na review. De inhoudsproblemen blokkeren modelvrijgave, niet de afgeronde methodeproef.

## Volgende stap

Behandel inhoudelijke correcties via de [gewone publicatieroute](reviewwijzigingen.md). Deze proef wijzigt geen vragen, selecties, projecten of database.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
