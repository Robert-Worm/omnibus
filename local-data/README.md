# Database en lokale server (`local-data/`)

> **In het kort:** deze map koppelt Omnibus aan de database en bevat de kleine lokale server die de app en de brongegevens levert. De server kan de database alleen lezen.

## Wat staat hier?

| Bestand of map | Wat het doet |
| --- | --- |
| `runtime/` | Hier pak je de database-zip uit (staat buiten Git) |
| `repository.mjs` | De database lezen |
| `runtime-publication.mjs` | Controleren of database en build bij elkaar horen |
| `server.mjs`, `static-web.mjs` | De lokale server en de bestanden van de app |
| `runtime-backup.mjs` | Een gecontroleerde kopie van de database maken |
| `test-support/` | Fictieve testdata |

## Wanneer heb je dit nodig?

Bij het installeren (je zet de database in `runtime/`), of als je iets aan de server of het laden van gegevens verandert.

## Spelregels

- De server biedt geen SQL, geen downloads van de database en geen opslag van projecten.
- Databases en instellingen blijven buiten Git.
- De server weigert te starten als database en build niet bij elkaar passen.

## Verder lezen

[Installeren](../docs/gebruiken/installeren.md) · [Database publiceren](../docs/beheer/database-publiceren.md) · [Storingen en herstel](../docs/beheer/storingen-en-herstel.md)
