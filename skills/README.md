# AI-skills van Omnibus

Zes losse instructiepakketten helpen bij het voorbereiden en reviewen van auditinhoud. Je kunt ze afzonderlijk installeren; je hebt ze niet alle zes nodig.

| Taak | Skill |
| --- | --- |
| [Een auditrapport voorbereiden](omnibus-add-report/README.md) | `omnibus-add-report` |
| [Een wet of normenkader voorbereiden](omnibus-add-framework/README.md) | `omnibus-add-framework` |
| [Een conceptueel model voorbereiden](omnibus-add-model/README.md) | `omnibus-add-model` |
| [Onderzoeks- en interviewvragen ontwerpen](omnibus-build-questions/README.md) | `omnibus-build-questions` |
| [Thema's en overlappende bouwstenen ordenen](omnibus-curate-themes/README.md) | `omnibus-curate-themes` |
| [De kwaliteit van auditbouwstenen reviewen](omnibus-review-audit-quality/README.md) | `omnibus-review-audit-quality` |

## Begin met één skill

Lees de introductie hierboven, daarna de SKILL.md en de verplichte naslag. De applicatie en de bronverzameling zitten niet in een skill.

Vanuit de repository controleer en installeer je één skill zo:

```text
npm run skills:check -- --skill omnibus-review-audit-quality
npm run skills:install -- --skill omnibus-review-audit-quality
```

Laat `--skill` weg om alle zes te kiezen, of herhaal het voor meerdere. De standaardbestemming is de skillsmap onder `CODEX_HOME`, of `~/.codex/skills` als die variabele niet is ingesteld. Met `--target <map>` kies je een andere bestemming. De controlemodus installeert niets. Een afwijkende bestaande skill wordt nooit overschreven: vergelijk en bewaar je eigen aanpassingen voordat je bijwerkt.

Elke map heeft een eigen licentie en introductie, zodat je hem los kunt delen. Kopieer de hele map, niet alleen SKILL.md. Het installatiescript en de metadata zijn gemaakt voor Codex; andere assistenten hebben hun eigen manier nodig om instructies te laden.

## Belangrijke grenzen

Dit zijn herbruikbare methoden, geen getrainde modellen, zelfstandige diensten of gegarandeerde conclusies. Ze bevatten geen AI-abonnement, geen private databases, geen bronrechten en niet elk hulpmiddel uit de opnameroute.

Het voorbereiden van rapporten, kaders en modellen hangt voor volledige opname en publicatie af van aparte contracten, broninvoer of private werkstromen. Vragen ontwerpen en tekstreviews zijn ook bruikbaar met meegeleverde broncontext, zonder iets te publiceren. Zie [eigen documenten gebruiken](../docs/own-content.md) voor de precieze grens.

Een technische intakecontrole toetst bestanden en integriteit, niet de betekenis. Ontbreekt verplicht bewijs of een onafhankelijke review, dan blijft de status HOLD of PENDING_REVIEW. Simuleer geen meerdere reviewers in één gesprek, en presenteer een AI-review niet als menselijke goedkeuring.

Controleer of je documenten naar een AI-aanbieder mag sturen. Houd vertrouwelijke bronnen buiten openbare issues, pull requests en voorbeelden.

De eigen skillinstructies vallen onder de [PolyForm Noncommercial License 1.0.0](../LICENSE). Brondocumenten houden hun eigen rechten. Een voorstel voor een betere methode is welkom, met een voorbeeld van het probleem en bewijs dat de verbetering de brontrouw en de goedkeuringsgrenzen niet verzwakt.
