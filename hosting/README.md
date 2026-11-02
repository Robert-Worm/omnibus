# Hosting (`hosting/`)

> **In het kort:** alles voor de [online versie](../docs/routekaart.md#pad-a--online-versie). De proefversie draait via de [container-route](container/README.md) op [omnibus.rijksmap.nl](https://omnibus.rijksmap.nl).

## Zo draait de proefversie nu

De proefversie draait via [`container/`](container/README.md): één Dockerfile met de openbare database erin, voor één app bij een containerhost (Sliplane). Je vindt hem op [omnibus.rijksmap.nl](https://omnibus.rijksmap.nl).

Begin hier als je de online versie wilt bijwerken of herstellen. Op je eigen computer draai je Omnibus zonder deze map; zie [installeren](../docs/gebruiken/installeren.md).

| Map | Wat het doet |
| --- | --- |
| [`container/`](container/README.md) | De online versie: app en openbare database in één image |
| `mcp/` | Een aparte image voor de AI-koppeling via internet; nog niet online |

Er was ook een uitgebreidere route met de database op een aparte schijf, voor een niet-openbare database. Die is op 2 november 2026 weggehaald, omdat de site de openbare database gebruikt ([B-033](../docs/beheer/besluiten.md#b-033)). Hij staat nog in de geschiedenis van Git, mocht hij ooit nodig zijn.

## Volgende stap

Begin bij [online zetten in een container](container/README.md), of bekijk wat er voor de online versie gepland is in [pad A van de routekaart](../docs/routekaart.md#pad-a--online-versie).

---

[↑ Omnibus](../README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
