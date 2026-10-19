# Beveiligingsproblemen melden

Omnibus is een openbare codebasis voor een lokale browserapp en lokale
MCP-koppeling. De loopbackserver, Content Workbench en STDIO-server zijn niet
vrijgegeven als openbare dienst. Er is geen gepubliceerde supportmatrix
of gegarandeerde reactietermijn.

## Vertrouwelijk melden

Meld een vermoedelijke kwetsbaarheid vertrouwelijk aan
[info@rijksmap.nl](mailto:info@rijksmap.nl), met het onderwerp
`Omnibus beveiligingsmelding`. Dit is het door de beheerder aangewezen meldadres.
Je kunt ook de knop **Report a vulnerability** onder het tabblad Security van deze repository gebruiken. Gebruik geen openbare issue of pull request voor kwetsbaarheidsdetails.
E-mail is geen beveiligde bestandskluis: stuur geen secrets, persoonsgegevens,
echte onderzoeksbestanden of werkende aanvalspakketten mee. Vraag eerst om een
passend overdrachtskanaal als een opgeschoonde beschrijving niet volstaat.

Een bruikbare melding bevat:

- de betrokken commit en component, Node-/besturingssysteemversie en configuratie
  zonder secrets of persoonlijke paden;
- de noodzakelijke voorwaarden, het mogelijke effect en korte reproduceerstappen;
- een minimaal synthetisch voorbeeld en opgeschoonde foutuitvoer;
- welke gegevens of systemen mogelijk geraakt zijn, en eventuele tijdelijke
  beperking die je al hebt toegepast.

Deel geen echte projecten, bronarchieven, databasekopieën, tokens of volledige
request-/logbestanden om de melding te onderbouwen. Vraag eerst om een passend
privaat overdrachtskanaal als een minimaal voorbeeld niet volstaat. Plaats
gevoelige details niet in commits, screenshots, openbare issues of pull requests.

## Onderzoek en afhandeling

Reproduceer uitsluitend in je eigen toegestane, geïsoleerde testomgeving met
synthetische data. Deze meldprocedure geeft geen toestemming om een bestaande
server, externe provider of gegevens van anderen actief te testen. Beperk een
reproductie tot wat nodig is om het probleem aan te tonen.

De beheerder beoordeelt de getroffen versies en bereikbare grens, bevestigt de
bevinding waar mogelijk en bepaalt beperking, herstel en passende regressietest.
Leg besluiten en bewijs in het afgesproken private dossier vast. Spreek eventuele
bekendmaking afzonderlijk af; een rapport indienen start geen automatische
publicatie of vaste reactietermijn.

Bij mogelijk gelekte credentials: neem contact op met de verantwoordelijke
beheerder voor intrekken of roteren. Alleen een bestand uit de laatste commit
verwijderen maakt een eerdere blootstelling niet ongedaan. Deel benodigde
bewijzen beperkt en behandel gegevensherstel los van het terugzetten van code.

## Relevante grenzen

Kwetsbaarheden kunnen de bronweergave, projectimport en decompressie, Excel- of
bestandsexport, HTTP-routes, lokale MCP-tools, publicatietools, dependencies of
secrets raken. Applicatielogin en accounts zijn uit productscope; technische
bescherming van deze grenzen blijft vereist. Oude WorkOS-/access-proefverslagen
zijn geen actueel productbeveiligingsmodel.

De database, bronreviewarchieven en gebruikersprojecten blijven buiten Git.
Een toekomstige openbare bronroute maakt de geleverde inhoud leesbaar zonder
applicatielogin; bronrechten en de publieke servergrens moeten vooraf worden
beoordeeld. Een geheime URL of CORS is geen toegangscontrole.

[Actieve contracten](docs/acceptatiecontracten.md) en
[architectuur en gegevensgrenzen](docs/contributor-architecture.md) beschrijven
het te beschermen gedrag. `check:code-only` zoekt naar uitgesloten paden en
enkele geheimpatronen; het is geen volledige secretscan. Fixturetests,
historische securityreviews en deze meldprocedure vormen geen onafhankelijke
veiligheidscertificering of vrijgave voor hosting.
