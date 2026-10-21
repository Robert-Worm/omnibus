# De eerste start op de server (`hosting/first-start/`)

> **In het kort:** een voorstel voor de allereerste start bij de hostingpartij. De server draait dan even zonder Omnibus, zodat de database er veilig op kan. Dit is nog niet bij de hostingpartij bewezen.

> [!NOTE]
> **Stand:** dit hoort bij de uitgebreide route, met de database op een aparte schijf. Die ligt klaar voor een niet-openbare database. De proefversie online gebruikt de eenvoudigere [container-route](../container/README.md).

## Waarom is dit nodig?

Omnibus start alleen als de database er al staat. Maar bij de hostingpartij kun je pas bestanden neerzetten als de server al draait. Dit voorstel lost dat op: de server start eerst een klein, tijdelijk proces dat niets doet en vanzelf stopt. In die tijd zet de beheerder de database neer.

## Waar staat dit?

| Onderdeel | Status | Toelichting |
| --- | --- | --- |
| Tijdelijk startproces en lokale proef | ✅ Klaar | Getest op Linux |
| Bevestiging door de hostingpartij | ⬜ Open | Nog niet gevraagd |
| Toestemming van de beheerder om het te gebruiken | ⬜ Open | Nog niet gegeven |

## Hoe werkt het?

1. **Tijdelijk starten.** De server start een proces dat hooguit vijftien minuten wacht. Het opent geen netwerkpoort en geen database.
2. **Database neerzetten.** De beheerder zet de database in een nieuwe map en [controleert hem](../data-transfer/README.md).
3. **Rechten vastzetten.** Omnibus mag de database lezen, maar niet wijzigen of vervangen.
4. **Normaal starten.** De beheerder vervangt de tijdelijke opdracht door de [normale start](../../docs/beheer/runtime-pakket.md). Pas daarna gaat Omnibus open voor bezoekers.

Gaat er iets mis, of is de tijd om? Dan blijft Omnibus dicht, en begint een nieuwe poging met een nieuw tijdvenster.

## Technische details

Alle opdrachten hieronder zijn voor de Linux-shell van de server.

<details><summary><b>Alle technische details en opdrachten</b></summary>

Dit is een voorstel voor de allereerste start op de server. Een gecontroleerde container blijft dan even draaien, zonder dat Omnibus, de database of een listener (een proces dat op een poort wacht) start. Zo kan de beheerder in die tijd de database neerzetten.

> [!WARNING]
> **Let op:** dit is geen bewezen werkwijze bij Sevalla, de hostingpartij die eerst was onderzocht. Gebruik het alleen als de hostingpartij het bevestigt en de beheerder toestemming geeft. Voeg geen nep-database of nep-gezondheidsserver toe.

### Wat de hostingpartij moet bieden

De [Sevalla-webterminal](https://docs.sevalla.com/applications/web-terminal) werkt alleen als er een instantie draait en gereed is. Via het Files-menu kun je bestanden tot 100 MB per upload of download overzetten. Daarvoor heb je updatebevoegdheid nodig.

De bestanden die binnenkomen, zijn van de containergebruiker. Alleen leesrechten zetten op bestanden van diezelfde gebruiker is geen blijvende scheiding. De eigenaar kan zijn rechten namelijk weer terugzetten.

Laat de hostingpartij vóór gebruik drie dingen bevestigen:

1. Of dezelfde image gereed wordt en een terminal biedt, met één vaste schijf, UID/GID `1000:1000`, HTTP en probes (gezondheidscontroles) uit, en zonder listener.
2. Hoe de beheerder bestanden ontvangt. En hoe hij daarna zowel de bestanden als de vervangbare bovenliggende mappen buiten bereik van de app brengt, zodat de app er niet in kan schrijven.
3. Welk beveiligd kanaal en welke hulpmiddelen er zijn om bestanden te ontvangen. En hoe sessies en overdrachten stoppen als iets wordt afgebroken.

Er moet een operator aanwezig zijn die de app mag pauzeren. De Node-timer hieronder stopt niet de herstartlus van het platform. Hij sluit ook niet vanzelf alle terminalsessies. Begin niet zonder deze afspraken.

### De opdracht

Gebruik dezelfde gecontroleerde image als bij de normale start. Controleer dat `node` echt Node 24 is, en dat de shell geen processen op de achtergrond toevoegt. Controleer vooraf HTTP, probes en eventuele TCP- of privéverbindingen.

De pakketmap is standaard `/app/omnibus-runtime`. De aparte schijf met data hoort buiten die map en buiten de webroot.

Vervang `FIXED_UTC_DEADLINE` door één vaste eindtijd in UTC, in de vorm `YYYY-MM-DDTHH:mm:ss.sssZ`. Die ligt hooguit vijftien minuten in de toekomst. Herstart de container, gebruik dan dezelfde eindtijd. Laat de opdracht geen nieuw tijdvenster berekenen.

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

De opdracht opent geen socket en geen database, en schrijft niets. Een verkeerde gebruiker of eindtijd geeft afsluitcode 64. De eindtijd of een TERM- of INT-signaal geeft afsluitcode 0. Dit is geen harde garantie: bij een vastgelopen proces of een verkeerde systeemklok kan het anders lopen.

### Van ontvangst naar de normale start

1. **Ontvang** alleen in een nieuwe map die de operator beheert.
2. **Controleer** bytes, hashes en de koppeling met het pakket met de [ontvangstcontrole](../data-transfer/README.md). Die volledige controle is een hulpmiddel voor de operator; hij zit bewust niet in het runtimepakket.
3. **Bewijs** dat de app de database en instellingen kan lezen, maar niet kan wijzigen of vervangen.
4. **Sluit** de beheersessie.
5. **Vervang** de tijdelijke opdracht bewust door de [normale pakketstart](../../docs/beheer/runtime-pakket.md). Gebruik dezelfde gecontroleerde release en publicatie, en een expliciete origin (het openbare adres). Start niet vanuit een terminal een tweede app-proces.
6. **Open** de site pas voor publiek na de proeven op de server.

**Fout, of eindtijd bereikt?** Houd de site dicht voor publiek, pauzeer de app en controleer dat instanties en sessies gestopt zijn. Bestaande data blijven staan; partials worden niet gebruikt. Een volgende poging vraagt een nieuw, bewust gekozen tijdvenster. Wil je terug naar een vorige versie? Gebruik de [herstelroute](../../docs/beheer/storingen-en-herstel.md).

### Proef op je eigen computer

Alleen op Linux, als UID/GID `1000:1000`, met Node 24 en een eigen tijdelijke map:

```sh
node --test --test-concurrency=1 --test-timeout=15000 hosting/first-start/rehearsal.test.mjs
```

De proef voert de opdracht uit dit document uit. Hij controleert de vaste eindtijd, de signalen, dat er geen sockets open zijn, dat data blijven staan, dat een verkeerde start strikt wordt geweigerd, en het probleem met eigenaarsrechten. De proef bewijst niet hoe de terminal van de hostingpartij werkt, welke rechten de schijf heeft, of dat een echte overdracht lukt.

</details>

## Samengevat

Een kort tijdelijk proces maakt het mogelijk om de database neer te zetten voordat Omnibus voor het eerst start. Het voorstel is lokaal getest; de hostingpartij moet het nog bevestigen.

## Volgende stap

Terug naar het [overzicht van hosting](../README.md), of bekijk de [checklist live demo](../../docs/beheer/live-demo-checklist.md).

---

[↑ Hosting](../README.md) · [Wegwijzer](../../docs/README.md) · [Routekaart](../../docs/routekaart.md)
