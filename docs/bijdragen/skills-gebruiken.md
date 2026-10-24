# Skills gebruiken met je AI-assistent

<!-- paginatype: taak -->

> **In het kort:** hier staat hoe je een Omnibus-skill laadt in Codex, Claude Code, de Claude-app of ChatGPT. Controleer daarna of jouw assistent alle meegeleverde bestanden kan lezen.

## Welke assistent past bij jou?

| Assistent | Hoe je de skill laadt | Geschikt voor |
| --- | --- | --- |
| Codex | Installatieopdracht vanuit de repository | Concept; technische controles als de benodigde omgeving aanwezig is |
| Claude Code | Skillmap kopiëren naar je eigen skills-map | Concept; technische controles als de benodigde omgeving aanwezig is |
| Claude-app (web of desktop) | Skill als zip uploaden | Een bron verwerken tot concept |
| ChatGPT | Skill uploaden of de map als bestanden toevoegen | Een bron verwerken tot concept |

Voor bijdragers is een **concept** genoeg: de beheerder doet de laatste controles. Ontbrekende bronlezingen, onafhankelijke reviews of hulpmiddelen blijven zichtbaar als beperking. Een geïnstalleerde skill bewijst niet dat die stappen zijn uitgevoerd. Gebruik het sterkste model dat je hebt; zie [welk AI-model gebruik je?](bron-verwerken.md#welk-ai-model-gebruik-je).

Alle voorbeelden gebruiken `omnibus-add-report`. Voor een wet of kader gebruik je `omnibus-add-framework`, voor een onderzoeksmodel `omnibus-add-model`.

## Wat heb je nodig?

Haal eerst de [code op](../gebruiken/installeren.md#1-haal-de-code-op). Voor het kopiëren of uploaden van een skill heb je de database en applicatieonderdelen niet nodig. Bewaar de hele gekozen skillmap, inclusief eventuele mappen `references/`, `assets/` en `scripts/`.

Voor Claude Code moet dat programma al beschikbaar zijn. Voor uploaden in de Claude-app of ChatGPT heb je toegang tot de betreffende functie nodig. Controleer dit in je eigen account; een abonnement of werkruimte kan beperkingen hebben.

## Codex

1. Haal de repository op en installeer de onderdelen, zie [installeren](../gebruiken/installeren.md), stap 1 en 2.
2. Installeer de skill:

   ```text
   npm run skills:install -- --skill omnibus-add-report
   ```

3. Start Codex en vraag: *Gebruik $omnibus-add-report voor dit rapport.*

## Claude Code

1. Kopieer de hele map `skills/omnibus-add-report/` uit de repository naar je eigen skills-map. Het bestand staat daarna op `~/.claude/skills/omnibus-add-report/SKILL.md`. Op Windows is `~` je gebruikersmap, bijvoorbeeld `C:\Users\jouwnaam`. Bewaar eigen aanpassingen als daar al een skill staat.
2. Start Claude Code in een map met je bron.
3. Vraag: *Gebruik de skill omnibus-add-report voor dit rapport*, of typ `/omnibus-add-report`.

Zie ook de [uitleg voor Claude Code](https://code.claude.com/docs/en/skills). Controleer vóór bronverwerking de bestanden met de proef hieronder.

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

   Open de zip ter controle. Daarin staan onder meer `omnibus-add-report/SKILL.md`, `omnibus-add-report/references/report-method.md` en `omnibus-add-report/assets/intake-plan.json.example`.

2. **Upload de zip** in de Claude-app bij *Customize* → *Skills*, en zet de skill aan. Het precieze menu kan per abonnement verschillen; zie de [uitleg van Anthropic](https://claude.com/docs/skills/how-to).
3. **Start een gesprek** en doe eerst de proef hieronder. Voeg daarna het rapport toe en vraag om een conceptpakket.

## ChatGPT

1. **Maak een zip van de skillmap**, zoals hierboven bij de Claude-app.
2. **Voeg de skill toe** als jouw ChatGPT-omgeving installatie aanbiedt. De mogelijkheden hangen af van je omgeving en de rechten in je werkruimte. Zie de [uitleg van OpenAI](https://learn.chatgpt.com/docs/skills-and-plugins).
3. **Kan dat niet?** Voeg alle bestanden uit de skillmap als bijlagen toe, of zet ze in een [ChatGPT-project](https://learn.chatgpt.com/docs/projects). Neem ook `assets/` en eventuele `scripts/` mee, niet alleen `SKILL.md` en `references/`. Vermeld per bijlage het oorspronkelijke pad binnen de skillmap als de app geen mappen bewaart.
4. Doe eerst de proef hieronder. Kan de assistent een nodig bestand niet lezen, kies dan een omgeving die dat wel kan. Voeg pas daarna het rapport toe en vraag om een conceptpakket.

## Controleer vóór je begint

Vraag je assistent:

> Lees SKILL.md en de meegeleverde naslag. Noem welke bestanden je hebt gelezen en welke verwijzingen je niet kunt openen. Voor omnibus-add-report: lees ook assets/intake-plan.json.example. Maak nog geen extractie. Geef aan welke hulpmiddelen en onafhankelijke reviews ontbreken voor deze werkwijze.

**Gelukt als:** de assistent de bestanden kan lezen en ontbrekende onderdelen concreet noemt. Alleen zeggen dat de skill geladen is, bewijst dit niet.

Werk je zonder de private rapportkit of zonder lokale bestandstoegang? Vermeld dat in je opdracht en vraag om een overdraagbaar concept. Ontbrekende reviews blijven `PENDING_REVIEW` of `HOLD`, zoals de skill voorschrijft. Laat de assistent uitgevoerde stappen en open controles apart opsommen. Een map of zip maken is geen bewijs van een volledige inhoudelijke review.

## Goed om te weten

- **De skill verwijst soms naar opdrachten** zoals `npm run content:intake`. Die zijn voor de beheerder. Ontbreekt de verwerkingsomgeving, noteer deze controles dan als niet uitgevoerd. Maak geen vervangend goedkeuringsbewijs.
- **Lange rapporten** passen niet altijd in één gesprek. Werken per hoofdstuk vervangt de vereiste volledige bronlezingen en onafhankelijke reviews niet. Bewaar de paginadekking; ontbrekende delen of reviews blijven `HOLD`.
- **Deel alleen wat je mag delen.** Controleer of je de bron met jouw AI-dienst mag delen, ook bij een openbaar rapport. Vertrouwelijke stukken vereisen toestemming.
- **Controleer altijd zelf** of de bronpassages kloppen, zoals beschreven in [een bron verwerken](bron-verwerken.md#4-controleer-het-resultaat).

## Samengevat

Codex en Claude Code laden de skill vanuit de repository. In de Claude-app en ChatGPT gebruik je de beschikbare installatie- of bijlagenroute. Controleer dat alle benodigde bestanden leesbaar zijn. Lever een concept met de werkelijke lees- en reviewstatus.

## Volgende stap

Verder met [een bron verwerken](bron-verwerken.md), stap 2.

---

[↑ Meedoen](README.md) · [Wegwijzer](../README.md) · [Begrippen](../begrippen.md) · [Routekaart](../routekaart.md)
