# Bijdragen aan Omnibus

Dank je voor je hulp om brongebonden auditwerk duidelijker en bruikbaarder te maken. Kleine, goed uitgelegde bijdragen zijn welkom.

## Manieren om te helpen

- Leg een onduidelijk scherm of een onduidelijke instructie uit, met een fictief voorbeeld.
- Meld een reproduceerbare fout of een toegankelijkheidsprobleem.
- Verbeter documentatie, tests of een bestaande werkstroom.
- Stel een correctie op een skill voor, met onderbouwing en een voorbeeld van het probleem.

Open voor grotere functies, wijzigingen in opslag of nieuwe afhankelijkheden eerst een issue dat de behoefte beschrijft, voordat je veel code schrijft. Accounts en betalingen vallen buiten de scope. Inhoudsvoorstellen staan los van codewijzigingen: voeg geen echte bronarchieven of onderzoeksprojecten toe aan issues of pull requests. Vragen en ideeën kunnen ook in [Discussions](../../discussions).

## Lokaal beginnen

Lees de [setuphandleiding](docs/contributor-setup.md), de [architectuur](docs/contributor-architecture.md) en [AGENTS.md](AGENTS.md). De zelfstandige tests draaien zonder de database van de beheerder. Voor de browserapplicatie heb je een apart voorbereide database nodig; zie [eigen documenten gebruiken](docs/own-content.md).

Maak een branch, volg de bestaande stijl en houd elke wijziging gericht. Gebruik fictieve testdata. Hergebruik de gedeelde viewers, de logica voor selecties en vraagkoppelingen, en de Excel-generator. Behoud bronidentiteiten, exacte passages, grenzen van toepasselijkheid, de HOLD-status en tekst die gebruikers zelf in hun project schreven. HOLD betekent dat verplicht bewijs of een review ontbreekt; het mag nooit goedkeuring worden alleen om een test te laten slagen.

## Je wijziging controleren

Kies de [tests die bij je wijziging passen](docs/contributor-setup.md#passende-controles-kiezen). Controleer bij documentatie de links en opdrachten. Dek bij gedragswijzigingen het verwachte resultaat af, en de relevante fout- en herstelgevallen.

Bekijk de diff en de gestagede bestanden voordat je commit. Voeg geen databases, inloggegevens, bronarchieven, echte projecten, exports of gegenereerde uitvoer toe. Forceer nooit genegeerde inhoud in Git. Draai na het stagen `git diff --cached --check` en `npm run check:code-only`. Dat laatste is een smalle controle, geen bewijs dat er geen gevoelig materiaal meer in zit.

Leg in je pull request uit:

- het probleem van de gebruiker en wat er veranderde;
- welke tests je echt hebt gedraaid, en de uitkomsten;
- beperkingen of controles die je niet hebt gedaan;
- de gevolgen voor opgeslagen projecten, de betekenis van bronnen of exports.

Beschrijf geen tests die je niet hebt gedraaid, en presenteer een AI-zelfreview niet als onafhankelijke validatie. De beheerder reviewt en integreert wijzigingen; indienen garandeert geen acceptatie of reactietermijn. De [acceptatiecontracten](docs/acceptatiecontracten.md) beschrijven de grenzen. Oude experimenten zijn geen instructie om verwijderde functies terug te brengen.

## Bijdragen aan inhoud en skills

De [zes skills](skills/README.md) beschrijven elk een eigen bron- of reviewmethode. Houd bronfeiten gescheiden van voorgestelde normen, risico's en toetsinstructies. Laat zien hoe een formuleringswijziging de betekenis behoudt en het praktische gebruik verbetert.

Onafhankelijke inhoudsreviews en toestemming om te integreren zijn aparte vereisten. De technische intake controleert het pakket en de integriteit, niet de betekenis. Zie [intake](docs/content-intake.md). Zijn private verwerkingstools niet beschikbaar, meld dan de ontbrekende voorwaarde in plaats van die te omzeilen.

## Respectvol samenwerken en beveiliging

Wees opbouwend en concreet. Bekritiseer het werk, niet de persoon. Plaats geen persoonsgegevens, intimidatie of vertrouwelijk materiaal. Zie de [gedragscode](CODE_OF_CONDUCT.md). De beheerder kan ongepast materiaal verwijderen of discussies sluiten die het project niet dienen.

Meld kwetsbaarheden vertrouwelijk zoals beschreven in [SECURITY.md](SECURITY.md), niet via een openbaar issue of een pull request.

## Rechten en naamsvermelding

Door bewust een bijdrage in te dienen voor opname, bied je die aan onder dezelfde licentie als het project, de [PolyForm Noncommercial License 1.0.0](LICENSE), tenzij uitdrukkelijk anders is afgesproken. Dien alleen materiaal in dat je mag bijdragen. Behoud vermeldingen van derden en geef aan welk materiaal van derden je toevoegt. De codelicentie geeft geen rechten op de documenten die Omnibus verwerkt.
