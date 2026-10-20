# Wegwijzer

> **In het kort:** alle documentatie van Omnibus, ingedeeld naar wat je wilt doen. Kies hieronder je route.

```mermaid
flowchart TD
    S{"Wat wil je doen?"} --> G["🧭 Gebruiken<br/>Omnibus installeren<br/>en een kader maken"]
    S --> B["🤝 Bijdragen<br/>Een bron verwerken<br/>of de code verbeteren"]
    S --> H["🛠️ Beheren<br/>Pakketten controleren<br/>en de database publiceren"]
    classDef default fill:#eaf2f8,stroke:#01689b,color:#15233b;
```

## 🧭 Gebruiken

Voor auditors en onderzoekers die Omnibus willen gebruiken.

| Ik wil… | Lees |
| --- | --- |
| Omnibus op mijn computer zetten | [Installeren](gebruiken/installeren.md) |
| Weten hoe de vier stappen werken | [Werken met Omnibus](gebruiken/werken-met-omnibus.md) |
| Met mijn eigen documenten werken | [Eigen documenten](gebruiken/eigen-documenten.md) |
| Mijn eigen AI-assistent laten meewerken | [AI-koppeling](gebruiken/ai-koppeling.md) |

## 🤝 Bijdragen

Voor iedereen die Omnibus wil helpen groeien.

| Ik wil… | Lees |
| --- | --- |
| Weten hoe ik kan helpen | [Meedoen](bijdragen/README.md) |
| Zien wat er al is en wat nog open staat | [Voortgang](bijdragen/voortgang.md) |
| Een rapport, wet of kader verwerken | [Een bron verwerken](bijdragen/bron-verwerken.md) |
| Een skill gebruiken met Claude, ChatGPT of Codex | [Skills gebruiken](bijdragen/skills-gebruiken.md) |
| Een wet of kader kiezen dat openbaar mag | [Werklijst wetten en kaders](bijdragen/werklijst-wetten-en-kaders.md) |
| De code verbeteren | [Ontwikkelen](bijdragen/ontwikkelen.md) en [architectuur](bijdragen/architectuur.md) |
| Documentatie schrijven in de huisstijl | [Stijlgids](bijdragen/stijlgids.md) |

## 🛠️ Beheren

Voor de beheerder, die ingeleverde pakketten controleert en nieuwe databases uitbrengt.

| Ik wil… | Lees |
| --- | --- |
| Een overzicht van het beheerwerk | [Beheer](beheer/README.md) |
| Een ingeleverd pakket controleren | [Pakket controleren](beheer/pakket-controleren.md) |
| Een nieuwe database maken en uitbrengen | [Database publiceren](beheer/database-publiceren.md) |
| Omnibus online zetten als demo | [Checklist live demo](beheer/live-demo-checklist.md) en [`hosting/`](../hosting/release-delivery/README.md) |

## Overig

- [Routekaart](routekaart.md): wat er nog komt.
- [Veelgestelde vragen](veelgestelde-vragen.md): korte antwoorden op de meest gestelde vragen.
- [Begrippen](begrippen.md): de woorden uit Omnibus in gewone taal.
- [AI-skills](../skills/README.md): de zes werkwijzen voor AI-assistenten.
- [Versiegeschiedenis](../CHANGELOG.md), [beveiliging](../SECURITY.md), [toegankelijkheid](../ACCESSIBILITY.md) en [gedragscode](../CODE_OF_CONDUCT.md).

## Waar vind je wat in de repository?

| Map | Wat erin staat |
| --- | --- |
| `docs/` | Deze documentatie, in drie routes: `gebruiken/`, `bijdragen/` en `beheer/` |
| `skills/` | Zes AI-skills om bronnen te verwerken en te controleren |
| `app/`, `components/`, `hooks/` | De schermen van de applicatie |
| `lib/` | Gedeelde regels: selecties, vragen, projecten en Excel-export |
| `local-data/` | De koppeling met de database |
| `agent-tools/` | De koppeling voor AI-assistenten |
| `content-tools/` | Hulpmiddelen voor de beheerder |
| `content-workbench/` | Oud werkbord van de beheerder, niet meer in gebruik |
| `scripts/` | Bouwen, testen en controleren |
| `hosting/` | Voorbereiding van de online versie |

In de hoofdmap staan verder alleen bestanden die daar moeten staan, omdat hulpmiddelen ze daar zoeken. Als nieuwkomer hoef je er niets mee.

| Bestand | Waarvoor |
| --- | --- |
| `README.md`, `CONTRIBUTING.md`, `SECURITY.md` en andere hoofdletterbestanden | Uitleg, licentie en afspraken; GitHub toont ze op vaste plekken |
| `database.html`, `offline.tsx` | Het startpunt van de app: de pagina en de code die hem opstart |
| `package.json`, `package-lock.json`, `.nvmrc` | Welke onderdelen en welke Node-versie Omnibus gebruikt |
| `vite.config.ts`, `vite.database.config.ts`, `vite-env.d.ts`, `tsconfig.json` | Instellingen voor het bouwen en de typecontrole |
| `components.json`, `.oxlintrc.json` | Instellingen voor de schermonderdelen en de codecontrole |
| `code-snapshot.json` | Een technische lijst van wat bij de eerste publicatie bewust niet in Git is gezet |
| `CITATION.cff` | Hoe je Omnibus citeert |

Elke map heeft een korte README met uitleg.

## Volgende stap

Nieuw hier? Begin met [Omnibus installeren](gebruiken/installeren.md). Heb je eerst een vraag? Kijk bij de [veelgestelde vragen](veelgestelde-vragen.md).

---

[↑ Terug naar Omnibus](../README.md)
