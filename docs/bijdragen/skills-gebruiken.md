# Skills gebruiken met je AI-assistent

<!-- paginatype: taak -->

> **In het kort:** de Omnibus-skills werken met elke AI-assistent die een map met instructies kan lezen. Hier staat per assistent hoe je een skill installeert en gebruikt: Codex, Claude Code, de Claude-app en ChatGPT.

## Welke assistent past bij jou?

| Assistent | Hoe je de skill laadt | Geschikt voor |
| --- | --- | --- |
| **Codex** | Installatieopdracht vanuit de repository | Alles, ook de technische controles |
| **Claude Code** | Skillmap kopiëren naar je eigen skills-map | Alles, ook de technische controles |
| **Claude-app** (web of desktop) | Skill als zip uploaden | Een bron verwerken tot concept |
| **ChatGPT** | Skill uploaden of de map als bestanden toevoegen | Een bron verwerken tot concept |

Voor bijdragers is een **concept** genoeg: de beheerder doet de technische controles. Elke assistent in de tabel is dus bruikbaar. Gebruik wel het sterkste model dat je hebt; zie [welk AI-model gebruik je?](bron-verwerken.md#welk-ai-model-gebruik-je).

Alle voorbeelden gebruiken `omnibus-add-report`. Voor een wet of kader gebruik je `omnibus-add-framework`, voor een onderzoeksmodel `omnibus-add-model`.

## Codex

1. Haal de repository op en installeer de onderdelen, zie [installeren](../gebruiken/installeren.md), stap 1 en 2.
2. Installeer de skill:

   ```text
   npm run skills:install -- --skill omnibus-add-report
   ```

3. Start Codex en vraag: *Gebruik $omnibus-add-report voor dit rapport.*

## Claude Code

1. Kopieer de map `skills/omnibus-add-report/` uit de repository naar de map met je eigen skills, zodat het bestand op deze plek staat: `~/.claude/skills/omnibus-add-report/SKILL.md`. Op Windows is `~` je gebruikersmap, bijvoorbeeld `C:\Users\jouwnaam`.
2. Start Claude Code in een map met je bron.
3. Vraag: *Gebruik de skill omnibus-add-report voor dit rapport*, of typ `/omnibus-add-report`.

## De Claude-app (web of desktop)

1. **Maak een zip van de skillmap.** De zip moet de map zelf bevatten, niet alleen de bestanden erin.

   Windows (PowerShell), vanuit de map `skills`:

   ```powershell
   Compress-Archive -Path omnibus-add-report -DestinationPath omnibus-add-report.zip
   ```

   macOS en Linux, vanuit de map `skills`:

   ```bash
   zip -r omnibus-add-report.zip omnibus-add-report/
   ```

2. **Upload de zip** in de Claude-app bij *Customize* → *Skills*, en zet de skill aan. Het precieze menu kan per abonnement verschillen; zie de [uitleg van Anthropic](https://claude.com/docs/skills/how-to).
3. **Start een gesprek**, voeg het rapport toe en vraag: *Gebruik de skill omnibus-add-report om een conceptpakket van dit rapport te maken.*

## ChatGPT

1. **Maak een zip van de skillmap**, zoals hierboven bij de Claude-app.
2. **Voeg de skill toe** in ChatGPT. Afhankelijk van je abonnement kun je een skill uploaden en installeren; in een zakelijke omgeving bepaalt de beheerder of dat mag. Zie de [uitleg van OpenAI](https://openai.com/academy/skills).
3. **Kan dat niet?** Voeg dan `SKILL.md` en de bestanden uit de map `references/` als bijlage toe aan je gesprek, of zet ze in een project. Begin met: *Volg de werkwijze in SKILL.md stap voor stap voor het rapport dat ik toevoeg.*
4. Voeg het rapport toe en vraag om een conceptpakket.

## Goed om te weten

- **De skill verwijst soms naar opdrachten** zoals `npm run content:intake`. Die zijn voor de beheerder. In de Claude-app of ChatGPT kun je ze overslaan; zeg dat de assistent een concept maakt.
- **Lange rapporten** passen niet altijd in één gesprek. Verwerk ze dan per hoofdstuk, en noem in je toelichting welke delen je deed.
- **Deel alleen wat je mag delen.** Een openbaar rapport kan altijd; vertrouwelijke stukken horen niet bij een AI-dienst zonder toestemming.
- **Controleer altijd zelf** of de bronpassages kloppen, zoals beschreven in [een bron verwerken](bron-verwerken.md#4-controleer-het-resultaat).

## Samengevat

Codex en Claude Code laden de skill vanuit de repository. In de Claude-app en ChatGPT upload je de skillmap als zip, of voeg je de bestanden toe aan je gesprek. Voor een concept is elke assistent geschikt.

## Volgende stap

Verder met [een bron verwerken](bron-verwerken.md), stap 2.

---

[↑ Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
