---
name: harden-agent-repo
description: Loop Omnibus na volgens de SAAF A2-standaard (Audit Criteria & Controls) en werk AUDIT-CRITERIA.md en skills/AUDIT-CRITERIA.md bij, met een korte opschoonronde en een interview met de beheerder. Gebruik bij een nieuwe release, vóór aanlevering bij SAAF, of als de beheerder om een A2-ronde vraagt.
user-invocable: true
disable-model-invocation: true
---

# Harden agent repo (Omnibus-versie)

Bewerking van de SAAF-skill `harden-agent-repo` (SAAF-Project, `.claude/skills/harden-agent-repo/SKILL.md`), overgenomen met toestemming ([B-027](../../../docs/beheer/besluiten.md#b-027)). Verschillen met het origineel:

- Omnibus heeft twee documenten: `AUDIT-CRITERIA.md` (applicatie en MCP-server) en `skills/AUDIT-CRITERIA.md` (de AI-skills).
- De tekst is Nederlands.
- Je opent geen PR in een SAAF-repository en claimt niets op de SAAF-portal. Je werkt in Omnibus, volgens `AGENTS.md`: een issuenummer in elke commit, `npm test` vóór elke push, en pushen alleen met toestemming van de beheerder.

## Stap 1 · Oriënteren

1. **README.** Zegt `README.md` wat Omnibus doet, wat erin gaat en eruit komt, en hoe je het start? Noemt hij de AI-koppeling (`agent-tools/`) en de skills? Een tool als SAAF Agent-Auditor leest de README om te bepalen of een repository een agent is. Klopt de README niet, herstel dat dan eerst.
2. **Bestaand werk.** Beide documenten bestaan al; dit is een bijwerkronde. Lees de epic *Auditcriteria* (#276) en de besluiten B-025 tot en met B-027.
3. **Branches.** Vergelijk `main` met andere actieve branches (`git branch -r`). Wijkt iets af van wat de documenten beschrijven, meld dat dan bovenaan het document. Kies niet stil één variant.
4. **Modelaanroepen.** De applicatie en de MCP-server roepen geen AI-model aan; de skills laten de assistent van de bijdrager wel werken. Controleer of dat nog zo is. AI-kaders (EU AI Act, OWASP LLM, NIST AI RMF) horen alleen bij onderdelen die echt een model aanroepen; elders is het opvulling, geen beheersmaatregel.

## Stap 2 · Hergebruiken, niet herschrijven

Gebruik wat er is: README's, besluiten, tests, de uitkomst van een echte run. Noem de bronnen in de metadata (*Bronnen voor dit document*). Ga uit van de diepgang van het voorbeeld `Audit-Work-Program-Agent-UC-8-` in SAAF: criteria per veld, en per criterium een eerlijke status, ook als die maar deels is.

## Stap 3 · Korte opschoonronde

Doe dit zonder er een zijproject van te maken:

- **Geheimen.** Zoek naar `sk-`, `AKIA`, `-----BEGIN PRIVATE KEY-----` en een `.env` in Git. `npm run check:code-only` doet een deel hiervan. Herschrijf nooit de geschiedenis zonder toestemming van de beheerder.
- **Commits zonder issue.** Tel de commits sinds de vorige ronde zonder `#nummer`, zoals de *light scan* van Agent-Auditor dat doet. Zet de telling in de dekkingsgaten.
- **Observability.** Klopt sectie 7 nog: wat wordt vastgelegd, wat bewust niet (privacy eerst), en wat ontbreekt?
- **De MCP-protocolproef.** Draai `npm run build:agent -- --settings <database>` en daarna `npm run test:agent:protocol`. Een verouderde build geeft valse fouten.
- Iets groters gevonden? Zet het als dekkingsgat in stap 4 en maak er een story van. Repareer het niet nu.

## Stap 4 · Het interview

Loop de documenten met de beheerder door, één onderdeel tegelijk:

1. **Wat het doet.** Twee tot vier zinnen: doel, invoer, uitvoer, de audittaak die het ondersteunt.
2. **Beheersdoelstellingen (CO-n, minstens drie).** Ze gaan over het eigen, betrouwbare gedrag van Omnibus: verzint niets, alles is herleidbaar, twijfel wordt gemeld. Ze gaan niet over het vakgebied van de bronnen (DORA, NOREA). Koppel elke doelstelling aan een kader uit de SAAF-lijst *domains-and-frameworks*, met artikel of onderdeel en de reden. Een implementatiedetail is geen doelstelling.
3. **Toetsbare criteria.** Per doelstelling: "Gegeven X, doet Omnibus Y" of "… doet niet Y". Vraag wat een tester echt zou controleren. Een beperking zet je direct bij het criterium: *Beperking, eerlijk benoemd: …*.
4. **Goede uitvoer en wat nooit mag.**
5. **Dekkingsgaten.** Vraag: "Wat zou een auditor redelijkerwijs verwachten dat er nog niet is?" Ook gaten in de repository tellen mee.
6. **Status en bewijs.** Draai elk criterium echt: de genoemde test of controle. Meld een mislukking. ☑ geslaagd, ◐ deels, ☐ niet uitgevoerd. Een mens beslist of een test het criterium dekt. *Concept* is een prima status.
7. **Observability.** Toets sectie 7 aan de tien vragen van SAAF: doel, gebruikers en belanghebbenden, werkstroom, kritieke beslissingen, faalwijzen, vast te leggen velden, beheersmaatregelen (toegestane tools, poorten, menselijke goedkeuring), auditbewijs dat maanden later nog nodig is, signalen, en succesmaatstaven.

Werk de bestanden tijdens het interview bij, zodat de beheerder ze ziet groeien.

## Stap 5 · Vastleggen

- Commit met het issuenummer van de epic of story, draai `npm test` en push alleen met toestemming van de beheerder.
- Zet open punten als reactie in de epic, met de overdrachtsnotitie uit `docs/beheer/samenwerking-ai.md`.
- Geen PR in een SAAF-repository zonder nieuw besluit van de beheerder.

## Stap 6 · Daarna

Een volledige beoordeling tegen de vaste A2-criteria doet SAAF Agent-Auditor (zie de story *Agent-Auditor lokaal* in #276). Deze skill maakt de documenten daar klaar voor.
