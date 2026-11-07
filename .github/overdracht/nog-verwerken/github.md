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

## Database v0.1.6 · splitsingen en nieuwe toetspunten (7 november 2026)

Bevat alles van v0.1.5. Klaar, nog niet gepubliceerd. Pakket: `D:\Rijksmap-rapporten\Project Omnibus\release-package-splitsingen-2026-11-07\`. Release `dcce0054…2f11e`, publicatie `ec586984…a9502`, catalogue.sqlite `adeedb68…52fe7`.

- Publiceer bij voorkeur alleen v0.1.6 als `database-2026-11-07-splitsingen` (titel *Database 7 november 2026 · splitsingen en nieuwe toetspunten · v0.1.6*); v0.1.5 is dan een tussenstap.
- Bouwbestanden: `work/dora-ronde6-20261107/` (apply6, renew6, build6: nieuwe ID's direct na hun buur; extra bronresources per kader).
- Open: bij 2 nieuwe toetspunten is de bronkoppeling die van het naastgelegen toetspunt (geen eigen bronrecord gevonden); BRRD artikel 7 (groepsherstelplan) wacht op de geconsolideerde tekst; NOREA-werkbladrijen als bronpassage (nieuw brondocument nodig).

## Database v0.1.7 · bronkoppelingen en NOREA-werkbladen (7 november 2026)

Bevat v0.1.5 en v0.1.6. Publiceer bij voorkeur alleen deze als `database-2026-11-07-bronkoppelingen` (titel *Database 7 november 2026 · bronkoppelingen en NOREA-werkbladen · v0.1.7*). Pakket: `D:\Rijksmap-rapporten\Project Omnibus\release-package-bronkoppelingen-2026-11-07\`. Release `ed3cf48f…f9b7c`, publicatie `bf24ff5c…8a0d6`, catalogue.sqlite `06e4ccc4…0efa52`. Bouwbestanden: `work/dora-ronde7-20261107/`.

- Van de 343 meldingen *onvolledige bronpassage* waren er 326 al gedekt: de herschrijvers kregen alleen de primaire passage te zien; viewer en export tonen alle koppelingen. 17 aangevuld.
- 26 werkbladrecords (NOREA v3.2) op bestaande werkboekpagina's; 62 koppelingen. Niet gekoppeld: 5 verwijzingen naar de twee tekstvakken op *Major Incidents* (staan niet in het bronwerkboek).
- Open: BRRD artikel 7 (groepsherstelplan) vraagt een nieuw brondocument.
