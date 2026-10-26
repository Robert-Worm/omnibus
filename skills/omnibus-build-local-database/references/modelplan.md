# Minimaal plan voor een modelpakket

Lees dit vóór je in stap 3 het `plan.json` van een onderzoeksmodel maakt. Het plan noemt alleen
bestanden die er al zijn, met hun echte rol. Er zit geen review, akkoord of hash in: die
ontstaan bij de echte reviews en bij `npm run content:prepare`.

```json
{
  "format": "omnibus-intake-plan",
  "schemaVersion": 1,
  "package": {"id": "mijn-model", "kind": "model", "version": "concept-1", "title": "Titel van het model"},
  "contract": "model-review-1",
  "files": [
    {"id": "contract", "path": "payload/contract.md", "roles": ["contract"]},
    {"id": "bron", "path": "payload/bron.txt", "roles": ["source", "source-text"]},
    {"id": "model", "path": "payload/model.json", "roles": ["viewer-content"]},
    {"id": "context", "path": "payload/context.md", "roles": ["context", "limitations"]},
    {"id": "reviewbasis", "path": "payload/reviewbasis.json", "roles": ["review-basis"]},
    {"id": "reviews", "path": "payload/reviews.json", "roles": ["review"]}
  ]
}
```

- `reviewbasis.json` is de volledige uitkomst van `prepareModelReview` uit
  `content-tools/model-quality.mjs`, voor dit model en deze bron.
- `reviews.json` is de lijst met de twee echte reviews, theorie en praktijk, gebonden aan die
  basis. Twee verschillende reviewers, allebei anders dan de auteur.
- Is de bron een pdf, neem dan de pdf op met rol `source` en de tekst apart met rol `source-text`.
- Het verificatieverslag uit stap 4 komt pas in de definitieve intake, met rol `supporting`.

De exacte eisen aan elk bestand staan in `content-tools/local-database.md`, bij *Zet de pakketten klaar*.
