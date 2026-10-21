# Checklist live demo

<!-- paginatype: logboek -->

> **In het kort:** wat er nog moet gebeuren voor een online demo. Per stap: wie het doet, wanneer, en wanneer het klaar is. Doel: een werkende demo op **1 december 2026**.

## Waar staat dit?

Het werk op de eigen computer is af: de app, het runtimepakket, de image en alle lokale proeven. De proefversie draait online. Wat nog open staat, moet **op de echte server** worden bewezen, of door **mensen** worden getest. Lokale tests zijn daarvoor niet genoeg.

Sinds 21 oktober 2026 staat een proefversie online op [omnibus.sliplane.app](https://omnibus.sliplane.app), bij de hostingpartij Sliplane. De openbare database zit daarbij gecontroleerd in de image ([container-route](../../hosting/container/README.md)), dus een aparte database of schijf is niet nodig. Stap 3 hieronder vervalt daarmee zolang de database openbaar is. Accounts, betalingen en een openbare AI-koppeling horen er niet bij. Deze checklist en [pad A van de routekaart](../routekaart.md#pad-a--online-versie) noemen dezelfde stappen. De [kwaliteitsbacklog](https://github.com/Robert-Worm/omnibus/issues?q=is%3Aissue+label%3Akwaliteit) staat er los van: die is geen voorwaarde voor de demo.

## De checklist

| Stap | Wie | Streefdatum |
| --- | --- | --- |
| 1. Database kiezen | Beheerder (inhoud) | eind oktober |
| 2. Code en runtimepakket vastzetten | Ontwikkelaar | eind oktober |
| 3. Eerste ontvangst op de server | Hostingbeheerder | begin november |
| 4. Werking op de server | Hostingbeheerder en een beoordelaar | begin november |
| 5. Storingen signaleren | Hostingbeheerder | begin november |
| 6. Back-up en herstel | Hostingbeheerder | 20 november |
| 7. Beveiliging beoordelen | Onafhankelijke beoordelaar | 20 november |
| 8. Overdracht | Ontwikkelaar | 20 november |
| 9. Gebruikers testen | Demonstrator en een onafhankelijke tester | 20 november |
| 10. Vrijgavebesluit | Eigenaar | 27 november |
| 11. Generale repetitie | Eigenaar en ontwikkelaar | 30 november |

De data zijn streefdata. Ze geven geen toestemming om diensten aan te zetten of kosten te maken.

## Klaar wanneer

Elke stap is klaar als het volgende geldt.

1. **Database kiezen.** De database en de rechten op de inhoud zijn beoordeeld. Er gaan geen privébestanden of persoonlijke paden mee.
2. **Code en runtimepakket vastzetten.** De code is beoordeeld en getest, de echte image is gebouwd, de basis-image is gecontroleerd op beveiligingsupdates. De openbare database zit gecontroleerd in de image ([container-route](../../hosting/container/README.md)); een niet-openbare database nooit.
3. **Eerste ontvangst op de server.** Er is een beveiligde manier om de database over te zetten. Schijf, gebruikers en leesrechten zijn vastgesteld. De tijdelijke [eerste start](../../hosting/first-start/README.md) is netjes beëindigd. Vervalt zolang de database openbaar is.
4. **Werking op de server.** Beveiligde verbinding (TLS), adres- en herkomstcontroles, gezondheidscontroles, foutafhandeling, logboeken en snelheid werken op de echte server.
5. **Storingen signaleren.** De controles van de hostingpartij werken, logboeken bevatten geen onderzoeksinhoud, iemand ontvangt de meldingen en er is een aanpak bij overbelasting.
6. **Back-up en herstel.** Bewaarplaats, bewaartermijn, verantwoordelijke en hersteldoelen zijn gekozen. Herstel en teruggaan naar een eerdere combinatie van code en database zijn op de server geoefend.
7. **Beveiliging beoordelen.** De instellingen zoals ze echt online gaan, zijn beoordeeld door iemand die ze niet heeft gemaakt.
8. **Overdracht.** Er is gekozen hoe automatische controles en beoordelingen gaan. Iemand die niet betrokken was, heeft de installatie met de documentatie kunnen volgen.
9. **Gebruikers testen.** Bronnen, selecties, vragen, bewaren en openen en de drie Excel-werkvormen zijn door mensen doorlopen, ook met alleen het toetsenbord.
10. **Vrijgavebesluit.** De eigenaar besluit op basis van stap 1–9 of de demo online mag.
11. **Generale repetitie.** Dezelfde vastgezette code en database zijn op de server doorlopen, en er is een terugvalroute.

Bewust niet in deze demo: een test met schermlezer en een test in desktop-Excel ([besluit B-005](besluiten.md#b-005)).

## Waar je op let

- **Controleer elke nieuwe database** met `npm run data:check-runtime -- --settings work/candidate/local-build.json`, volgens [database publiceren](database-publiceren.md). Val nooit stilletjes terug op een oudere versie.
- **Wil je zeker weten dat er niets ongewensts terugkomt?** Gebruik ook de [actieve-inventariscontrole](actieve-inventaris-controleren.md). Die wijzigt niets en beoordeelt geen rechten.
- **De lokale AI-koppeling** wordt niet vanzelf bijgewerkt met een nieuwe database. Bouw en test hem apart, en laat een AI-assistent opnieuw verbinden. Zie de [AI-koppeling](../../agent-tools/README.md).
- **Projecten blijven in de browser.** Naar een ander adres gaat alleen via **Bewaar project** en **Open project**.
- **Snelheid volgt de metingen.** Het snelheidswerk loopt in [#82](https://github.com/Robert-Worm/omnibus/issues/82) tot en met [#84](https://github.com/Robert-Worm/omnibus/issues/84). Kies geen ander hostingpakket of andere database zonder meting.
- **Controleer na een push de online versie.** De host bouwt opnieuw; kijk daarna of de online codeversie gelijk is aan `main` (zie [#85](https://github.com/Robert-Worm/omnibus/issues/85)).

## Hoe je bewijs vastlegt

Leg per controle vast: de codeversie, de release en publicatie, de datum, wie het deed, de uitkomst en wat níet is getest. Houd brontekst, echte projecten, exports, databases en ruwe testuitvoer buiten Git.

Een lokale proef in de browser bewijst selecties, koppelingen en Excel-inhoud. Hij bewijst niet hoe het eruitziet in desktop-Excel, of het toegankelijk is voor mensen, en hoe snel de server is. Herhaal alleen de controles die geraakt worden als code, database of serverinstellingen veranderen.

Gebruik de [container-route](../../hosting/container/README.md), het [runtimepakket](runtime-pakket.md) en [back-up en herstel](storingen-en-herstel.md). De [begrensde HTTP-controle](runtime-pakket.md#begrensde-http-controle-vóór-de-demo) kun je alvast met een fictief pakket op je eigen computer uitvoeren; die vervangt de meting op de server niet.

## Samengevat

Elf stappen, elk met een verantwoordelijke, een streefdatum en een duidelijk "klaar wanneer". Het meeste werk zit in bewijs op de echte server en in een test door mensen.

## Volgende stap

Zie [pad A van de routekaart](../routekaart.md#pad-a--online-versie) en de voorbereiding in [`hosting/`](../../hosting/README.md).

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
