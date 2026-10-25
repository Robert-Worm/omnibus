# Hulpmiddelen voor de beheerder (`content-tools/`)

> **In het kort:** hulpmiddelen om ingeleverde pakketten te controleren en klaar te maken voor een nieuwe database. Geen uploadscherm, en geen goedkeuring van inhoud.

## Belangrijkste bestanden

| Bestand | Wat het doet |
| --- | --- |
| `intake.mjs` | Controleert of een pakket compleet en ongewijzigd is |
| `runtime-delivery.mjs`, `runtime-author-data.mjs` | Gegevens klaarzetten voor een nieuwe publicatie |
| `model-quality.mjs` | Controleert de structuur van modelreviews |
| `local-database.mjs` | Maakt een nieuwe lokale modeldatabase; met eigenaarbesluit en basispublicatie bruikbaar in de bestaande viewer |
| `local-source-review.mjs` | Controleert bestandskoppelingen en objectdekking van rapport- en kaderreviews; verleent geen inhoudelijke toelating |
| `identity.mjs` | Controlegetallen (hashes) berekenen |
| `active-publication-guard.mjs` | Controleert of een nieuwe publicatie alleen de goedgekeurde pakketten en documenten bevat |

## Wanneer heb je dit nodig?

Bij het controleren van een ingeleverde bron of het lokaal klaarzetten van eigen modelpakketten.

Voor eigen modelpakketten is er een [lokale pakketroute](local-database.md). Die werkt zonder private auteursomgeving. Met een gecontroleerde basispublicatie en vastgelegde eigenaarbesluiten maakt zij een aparte viewerpublicatie; zonder die vrijgave blijft de uitvoer in HOLD.

## Spelregels

- Een technische controle is geen inhoudelijke goedkeuring.
- Ontbrekend bewijs wordt nooit omzeild; het pakket blijft in HOLD.
- Pakketten en brondocumenten blijven buiten Git.

## Verder lezen

[Pakket controleren](../docs/beheer/pakket-controleren.md) · [Actieve inventaris controleren](../docs/beheer/actieve-inventaris-controleren.md) · [Inhoud toevoegen](../docs/beheer/inhoud-toevoegen.md) · [Beheer](../docs/beheer/README.md)

---

[↑ Omnibus](../README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
