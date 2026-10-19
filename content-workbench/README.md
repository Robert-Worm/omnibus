# Content Workbench

De Workbench is een los lokaal voortgangsbord voor rapporten en hun verwerkingsbewijs. Beheerders zien er wat wacht, wat in review is en wat al aan gepubliceerde inhoud is gekoppeld.

## Begin hier

- Lees de [Workbench-handleiding](../docs/content-workbench.md) voor starten en gebruik.
- `server.mjs` start de lokale interface.
- `cli.mjs` importeert backlogregels; `link-evidence.mjs` koppelt geverifieerd bewijs.
- `backup.mjs` maakt back-ups van de eigen data van de Workbench.

## Grenzen

De Workbench heeft een eigen lokale database. Hij vervangt de broncatalogus van de applicatie niet, keurt geen inhoud goed en publiceert geen rapport omdat een status verandert. Backlogbestanden en bewijspakketten kunnen privé zijn: commit ze niet en gebruik geen echte onderzoeksdata in openbare voorbeelden.

[Terug naar het projectoverzicht](../README.md#wegwijs-in-de-mappen).
