# Bijdragersmodus

Lees dit als de private verwerkingsomgeving met de rapportkit niet beschikbaar is, bijvoorbeeld bij
een bijdrager in de Claude-app of ChatGPT. Je levert dan een **concept**, geen toelaatbaar
`report-kit-1.1`-pakket. De regels uit `SKILL.md` en [de rapportwerkwijze](report-method.md) blijven gelden.

- Vraag alleen naar de bron, als die ontbreekt. Vraag niet naar de rapportkit, een checkout of
  een projectmap. Geen budget opgegeven? Werk dan zonder deelagenten.
- Lees de hele bron volledig, één keer, en leg de paginadekking vast. Kun je geen afzonderlijke
  contexten gebruiken, dan blijven de tweede blinde lezing, de reconciliatie en de eindreviews
  `PENDING_REVIEW`. Simuleer ze niet en schrap ze niet.
- Lever één map `<pakket-id>-concept-<n>/` met deze bestanden; gebruik precies deze namen:

  | Onderdeel | Bestanden |
  | --- | --- |
  | Overzicht | `LEESMIJ.md`: leesvolgorde, afbakening en wat nog open is |
  | Bron | `bron.json`: titel, uitgever, link, datum en de hash van de pdf als je die kunt berekenen; `source-text.json` met de tekst per pagina |
  | Bouwstenen | `RECONCILED-SOURCE.json`, `APP-FINAL.json`, `CATALOGUE.json`, `APP-SOURCE-LINKS.json` en `context.json`, in de vorm uit [de rapportwerkwijze](report-method.md) |
  | Beperkingen | `beperkingen.md`: bronbeperkingen en alle HOLD- en `PENDING_REVIEW`-punten |
  | Eigen controle | `controle.md`: wat gelezen en gecontroleerd is, en wat niet; AI-controle apart van menselijke |

- Maak geen `intake.json`, reviewbasis, ontvangstbewijs of goedkeuring na. Die maakt de beheerder.
- Bied de map aan als zip om te downloaden, als je omgeving dat kan.
