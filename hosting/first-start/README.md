# De eerste start op de server (`hosting/first-start/`)

> **In het kort:** een voorstel voor de allereerste start bij de hostingpartij. De server draait dan even zonder Omnibus, zodat de database er veilig op kan. Dit is nog niet bij de hostingpartij bewezen.

## Waarom is dit nodig?

Omnibus start alleen als de database er al staat. Maar bij de hostingpartij kun je pas bestanden neerzetten als de server al draait. Dit voorstel lost dat op: de server start eerst een klein, tijdelijk proces dat niets doet en vanzelf stopt. In die tijd zet de beheerder de database neer.

## Waar staat dit?

| Onderdeel | Status |
| --- | --- |
| Tijdelijk startproces en lokale proef | ✅ Klaar en getest op Linux |
| Bevestiging door de hostingpartij | ⬜ Nog niet gevraagd |
| Toestemming van de beheerder om het te gebruiken | ⬜ Nog niet gegeven |

## Hoe werkt het?

1. **Tijdelijk starten.** De server start een proces dat hooguit vijftien minuten wacht. Het opent geen netwerkpoort en geen database.
2. **Database neerzetten.** De beheerder zet de database in een nieuwe map en [controleert hem](../data-transfer/README.md).
3. **Rechten vastzetten.** Omnibus mag de database lezen, maar niet wijzigen of vervangen.
4. **Normaal starten.** De beheerder vervangt de tijdelijke opdracht door de [normale start](../../docs/beheer/runtime-pakket.md). Pas daarna gaat Omnibus open voor bezoekers.

Gaat er iets mis, of is de tijd om? Dan blijft Omnibus dicht, en begint een nieuwe poging met een nieuw tijdvenster.

## Technische details

Alle opdrachten hieronder zijn voor de Linux-shell van de server.

<details><summary><b>Alle technische details en opdrachten</b></summary>

Deze voorgestelde beheerstart houdt een gecontroleerde container kort in leven zonder Omnibus, database of listener te starten. Het is geen bewezen Sevalla-bootstrapprocedure. Gebruik haar uitsluitend na providerbevestiging en toestemming van de beheerder. Voeg geen dummy database of fake healthserver toe.

### Providervoorwaarden

De [Sevalla-webterminal](https://docs.sevalla.com/applications/web-terminal) vereist een draaiende, gereedstaande instantie. Het Files-menu kan bestanden overbrengen tot 100 MB per upload/download; daarvoor is updatebevoegdheid nodig. De ontvangen bestanden behoren aan de containergebruiker. Alleen leesrechten instellen op bestanden die dezelfde gebruiker bezit, is geen blijvende scheiding: die eigenaar kan zijn rechten herstellen.

Laat vóór gebruik bevestigen:

1. Of dezelfde image met één persistente disk, UID/GID `1000:1000`, HTTP/probes uit en zonder listener gereed wordt en terminaltoegang biedt.
2. Hoe de beheerder ontvangt en daarna zowel bestanden als vervangbare bovenliggende mappen buiten de schrijfmacht van de runtime brengt.
3. Welk beschermd ontvangstkanaal en welke operatorhulpmiddelen beschikbaar zijn, en hoe sessies en transfers worden beëindigd bij afbreken.

Een aanwezige operator moet bevoegd zijn de app op te schorten. De Node-timer hieronder beëindigt niet de herstartlus van het platform en trekt niet zelfstandig alle terminalsessies in. Zonder die beheerafspraken niet beginnen.

### Kandidaatopdracht

Gebruik dezelfde gecontroleerde image als voor de normale start. Controleer dat `node` de bedoelde Node 24 is en de shell geen achtergrondprocessen toevoegt. Controleer HTTP/probes en eventuele TCP-/private verbindingen vooraf. De standaardpakketmap is `/app/omnibus-runtime`; de afzonderlijke datamount hoort buiten die map en buiten de webroot.

Vervang `FIXED_UTC_DEADLINE` door één vaste UTC-tijd in `YYYY-MM-DDTHH:mm:ss.sssZ`, maximaal vijftien minuten vooruit. Bewaar dezelfde letterlijke eindtijd bij herstart; bereken geen nieuw tijdvenster in het commando.

<!-- first-start-command -->
```sh
unset NODE_OPTIONS NODE_PATH || exit 64
exec node -e '
const text = process.argv[1], end = Date.parse(text), left = end - Date.now();
if (process.getuid() !== 1000 || process.getgid() !== 1000 ||
    !Number.isSafeInteger(end) || new Date(end).toISOString() !== text ||
    left <= 0 || left > 900000) process.exit(64);
const finish = () => process.exit(0);
process.once("SIGTERM", finish);
process.once("SIGINT", finish);
setTimeout(finish, left);
' 'FIXED_UTC_DEADLINE'
```
<!-- /first-start-command -->

De opdracht opent geen socket of database en schrijft geen uitvoer. Verkeerde identiteit of eindtijd geeft exitcode 64; eindtijd of TERM/INT geeft exitcode 0. Dit is geen harde tijdgarantie bij een bevroren proces of afwijkende systeemklok.

### Van ontvangst naar de normale start

Ontvang uitsluitend in een nieuwe, door de operator beheerde map. Verifieer bytes, hashes en pakketkoppeling met de [ontvangstcontrole](../data-transfer/README.md). De volledige checker is een operatorhulpmiddel en zit bewust niet in het runtimepakket.

Bewijs daarna dat de runtime kan lezen maar de database en instellingen niet kan wijzigen of vervangen. Sluit de beheersessie. Vervang de tijdelijke opdracht bewust door de [normale pakketstart](../../docs/beheer/runtime-pakket.md), met dezelfde geverifieerde release/publicatie en expliciete origin. Begin niet vanuit een terminal een tweede app-proces. Open pas publieke toegang na de hostproeven.

Bij fout of eindtijd: publieke toegang uit houden, app opschorten en gestopte instanties en sessies controleren. Bestaande data blijven behouden; partials blijven ongeactiveerd. Een volgende poging vraagt een nieuw bewust tijdvenster. Gebruik voor terugschakelen de [herstelroute](../../docs/beheer/storingen-en-herstel.md).

### Lokale proef

Alleen op Linux, als UID/GID `1000:1000`, met Node 24 en een eigen tijdelijke map:

```sh
node --test --test-concurrency=1 --test-timeout=15000 hosting/first-start/rehearsal.test.mjs
```

De proef voert het commando uit dit document uit en controleert de vaste eindtijd, signalen, afwezige sockets, databehoud, strikte startweigering en het eigenaarsrechtenprobleem. Zij bewijst geen providerterminal, diskrechten of daadwerkelijke overdracht.

</details>

## Samengevat

Een kort tijdelijk proces maakt het mogelijk om de database neer te zetten voordat Omnibus voor het eerst start. Het voorstel is lokaal getest; de hostingpartij moet het nog bevestigen.

## Volgende stap

Terug naar het [overzicht van hosting](../README.md), of bekijk de [checklist live demo](../../docs/beheer/live-demo-checklist.md).

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Routekaart](../../docs/routekaart.md)
