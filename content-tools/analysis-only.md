# Afzonderlijke herhaalanalyse

`scripts/prepare-skill-analysis.mjs` bereidt één bron voor op een nieuwe analyse, ook als die identiteit al actief is. Het maakt een nieuw dossier onder `work/skill-analysis/<run-id>/`. Het vraagt geen auteursregister, importeert geen applicatiemodules en voert de rapportkit niet uit. De gewone intake en de toelatingsvoorwaarden blijven ongewijzigd.

Het dossier is **geen toegelaten pakket**. Het eigen formaat `omnibus-analysis-only` wordt door `content:intake` en `content:prepare` geweigerd, ook als iemand het bestand `intake.json` noemt. `publishable`, `admitted`, `contentValidated` en `reviewValidated` blijven `false`; publicatie blijft HOLD. Dit commando verleent geen recht om analyse-uitvoer in een catalogus op te nemen.

## Voorbereiden

1. Leg de oorspronkelijke bronidentiteit, editie, PDF-hash, teksthash en een aaneengesloten paginamapping vast. De mapping gebruikt Unicode-codepoints (`page`, `start`, `end`), vanaf nul tot de volledige tekstlengte. Lever reeds gecontroleerde bronbestanden aan; dit hulpmiddel bewijst niet dat tekst en pagina's inhoudelijk met de PDF overeenkomen en voert geen extractie uit.
2. Vraag de actuele skillbasis op met `node scripts/prepare-skill-analysis.mjs basis omnibus-add-report` (of `omnibus-add-framework`). Dit inventariseert de volledige gekozen skill, de OAK-skill, `AGENTS.md` en de samenwerkingsafspraken met hun SHA-256 en HEAD. Neem deze basis met het werkelijk gekozen `model` over in het plan. Een inventarisatie is geen onafhankelijke goedkeuring. Gewijzigde of ontbrekende bestanden en een andere repositoryversie blokkeren de voorbereiding.
3. Pin voor rapporten de bestaande `RELEASE-MANIFEST.json` en de onafhankelijke `APPROVAL.json` van de vrijgegeven kit. Alle manifestleden en de verplichte kernbestanden worden gecontroleerd, zonder scripts uit te voeren. Voor kaders zijn de onveranderde `CONTRACT.txt` en `CONTRACT-ADDENDUM-01.txt` vereist.
4. Bewaar het plan privé en leg de planhash afzonderlijk vast. Start vervolgens: `node scripts/prepare-skill-analysis.mjs prepare <plan.json> --expect-sha256 <bewaarde-planhash> --run <nieuwe-run-id>`. De ID van de bron blijft gelijk; de run-ID is uitsluitend de naam van het analysedossier. Een bestaande map wordt nooit hergebruikt of overschreven.
5. Bewaar de teruggegeven manifesthash afzonderlijk en controleer vóór gebruik: `node scripts/prepare-skill-analysis.mjs check <analysis.json> --expect-sha256 <bewaarde-manifesthash>`. Deze controle vergelijkt de vastgelegde invoerbytes, ook als de originele werkbestanden later wijzigen. Zij keurt geen inhoudelijke uitvoer goed.

Het plan heeft de volgende vorm. Alle paden zijn lokale invoerpaden; gebruik absolute paden zodat het plan niet afhangt van de huidige werkmap. Vervang de schematische waarden door werkelijk vooraf bewaarde hashes en bronmetadata.

```json
{
  "format": "omnibus-analysis-plan",
  "schemaVersion": 1,
  "source": {
    "id": "bestaande-bron-id",
    "kind": "report",
    "edition": "exacte titel, uitgever en editie",
    "pdf": { "path": "<originele-pdf>", "sha256": "<bewaarde-hash>" },
    "text": { "path": "<gecontroleerde-tekst>", "sha256": "<bewaarde-hash>" },
    "pages": [{ "page": 1, "start": 0, "end": 123 }]
  },
  "basis": {
    "skill": "omnibus-add-report",
    "repositoryRevision": "<volledige-commit>",
    "files": { "<ieder-pad-uit-basis>": "<bewaarde-hash>" },
    "model": "<werkelijk-model>"
  },
  "method": {
    "contract": "report-kit-1.1",
    "manifest": { "path": "<kit-manifest>", "sha256": "<onafhankelijk-bewaarde-hash>" },
    "approval": { "path": "<kit-goedkeuring>", "sha256": "<onafhankelijk-bewaarde-hash>" }
  }
}
```

Bij `kind: "framework"` is `method`:

```json
{
  "contract": "framework-cio-0.1+addendum-01",
  "files": {
    "CONTRACT.txt": { "path": "<contract>", "sha256": "<bewaarde-hash>" },
    "CONTRACT-ADDENDUM-01.txt": { "path": "<addendum>", "sha256": "<bewaarde-hash>" }
  }
}
```

## Inhoudelijke uitvoering en meting

De exacte invoerkopieën staan onder `inputs/source`, `inputs/basis` en `inputs/method`. De mappen onder `analysis/` zijn aanvankelijk leeg. Gebruik deze voor de nieuwe lezingen, reconciliatie, praktische uitwerking, reviews en meting. De twee lezers krijgen ieder een onafhankelijke context met alleen hun eigen opdracht en de vastgepinde bron en instructies. Lege rolmappen bewijzen geen onafhankelijkheid. Er wordt geen eerdere bronbank of review als nieuwe uitkomst gekopieerd en er worden geen kitontvangstbewijzen nagebootst.

De status is `INPUTS_PINNED_NOT_READ`. De technische voorbereiding registreert haar werkelijke begin, einde en duur afzonderlijk. Werkelijke tokens en kosten blijven `null` zonder verzoektelemetrie of factuurgegevens. De inhoudelijke run staat op `NOT_STARTED`, met onbekende tijd, tokens, kosten en kwaliteit. Het commando schat geen score en telt bestandsgrootte niet als verbruik.

Voor een echte nulmeting blijven alle inhoudelijke skillverplichtingen nodig: volledige onafhankelijke tekst- en beeldlezingen, reconciliatie, actuele vastgepinde applicatie-/taxonomiecontext voor de praktische uitwerking, conceptreview, herstel, afzonderlijke exacte eindreviews en volledige OAK-dekking. Bewaar werkelijke fasewaarnemingen en verbruik in afzonderlijke meetbestanden; wijzig het oorspronkelijke voorbereidingsmanifest niet. Ontbrekende context, bronzekerheid of reviews blijven HOLD. Dit hulpmiddel vervangt geen kitworkflow, reviewvalidator of publicatiepoort en telt op zichzelf niet als een nulmeting.

---

[↑ Hulpmiddelen voor de beheerder](README.md) · [Wegwijzer](../docs/README.md) · [Begrippen](../docs/begrippen.md) · [Routekaart](../docs/routekaart.md)
