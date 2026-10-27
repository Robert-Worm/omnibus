# Bron voorbereiden en invoer bevriezen

Gebruik [prepare-source.py](../scripts/prepare-source.py) voor een **nieuwe**
rapportextractie. Het zet de exacte PDF, tekst en alle paginabeelden klaar voor
twee blinde lezingen. Het schrijft geen bevindingen, leeslogs, reviews of
goedkeuringen en opent geen database. Gebruik het niet om een bestaand dossier
achteraf van nieuwe bewijzen te voorzien.

## Benodigd

- Een lokale, leesbare PDF waarvan de coördinator de juiste editie heeft vastgesteld
  en de SHA-256 buiten het pakket heeft bewaard.
- Python 3.9 of nieuwer met de [geteste pypdf-versie](../scripts/requirements-source.txt)
  en Poppler `pdftoppm` voor paginabeelden. Installeer die zo nodig in je eigen
  lokale hulpmiddelenomgeving; de skill installeert niets automatisch.
- Een nieuwe pakketmap buiten de skill, met een al bestaande bovenliggende map.
  Gebruik een map van de coördinator, zonder symlinks of gelijktijdige bewerkingen.

De Python-afhankelijkheid installeer je in die omgeving vanuit de skillmap met
`python -m pip install -r scripts/requirements-source.txt`. Kies `python3` als
dat op jouw computer de naam van Python is. Poppler is een apart lokaal hulpmiddel.

## Uitvoeren

Voer vanuit de skillmap uit en vervang de waarden tussen `<...>`:

```text
python -B scripts/prepare-source.py --pdf <origineel.pdf> --pdf-sha256 <bewaarde-bronhash> --source-id <rapportidentiteit> --packet <nieuwe-pakketmap>
```

Staat `pdftoppm` niet op je zoekpad, voeg dan
`--renderer <pad-naar-pdftoppm>` toe. Gebruik een eigen vertrouwde installatie.
De voorbereiding leest de hele PDF en rendert alle pagina's op maximaal 1600
pixels. Lege tekstpagina's blijven behouden; het hulpmiddel voegt geen OCR of
verzonnen tekst toe. De onafhankelijke lezers beoordelen ook zulke pagina's visueel.

**Gelukt als:** de uitvoer `INPUTS_PREPARED_NOT_READ` meldt en het aantal pagina's
klopt. Bewaar `input_freeze_sha256` buiten het pakket. De drie velden
`publishable`, `contentValidated` en `reviewValidated` blijven `false`.

De pakketmap bevat:

- `source.pdf`, `source.txt`, `SOURCE.json` en `visual/`: de bron met letterlijke
  tekst, Unicode-codepoint-offsets en alle paginabeelden;
- `extractor/` en `inventory/`: ieder een volledige bronkopie, eigen `TASK.md`,
  broncontract en recordcontrole, plus een **lege** `output/`;
- `INPUT-FREEZE.json`: checksums van de oorspronkelijke bron, beide leesmappen,
  beelden en instructies, plus de gebruikte hulpmiddelenversies.

Geef ieder onafhankelijk gesprek uitsluitend zijn eigen leesmap. Een mapnaam
bewijst geen onafhankelijke lezing; deel geen geschiedenis of andere inzendingen.

## Daarna

Volg het [pakketoverzicht](report-package.md) voor de verdere methode. Selectie,
de actuele baseline/taxonomie en de onafhankelijk beoordeelde hulpmiddelenrelease
moeten volgens het bestaande uitvoercontract worden vastgelegd. Deze voorbereiding
maakt of keurt die stukken niet namens de coördinator goed.

De [fasebewijscontrole](stage-receipts.md) gebruikt de afzonderlijk bewaarde
`--input-freeze-sha256`. Zij controleert alle bevroren bestanden opnieuw en vereist
dat de gebruikte `prepare-source.py` en de vijf broninstructies bij de goedgekeurde
release horen. Een technische bevriezing is geen bewijs van gelezen broninhoud.
`FIRST-SUBMISSIONS.json` hoort pas **na** beide werkelijke lezingen te ontstaan;
gebruik daarvoor [eerste inzendingen vastleggen](first-submissions.md).

## Als de voorbereiding stopt

Een bestaande pakketmap wordt nooit overschreven. Bij een onderbroken of mislukte
voorbereiding blijven eventuele deelbestanden behouden, zonder voltooide
`INPUT-FREEZE.json`. Onderzoek de fout en gebruik een nieuwe map; reconstrueer
geen ontbrekende bewijsstappen. Een ontbrekend paginabeeld, gewijzigde bron,
versleutelde PDF of overschreden limiet is een blokkade. Neem geen steekproef om
de limiet te omzeilen: maximaal 256 MiB PDF, 2000 pagina's, 7 MiB bron-JSON en vijf
minuten voor het renderen. Bewaar bronnen en gegenereerde pakketten privé.
