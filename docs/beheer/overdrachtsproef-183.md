# Overdrachtsproef releasevoorbereiding

<!-- paginatype: logboek -->

> **In het kort:** het lokaal verpakken en ontvangen van een fictieve database is aangetoond. Twee fouten in de releasevoorbereiding zijn hersteld. Een volledige inhoudelijke publicatie is nog niet beproefd.

Op 24 oktober 2026 is issue #183 beproefd vanaf openbare codebasis `b06352cbcd281c329f7acb52d13b8c3094478118`, in een afzonderlijke checkout. Alleen de repository, de documentatie en Node 24.21.0 zijn gebruikt. Er zijn geen andere chats, private overdrachten, echte databases of broncollecties geraadpleegd.

## Eerst genoteerde vragen en struikelpunten

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

## Aangetoond resultaat

De [gedocumenteerde oefenroute](database-publiceren.md#oefenen-met-volledig-fictieve-data) is uitgevoerd: testgegevens maken, invoer controleren, release voorbereiden, zip onafhankelijk uitpakken met PowerShell en de ontvangen database opnieuw controleren. Alle uitvoer bleef in de genegeerde eigen werkmap.

| Controle | Uitkomst |
| --- | --- |
| Runtimecontrole vóór en na verpakken | `VERIFIED_RUNTIME_DATABASE`; 4 pakketten, 5 records, 1 document, 2 bronpagina's, 1 bronartefact, 99 modules en 1 resource |
| Inhoudelijke goedkeuring | `newContentApproval: false`; alle 5 fictieve records blijven HOLD |
| Bronpassage vóór en na verpakken | 1 exacte Unicode-passage, 0 afwijkingen |
| Vraagcontrole vóór en na verpakken | 1 vraag zonder gevonden vormfout |
| Controlegetallen | SHA-256 van de zip en van alle 3 bestanden in het interne manifest komen overeen |
| Gerichte release-tests | 8 geslaagd; inclusief echte CLI, open WAL, gewijzigde inhoud, verkeerde publicatiehash en weigeren van een bestaande uitvoermap |

## Resterende grens

Dit is een geslaagde **lokale technische voorbereiding en ontvangst**, geen volledige databaserelease. De testgegevens bevatten vaste fictieve inhoud en minimale modulevormen; zij vormen geen tweede publicatiepijplijn en bewijzen geen werkende viewer. De interne publicatiemarker is uitsluitend synthetische testinvoer, geen bewijs van een uitgevoerde bronreview.

De private bronreview, echte bronpublicatie, testbuild met bruikbare inhoud, projectherstel, rechtencontrole, GitHub-upload, activering en hostingcontrole zijn niet uitgevoerd. Voor de eerste twee zijn de expliciet gedocumenteerde private invoer en bevoegdheden nodig; voor de overige stappen is afzonderlijk bewijs nodig. Issue #183 kan daarom niet op grond van deze proef volledig worden afgevinkt. Het vervangen van #55 en #43 blijft een beslissing bij de integratie; er zijn geen issues of labels gewijzigd.

## Volgende stap

Voer de [lokale oefenroute](database-publiceren.md#oefenen-met-volledig-fictieve-data) uit in een nieuwe werkmap en bewaar de controle-uitkomsten vóór een vervolgproef met echte inhoud.

---

[↑ Beheer](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
