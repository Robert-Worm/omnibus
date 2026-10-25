# Skills meten

<!-- paginatype: taak -->

> **In het kort:** zo meet je wat een skill kost en oplevert: tijd, tokens en een kwaliteitsscore, op een vaste testset van openbare bronnen. Een optimalisatie gaat alleen door als de kwaliteit nergens daalt ([B-018](besluiten.md#b-018)).

## Wat meet je?

| Wat | Hoe | Waar het vandaan komt |
| --- | --- | --- |
| Vaste leeskosten | Tokens van `SKILL.md` en de naslag die de skill altijd laat lezen | `npm run skills:meting` |
| Leeskosten van de bron | Tokens van de tekstlaag van de bron, maal het aantal volledige lezingen in de werkwijze | `npm run skills:meting -- --database <catalogue.sqlite>` |
| Tijd en tokens van een run | Begin/eindtijden en beschikbare verzoektelemetrie van de werkelijk gebruikte contexten | Jij legt het vast in [de metingen](#metingen) |
| Kwaliteit | OAK-score van 1 tot 10 uit [`omnibus-review-audit-quality`](../../skills/omnibus-review-audit-quality/README.md) | Jij legt het vast in [de metingen](#metingen) |

Tokens in het script zijn een schatting: 3,5 tekens per token voor Nederlandse tekst. Beelden van pagina's tellen niet mee; die kosten meer.

## De testset

Vier openbare bronnen uit de database: klein, middel en groot.

| Skill | Bron | Waarom |
| --- | --- | --- |
| `omnibus-add-report` | LVVN26 | Klein rapport (14 pagina's) |
| `omnibus-add-report` | PROO26 | Middelgroot rapport (19 pagina's, veel tekst) |
| `omnibus-add-report` | IVHO25 | Groot rapport (41 pagina's) |
| `omnibus-add-framework` | TR-CYBER, hoofdtekst | Kort kader (6 pagina's) |

De testset staat ook in `scripts/skill-meting.mjs`. Verander hem alleen met een nieuw besluit; anders zijn metingen niet te vergelijken.

## Stap voor stap

1. **Meet de vaste kosten.** Draai `npm run skills:meting -- --database local-data/runtime/catalogue.sqlite`.
2. **Draai de skill op elke bron uit de testset**, in een nieuwe chat, met hetzelfde model. Begin met één pilot. Leg vooraf broneditie en SHA-256, repositoryversie en hashes van de gebruikte skills/naslag, model, rolverdeling en maximaal aantal deelagenten vast. Noteer per daadwerkelijk uitgevoerde fase context-ID, begin/eindtijd en beschikbare verzoektelemetrie. Behoud de twee blinde lezers, onafhankelijke reconciliatie, conceptreview en afzonderlijke eindreviews. Een bestaande bronbank telt niet als nieuwe extractie.
3. **Beoordeel het resultaat** met `omnibus-review-audit-quality`. Alleen volledige bron- en ketendekking levert een totaalscore op. Bewaar ruwe onafhankelijke oordelen; los materiële verschillen met bewijs op. Een steekproefscore of gemiddelde van onbesliste tegenstrijdige oordelen is geen rapportscore.
4. **Leg de run vast** als regel in [de metingen](#metingen).
5. **Vergelijk** een nieuwe versie met de vorige op dezelfde bronnen. Daalt de score bij één bron, dan gaat de wijziging niet door.

*Gelukt als:* elke bron uit de testset een regel heeft voor de oude en de nieuwe versie.

Bewaar bronbestanden, fasebewijzen, ruwe reviews en verzoeklogs uitsluitend in een private, genegeerde werkmap. De openbare tabel bevat alleen de samenvatting. Onbeschikbaar verbruik of een ontbrekende score is `null`, met de reden bij de registratie. Noteer input, cache-input, output en redeneertokens afzonderlijk waar beschikbaar: cache-input zit al in input en redeneertokens zitten al in output. Subscriptioncredits zijn geen eurofactuur. Kosten zonder werkelijke factuur- of verzoekgegevens blijven `null`; de tekstschatting hierboven blijft apart.

Scheid voorbereiding, inhoudelijke uitvoering en technisch onderhoud. Een vastgelopen intake krijgt HOLD en telt niet als een voltooide run. Geen fase achteraf reconstrueren, ontbrekend bewijs vervangen of kitcontroles aanpassen om de meting te laten slagen.

`vergelijk(oud, nieuw)` verlangt aan beide kanten precies één regel per vaste bron/skill, een geldige score van 1–10, één repositoryversie per reeks en hetzelfde model. Lege, onvolledige, dubbele en gemengde reeksen worden geweigerd. Kies de oude en nieuwe versie expliciet vóór de vergelijking. Dit controleert de meettabel; het bewijst geen bronlezing, juiste hashes of onafhankelijke review. Die bewijzen blijven onderdeel van het private dossier. Lagere scores bij één bron blokkeren de vergelijking, ook bij minder tokens.

## Geschatte leeskosten

Gemeten op 24 oktober 2026, met de skills uit deze repository.

**Vaste leeskosten per skill** (tokens, geschat)

| Skill | Altijd | Alleen als nodig |
| --- | ---: | ---: |
| `omnibus-add-framework` | 8.319 | 0 |
| `omnibus-add-model` | 5.430 | 0 |
| `omnibus-add-report` | 8.206 | 0 |
| `omnibus-build-questions` | 8.283 | 0 |
| `omnibus-curate-themes` | 5.033 | 2.826 |
| `omnibus-review-audit-quality` | 7.433 | 2.591 |
| `omnibus-review-questions` | 5.605 | 0 |

**Leeskosten van de bron** (tokens, alleen de tekstlaag)

| Bron | Pagina's | Eén lezing | Vier lezingen |
| --- | ---: | ---: | ---: |
| LVVN26 | 14 | 7.741 | 30.964 |
| PROO26 | 19 | 13.625 | 54.500 |
| IVHO25 | 41 | 33.839 | 135.356 |
| TR-CYBER, hoofdtekst | 6 | 3.215 | 12.860 |

Wat dit laat zien:

- **De bron lezen kost het meest.** De werkwijze voor rapporten en kaders laat de bron vier keer volledig lezen: twee lezers, een reconciliator en een eindreviewer. Bij een rapport van 41 pagina's is dat ruim zestien keer zoveel als de instructies.
- **Werkelijk verbruik vraagt verzoektelemetrie.** Herhaalde context, cache, uitvoer en beelden staan niet volledig in deze tekstschatting. Leid daaruit geen werkelijke tokens of kosten af.

## Metingen

Er is nog geen volledige nulmeting. De eerste LVVN26-pilot heeft uitsluitend de intake doorlopen en staat op HOLD. `Agents` telt daadwerkelijk gestarte deelagenten; de coördinator staat afzonderlijk in het private dossier. Minuten en tokens hieronder betreffen een volledige inhoudelijke run en blijven bij deze geblokkeerde intake `null`.

| Datum | Skill | Bron | Versie | Model | Agents | Minuten | Tokens | Score |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| 2026-10-25 | omnibus-add-report | LVVN26 | c1c0586 | gpt-6-astra | 0 | null | null | null |

**Partiële nulmeting van 25 oktober 2026 — HOLD.** De originele PDF (14 pagina's) en de onafhankelijke vrijgave van rapportkit 1.1 zijn gevonden; alle 29 kitbestanden zijn geverifieerd. De publieke checkout mist het auteursregister dat de kit nodig heeft. Een afzonderlijke intakeproef met het beschikbare private register weigert LVVN26 met `Report already active`. Beide proeven eindigden zonder een analysepakket te maken. De gelijkheid van die private applicatiebasis met de huidige runtime is niet aangetoond.

Alleen de coördinator heeft titel en colofon in tekst en beeld gecontroleerd. Geen blinde lezing, reconciliatie, praktische uitwerking, eindreview of OAK-panel is uitgevoerd; er is dus geen OAK-score of inhoudelijke PASS. Het private dossier bevat de bron- en skillhashes, contextidentiteit, tijden, intake-uitkomsten en apart gemeten voorbereidingsverbruik. De bestaande database is uitsluitend gelezen.

De afzonderlijke coördinatorregistratie beslaat 14:23:29 tot 14:33:20 UTC: 591,857 seconden, inclusief voorbereiding en onderhoud van het meetscript. In dit afgebakende venster zijn 26 verzoeken vastgelegd met 2.614.136 inputtokens (waarvan 2.504.320 cache-input) en 22.597 outputtokens (waarvan 7.020 redeneertokens), samen 2.636.733 tokens. Dit zijn werkelijke lokale tellers voor dit voorbereidingswerk, geen verbruik of doorlooptijd van een volledige rapportverwerking. Eurokosten zijn `null`: er is geen factuurbedrag beschikbaar. Latere overdracht valt buiten dit venster.

**Nog te controleren:** eerst is een geverifieerde route nodig om een reeds aanwezige testbron met ongewijzigde identiteit en bronwaarborgen opnieuw te verwerken. De kit of het auteursregister is voor deze pilot niet aangepast. Daarna volgt LVVN26 met alle rollen en volledige OAK-dekking. PROO26, IVHO25 en TR-CYBER volgen afzonderlijk met hetzelfde model en dezelfde vastgelegde skillbasis; deze drie runs zijn niet gestart. De story blijft open tot de volledige vaste testset werkelijk is gemeten.

`npm run skills:meting -- --metingen` vat de vastgelegde runs samen.

## Samengevat

Meet vaste kosten met het script, draai de skill op de vier bronnen van de testset, beoordeel met de OAK-score en leg elke run vast. Daalt de score bij één bron, dan gaat de wijziging niet door.

## Volgende stap

Lees welke ideeën uit andere skillverzamelingen we meten in [lessen uit andere skills](skill-lessen.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
