# Content Workbench (`content-workbench/`)

> **In het kort:** een lokaal werkbord waarop de beheerder bijhoudt welke bronnen wachten, in bewerking zijn of al in de database staan. Het draait alleen op de eigen computer.

## Belangrijkste bestanden

| Bestand | Wat het doet |
| --- | --- |
| `server.mjs` | Start het werkbord op `127.0.0.1` |
| `cli.mjs` | Importeert werklijsten (CSV) |
| `link-evidence.mjs` | Koppelt gecontroleerd bewijs aan bronnen |
| `backup.mjs` | Maakt een back-up van het werkbord |
| `web/` | De schermen van het werkbord |

## Wanneer heb je dit nodig?

Als beheerder, om het overzicht te houden over veel bronnen tegelijk. Voor bijdragers is er het [claimsysteem op GitHub](../docs/bijdragen/README.md).

## Spelregels

- Het werkbord heeft een eigen database en keurt niets goed of publiceert niets.
- Werklijsten en bewijs kunnen privé zijn: niet in Git zetten.

## Verder lezen

[Content Workbench-handleiding](../docs/beheer/content-workbench.md) · [Beheer](../docs/beheer/README.md)
