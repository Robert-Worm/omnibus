# Nog te doen op GitHub

**Push en releases**
- [ ] `git push -u origin toetspunten-auditor`; daarna pull request naar `main` met verwijzing naar deze map.
- [ ] Nieuwe database na de herschrijving: release maken (de beheerder uploadt), daarna `database-release.mjs` en Dockerfile omzetten.

**Online versie draait nu zonder GitHub (8 november 2026)**
- Sinds 8 november draait omnibus.rijksmap.nl op de Sliplane-service `omnibus-image`, image `docker.io/robertworm/omnibus:0.1.11` (digest `5e17794f…fd51e5587`), gebouwd met `hosting/container/Dockerfile.lokaal` uit commit 408c12c en database v0.1.11. De oude service `omnibus` (GitHub-bron) staat op pauze, niet verwijderd.
- [ ] Als GitHub terug is: kiezen of de host weer vanuit GitHub bouwt (domein terug naar `omnibus`, `omnibus-image` pauzeren) of bij de image blijft.

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

## Database v0.1.10 · artikel 23 en toepassing (8 november 2026)

Bevat v0.1.5 tot en met v0.1.9. Publiceer bij voorkeur alleen deze als `database-2026-11-08-artikel23` (titel *Database 8 november 2026 · artikel 23 en toepassing · v0.1.10*). Pakket: `D:\Rijksmap-rapporten\Project Omnibus\release-package-artikel23-2026-11-08\`. Release `89598dde…cba37`, publicatie `3ec79d07…d4b85`, catalogue.sqlite `46d7eeaf…036c4`. Bouwbestanden: `work/dora-ronde10-20261108/`.

- Nieuw toetspunt DORA-PILOT20-N01-P03-N1 (artikel 23), uitgewerkt en apart gereviewd; bronbeslissing van het record naar *uitgewerkt*.
- Toepassing van DORA en RTS 2024/1774 noemt wie onder artikel 16, lid 1, valt.
- Let op: `lib/framework-about-guidance.mjs` pint de context per kader; bij elke wijziging van context of beperkingen de pin bijwerken (zes kaders herpind in deze branch).

## Database v0.1.9 · normen hersteld (8 november 2026)

Bevat v0.1.5 tot en met v0.1.8. Publiceer bij voorkeur alleen deze als `database-2026-11-08-normen` (titel *Database 8 november 2026 · normen hersteld · v0.1.9*). Pakket: `D:\Rijksmap-rapporten\Project Omnibus\release-package-normen-2026-11-08\`. Release `f341e916…098ce`, publicatie `e406b882…69f14`, catalogue.sqlite `e672b356…6f8ac`. Bouwbestanden: `work/dora-ronde9-20261108/`.

- Zes normen en één beheersmaatregel: alleen fouten hersteld (besluit 8 november). Drie toetsen zonder werktaal. Misleidende afbakeningszin bij DORA vervangen.

## Database v0.1.13 · uitvoerbare toetspunten (9 november 2026)

Bevat v0.1.8 tot en met v0.1.12. Publiceer bij voorkeur alleen deze als `database-2026-11-09-uitvoerbaar` (titel *Database 9 november 2026 · uitvoerbare toetspunten · v0.1.13*). Pakket: `D:\\Rijksmap-rapporten\\Project Omnibus\\release-package-uitvoerbaar-2026-11-09\\`. Release `52174c7e…2e6583`, publicatie `2f789e17…388981`, zip `d21c0ffc…b792daca`. Bouwbestanden: `work/dora-ronde13-20261109/`. Bouwmap voor de image: `omnibus-bouwmap-0.1.13` (commit 3b2c2a6). 1.410 DORA-toetspunten herschreven (toepassing, voorwaarden, relevantie, handeling en bewijs), per batch apart gereviewd; registers ITS 2956 en 302 volgen in ronde 14.

## Database v0.1.12 · minder tekst (8 november 2026)

Bevat v0.1.8 tot en met v0.1.11. Publiceer bij voorkeur alleen deze als `database-2026-11-08-minder-tekst` (titel *Database 8 november 2026 · minder tekst · v0.1.12*). Pakket: `D:\\Rijksmap-rapporten\\Project Omnibus\\release-package-minder-tekst-2026-11-08\\`. Release `81ffe097…61d3af`, publicatie `a5324b29…808997`, zip `ed939816…e4fd3ff`. Bouwbestanden: `work/dora-ronde12-20261108/`. Bouwmap voor de image: `omnibus-bouwmap-0.1.12` (commit 7babfe7).

- Dubbele regels en zinnen binnen velden weg; kanttekeningen die bij bijna elk toetspunt stonden, staan één keer bij het kader.
- 219 zinnen met Engels of interne codes herschreven (betekenisreview: 207 goed, 11 verbeterd); Engelse brontekst van GL34 blijft brontekst.
- Normtekst 1502-C01-T01 zonder ingevoegde opmerking.

## Database v0.1.11 · werktaal (8 november 2026)

Bevat v0.1.8 tot en met v0.1.10. Publiceer bij voorkeur alleen deze als `database-2026-11-08-werktaal` (titel *Database 8 november 2026 · werktaal · v0.1.11*). Pakket: `D:\Rijksmap-rapporten\Project Omnibus\release-package-werktaal-2026-11-08\`. Release `129c31b9…7de156`, publicatie `898d05f8…6daee`, zip `e96ca05a…dccc8731`. Bouwbestanden: `work/dora-ronde11-20261108/`. Draait al online via de image.

- Werktaal uit alle zichtbare hulpvelden (985 zinnen), betekenis gecontroleerd door aparte reviewers; 45 correcties.
- Eigen afbakening en voorwaarden voor de 21 nieuwe toetspunten; herhaald bewijs bij bestaan vervangen door een verwijzing naar opzet; vier normcitaten hersteld.

## Database v0.1.8 · herstel na panelronde 3 (8 november 2026)

Bevat v0.1.5 tot en met v0.1.7. Publiceer bij voorkeur alleen deze als `database-2026-11-08-herstel` (titel *Database 8 november 2026 · herstel na panelronde 3 · v0.1.8*). Pakket: `D:\Rijksmap-rapporten\Project Omnibus\release-package-herstel-2026-11-08\`. Release `e2659960…707e4`, publicatie `2c94dab8…d18e6`, catalogue.sqlite `8cd8e72f…12e58`. Bouwbestanden: `work/dora-ronde8-20261108/`.

- Bronkoppelingen per gesplitst deel (249 delen); precieze koppelingen en bronbeslissingen bij de 18 nieuwe toetspunten; N262-P01-N1 onder norm N260.
- Werktaal in hulpteksten en bronbeperkingen per zin herschreven; norm- en toetspuntteksten ongewijzigd.
- Codewijzigingen (Excel comprimeren, melding niet-gekoppelde bouwstenen, interviewniveau) zitten in de branch, niet in de database.

## Database v0.1.7 · bronkoppelingen en NOREA-werkbladen (7 november 2026)

Bevat v0.1.5 en v0.1.6. Publiceer bij voorkeur alleen deze als `database-2026-11-07-bronkoppelingen` (titel *Database 7 november 2026 · bronkoppelingen en NOREA-werkbladen · v0.1.7*). Pakket: `D:\Rijksmap-rapporten\Project Omnibus\release-package-bronkoppelingen-2026-11-07\`. Release `ed3cf48f…f9b7c`, publicatie `bf24ff5c…8a0d6`, catalogue.sqlite `06e4ccc4…0efa52`. Bouwbestanden: `work/dora-ronde7-20261107/`.

- Van de 343 meldingen *onvolledige bronpassage* waren er 326 al gedekt: de herschrijvers kregen alleen de primaire passage te zien; viewer en export tonen alle koppelingen. 17 aangevuld.
- 26 werkbladrecords (NOREA v3.2) op bestaande werkboekpagina's; 62 koppelingen. Niet gekoppeld: 5 verwijzingen naar de twee tekstvakken op *Major Incidents* (staan niet in het bronwerkboek).
- Open: BRRD artikel 7 (groepsherstelplan) vraagt een nieuw brondocument.
