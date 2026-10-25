# Veelgestelde vragen

<!-- paginatype: naslag -->

> **In het kort:** korte antwoorden op de vragen die nieuwkomers het vaakst stellen, over wat Omnibus is, installeren, meedoen, rechten en AI. Elk antwoord linkt naar de pagina met de volledige uitleg.

## Over Omnibus

### Wat is Omnibus, in één zin?

Een hulpmiddel waarmee je als auditor of onderzoeker een referentiekader samenstelt uit normen van echte rapporten, wetten en kaders, en dat als Excel-werkdocument downloadt. Zie [werken met Omnibus](gebruiken/werken-met-omnibus.md).

### Wat kost het?

Niets. Omnibus is een niet-commercieel project. Je mag het vrij gebruiken, aanpassen en delen, maar niet commercieel. Zie [licentie in de README](../README.md#licentie).

### Is Omnibus een officieel product van de overheid?

Nee. Het is een persoonlijk initiatief van Robert Worm. De normen komen wel uit openbare rapporten van de rijksoverheid, onder meer van de Auditdienst Rijk.

### Betekent een norm uit Omnibus dat die juridisch geldt voor de organisatie die ik onderzoek?

Nee. Een norm kiezen zegt niet dat hij geldt, of dat de organisatie eraan voldoet. Dat oordeel blijft bij jou. Bij elke norm kun je de bron lezen om dat te beoordelen.

## Installeren en gebruiken

### Wat heb ik nodig om Omnibus te gebruiken?

Niets, als je de [proefversie online](https://omnibus.sliplane.app) gebruikt. Zelf installeren: Git en Node.js 24.21; `node scripts/installeer.mjs` haalt de database zelf op. Met Docker heb je alleen Docker nodig. Na de installatie heb je geen internet en geen account nodig. Zie [installeren](gebruiken/installeren.md). Krijg je een foutmelding? Kijk bij [problemen bij installeren en starten](gebruiken/problemen-oplossen.md).

### Kan ik Omnibus gebruiken zonder iets te installeren?

Ja, er staat een [proefversie online](https://omnibus.sliplane.app). Je werk blijft ook daar in je eigen browser.

### Werkt het op Windows, macOS en Linux?

Ja. [GitHub test de installatie](https://github.com/Robert-Worm/omnibus/actions/workflows/installatie.yml) met één opdracht op Windows, macOS en Linux, elke maand en bij elke wijziging.

### Waar wordt mijn werk bewaard?

In je browser, op je eigen computer. Er gaat niets naar een server. Browseropslag is geen back-up: download je project met **Bewaar project**. Zie [goed om te weten](gebruiken/installeren.md#goed-om-te-weten).

### Ik zie mijn project niet meer. Wat nu?

Controleer of je dezelfde browser, adresnaam en poort gebruikt. Ook `localhost` en `127.0.0.1` hebben aparte opslag. Heb je een projectbestand bewaard? Open het met **Open project**.

### Komt er een nieuwe database, en hoe krijg ik die?

Ja, als er nieuwe bronnen zijn verwerkt. Bewaar je onderzoek vooraf met **Bewaar project**. Volg de tabel [Bijwerken per installatieroute](gebruiken/installeren.md#bijwerken): Docker bouw je opnieuw; bij de twee Git-routes vervang je de databasemap. De installer gebruikt een aanwezige database opnieuw en zoekt niet automatisch naar de nieuwste. Een nieuwe database kan nieuwere code nodig hebben: gebruik de combinatie die de release noemt en laat de controles slagen.

### Hoe krijg ik nieuwe code?

Met Docker kies je een vrijgegeven versie, bouw je opnieuw en start je een nieuwe container. Bij de Git-routes haal je de code op en vernieuw je de bibliotheken; daarna bouw en start je opnieuw. De opdrachten staan bij [Bijwerken per installatieroute](gebruiken/installeren.md#bijwerken). Je onderzoek blijft in je browser; bewaar vooraf ook een projectbestand.

## Meedoen

### Hoe kan ik helpen?

Door een rapport, wet of kader te verwerken: je claimt een bron, verwerkt hem met een AI-skill en levert het resultaat in. Zie [meedoen](bijdragen/README.md).

### Moet ik kunnen programmeren?

Nee. Je hebt een AI-assistent nodig die bestanden kan lezen en schrijven, en een GitHub-account om te claimen. De AI doet het meeste werk; jij controleert het resultaat.

### Welke bron moet ik kiezen?

Bij voorkeur een [aanbevolen rapport](bijdragen/werklijst-aanbevolen.md) van de Auditdienst Rijk, in een vakgebied dat je kent. Die leveren de meeste bruikbare normen op.

### Wat als ik halverwege stop?

Schrijf `/vrijgeven` bij je claim. Dan komt de bron weer vrij voor iemand anders. Na 60 dagen zonder reactie gebeurt dat automatisch.

### Wat betekent *Mogelijk dubbel* in de werklijst?

Dat rapport staat waarschijnlijk twee keer op de Rijksmap, bijvoorbeeld op twee websites. Claim dan het andere rapport; de link staat erbij.

## Rechten

### Mag ik elke bron verwerken?

Bijna. Rapporten die niet openbaar zijn, hebben geen claimlink. Voor kaders met auteursrecht (zoals ISO en COBIT) is eerst toestemming van de uitgever nodig. Per bron staat het in de [werklijst wetten en kaders](bijdragen/werklijst-wetten-en-kaders.md).

### Waarom staan de IIA Topical Requirements met volledige tekst in de database?

Dat is een bewust besluit van de beheerder. De rechten blijven bij The Institute of Internal Auditors; vraagt de IIA om verwijdering, dan gaan de teksten uit de volgende database. Zie [NOTICE](../NOTICE).

### Van wie is wat ik bijdraag?

Je bijdrage valt onder dezelfde [licentie (LICENSE)](../LICENSE) als het project. De bronteksten zelf blijven van hun uitgevers.

## AI

### Welk AI-model moet ik gebruiken?

Het sterkste dat je hebt. Aanbevolen zijn Claude Opus, Claude Fable, Claude Mythos, GPT-5 en Codex. Zie [welk AI-model gebruik je?](bijdragen/bron-verwerken.md#welk-ai-model-gebruik-je).

### Werken de skills ook met Claude of ChatGPT?

Ja. Je uploadt de skillmap als zip, of voegt de bestanden toe aan je gesprek. Zie [skills gebruiken met je AI-assistent](bijdragen/skills-gebruiken.md).

### Kan mijn AI-assistent ook direct in de database zoeken?

Ja, via een lokale koppeling (MCP) op je eigen computer. De assistent kan zoeken en een onderzoeksopzet voorstellen, maar slaat pas iets op na jouw akkoord. Zie [AI-koppeling](gebruiken/ai-koppeling.md).

### Gaan mijn onderzoeksgegevens naar een AI-dienst?

Omnibus stuurt zelf niets naar een AI-dienst. Gebruik je een AI-assistent, dan bepaal jij wat je met die assistent deelt, onder de voorwaarden van die dienst.

## Samengevat

Omnibus is gratis, draait op je eigen computer en bewaart je werk in je browser. Meedoen kan zonder programmeerkennis. Bij twijfel over rechten: kijk in de werklijst of vraag het in Discussions.

## Volgende stap

Staat je vraag er niet bij? Stel hem in [Discussions](https://github.com/Robert-Worm/omnibus/discussions). Veelgestelde vragen daar komen op deze pagina.

---

[↑ Wegwijzer](README.md) · [Begrippen](begrippen.md) · [Routekaart](routekaart.md)
