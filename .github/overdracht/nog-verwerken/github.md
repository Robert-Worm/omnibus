# Nog te doen op GitHub

**Push en releases**
- [ ] `git push -u origin toetspunten-auditor`; daarna pull request naar `main` met verwijzing naar deze map.
- [ ] Nieuwe database na de herschrijving: release maken (de beheerder uploadt), daarna `database-release.mjs` en Dockerfile omzetten.

**Issues**
- [ ] Nieuwe story onder epic #322: *Toetspunten vanuit de auditor* (besluit 7 november), met de checklist uit `toetspunten.md`. Bovenaan zetten in `.github/overdracht/volgorde.json`.
- [ ] #322: link naar het voorstel (Claude-document *Toetspunten vanuit de auditor*) en de besluiten van 7 november.
- [ ] Checklists van gesloten issues nalopen: #302, #303, #304 tot en met #313. Afvinken wat af is; bij open punten noemen in welke story ze verder lopen.
- [ ] #321: ITS 2025/302 *hele groep kiezen* is opgelost in 09e59ab (afvinken).
- [ ] Na alle bovenstaande: reacties en labels rustig verspreid, niet meer dan een paar per minuut.

**Account**
- [ ] Controleren of Dependabot en Actions weer draaien.

## Database v0.1.5 · toetspunten vanuit de auditor (7 november 2026)

Klaar, nog niet gepubliceerd. Pakket op de D-schijf: `D:\Rijksmap-rapporten\Project Omnibus\release-package-auditor-2026-11-07\` (zip, SHA256SUMS, releasenotities, LEESMIJ, verwerkt.json).

1. Push branch `toetspunten-auditor` (bevat de relevantiecode: icoon in de viewer, kolom in de export) en open een PR.
2. Beheerder maakt release `database-2026-11-07-auditor` met titel *Database 7 november 2026 · toetspunten vanuit de auditor · v0.1.5* en uploadt de zip.
3. Daarna: databasepin en `verwerkt.json` bijwerken (zoals a21fac4), CHANGELOG-regel toevoegen, live versie controleren via `/api/v1/version` (release `d4e4dd2f…d9c44`, publicatie `dbfac2d0…10b6b`; catalogue.sqlite `fa566bac…e8fc0`).
4. Bouwbestanden: `work/dora-ronde5-20261107/` (apply5, renew5, REVIEW-BASIS5, REVIEW-QUESTIONS5, VERSLAG5).
