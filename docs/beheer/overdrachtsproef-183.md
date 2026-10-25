# Overdrachtsproef releasevoorbereiding

<!-- paginatype: logboek -->

> **In het kort:** een verse AI-agent heeft de bestaande oefenroute zelfstandig voltooid. Lokaal verpakken en ontvangen werkt zonder nieuwe reparaties. Een echt voorbeeld van claim tot release is hiermee niet aangetoond.

Op 24 oktober 2026 is issue #183 beproefd vanaf openbare codebasis `b06352cbcd281c329f7acb52d13b8c3094478118`, in een afzonderlijke checkout. Alleen de repository, de documentatie en Node 24.21.0 zijn gebruikt. Er zijn geen andere chats, private overdrachten, echte databases of broncollecties geraadpleegd.

## Vragen en reparaties op 24 oktober

De oorspronkelijke vragen zijn vóór de reparaties genoteerd. Deze tabel vat ze samen; de laatste twee waarnemingen komen uit de daaropvolgende proef met fictieve SQLite-gegevens.

| Vraag of waarneming | Wat is aangepast |
| --- | --- |
| Hoe oefent een verse beheerder met alleen de openbare repository? De handleiding vereist meteen een private omgeving. | De handleiding onderscheidt echte bronpublicatie en een lokale fictieve proef. De private route blijft een afzonderlijke voorwaarde. |
| Waar komen geldige oefenhashes vandaan? Zelf verzonnen waarden zijn geen bewijs. | Vaste testgegevens gebruiken de bestaande import- en publicatiefuncties voor de hashes. De gewone validator controleert de database. |
| Waarom gebruikt stap 6 `work/candidate/local-build.json`, terwijl eerdere stappen `work/publication-01` gebruiken? | Stap 6 gebruikt nu dezelfde publicatiemap. |
| Welke “stappen 1 tot en met 5 hierboven” mag een AI-agent uitvoeren? De onmiddellijk voorafgaande lijst bevat ook publicatie en pushes. | De verwijzing noemt nu de exacte lokale stappen en houdt het publicatiebesluit apart. |
| Bewijzen de bestaande tests dat een echte database wordt aanvaard? Ze schrijven een tekstbestand en retourneren zelf `VERIFIED_RUNTIME_DATABASE`. | De bundeltests gebruiken nu echte SQLite, de gewone validator en een uitgepakte bundel. De vervangbare validator is verwijderd. |
| Waarom volgt na HOLD voor ontbrekende Rijksmap-ID's toch “Klaar”? Kan automatisering dat aanzien voor succes? | Nu volgt exitcode 1 zonder succesmelding, met uitleg over conceptbestanden en opnieuw proberen. |
| Een echte fictieve database wordt aanvaard. Zonder Rijksmap-ID volgt inderdaad HOLD én “Klaar”, met exitcode 0. | De gewone releaseopdracht wordt getest met een ontbrekende en een aangevulde fictieve koppeling. |
| Een publicatie in het SQLite-journaal (WAL) slaagt voor de controle. De zip bevat alleen het hoofdbestand en mist daardoor de publicatie. | De bestaande back-upfunctie levert nu een consistente kopie. Die wordt opnieuw gecontroleerd. De regressietest houdt het journaal open tijdens verpakken en ontvangen. |

## Resultaat op 24 oktober

De [gedocumenteerde oefenroute](database-publiceren.md#oefenen-met-volledig-fictieve-data) is uitgevoerd: testgegevens maken, invoer controleren, release voorbereiden, zip onafhankelijk uitpakken met PowerShell en de ontvangen database opnieuw controleren. Alle uitvoer bleef in de genegeerde eigen werkmap.

| Controle | Uitkomst |
| --- | --- |
| Runtimecontrole vóór en na verpakken | `VERIFIED_RUNTIME_DATABASE`; 4 pakketten, 5 records, 1 document, 2 bronpagina's, 1 bronartefact, 99 modules en 1 resource |
| Inhoudelijke goedkeuring | `newContentApproval: false`; alle 5 fictieve records blijven HOLD |
| Bronpassage vóór en na verpakken | 1 exacte Unicode-passage, 0 afwijkingen |
| Vraagcontrole vóór en na verpakken | 1 vraag zonder gevonden vormfout |
| Controlegetallen | SHA-256 van de zip en van alle 3 bestanden in het interne manifest komen overeen |
| Gerichte release-tests | 8 geslaagd; inclusief echte CLI, open WAL, gewijzigde inhoud, verkeerde publicatiehash en weigeren van een bestaande uitvoermap |

## Zelfstandige proef op 25 oktober

Een verse AI-agent begon in een schone, afzonderlijke checkout op openbare codebasis `a223bfeec7360d25b5314f4a23b40450ecd5cb63`, met Node 24.21.0 en geïnstalleerde onderdelen. Het startpunt is vóór uitvoering vastgelegd. De agent volgde README → Beheer → Beheerhandboek → Database publiceren → Oefenen met volledig fictieve data. Dit eerdere verslag, issuecommentaren en oude overdrachten zijn vóór de eerste doorloop niet gelezen; een gerichte uitleg, echte database of private broncollectie is niet gebruikt.

De bestaande opdrachten zijn ongewijzigd uitgevoerd. De ontvangermap bestond vooraf niet. Het lokale log bevat de opdrachten, vragen, controlegetallen en uitkomsten; het blijft buiten Git. Van het vastgelegde startpunt om 16:59:27 UTC tot het einde van de gerichte tests om 17:01:30 UTC verstreken ruim twee minuten. Dit omvat geen installatie van de al aanwezige Node-omgeving en onderdelen.

| Tijdens het volgen genoteerd | Antwoord of uitkomst |
| --- | --- |
| Hoort een build bij deze oefenroute? | De oefenroute begrenst de proef expliciet tot verpakken en ontvangen. De minimale modules bewijzen geen bruikbare viewer. |
| De gegenereerde releasenotities verwijzen naar installatie. | De oefenroute zegt uitdrukkelijk te stoppen, de bundel niet te activeren en de installatieaanwijzingen niet te volgen. Alleen de nieuwe ontvangermap is gebruikt. |
| Zijn er ontbrekende stappen of onbeantwoorde vragen? | Geen aangetroffen. Geen scripts of uitvoerbare stappen aangepast. |
| Testgegevens en ontvangen database controleren | Beide `VERIFIED_RUNTIME_DATABASE`, dezelfde release en publicatie, 4 pakketten, 5 records, 1 document en 2 bronpagina's; `newContentApproval: false`. |
| Bronpassages en vragen vóór en na overdracht | Steeds 1 exacte passage zonder HOLD en 1 vraag zonder gevonden vormfout. |
| Zip met PowerShell uitpakken en hashes vergelijken | De zip en alle 3 bestanden in het interne manifest komen overeen; de ontvangen instellingen verwijzen relatief naar `catalogue.sqlite`. |
| Bestaande `npm run test:release-prepare` | 17 geslaagd, 0 mislukt, 0 overgeslagen; inclusief echte releaseopdracht, open SQLite-journaal en weigeren van ongeldige invoer. |

Er zijn geen nieuwe struikelpunten om in de werkinstructie te repareren. De route hoeft voor deze uitkomst niet te worden uitgebreid met een nieuwe testdienst of een herhaalde volledige testsuite.

## Dekking van de vervangen issues

Pas na de zelfstandige proef zijn de oorspronkelijke issuebodies van [#55](https://github.com/Robert-Worm/omnibus/issues/55) en [#43](https://github.com/Robert-Worm/omnibus/issues/43) vergeleken. Beide stonden op 25 oktober al gesloten als `not_planned`; dat is geen bewijs dat al hun oorspronkelijke criteria zijn uitgevoerd.

| Criterium | Dekking door deze proef |
| --- | --- |
| #183: een agent zonder voorkennis gebruikt alleen repository en documentatie | Voldaan voor de lokale releasevoorbereiding en ontvangst; het eerdere verslag is pas daarna gelezen. |
| #183: vragen en struikelpunten vastleggen en verwerken | Voldaan: tijdens de proef vastgelegd, hierboven verwerkt; geen nieuwe blokkades. |
| #55: een ander volgt de fictieve releaseroute binnen twee uur | Voldaan voor de vervangende AI-proef en de lokale overdracht, met de hierboven genoemde aanwezige omgeving. Geen menselijke tweede deelnemer of externe publicatie geclaimd. |
| #43: één pagina met opdrachten en uitkomsten voor een echt openbaar voorbeeld van claim tot release, door een ander nagelopen | Niet aangetoond: geen echt pakket vanaf de ingeleverde claim doorlopen. De oefenpagina begint bij een fictieve database. |

Het [openbare voorbeeldpakket](../bijdragen/voorbeeldpakket.md) is een bijdragersconcept. Het is in deze proef niet door intake, review, toelating en bronpublicatie gevolgd.

## Resterende grens

Dit is een geslaagde **lokale technische voorbereiding en ontvangst**, geen volledige databaserelease. De testgegevens bevatten vaste fictieve inhoud en minimale modulevormen; zij vormen geen tweede publicatiepijplijn en bewijzen geen werkende viewer. De interne publicatiemarker is uitsluitend synthetische testinvoer, geen bewijs van een uitgevoerde bronreview.

De private bronreview, echte bronpublicatie, testbuild met bruikbare inhoud, projectherstel, rechtencontrole, GitHub-upload, activering en hostingcontrole zijn niet uitgevoerd. Deze stappen zijn geen afkeurgrond voor de afgebakende lokale fixtureproef. Vooral hostacceptatie staat daar los van.

De lokale opdracht van #183 is voltooid. De oorspronkelijke eis van #43 is niet bewezen. Daarvoor ontbreken één uitgewerkt voorbeeld van een echte claim tot release en de zelfstandige doorloop daarvan. Bij afsluiting van #183 moet de beheerder daarom expliciet vastleggen of de fictieve route die oude eis vervangt, of waar die eis behouden blijft. Intake, toelating en bronpublicatie horen bij [#154](https://github.com/Robert-Worm/omnibus/issues/154); deze proef heeft die onderdelen niet gewijzigd. Er zijn geen issues of labels gewijzigd.

## Volgende stap

Gebruik dit verslag om de lokale proef af te tekenen en de resterende dekking van #43 vast te leggen. Een volgende beheerder kan de [oefenroute](database-publiceren.md#oefenen-met-volledig-fictieve-data) in nieuwe mappen volgen; een herhaling is geen voorwaarde om deze geslaagde proef te accepteren.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
