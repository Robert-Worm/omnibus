# Rapportpakket voorbereiden

Lees dit vóór een nieuwe rapportextractie. De inhoudelijke contracten en vijf
rolinstructies uit single-report-kit 1.1 zijn inhoudelijk ongewijzigd meegeleverd. Deze map
bevat geen rapporten, ingevulde reviews of ontvangstbewijzen.
`REVIEW-CONTRACT.json.example` bevat de oorspronkelijke contracttekst; de extra
extensie onderscheidt het voorbeeld van een werkelijk ingevulde review. Alleen
de regeleinden van dat JSON-voorbeeld zijn naar LF omgezet.

## Wat beschikbaar is

Iedere rol leest de [kwaliteitseisen](report-kit/QUALITY.md). De coördinator leest
ook het [uitvoercontract](report-kit/OUTPUT-CONTRACT.md) en de bestaande
[rapportmethode](report-method.md). Bronrollen gebruiken het
[broncontract](report-kit/contracts/CONTRACT.md), de
[recordcontrole](report-kit/contracts/record_contract.py) en de
[bronuitvoer](report-kit/SOURCE-OUTPUT.md).

De Python-recordcontrole toetst structuur, letterlijke citaten binnen de
aangeleverde context en interpretatiegrenzen. Zij bewijst geen volledige bronlezing
of inhoudelijke kwaliteit.

Voor het vastleggen en controleren van fasebewijzen is een
[afzonderlijk hulpmiddel](stage-receipts.md) meegeleverd. Het vereist een extern
vastgelegde, onafhankelijk beoordeelde hulpmiddelenversie en echte uitvoering;
het verleent geen goedkeuring.

Ook [bronvoorbereiding en invoerbevriezing](source-preparation.md) zijn beschikbaar:
de exacte PDF, volledige tekst en paginabeelden worden voor beide blinde lezingen
klaargezet. Er worden geen leeslogs of eerste inzendingen aangemaakt.

**Nog niet zelfstandig meegeleverd:** selectie/baseline/taxonomie, bevriezing van
de eerste inzendingen, reviewbasis en eindcontrole. De opdrachten met `tools/workflow.py` in het
oorspronkelijke uitvoercontract zijn dus geen werkende opdrachten in deze skillmap.
Zonder geverifieerde hulpmiddelen en echte fasebewijzen blijft voorbereidend werk
`HOLD`/`PENDING_REVIEW`. Maak geen vervangend ontvangstbewijs, leeslog, vrijgaveanker
of `APPROVE` om een controle te laten slagen. Deze bundel is nog geen zelfstandige
vrijgavestraat.

## Invoer en uitvoer per rol

| Rol | Toegestane invoer | Uitvoer |
| --- | --- | --- |
| [Bronlezer A en B](report-kit/roles/source-reader.md) | Ieder een eigen gesprek met de volledige bron, tekst- en beeldpagina's, broncontract, kwaliteitseisen en eigen taak. Geen andere lezing, oude extractie of praktische voorstellen. | Ieder een eigen `output/result.json`, `READ-LOG.json` en `VISUAL-EVIDENCE.json`. |
| [Reconciliator](report-kit/roles/reconciler.md) | Nieuw gesprek na bevriezing van beide eerste inzendingen. Volledige bron, beide lezingen en logs, contracten en vastgelegde checksums. Geen praktische voorstellen. | `RECONCILED-SOURCE.json` en `RECONCILIATION-LOG.json`. |
| [Praktische auteur](report-kit/roles/practical-author.md) | Stabiele bronbank, originele bron, beperkingen, uitvoercontract en actuele vastgelegde taxonomie. De coördinator mag deze rol uitvoeren. | Praktische voorstellen, concepten, bronlinks en inclusiebesluiten; na conceptreview de eindset en herstelverantwoording. |
| [Praktische reviewer](report-kit/roles/practical-reviewer.md) | Een eigen gesprek dat geen auteur of hersteller is. Eerst de volledige conceptset; na herstel de exacte eindset, reviewbasis, issues en diff. | `audit-draft-review.json`, later `audit-final-review.json`. |
| [Bron-eindreviewer](report-kit/roles/source-reviewer.md) | Een eigen gesprek, apart van bronlezers, reconciliator, auteur en praktische reviewer. Volledige bron met beelden, eerste lezingen, reconciliatie en alle eindbestanden. | `source-final-review.json`, met werkelijke volledige leeslog. |

Beide eindreviewers gebruiken het
[reviewcontract](report-kit/REVIEW-CONTRACT.json.example). Dit beschrijft de
vereiste velden; het is geen ingevulde beoordeling. Zij bevestigen elk de zes
exacte eindbestanden en hun afhankelijkheden. Iedere materiële wijziging vraagt
een nieuwe basis en herbeoordeling van de geraakte relaties. De auteur schrijft
nooit de goedkeuring van een reviewer.

## Afzonderlijke gesprekken zonder deelagenten

Start voor elke onafhankelijke rol een nieuw gesprek. Neem alleen de invoer uit
de tabel mee, zonder gedeelde geschiedenis of bestanden die de lezer niet mag zien.
Een nieuw gesprek is niet blind als een gedeelde projectmap de andere lezing bevat.

Gebruik deze opdracht met de werkelijke gegevens:

> Voer uitsluitend rol [rol] uit volgens de meegeleverde rolinstructie en contracten.
> Bron: [exacte editie en bestanden]. Gespreksidentiteit: [werkelijke identiteit].
> Lees alleen de toegestane invoer. Meld eerst ontbrekende bestanden of hulpmiddelen.
> Leg alleen werkelijk uitgevoerd lees- en reviewwerk vast. Lever de vaste
> uitvoerbestanden en concrete onzekerheden terug; wijzig of publiceer niets anders.

Leg fase-invoer en startbewijs vast vóór uitvoering en eindbewijs na waargenomen
voltooiing. Bewaar beide eerste inzendingen ongewijzigd vóór vergelijking.
Achteraf fases reconstrueren of andere namen boven dezelfde analyse zetten is
geen onafhankelijke uitvoering.

## Overdragen

Gebruik het [bestaande intakeplan](../assets/intake-plan.json.example). De paden
zijn voorbeelden: wijs ze naar de werkelijke bestanden met de juiste rol.
Hernoem geen bevroren eindbestanden. Zo wijst `source-review` naar de echte
`source-final-review.json`, `practical-review` naar `audit-final-review.json` en
`review-basis` naar `REVIEW-BASIS.json`. Neem ook alle afhankelijkheden mee.

Een ontvangende Omnibus-codecheckout kan `content:prepare` en `content:intake`
uitvoeren. `FILES_VERIFIED_REVIEW_REQUIRED` bevestigt bestandsrollen en ongewijzigd
transport, geen bronkwaliteit of vrijgave. Ontbrekend bewijs blijft een blokkade.
Alle bestaande broncontroles, onafhankelijke reviews en toelating blijven vereist
voordat inhoud in een database terechtkomt.
