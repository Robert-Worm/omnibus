// Reviewed reading layer for exact, authored limitation texts.
// Unknown or amended source-package wording is preserved; no catalogue authority.
/** @type {Map<string,{title:string,text?:string,guide?:string,about?:Record<string,{title:string,text:string,section:string}>}>} */
const wording=new Map([
 [
  "Interne auditors moeten toepasselijke onderwerpen beoordelen. De beschreven organisatieprocessen zijn de maatstaf van die beoordeling; dit document maakt ze niet automatisch tot wettelijke plichten voor de organisatie.",
  {
   "title": "Beroepsvereiste voor de auditor"
  }
 ],
 [
  "Doelen, risico’s, beheersdoelstellingen, maatregelen en de praktische toetsacties zijn analytische toevoegingen. De handleiding geeft voorbeelden; onder meer kwartaal- of jaarfrequenties, producten en bewijsdocumenten zijn daardoor niet verplicht.",
  {
   "title": "Onderzoeksvoorstellen en voorbeelden"
  }
 ],
 [
  "Het kader is een minimumbasis. Stel aanvullende toepasselijke wetgeving en technische eisen afzonderlijk vast. De NIST-/COBIT-mapping bevat bronfouten en bewijst geen volledige gelijkwaardigheid.",
  {
   "title": "Aanvullende eisen apart vaststellen"
  }
 ],
 [
  "Bij een vertaalgeschil geldt volgens de bron het Engelse origineel. Dat origineel is niet meegeleverd en is niet als tweede teksteditie verwerkt.",
  {
   "title": "Engels origineel niet meegeleverd"
  }
 ],
 [
  "De aangeleverde vertaling en handleiding zijn voor individueel gebruik gemarkeerd. Openbare herpublicatie vraagt een afzonderlijke rechtenbeoordeling. Verborgen oude sjabloontekst op de laatste handleidingpagina is niet gebruikt voor norminhoud of uitgave.",
  {
   "title": "Gebruiksrechten en verborgen sjabloontekst"
  }
 ],
 [
  "De interne auditor beoordeelt de beschreven organisatieprocessen. Organisatie- en leveranciersrollen zijn daarmee niet automatisch wettelijke normadressaten.",
  {
   "title": "Rol van auditor, organisatie en leverancier"
  }
 ],
 [
  "Doelen, risico’s, beheersdoelstellingen, maatregelen en toetsacties zijn analytische voorstellen. Bewijsvoorbeelden zijn geen verplichte documenttypen; werking blijft afzonderlijk te ontwerpen.",
  {
   "title": "Bewijsvoorbeelden zijn niet verplicht"
  }
 ],
 [
  "Op peildatum 2026-10-16 is dit kader gepubliceerd maar nog niet van kracht. Selectie is voor voorbereiding of expliciete vrijwillige toepassing; verplichte toepassing begint op 2026-12-15.",
  {
   "title": "Verplichte toepassing vanaf 15 december 2026"
  }
 ],
 [
  "Bij vertaalgeschillen geldt het Engelse origineel; dat is niet meegelezen. Individueel-gebruik/copyrightmarkering is geen toestemming voor openbare herpublicatie.",
  {
   "title": "Engelse tekst en gebruiksrechten"
  }
 ],
 [
  "Bijlage B noemt beheersing G herstelprocessen, terwijl de hoofdvereiste werving en inwerken betreft. De claim dat die casussen alle vijftien vereisten dekken staat op HOLD. De overige voorbeelden zijn alleen illustratief; de juiste hoofdvereiste C-G blijft bruikbaar.",
  {
   "title": "Casussen dekken niet aantoonbaar alle vereisten"
  }
 ],
 [
  "De mapping is geen bewijs van gelijkwaardigheid. De foutieve kolomkop Documentatie Referentie bij COSO-ERM-inhoud maakt de externe inhoud geen documentatieplicht.",
  {
   "title": "COSO-koppeling schept geen documentatieplicht"
  }
 ],
 [
  "Op peildatum 2026-10-16 is dit kader gepubliceerd maar nog niet van kracht. Selectie is voor voorbereiding of expliciete vrijwillige toepassing; verplichte toepassing begint op 2027-04-30.",
  {
   "title": "Verplichte toepassing vanaf 30 april 2027"
  }
 ],
 [
  "De ISO-mapping en het optionele formulier vervangen de hoofdtekst niet. Onder meer bestuursgoedkeuring bij G-A ontbreekt in de herhaling; formulier G-D verkort rollen en C-G gebruikt en waar de hoofdtekst of zegt.",
  {
   "title": "Hoofdtekst gaat vóór verkorte hulpmiddelen"
  }
 ],
 [
  "De ISO-mapping is geen bewijs van gelijkwaardigheid of verplichting alle genoemde ISO-normen te volgen. Maand-, kwartaal-, halfjaar- en jaarvoorbeelden in de guide zijn geen toegevoegde frequenties. De herhaalde testzin in de middelenoverweging schept geen extra testplicht.",
  {
   "title": "ISO-verwijzingen en frequenties zijn geen extra eisen"
  }
 ],
 [
  "Op peildatum 2026-10-16 is het kader van kracht sinds 2026-09-15.",
  {
   "title": "Van kracht sinds 15 september 2026"
  }
 ],
 [
  "De primaire organisatie blijft verantwoordelijk voor de risico’s op haar doelen. Het kader maakt de beschreven controls niet automatisch wettelijke verplichtingen voor alle leveranciers of opdrachtgevers.",
  {
   "title": "Verantwoordelijkheid blijft bij de primaire organisatie"
  }
 ],
 [
  "Voorbeelden zoals agenten, openbare diensten en groepsdiensten staan in de context van indirecte of interne relaties. Gebruik ze niet als automatische vrijstelling wanneer sprake is van daadwerkelijke externe zakelijke dienstverlening.",
  {
   "title": "Voorbeelden geven geen automatische vrijstelling"
  }
 ],
 [
  "Achtergrondchecks, contractclausules, SOC-rapporten, auditrechten en kwartaalreviews zijn guidevoorbeelden. De verkorte guideparafrase C-C laat de handtekeningen weg; de hoofdtekst verlangt bevoegde ondertekening door beide partijen.",
  {
   "title": "Voorbeelden vervangen de ondertekeningseis niet"
  }
 ],
 [
  "Doelen, risico’s, beheersvoorstellen, onderzoeksvragen en toetsaanpakken zijn analytische uitwerkingen. Zij voegen geen bronplicht toe. Selectie bevestigt geen juridische toepasselijkheid.",
  {
   "title": "Onderzoeksvoorstellen voegen geen bronplicht toe",
   "text": "Doelen, risico’s, beheersdoelen en maatregelen, vragen en toetsen zijn analytische uitwerkingen. Selectie bevestigt geen juridische toepasselijkheid.",
   "about": {
    "DORA-2024-1774": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doelen, risico’s, beheersvoorstellen, vragen en toetsen voegen geen bronplichten toe. Selectie stelt toepasselijkheid niet vast.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Deze afzonderlijke kandidaat volgt de vastgelegde editie. Een nieuwe actuele-consolidatiecontrole is nog niet bevestigd.",
  {
   "title": "Actualiteit van de vastgelegde editie niet opnieuw bevestigd",
   "about": {
    "DORA-2024-1774": {
     "title": "Broneditie en actualiteit",
     "text": "De uitwerking volgt de vastgelegde editie. Een nieuwe controle van de actuele geconsolideerde tekst is niet bevestigd.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "RTS1774-NL-A12-2-B; RTS1774-NL-A21-ALINEA1-ALINEA2; RTS1774-NL-A33-ALINEA1-ALINEA3; RTS1774-NL-A39-2-J; RTS1774-NL-A40-1",
  {
   "title": "Deze bepalingen zijn niet uitgewerkt",
   "guide": "Vijf bronclausules zijn uitgesloten. De onderstaande codes wijzen hun bronplaatsen aan; de afzonderlijke redenen zijn hier niet toegelicht.",
   "about": {
    "DORA-2024-1774": {
     "title": "Vijf uitgesloten bronclausules",
     "text": "Vijf clausules blijven uitgesloten: artikel 12(2)(b) verwijst voor afwijkende activiteiten naar artikel 24, terwijl artikel 23 dat onderwerp behandelt; de retentiealinea van artikel 21 verwijst naar e(i), dat rollen en verantwoordelijkheden betreft; in de sterke-authenticatiealinea van artikel 33 is de derde toegangscategorie onduidelijk; artikel 39(2)(j) noemt de onduidelijke functiegroep “kritieke of bedrijfsfuncties”; artikel 40(1) verbindt jaarlijks testen en majeure wijzigingen met “of”. De Engelse tekst lost deze punten niet op. Leid hieruit geen vervangende verwijzing, bredere doelgroep of zelfgekozen testfrequentie af.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Opzet en bestaan geven geen oordeel over duurzame werking. Kies zelf onderzoeksperiode, gevallen en onderbouwing.",
  {
   "title": "Een concreet geval bewijst geen duurzame werking",
   "text": "Opzet en bestaan zijn onvoldoende voor een oordeel over duurzame werking. Bepaal onderzoeksperiode, gevallen en onderbouwing afzonderlijk.",
   "about": {
    "DORA-2024-1774": {
     "title": "Bewijs voor werking",
     "text": "Opzet en bestaan bewijzen geen duurzame werking. Bepaal onderzoeksperiode, gevallen en onderbouwing afzonderlijk.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Deze uitwerking omvat artikelen 1–30 en 45–64. Het oversightkader voor kritieke derde aanbieders van ICT-diensten (artikelen 31–44) vormt een afzonderlijk onderdeel. Onderliggende technische regelgeving is niet automatisch in deze wetstekst opgenomen.",
  {
   "title": "Artikelen 31–44 staan afzonderlijk",
   "about": {
    "DORA-2022-2554": {
     "title": "Toepassing",
     "text": "Deze uitwerking omvat artikelen 1–30 en 45–64. Toezicht op kritieke ICT-dienstverleners (31–44) en technische regelgeving hebben eigen onderdelen.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Doelen, risico’s, beheersuitwerkingen en vragen zijn brongebonden onderzoeksvoorstellen. De normtekst, toepassingsvoorwaarden en eventuele open bronvragen bepalen de grenzen van de uitwerking.",
  {
   "title": "Bronvoorwaarden begrenzen onderzoeksvoorstellen",
   "about": {
    "DORA-2022-2554": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doelen, risico’s, beheersuitwerkingen en vragen zijn onderzoeksvoorstellen. Normtekst, toepassingsvoorwaarden en open bronvragen blijven bepalend.",
     "section": "method"
    }
   }
  }
 ],
 [
  "De kandidaat volgt de vastgelegde DORA-broneditie en de afzonderlijk beoordeelde sectorbepalingen. Concrete toepasselijkheid, entiteitskwalificatie en individuele vrijstellingen blijven per onderzoek vast te stellen.",
  {
   "title": "Toepasselijkheid per onderzoek vaststellen",
   "about": {
    "DORA-2022-2554": {
     "title": "Broneditie en toepassing",
     "text": "Gebruik de vastgelegde editie en beoordeel per onderzoek de entiteitskwalificatie, toepasselijkheid en vrijstellingen.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "De ontwikkeling van bewustmaking en opleiding is afzonderlijk uitgewerkt voor de doelgroep van artikel 16, volgens behoeften en ICT-risicoprofiel. Dit is geen algemene micro-route en geen verplichting tot deelname, examen of bewezen leereffect.",
  {
   "title": "Opleiding voor de doelgroep van artikel 16",
   "about": {
    "DORA-2022-2554": {
     "title": "Opleiding onder artikel 16",
     "text": "Bewustmaking en opleiding zijn uitgewerkt naar behoeften en ICT-risicoprofiel van de doelgroep van artikel 16. Dit is geen algemene route voor micro-ondernemingen en geen afzonderlijke plicht tot deelname, examen of bewezen leereffect.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Dit is een open juridische samenloopvraag, niet uitsluitend nog onbekende feitelijke classificatie van één entiteit. Artikel16 sluit5–15 uit,24 verwijst naar6, en overweging43 noemt een beperkte programmaroute voor vereenvoudigde entiteiten. Algemene FMA-uitleg beslist die samenloop niet. Zowel een volledige vrijstelling als universele toepassing van het24-programma zou hier een nieuwe interpretatie zijn. Uitsluitend uitbreiding van deze pilotketens naar niet-micro-entiteiten die onder artikel16 vallen. Bestaande gewone artikel6-route blijft inhoudelijk afzonderlijk beoordeelbaar.",
  {
   "title": "Samenloop tussen artikelen 16 en 24 blijft onbeslist",
   "guide": "Voor niet-micro-entiteiten onder artikel 16 is de bedoelde uitbreiding van de pilotketens juridisch onbeslist. Zowel volledige vrijstelling als algemene programmaplicht zou een nieuwe interpretatie zijn.",
   "about": {
    "DORA-2022-2554": {
     "title": "Testprogramma bij het vereenvoudigde raamwerk",
     "text": "Voor niet-micro-entiteiten onder artikel 16 blijft de samenloop met het testprogramma van artikel 24 onbeslist: artikel 16 sluit artikelen 5–15 uit, artikel 24 verwijst naar artikel 6 en overweging 43 noemt een beperkt programma. Algemene FMA-uitleg beslist dit niet. Deze uitwerking onderbouwt noch volledige vrijstelling noch universele toepassing. De gewone artikel 6-route blijft afzonderlijk beoordeelbaar.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Wie de informatie onder artikel 30(3)(e)(iv) wettelijk moet verstrekken blijft onbeslist. Het afzonderlijke toetspunt onderzoekt alleen de contractuele informatieplicht en duidelijke schriftelijke taaktoewijzing. Een contractueel gekozen uitvoerder is geen vastgestelde wettelijke actor; een positieve uitkomst bewijst geen volledige naleving van e(iv).",
  {
   "title": "Wettelijke informatieverstrekker nog onduidelijk",
   "about": {
    "DORA-2022-2554": {
     "title": "Artikel 30(3)(e)(iv): informatieplicht zonder benoemde uitvoerder",
     "text": "Het contract moet een plicht bevatten om bijzonderheden over reikwijdte, procedures en frequentie van inspecties en audits te verstrekken. Artikel 30(3)(e)(iv) benoemt niet uitdrukkelijk wie die informatie verstrekt. Onderzoek daarom de contractuele informatieplicht en schriftelijke taaktoewijzing; een gekozen uitvoerder bewijst niet wie wettelijk verantwoordelijk is of dat dit onderdeel volledig wordt nageleefd.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Beide bevroren Nederlandse edities verwijzen bij transactieregisters naar EMIR22. Het ESMA-werkprogramma ondersteunt nu expliciet ESMA’s aangekondigde DORA-toezicht op transactieregisters; het bewijst geen formele correctie of welke verwijzing de wetgever daarvoor in46(h) heeft vastgesteld. Geen automatische autoriteitsroutering afleiden uit de foutieve verwijzing. Zie het gerichte bronoordeel; geen algemene blokkade of automatische vrijgave.",
  {
   "title": "Geen automatische bevoegdheid uit de EMIR-verwijzing",
   "guide": "De verwijzing in artikel 46(h) blijft onopgelost. Het ESMA-werkprogramma ondersteunt aangekondigd toezicht, maar bewijst geen formele wetscorrectie of juiste wettelijke verwijzing.",
   "about": {
    "DORA-2022-2554": {
     "title": "Bevoegdheid bij transactieregisters",
     "text": "Artikel 46(h) verwijst in beide Nederlandse bronedities naar EMIR artikel 22. Het ESMA-werkprogramma ondersteunt aangekondigd DORA-toezicht, maar bewijst geen formele correctie van die verwijzing. Leid hieruit geen automatische bevoegdheidsroute af; het gerichte bronoordeel blijft bepalend.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De wijzigingslaag in artikelen 59–63 blijft verbonden aan de oorspronkelijke DORA-bron. Twaalf sectorpunten zijn daarnaast gericht uitgewerkt met de betekenisdragende bepalingen uit vier sectorverordeningen. Dit omvat geen volledige sectorale nalevingsbeoordeling; uitzonderingen en derde-landroutes blijven per punt zichtbaar.",
  {
   "title": "Sectoruitwerking is niet volledig",
   "about": {
    "DORA-2022-2554": {
     "title": "Sectorale afbakening",
     "text": "Artikelen 59–63 blijven verbonden aan de oorspronkelijke DORA-bron. Twaalf sectorpunten gebruiken daarnaast bepalingen uit vier sectorverordeningen. Dit is geen volledige sectorale nalevingsbeoordeling; uitzonderingen en routes voor derde landen blijven per punt gelden.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Doel, risico, beheersuitwerkingen en vragen zijn analytische voorstellen. Selectie bevestigt geen toepasselijkheid.",
  {
   "title": "Onderzoeksvoorstel is geen toepasselijkheidsbesluit",
   "text": "Doel, risico, beheersdoelen, maatregelen en vragen zijn analytische voorstellen. Selectie bevestigt geen toepasselijkheid.",
   "about": {
    "DORA-2024-1772": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen en vragen zijn analytische voorstellen. Selectie stelt toepasselijkheid niet vast.",
     "section": "method"
    },
    "DORA-2024-1773": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen, vragen, toetsen en bewijsvoorbeelden zijn analytische voorstellen. Selectie stelt toepasselijkheid niet vast; de voorstellen bewijzen geen naleving.",
     "section": "method"
    },
    "DORA-2025-301": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen en vragen zijn analytische voorstellen. Selectie stelt toepasselijkheid niet vast.",
     "section": "method"
    },
    "DORA-2025-302": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen en vragen zijn analytische voorstellen. Selectie stelt toepasselijkheid niet vast.",
     "section": "method"
    },
    "DORA-2025-532": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen, vragen en toetsen zijn analytische voorstellen voor onafhankelijke beoordeling. Selectie stelt toepasselijkheid niet vast; de voorstellen bewijzen geen naleving.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Artikel 8, lid 2, onder c: NL noemt artikel 1; EN noemt lid 1. Gezamenlijke ernst volgt hier expliciet artikel 8, lid 1, als begrensde interpretatie.",
  {
   "title": "Verschil tussen Nederlandse en Engelse verwijzing",
   "about": {
    "DORA-2024-1772": {
     "title": "Artikel 8(2)(c): gezamenlijke ernst",
     "text": "De Nederlandse tekst verwijst naar artikel 1, de Engelse naar lid 1. Deze uitwerking gebruikt voor gezamenlijke ernst artikel 8(1) als expliciete, begrensde interpretatie.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De aanvullende slotroute van artikel 10 is inhoudelijk onbeslist. De primaire kans- en impactregels leveren geen uitputtende classificatie of volledige negatieve conclusie.",
  {
   "title": "Classificatie is niet uitputtend",
   "about": {
    "DORA-2024-1772": {
     "title": "Artikel 10: plaats van aanvullende drempels blijft onbeslist",
     "text": "Artikel 10 stelt eerst de voorwaarden a, b en c voor een significante cyberdreiging. De slotzin laat daarnaast drempels uit artikel 9(2), (3), (5) en (6) meewegen, zonder duidelijk te bepalen hoe die zich tot de alternatieven van c verhouden. De Engelse tekst lost dat niet op. Gebruik de primaire voorwaarden; trek geen volledige negatieve classificatie en maak van de slotzin geen automatisch extra alternatief of verplichte toets aan alle aanvullende drempels.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De bronstatus is die van het bevroren dossier; dit concept is geen nieuw algemeen oordeel over actuele juridische toepasselijkheid.",
  {
   "title": "Bronstatus is gebonden aan het vastgelegde dossier",
   "text": "Dit concept geeft geen nieuw algemeen oordeel over actuele juridische toepasselijkheid.",
   "about": {
    "DORA-2024-1772": {
     "title": "Broneditie en actualiteit",
     "text": "De bronstatus hoort bij de vastgelegde editie; actuele juridische toepasselijkheid is daarmee niet opnieuw vastgesteld.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Een classificatieverwijzing verandert de afzonderlijke classificatieregels niet. RTS 2024/1772 artikel 8 verwijst naar artikel 9; de begrensde NL/EN-interpretatie bij terugkerende incidenten blijft zichtbaar.",
  {
   "title": "Classificatieregels blijven afzonderlijk gelden",
   "about": {
    "DORA-2025-301": {
     "title": "Classificatie van terugkerende incidenten",
     "text": "Verwijzingen wijzigen de afzonderlijke classificatieregels niet. Artikel 8 van RTS 2024/1772 verwijst naar artikel 9; de begrensde Nederlandse/Engelse interpretatie voor terugkerende incidenten blijft gelden.",
     "section": "point"
    }
   }
  }
 ],
 [
  "NIS2-aanmerking, nationale feestdagen en concrete besluiten zijn niet met dit concept vastgesteld.",
  {
   "title": "NIS2-status, feestdagen en besluiten apart vaststellen",
   "about": {
    "DORA-2025-301": {
     "title": "Casusafhankelijke voorwaarden",
     "text": "Stel NIS2-aanmerking, nationale feestdagen en concrete besluiten afzonderlijk vast.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Artikel 6 verwijst voor algemene entiteitsinformatie naar artikel 1; de exacte vertaling naar een dreigingsformulier vergt een afzonderlijke bron.",
  {
   "title": "Dreigingsformulier vraagt aanvullende bron",
   "about": {
    "DORA-2025-301": {
     "title": "Dreigingsmelding: apart formulier en onbesliste veldactor",
     "text": "Artikel 6 beschrijft de informatie bij een vrijwillige dreigingsmelding. Het bijbehorende formulier en de invulinstructies staan in ITS 2025/302, bijlagen III en IV. Daar blijft bij veld 3 onbeslist welk entiteitstype bij indirecte indiening moet worden ingevuld. Gebruik de afzonderlijke formulieruitwerking met die beperking; de melding zelf blijft vrijwillig.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De bevroren bronmetadata noemt een Franse rectificatie; deze is niet op de Nederlandse tekst toegepast. Geen nieuwe algemene bevestiging van actuele juridische status.",
  {
   "title": "Franse rectificatie niet toegepast op Nederlandse tekst",
   "about": {
    "DORA-2025-301": {
     "title": "Broneditie en actualiteit",
     "text": "De bronmetadata noemt een Franse rectificatie; die is niet toegepast op de Nederlandse tekst. De actuele juridische status is niet opnieuw algemeen bevestigd.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Zeven materiële betekeniscomponenten blijven HOLD; vier externe verwijzingsafhankelijkheden zijn apart gehouden. Veilige lokale veldinhoud blijft onderzoekbaar.",
  {
   "title": "Zeven betekenisvragen blijven onbeslist",
   "about": {
    "DORA-2025-302": {
     "title": "Zeven open onderdelen van de formulieren",
     "text": "Op HOLD blijven: gelijkstelling van de tegenpartijennoemer met de classificatiedrempel (3.7); invulling zonder genomen én geplande herstelmaatregelen (3.34); negatieve uitkomsten bij risico voor kritieke functies of afwikkelbaarheid (4.10–4.11); de veldactor bij indirecte dreigingsmelding (IV.3); de noemerperiode bij geaggregeerde transactiepercentages (3.10); een eindverslag wanneer werkelijke cijfers ontbreken; en het afrondingsalgoritme bij meer dan één decimaal (3.5, 3.7, 3.10). Daarnaast verwijzen vier velden naar RTS 1772-bepalingen die de bedoelde drempel niet vastleggen: 2.6 naar artikel 12 (informatiedeling), 3.13 naar artikel 10 (cyberdreigingen), 3.20–3.21 naar artikel 13 (inwerkingtreding) en 4.12 naar het niet-bestaande artikel 14. De toegelaten lokale veldinhoud blijft onderzoekbaar; deze verwijzingen worden niet automatisch vervangen.",
     "section": "point"
    }
   }
  }
 ],
 [
  "MoederDORA 19 en RTS 1772/301 zijn afzonderlijke gebonden context, geen stille vervanging van bronverwijzingen.",
  {
   "title": "Andere DORA-regels vervangen verwijzingen niet",
   "about": {
    "DORA-2025-302": {
     "title": "Herkomst van gekoppelde bronnen",
     "text": "",
     "section": "omit"
    }
   }
  }
 ],
 [
  "Concreet classificatieoordeel, sector-/NIS2-/BRRD-toepasselijkheid en bevoegde autoriteit worden niet door selectie vastgesteld.",
  {
   "title": "Selectie stelt classificatie en bevoegdheid niet vast",
   "about": {
    "DORA-2025-302": {
     "title": "Toepasselijkheid en classificatie",
     "text": "Stel classificatie, sectorale toepassing, NIS2/BRRD-toepasselijkheid en bevoegde autoriteit per geval vast; selectie doet dit niet.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "I01: beleidsmatige vastlegging van rapportagefrequentie is begrensde NL/EN-interpretatie; NL noemt verslag. Geen vaste frequentie of extra document.",
  {
   "title": "Rapportagefrequentie berust op begrensde interpretatie",
   "about": {
    "DORA-2024-1773": {
     "title": "Rapportagefrequentie",
     "text": "Het vastleggen van een rapportagefrequentie berust op een begrensde vergelijking van de Nederlandse en Engelse tekst; de Nederlandse tekst noemt verslag. Er is geen vaste frequentie of extra document voorgeschreven in deze uitwerking.",
     "section": "point"
    }
   }
  }
 ],
 [
  "I02: specifieke actualisering van een risicobeoordeling onder artikel 9(3) blijft HOLD; documentatie uit dezelfde zin is wel uitgewerkt.",
  {
   "title": "Actualisering risicobeoordeling blijft onbeslist",
   "about": {
    "DORA-2024-1773": {
     "title": "Artikel 9(3): welke beoordeling moet worden bijgewerkt?",
     "text": "Artikel 9(3) verwijst voor de bij te werken risicobeoordeling naar artikel 6, dat de zorgvuldigheidsbeoordeling van aanbieders behandelt. Artikel 5 beschrijft de voorafgaande risicobeoordeling. Beide taalversies verwijzen naar artikel 6; het precieze beoordelingsobject blijft daarom op HOLD. De afzonderlijke documentatie van de beoordeling uit artikel 9(2) blijft toetsbaar. Vervang artikel 6 niet zelf door artikel 5 en maak er geen plicht van om alle beoordelingen bij te werken.",
     "section": "point"
    }
   }
  }
 ],
 [
  "I03: geen nieuwe plicht kritieke functies uit te besteden. I04: auditrechten en uitoefening volgens afspraak zijn contractueel begrensd.",
  {
   "title": "Geen uitbestedingsplicht; auditrechten zijn contractueel begrensd",
   "about": {
    "DORA-2024-1773": {
     "title": "Uitbesteding en auditrechten",
     "text": "Er is geen nieuwe plicht om kritieke functies uit te besteden. Auditrechten en hun uitoefening zijn begrensd door de contractuele afspraak.",
     "section": "point"
    }
   }
  }
 ],
 [
  "I05: groepstoepassing en externe DORA-/sectorale/nationale vereisten worden niet automatisch vastgesteld. Alleen expliciet gebonden moederinhoud is inhoudelijk meegenomen.",
  {
   "title": "Groepstoepassing en externe eisen apart vaststellen",
   "about": {
    "DORA-2024-1773": {
     "title": "Groep en externe voorwaarden",
     "text": "Groepstoepassing en externe DORA-, sectorale en nationale voorwaarden vragen afzonderlijke vaststelling. Alleen expliciet gekoppelde bepalingen uit de hoofdregeling zijn inhoudelijk meegenomen.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Bronmetadata geeft de bevroren editie weer; geen nieuwe algemene actualiteitsverklaring.",
  {
   "title": "Geen nieuwe bevestiging van actualiteit",
   "text": "De bronmetadata beschrijft de vastgelegde editie. Zij is geen nieuwe algemene actualiteitsverklaring.",
   "about": {
    "DORA-2024-1773": {
     "title": "Broneditie en actualiteit",
     "text": "De bronmetadata beschrijft de vastgelegde editie; volledige actuele juridische geldigheid is niet opnieuw vastgesteld.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Beheersketens, toetsinstructies en bewijsvoorbeelden zijn analytische voorstellen, geen broncitaten of vastgestelde naleving.",
  {
   "title": "Toetsvoorstellen zijn geen bewijs van naleving",
   "text": "Beheersketens, toetsinstructies en bewijsvoorbeelden zijn analytische voorstellen. Het zijn geen broncitaten of vastgestelde naleving.",
   "about": {
    "DORA-2024-1773": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen, vragen, toetsen en bewijsvoorbeelden zijn analytische voorstellen. Selectie stelt toepasselijkheid niet vast; de voorstellen bewijzen geen naleving.",
     "section": "method"
    }
   }
  }
 ],
 [
  "I01: artikel 4(1)(h) zegt letterlijk “tussen de ICT-diensten en zijn onderaannemers”. De derde aanbieder als contractpartij volgt uitsluitend uit de expliciete context van de aanhef en onderdelen f en i. Dit is begrensde interpretatie, geen officiële broncorrectie; noodplannen én dienstenniveaus blijven vereist.",
  {
   "title": "Contractpartij volgt uit begrensde contextlezing",
   "guide": "De derde aanbieder is als contractpartij afgeleid uit de context van artikel 4(1)(h), niet uit een officiële correctie. Zowel noodplannen als dienstenniveaus blijven vereist.",
   "about": {
    "DORA-2025-532": {
     "title": "Artikel 4(1)(h): contractpartij",
     "text": "De letterlijke tekst noemt een overeenkomst tussen ICT-diensten en onderaannemers. De derde aanbieder als contractpartij volgt hier uit de aanhef en onderdelen f en i. Dit is een begrensde interpretatie, geen officiële correctie. Noodplannen én dienstenniveaus blijven vereist.",
     "section": "point"
    }
   }
  }
 ],
 [
  "I02/I03: artikel 5(3) zegt letterlijk “aanbestedingsregelingen”; hier uitsluitend gelezen binnen de uitbestedingscontext van artikel 5. Goedkeuring óf geen bezwaar tegen het einde van de termijn; geen fictieve instemming eerder. Artikel 6(b) levert geen algemeen positief recht op vroegtijdige implementatie met toestemming op; een specifiek vroegtijdig scenario is niet beslist.",
  {
   "title": "Instemming en vroegtijdige uitvoering blijven begrensd",
   "guide": "De term aanbestedingsregelingen wordt hier binnen de uitbestedingscontext gelezen. Vóór het einde van de termijn wordt geen fictieve instemming aangenomen. Een algemeen recht op vroegtijdige uitvoering volgt hier niet uit; het specifieke vroegtijdige scenario blijft onbeslist.",
   "about": {
    "DORA-2025-532": {
     "title": "Artikel 5(3): instemming en uitvoering",
     "text": "Aanbestedingsregelingen wordt hier binnen de uitbestedingscontext gelezen. Goedkeuring of geen bezwaar tegen het einde van de termijn is vereist; vóór dat einde wordt geen fictieve instemming aangenomen. Artikel 6(b) geeft hier geen algemeen recht op vroegtijdige uitvoering met toestemming; het specifieke vroegtijdige scenario blijft onbeslist.",
     "section": "point"
    }
   }
  }
 ],
 [
  "I04: onvolledige NL-zinsconstructies worden niet stil gecorrigeerd. Periodieke beoordeling blijft f–j; wettelijke eindverantwoordelijkheid blijft bij de entiteit.",
  {
   "title": "Onvolledige zinnen veranderen verantwoordelijkheid niet",
   "about": {
    "DORA-2025-532": {
     "title": "Periodieke beoordeling en verantwoordelijkheid",
     "text": "Ondanks onvolledige Nederlandse zinnen blijft de periodieke beoordeling onderdelen f–j omvatten. De wettelijke eindverantwoordelijkheid blijft bij de entiteit; de brontekst is niet gecorrigeerd.",
     "section": "point"
    }
   }
  }
 ],
 [
  "I05: “uitvoeringsnormen” in overweging 12 wijzigt de identiteit als gedelegeerde verordening met reguleringsnormen niet.",
  {
   "title": "Regelingssoort blijft ongewijzigd",
   "about": {
    "DORA-2025-532": {
     "title": "Regelingstype vastgesteld",
     "text": "",
     "section": "omit"
    }
   }
  }
 ],
 [
  "I06: concrete toepasselijkheid, materiële onderdelen, redelijkheid van termijnen, hoofdstuk-IV-tests en externe regelgeving afzonderlijk bepalen; alleen gebonden moederinhoud is hier expliciet uitgewerkt.",
  {
   "title": "Aanvullende toepassingsvoorwaarden apart beoordelen",
   "about": {
    "DORA-2025-532": {
     "title": "Toepasselijkheid en externe voorwaarden",
     "text": "Stel toepasselijkheid, materiële onderdelen, redelijkheid van termijnen, hoofdstuk-IV-tests en externe regels afzonderlijk vast. Alleen gekoppelde bepalingen uit de hoofdregeling zijn inhoudelijk uitgewerkt.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "I07: editiegebonden bronbasis; geen nieuwe algemene actualiteitsverklaring.",
  {
   "title": "Actualiteit van deze editie niet opnieuw bevestigd",
   "text": "I07: de bronbasis is aan de vastgelegde editie gebonden. Dit is geen nieuwe algemene actualiteitsverklaring.",
   "about": {
    "DORA-2025-532": {
     "title": "Broneditie en actualiteit",
     "text": "De uitwerking volgt de vastgelegde editie; de actuele juridische status is niet opnieuw algemeen bevestigd.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Alle ketens en toetsen zijn auteursvoorstellen voor onafhankelijke beoordeling; geen vastgestelde naleving.",
  {
   "title": "Onafhankelijke beoordeling blijft nodig",
   "text": "De ketens en toetsen zijn auteursvoorstellen. Zij stellen naleving niet vast.",
   "about": {
    "DORA-2025-532": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen, vragen en toetsen zijn analytische voorstellen voor onafhankelijke beoordeling. Selectie stelt toepasselijkheid niet vast; de voorstellen bewijzen geen naleving.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Doel, risico, beheersuitwerkingen en vragen zijn analytische voorstellen. Selectie bevestigt geen toepasselijkheid of werking.",
  {
   "title": "Selectie bewijst geen toepasselijkheid of werking",
   "text": "Doel, risico, beheersdoelen, maatregelen en vragen zijn analytische voorstellen. Hun selectie bevestigt geen toepasselijkheid of werking.",
   "about": {
    "DORA-2024-2956": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen en vragen zijn analytische voorstellen. Selectie bewijst geen toepasselijkheid of werking.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Zes materiële rest-HOLDs; afzonderlijke voorwaardelijke botsingsgrens bij beide identificatiecodes.",
  {
   "title": "Zes open punten en een voorwaardelijke codebotsing",
   "guide": "Zes inhoudelijke punten blijven onbeslist (HOLD). Daarnaast geldt een afzonderlijke voorwaardelijke beperking bij gebruik van beide identificatiecodes.",
   "about": {
    "DORA-2024-2956": {
     "title": "Zes open registeronderdelen",
     "text": "Op HOLD blijven: de bedoelde rapportagevaluta; volledige opname en koppeling van overige niet-financiële groepsentiteiten; koppeling van een uitsluitend met EUID geïdentificeerde ondertekenaar aan LEI-modellen; niet gekoppelde externe definities en gegevensmaatstaven; de combinatie van uitsluiting en hiërarchieoptie bij volledige uitbesteding; en de invulroute wanneer een directe moeder ontbreekt. Daarnaast blijft een concrete botsing tussen beide-codegebruik en de codebeperking voor rechtspersonen buiten de EU onbeslist. Andere velden blijven onder hun eigen voorwaarden toetsbaar.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Externe sectorale grondslagen worden niet uit verwijzingen gereconstrueerd.",
  {
   "title": "Sectorale rechtsgrond niet uit verwijzingen afleiden",
   "text": "De uitwerking reconstrueert externe sectorale grondslagen niet uit verwijzingen daarnaar.",
   "about": {
    "DORA-2024-2956": {
     "title": "Externe sectorale voorwaarden",
     "text": "Voor een inhoudelijk oordeel over externe sectorale grondslagen zijn de betreffende bronnen nodig; een verwijzing alleen volstaat niet.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "De bron-, inhouds-, vraag- en omzettingsreviews zijn afgerond voor de afzonderlijke kandidaat. Dit is geen definitieve toelating, actieve opname of publicatie.",
  {
   "title": "Review is geen toelating of publicatie",
   "about": {
    "DORA-2025-1190": {
     "title": "Historische toelatingsnotitie",
     "text": "",
     "section": "omit"
    }
   }
  }
 ],
 [
  "Deze oorspronkelijke publicatie trad op 8 juli 2025 in werking. Dit is geen actuele rechtsstandcontrole; de actuele status blijft onbekend.",
  {
   "title": "Inwerkingtreding bekend; actuele rechtsstand niet gecontroleerd",
   "text": "De oorspronkelijke publicatie trad op 8 juli 2025 in werking. De actuele status blijft onbekend omdat geen nieuwe actuele rechtsstandcontrole is uitgevoerd.",
   "about": {
    "DORA-2025-1190": {
     "title": "Broneditie en actualiteit",
     "text": "De uitwerking volgt de vastgelegde oorspronkelijke editie, die op 8 juli 2025 in werking trad. De actuele geconsolideerde rechtsstand is niet opnieuw vastgesteld; de actuele pakketstatus blijft onbekend.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Doel, risico, beheersuitwerkingen, toetsinstructies en vragen zijn onderzoeksvoorstellen; zij zijn geen vastgestelde naleving.",
  {
   "title": "Onderzoeksvoorstellen stellen naleving niet vast",
   "text": "Doel, risico, beheersdoelen en maatregelen, toetsinstructies en vragen zijn voorstellen voor onderzoek. Zij zijn geen vastgestelde naleving.",
   "about": {
    "DORA-2025-1190": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doel, risico, beheersuitwerkingen, toetsen en vragen zijn onderzoeksvoorstellen en bewijzen geen naleving.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Broneditiegebonden; actuele geconsolideerde rechtsstand niet opnieuw vastgesteld.",
  {
   "title": "Actuele geconsolideerde rechtsstand niet opnieuw vastgesteld",
   "text": "Deze uitwerking volgt de vastgelegde broneditie.",
   "about": {
    "DORA-2025-1190": {
     "title": "Broneditie en actualiteit",
     "text": "De uitwerking volgt de vastgelegde oorspronkelijke editie, die op 8 juli 2025 in werking trad. De actuele geconsolideerde rechtsstand is niet opnieuw vastgesteld; de actuele pakketstatus blijft onbekend.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Eén lokale materiële HOLD: bijlage VIII a vi 2. Geen stilzwijgend corrigendum.",
  {
   "title": "Eén bijlagepunt blijft onbeslist",
   "about": {
    "DORA-2025-1190": {
     "title": "Attestveld verwijst naar een ontbrekend artikellid",
     "text": "Bijlage VIII, a, vi, 2 vraagt naar toepassing van artikel 5(3), tweede alinea, terwijl artikel 5 in deze broneditie alleen leden 1 en 2 heeft. Daardoor is de inhoud van dit attestveld niet bepaalbaar en blijft het op HOLD. De overige attestvelden, waaronder inzet van interne testers, blijven afzonderlijk toetsbaar. Vervang de verwijzing niet door het vermoedelijk bedoelde artikel 7(2); een volledig conformiteitsoordeel over het attest blijft uitgesloten.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Artikel 6 lid 2 blijft via de zichtbare b→a-keten verklaard, zonder brontekstvervanging.",
  {
   "title": "Artikel 6, lid 2 blijft via zijn verwijzingsketen verklaard",
   "about": {
    "DORA-2025-1190": {
     "title": "Gezamenlijke risicoanalyse: verantwoordelijke control team",
     "text": "De verwijzing in artikel 6(2) is herleidbaar: artikel 16(3)(b) verwijst zelf naar de volgens onderdeel a aangewezen financiële entiteit. Haar control team beoordeelt de risico’s van meerdere deelnemers; de andere control teams werken mee en behouden hun eigen risicobeoordeling. De leidende autoriteit is daarmee niet de taakdrager van die analyse.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Uitvoeringsselectie, fictieve keuze, TTI-rapportminimum en inclusierelatie blijven afzonderlijke objecten; geen universele drie-/vierregel.",
  {
   "title": "Verschillende keuzes en minima niet samenvoegen",
   "about": {
    "DORA-2025-1190": {
     "title": "Scenarioselectie en rapportinhoud apart beoordelen",
     "text": "Artikel 10(3) verlangt ten minste drie scenario’s voor uitvoering. Onder de voorwaarden van lid 4 mag maximaal één daarvan niet-dreigingsgestuurd zijn. Het TTI-rapport moet daarnaast aan zijn eigen inhoudseisen voldoen en de geselecteerde scenario’s omvatten. Rapportinhoud en uitvoeringsselectie zijn dus geen identieke lijst; leid hieruit geen algemene regel af dat altijd drie of vier scenario’s volstaan.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Externe DORA- en sector-/veiligheidsgrondslagen houden hun eigen bronbinding; ontbrekende detailinhoud wordt niet ingevuld.",
  {
   "title": "Ontbrekende externe detailregels niet invullen",
   "text": "DORA- en sector- of veiligheidsgrondslagen blijven aan hun eigen bronnen verbonden. Ontbrekende detailinhoud wordt niet aangevuld.",
   "about": {
    "DORA-2025-1190": {
     "title": "Externe voorwaarden",
     "text": "DORA- en sectorale of veiligheidsvoorwaarden vragen hun eigen brononderbouwing. Ontbrekende detailinhoud is niet ingevuld.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "De normgroepen en toetspunten zijn onafhankelijk beoordeeld. Toelating tot de actieve collectie staat nog open.",
  {
   "title": "Beoordeling afgerond; toelating nog open",
   "about": {
    "DORA-2025-1190": {
     "title": "Historische toelatingsnotitie",
     "text": "",
     "section": "omit"
    }
   }
  }
 ],
 [
  "Doel, risico, beheersuitwerking en vragen zijn beoordeelde analytische voorstellen. DORA-, RTS- en ITS-vereisten houden hun eigen voorwaarden; NOREA-selectie neemt geen wettelijke punten automatisch mee.",
  {
   "title": "NOREA-selectie neemt wettelijke punten niet automatisch mee",
   "about": {
    "NOREA-DORA-3-2": {
     "title": "NOREA en wettelijke voorwaarden",
     "text": "Doel, risico, beheersuitwerking en vragen zijn analytische voorstellen. DORA-, RTS- en ITS-vereisten behouden hun eigen voorwaarden; selectie in NOREA neemt wettelijke punten niet automatisch mee.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Onopgeloste bronverwijzingen en fragmenten blijven begrensd. De toets en beslissing per punt bepalen welk leesbaar onderdeel onderzocht kan worden; over uitgesloten fragmenten volgt geen oordeel.",
  {
   "title": "Geen oordeel over uitgesloten bronfragmenten",
   "about": {
    "NOREA-DORA-3-2": {
     "title": "Beperkte onderdelen binnen de NOREA-controls",
     "text": "Enkele bronfragmenten laten geen volledig oordeel toe.\nOnduidelijke formuleringen betreffen 6.1 (appropriately placed), 9.3 (this information), 11.3 (onvolledige taakdrager), 15.4 (ontvanger en aanleiding van hulp), 18.1 (onvoltooide verwijzing) en 26.1 (aansluiting tussen beeldschermen en toegang).\nOnjuiste of onbewezen verwijzingen raken 9.1–9.6, 14.1–14.2, 15.1–15.5, 16.1, 17.5, 22.2 en 25.3.\nBij 10.1–10.2 zijn classificatieschema’s geen volledige wettelijke classificatie; dreigingsmelding bij 10.2 en 11.3 blijft vrijwillig.\nOpen wettelijke onderdelen werken door in 11.3, 16.2–16.3, 17.3, 18.1–18.3 en 19.1–19.3.\nVerkorte of beschadigde werkboekkopieën raken daarnaast 16.1, 19.3, 20.1–20.2, 24.2 en 26.1.\nDuidelijke passages en afzonderlijk gekoppelde wettelijke bepalingen blijven beoordeelbaar; een kopiegebrek blokkeert niet de hele control.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De celtekst van alle 17 werkbladen, ook verborgen bladen, is ongewijzigd opgenomen in een tekstweergave per rij. Deze toont geen oorspronkelijke Excel-opmaak, grafieken of PDF-paginas. Werkblad, rij, cel en bronhash blijven vastgelegd.",
  {
   "title": "Tekstweergave van het Excel-bestand",
   "about": {
    "NOREA-DORA-3-2": {
     "title": "Gebruikte bronnen",
     "text": "Alle 17 werkbladen, ook verborgen bladen, zijn weergegeven als ongewijzigde celtekst per rij. De oorspronkelijke Excel-opmaak en grafieken ontbreken; rijnummers zijn geen PDF-paginanummers.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "In deze conversie is geen nieuwe volledige actualiteitsverificatie uitgevoerd; de afzonderlijke metadatawaarneming van 3 november vermeldt in-force=true. UNKNOWN blijft de begrensde actuele pakketstatus; de metadatawaarneming bewijst geen volledige juridische actualiteit.",
  {
   "title": "Metadatawaarneming is geen volledige actualiteitscontrole",
   "text": "Bij deze omzetting is niet opnieuw volledig gecontroleerd of deze uitwerking juridisch actueel is. Een afzonderlijke metadatawaarneming van 3 november vermeldt dat de regeling van kracht is. De actuele status van deze uitwerking blijft onbekend: die waarneming bewijst niet dat alle opgenomen juridische inhoud actueel is.",
   "about": {
    "DORA-2024-1502": {
     "title": "Broneditie en actualiteit",
     "text": "De bronmetadata van 3 november 2026 vermeldt dat de regeling van kracht is. Een volledige actualiteitscontrole van de opgenomen juridische inhoud ontbreekt; de pakketstatus blijft UNKNOWN.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Doelen, risico’s, beheersuitwerkingen en toetsinstructies zijn analytische voorstellen. Selectie is geen toepasselijkheidsbesluit.",
  {
   "title": "Selectie is geen toepasselijkheidsbesluit",
   "text": "Doelen, risico’s, beheersdoelen, maatregelen en toetsinstructies zijn analytische voorstellen.",
   "about": {
    "DORA-2024-1502": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doelen, risico’s, beheersuitwerkingen en toetsen zijn analytische voorstellen. Selectie stelt toepasselijkheid niet vast.",
     "section": "method"
    }
   }
  }
 ],
 [
  "No unqualified conclusion from unresolved article 2(4) dimension/category interpretation.",
  {
   "title": "Interpretatie van artikel 2(4) blijft onbeslist",
   "guide": "De uitleg van dimensie en categorie in artikel 2(4) is niet opgelost. Daaruit mag geen onvoorwaardelijke conclusie worden afgeleid.",
   "about": {
    "DORA-2024-1502": {
     "title": "Artikel 2(4): aantallen, activa en categorieën",
     "text": "Artikel 2(4) noemt totale aantallen waar de bronformules ook activawaarden onderscheiden. Daarnaast staat niet vast of aandelen uit verschillende categorieën samen mogen worden gebruikt. Trek geen aanwijzingsconclusie die deze keuzes ongemerkt maakt. De afzonderlijke formules blijven bruikbaar; een geval met beide aandelen van ten minste 10% binnen één categorie lost de dimensievraag niet op.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Article 5(4)(b) comparison base remains unresolved.",
  {
   "title": "Vergelijkingsbasis van artikel 5(4)(b) blijft onbeslist",
   "guide": "De basis voor de vergelijking in artikel 5(4)(b) is nog niet vastgesteld.",
   "about": {
    "DORA-2024-1502": {
     "title": "Artikel 5(4)(b): afwijkende vergelijkingsbasis",
     "text": "De tweede drempelroute noemt een afwijkende vergelijking “of een categorie” in plaats van “voor een categorie”; de Engelse tekst bevat hetzelfde verschil. De vergelijkingsbasis blijft onbeslist. De eerste route en de OF-relatie tussen beide routes blijven afzonderlijk bruikbaar; maak er geen EN-voorwaarde van.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Reintegration-dependent article 5(3) population/outcomes remain restricted.",
  {
   "title": "Onderzoek bij artikel 5(3) blijft beperkt",
   "guide": "De populatie en uitkomsten die afhankelijk zijn van herintegratie blijven begrensd. De oorspronkelijke beperking blijft bepalend.",
   "about": {
    "DORA-2024-1502": {
     "title": "Artikel 5(3): migratie of ook herintegratie",
     "text": "De Nederlandse formule noemt migratie; de Engelse formule noemt migratie of herintegratie. Onbeslist blijven populatie en uitkomst die afhangen van het meenemen of uitsluiten van gevallen met alleen herintegratie. Kies niet stilzwijgend één taalversie; afzonderlijke indicatoren blijven mogelijk zonder uitspraak over die extra gevallen.",
     "section": "point"
    }
   }
  }
 ],
 [
  "No autonomous ASI-score calculation from an unbound external standard.",
  {
   "title": "Geen zelfstandige ASI-scoreberekening",
   "guide": "Deze uitwerking biedt geen basis voor een zelfstandige ASI-scoreberekening vanuit een externe norm die niet aan het bronpakket is gekoppeld.",
   "about": {
    "DORA-2024-1502": {
     "title": "ASI-score en classificatie",
     "text": "Deze uitwerking onderbouwt geen zelfstandige ASI-scoreberekening uit een externe norm die niet aan het bronpakket is gekoppeld.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Package-wide restrictions survive per-point and question conversion; empty local exclusions do not waive them.",
  {
   "title": "Beperkingen gelden ook bij losse punten en vragen",
   "guide": "Beperkingen voor het hele pakket blijven gelden na omzetting naar afzonderlijke punten en vragen. Een leeg lokaal uitsluitingenveld heft ze niet op.",
   "about": {
    "DORA-2024-1502": {
     "title": "Pakketgrenzen blijven gelden",
     "text": "",
     "section": "omit"
    }
   }
  }
 ],
 [
  "Bewijsvoorbeelden zijn uitwisselbaar naar de feitelijke werkwijze; artikel 6 schrijft geen afzonderlijk bewijsdocument voor. Een concrete toepassing bewijst geen duurzame werking.",
  {
   "title": "Artikel 6 schrijft geen afzonderlijk bewijsdocument voor",
   "text": "Voorbeeldbewijzen mogen worden vervangen door passend bewijs uit de praktijk. Artikel 6 verlangt geen apart bewijsdocument; één concrete toepassing bewijst geen duurzame werking.",
   "about": {
    "DORA-2024-1502": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Artikel 6 verlangt geen afzonderlijk bewijsdocument. Voorbeelden mogen worden vervangen door passend bewijs; één concreet geval bewijst geen duurzame werking.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Toetsinstructies zijn voorstellen voor opzet en bestaan. Een concreet geval toont toepassing in dat geval; periode/populatie/steekproef zijn niet door de auteur vastgesteld. Bronvoorwaarden en gerichte HOLD blijven gelden.",
  {
   "title": "Onderzoek naar werking apart ontwerpen",
   "about": {
    "DORA-2024-1502": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Kies onderzoeksperiode, populatie en steekproef passend bij de onderzoeksvraag. Eén geval bewijst alleen toepassing in dat geval; bronvoorwaarden en gerichte HOLD blijven gelden.",
     "section": "method"
    }
   }
  }
 ],
 [
  "De vier gerichte inhoudelijke HOLD-onderwerpen blijven gelden: die beslissingen worden niet door de vraagconcepten onderzocht. T07 en T12 hebben alleen begrensde, afzonderlijk beschreven onderzoeksruimte.",
  {
   "title": "Vier open onderwerpen blijven uitgesloten",
   "about": {
    "DORA-2024-1502": {
     "title": "Vier inhoudelijke HOLD-onderwerpen",
     "text": "De vier inhoudelijke HOLD-onderwerpen blijven uitgesloten van een beslissend oordeel. T07 en T12 hebben alleen hun afzonderlijk beschreven, beperkte onderzoeksruimte.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "DORA-categorie-/bevoegde-autoriteitsinhoud en CRD ASI-scoreberekening niet uit geheugen ingevuld. Berekenings- en procespunten onderzoeken de expliciete 1502-regels met bestaande indelingen; classificatierechtmatigheid blijft afzonderlijk te onderbouwen.",
  {
   "title": "Classificatie en ASI-score vragen eigen onderbouwing",
   "guide": "De uitwerking vult externe DORA- en CRD-inhoud niet uit geheugen aan. Zij onderzoekt de expliciete 1502-regels met bestaande indelingen, zonder hun rechtmatigheid vast te stellen.",
   "about": {
    "DORA-2024-1502": {
     "title": "ASI-score en classificatie",
     "text": "Berekenings- en procespunten volgen de expliciete 1502-regels met bestaande indelingen. De rechtmatigheid van DORA-categorieën, bevoegde autoriteit en CRD-ASI-score vraagt afzonderlijke brononderbouwing.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Het termijnobject van de 30 kalenderdagen in artikel 31(5) is niet opgelost; daarvan wordt geen praktische deadline afgeleid.",
  {
   "title": "Geen praktische deadline uit artikel 31(5)",
   "about": {
    "DORA-OVERSIGHT-31-44": {
     "title": "Artikel 31(5): 30 dagen voor verzoek of antwoord?",
     "text": "De Nederlandse tekst koppelt 30 kalenderdagen na ontvangst van de verklaring aan het verzoek om aanvullende informatie; de Engelse tekst aan het indienen daarvan. Daardoor staat niet vast welke handeling binnen die termijn moet vallen. Leid er geen praktische deadline of nieuwe termijn vanaf ontvangst van het verzoek uit af. Het recht op een verklaring binnen zes weken en de beoordeling daarvan blijven afzonderlijk bruikbaar.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De bronverwijzing in artikel 41(1)(d) wordt niet stilzwijgend gecorrigeerd.",
  {
   "title": "Verwijzing in artikel 41(1)(d) blijft ongewijzigd",
   "text": "De bronverwijzing wordt niet stilzwijgend gecorrigeerd.",
   "about": {
    "DORA-OVERSIGHT-31-44": {
     "title": "Artikel 41(1)(d): verwijzing sluit niet aan",
     "text": "Artikel 41(1)(d) verwijst naar artikel 42(3) voor beoordeling van maatregelen van de aanbieder. Artikel 42(3) bevat echter informatieplichten en risicobehandeling, niet die beoordelingsdetails. Artikel 6 van 2025/295 biedt aanvullende context, maar corrigeert de verwijzing niet. Gebruik voor concrete beoordelingsnormen de afzonderlijke bron; vervang het lidnummer niet zelf.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De datumzinsbouw in artikel 43(2) wordt niet omgezet in een algemene betalingsdeadline.",
  {
   "title": "Artikel 43(2) geeft hier geen algemene betalingsdeadline",
   "about": {
    "DORA-OVERSIGHT-31-44": {
     "title": "Artikel 43(2): betalingsdatum",
     "text": "De datumzinsbouw van artikel 43(2) onderbouwt in deze uitwerking geen algemene betalingsdeadline.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Afzonderlijke externe rechtsbronnen, nationale procedures en actuele casusgegevens kunnen nodig blijven om bevoegdheid of toepasselijkheid vast te stellen.",
  {
   "title": "Bevoegdheid en toepasselijkheid vragen soms aanvullende bronnen",
   "text": "Externe rechtsbronnen, nationale procedures en actuele casusgegevens kunnen nodig blijven voor die vaststelling.",
   "about": {
    "DORA-OVERSIGHT-31-44": {
     "title": "Bevoegdheid, toepassing en aanwijzing",
     "text": "Externe rechtsbronnen, nationale procedures en actuele casusgegevens kunnen nodig zijn om bevoegdheid en toepasselijkheid vast te stellen.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "De bronstatuscontrole is geen bevestiging dat een specifieke aanbieder momenteel als kritiek is aangewezen.",
  {
   "title": "Actuele aanwijzing als kritieke aanbieder niet bevestigd",
   "text": "De controle van de bronstatus stelt niet vast dat een specifieke aanbieder momenteel als kritiek is aangewezen.",
   "about": {
    "DORA-OVERSIGHT-31-44": {
     "title": "Bevoegdheid, toepassing en aanwijzing",
     "text": "De bronstatuscontrole stelt niet vast dat een specifieke aanbieder momenteel als kritiek is aangewezen.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "De inhoudelijke conceptlaag is begrensd gereviewd; deze omzetting moet nog afzonderlijk worden beoordeeld. Geen toelating of activatie.",
  {
   "title": "Omzetting nog afzonderlijk te beoordelen",
   "about": {
    "DORA-OVERSIGHT-31-44": {
     "title": "Historische omzettingsnotitie",
     "text": "",
     "section": "omit"
    }
   }
  }
 ],
 [
  "Oorspronkelijke editie en begrensde broncontrole; geen volledige actuele juridische of individuele toepasselijkheidsgoedkeuring.",
  {
   "title": "Geen volledige actuele juridische goedkeuring",
   "about": {
    "DORA-OVERSIGHT-FEES-1505": {
     "title": "Broneditie en actualiteit",
     "text": "De uitwerking volgt de oorspronkelijke editie met een beperkte broncontrole. Actuele juridische status en individuele toepasselijkheid zijn daarmee niet volledig bevestigd.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Geen algemene controlelijst voor financiële entiteiten. Selectie bevestigt geen aanwijzing of toepasselijkheid.",
  {
   "title": "Geen algemene checklist voor financiële entiteiten",
   "about": {
    "DORA-OVERSIGHT-FEES-1505": {
     "title": "Toepassing en aanwijzing",
     "text": "Dit is geen algemene controlelijst voor financiële entiteiten. Selectie stelt actuele aanwijzing of individuele toepasselijkheid niet vast.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Drie terugvalalinea’s voor omzet blijven als broncontext behouden; onbesliste toepassing wordt niet automatisch berekend.",
  {
   "title": "Alternatieve omzetbepaling niet automatisch berekenen",
   "about": {
    "DORA-OVERSIGHT-FEES-1505": {
     "title": "Overlappende terugvalregels voor omzet",
     "text": "Artikel 2(3) bevat drie afzonderlijke terugvalregels wanneer bepaalde gecontroleerde omzetcijfers ontbreken. De Engelse tekst verduidelijkt de Nederlandse ontkenning, maar bepaalt geen voorrang bij overlap tussen die regels. Bereken daarom geen automatische exclusieve omzetroute en kies geen eigen volgorde.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Termijnbotsingen, concrete rente en overige externe afhankelijkheden blijven zichtbaar.",
  {
   "title": "Termijnbotsingen, rente en externe afhankelijkheden blijven zichtbaar",
   "about": {
    "DORA-OVERSIGHT-FEES-1505": {
     "title": "Betalingstermijnen en concrete achterstandsrente",
     "text": "Artikel 5 geeft een betaaltermijn van ten minste 30 dagen én een toepasselijke kalendergrens van 30 april of 31 december. Bij een late debetnota kan dat botsen; deze bron geeft geen automatische voorrangs- of verschuivingsregel. De renteverwijzing is herleid naar artikel 99 van 2024/2509. Bepaal rente en bedrag per vordering met de toepasselijke bepaling, vervaldatum en officiële rentegrondslag.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Doelen, risico’s, beheersuitwerkingen en toetsen zijn analytische voorstellen; bewijsvoorbeelden scheppen geen documentplicht.",
  {
   "title": "Bewijsvoorbeelden scheppen geen documentplicht",
   "text": "Doelen, risico’s, beheersdoelen, maatregelen en toetsen zijn analytische voorstellen. De genoemde bewijsstukken zijn voorbeelden.",
   "about": {
    "DORA-OVERSIGHT-FEES-1505": {
     "title": "Onderzoeksvoorstellen",
     "text": "Doelen, risico’s, beheersuitwerkingen en toetsen zijn analytische voorstellen. Bewijsvoorbeelden scheppen geen documentplicht.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Selectie bevestigt geen actuele aanwijzing of individuele toepasselijkheid.",
  {
   "title": "Actuele aanwijzing en toepasselijkheid apart vaststellen",
   "text": "Selectie bevestigt geen actuele aanwijzing of individuele toepasselijkheid.",
   "about": {
    "DORA-OVERSIGHT-FEES-1505": {
     "title": "Toepassing en aanwijzing",
     "text": "Dit is geen algemene controlelijst voor financiële entiteiten. Selectie stelt actuele aanwijzing of individuele toepasselijkheid niet vast.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Artikel1(i) blijft HOLD wegens een materieel verschil tussen Nederlandse en Engelse oorspronkelijke tekst.",
  {
   "title": "Artikel 1(i) blijft onbeslist door taalverschil",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Artikel 1(i): ontbrekende beperking in de Nederlandse tekst",
     "text": "Artikel 1(i) blijft op HOLD. De Engelse tekst beperkt de gevraagde gegevens tot kritieke ICT-aanbieders die afhankelijk zijn van diensten van de aanvrager, indien beschikbaar. Die beperking ontbreekt in de oorspronkelijke Nederlandse tekst. De uitwerking kiest daarom geen brede of stilzwijgend vernauwde informatieplicht.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De oorspronkelijke verwijzing naar2022/2254 in artikel3(1) blijft zichtbaar onopgelost; de uitwerking beperkt zich tot eigen plan-/verslaghandelingen.",
  {
   "title": "Verwijzing naar 2022/2254 blijft onopgelost",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Artikel 3(1): onopgeloste verwijzing",
     "text": "De verwijzing naar 2022/2254 blijft onopgelost. De uitwerking onderzoekt alleen de eigen plan- en verslaghandelingen.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Identificatiecodes en diensttypen vereisen de afzonderlijke toepasselijke ITS-basis.",
  {
   "title": "Identificatiecodes en diensttypen vragen afzonderlijke bron",
   "text": "Voor deze onderdelen is de toepasselijke basis in de technische uitvoeringsnormen (ITS) nodig.",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Identificatiecodes en diensttypen",
     "text": "Beoordeel de juistheid van identificatiecodes pas met de toepasselijke ITS 2024/2956-bepaling, versie, rol, persoonstype en vestigingsland. Aanwezigheid en herleidbaarheid van gegevens blijven afzonderlijk toetsbaar. De diensttypenlijst is gevonden in ITS-bijlage III; de verwijzing in deze bron naar bijlage IV blijft onopgelost. Dit schept geen algemene plicht voor aanbieders om twee codes te verwerven of een volledig informatieregister aan te houden.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Een selectie bevestigt geen aanwijzing, toepasselijkheid of naleving.",
  {
   "title": "Selectie bewijst geen aanwijzing of naleving",
   "text": "Een selectie stelt aanwijzing, toepasselijkheid en naleving niet vast.",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Toepasselijkheid en aanwijzing",
     "text": "Selectie stelt actuele aanwijzing, toepasselijkheid of naleving niet vast.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Bijlagevelden 6–7 over de voorgeschreven diensttype-indeling blijven HOLD wegens de onopgeloste IV/III-verwijzing. Het model is daarom slechts begrensd toetsbaar.",
  {
   "title": "Diensttypevelden blijven onbeslist",
   "guide": "Bijlagevelden 6–7 blijven op HOLD door de onopgeloste verwijzing naar bijlage IV of III. Het model kan daardoor slechts beperkt worden getoetst.",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Diensttypevelden verwijzen naar de verkeerde bijlage",
     "text": "Bijlagevelden 6–7 blijven op HOLD: de bron verwijst voor de indeling van ICT-diensten naar ITS-bijlage IV, terwijl de lijst S01–S19 in bijlage III staat en bijlage IV totale activa behandelt. De gevonden lijst bewijst geen officiële correctie. De overige toegelaten modelvelden blijven toetsbaar; een oordeel over het volledige model is daarmee niet onderbouwd.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Maatregelen en toetsontwerp zijn analytische voorstellen. Bewijssoorten zijn voorbeelden; gelijkwaardig bewijs blijft mogelijk.",
  {
   "title": "Toetsontwerp en bewijssoorten zijn voorstellen",
   "text": "Maatregelen en toetsen zijn analytische voorstellen. Gelijkwaardig bewijs blijft mogelijk naast de genoemde voorbeelden.",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Maatregelen en toetsen zijn analytische voorstellen. Bewijsstukken zijn voorbeelden; gelijkwaardig bewijs is mogelijk.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Geen passend concreet geval betekent geen positief bestaanoordeel; leg de beperking vast.",
  {
   "title": "Zonder concreet geval geen positief bestaanoordeel",
   "text": "Ontbreekt een passend geval, leg dan die onderzoeksbeperking vast.",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Zonder passend geval volgt geen positief bestaanoordeel; leg de beperking vast.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Opzet en één bestaansgeval bewijzen geen duurzame werking. Een werkingstoets vraagt afzonderlijk periodebewijs; onderzoeksperiode en selectie worden passend bij de onderzoeksvraag bepaald.",
  {
   "title": "Werking vraagt bewijs over een periode",
   "text": "Opzet en één concreet bestaansgeval bewijzen geen duurzame werking. Daarvoor is afzonderlijk bewijs over een periode nodig. Bepaal onderzoeksperiode en selectie passend bij de onderzoeksvraag."
  }
 ],
 [
  "Drie taakbepalingen blijven buiten de praktische selectie wegens verwijzings- of taalverschillen.",
  {
   "title": "Drie taakbepalingen zijn niet selecteerbaar",
   "about": {
    "DORA-JOINT-TEAMS-420": {
     "title": "Drie uitgesloten teamtaken",
     "text": "Artikel 1(1)(c), (f) en (g) blijven buiten de praktische selectie. Onderdeel c verwijst naar hoofdstuk II van 2025/295; onderdeel g verwijst voor saneringsplan en voortgangsverslagen naar artikel 4 van die regeling. De bedoelde grondslagen zijn niet vastgesteld. Bij onderdeel f blijft de eigen aanbevelingsbevoegdheid van het team onbeslist ten opzichte van de bevoegdheid van de lead overseer. Leid hieruit geen vervangende verwijzing of zelfstandige teambevoegdheid af.",
     "section": "point"
    }
   }
  }
 ],
 [
  "De algemene regelingenplicht is begrensd uitgewerkt; de betwiste specifieke onderwerpen uit artikel 5(4) blijven HOLD.",
  {
   "title": "Specifieke onderwerpen van artikel 5(4) blijven onbeslist",
   "about": {
    "DORA-JOINT-TEAMS-420": {
     "title": "Artikel 5(4): bereik van “indien van toepassing”",
     "text": "De algemene plicht om uitvoeringsregelingen vast te stellen is uitgewerkt. Onbeslist blijft of “indien van toepassing” alleen ethiek en gedrag begrenst of ook tijd, kosten en opleiding. Die specifieke onderwerpen blijven op HOLD.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Ondersteuning en voorbereiding geven het team geen zelfstandige extra toezichtbevoegdheden.",
  {
   "title": "Teamondersteuning geeft geen extra toezichtbevoegdheid",
   "text": "Ondersteuning en voorbereiding geven het team geen zelfstandige aanvullende bevoegdheden.",
   "about": {
    "DORA-JOINT-TEAMS-420": {
     "title": "Taak en bevoegdheid",
     "text": "Ondersteuning en voorbereiding geven het onderzoeksteam geen aanvullende zelfstandige toezichtbevoegdheden.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Genoemde DORA-bepalingen en feitelijke opdrachten blijven bepalend voor inhoudelijke grenzen.",
  {
   "title": "DORA-bepalingen en feitelijke opdracht begrenzen het onderzoek",
   "about": {
    "DORA-JOINT-TEAMS-420": {
     "title": "Taak en bevoegdheid",
     "text": "De genoemde DORA-bepalingen en de feitelijke opdracht bepalen de inhoudelijke grenzen.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Beheersmaatregelen, vragen en toetsontwerp zijn analytische voorstellen; bewijssoorten zijn voorbeelden en gelijkwaardig bewijs blijft mogelijk.",
  {
   "title": "Maatregelen, vragen en toetsen zijn voorstellen",
   "text": "Bewijssoorten zijn voorbeelden. Gelijkwaardig bewijs blijft mogelijk bij de analytisch voorgestelde maatregelen, vragen en toetsen.",
   "about": {
    "DORA-JOINT-TEAMS-420": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Maatregelen, vragen en toetsen zijn analytische voorstellen. Bewijsstukken zijn voorbeelden; gelijkwaardig bewijs is mogelijk.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Geen passend concreet geval betekent geen positief bestaanoordeel.",
  {
   "title": "Zonder concreet geval geen positief bestaanoordeel",
   "text": "Een passend concreet geval is nodig om positief over bestaan te kunnen oordelen.",
   "about": {
    "DORA-JOINT-TEAMS-420": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Zonder passend concreet geval volgt geen positief bestaanoordeel.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Een bestaansgeval bewijst geen duurzame werking. Een werkingstoets vraagt afzonderlijk periodebewijs; onderzoeksperiode en selectie worden passend bij de onderzoeksvraag bepaald.",
  {
   "title": "Een bestaansgeval bewijst geen duurzame werking",
   "text": "Een werkingstoets vraagt afzonderlijk bewijs over een periode. Kies onderzoeksperiode en selectie passend bij de onderzoeksvraag."
  }
 ],
 [
  "Dit zijn toezichtssamenwerkingsrichtsnoeren onder het comply-or-explain-regime, geen rechtstreeks toepasselijke verordening met nieuwe algemene plichten voor financiële entiteiten of aanbieders.",
  {
   "title": "Richtsnoeren voor toezichtssamenwerking",
   "about": {
    "DORA-COOPERATION-GL36": {
     "title": "Aard van de richtsnoeren",
     "text": "Dit zijn richtsnoeren voor toezichtssamenwerking volgens comply-or-explain. Zij scheppen geen nieuwe algemene rechtstreeks toepasselijke plichten voor financiële entiteiten of aanbieders.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Vragen en beheersmaatregelen zijn analytische voorstellen. Voorbeeldbewijzen zijn niet verplicht voorgeschreven documenten; gelijkwaardig bewijs is mogelijk.",
  {
   "title": "Voorbeeldbewijzen zijn geen verplichte documenten",
   "text": "Vragen en maatregelen zijn analytische voorstellen. Gelijkwaardig bewijs blijft mogelijk.",
   "about": {
    "DORA-COOPERATION-GL36": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Vragen en maatregelen zijn analytische voorstellen. Bewijsstukken zijn voorbeelden; gelijkwaardig bewijs is mogelijk.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Geen passend concreet geval betekent geen positief bestaanoordeel; interviews alleen bewijzen geen uitvoering en een bestaansgeval geen duurzame werking.",
  {
   "title": "Interviews en losse gevallen zijn onvoldoende voor werking",
   "text": "Zonder passend geval volgt geen positief bestaanoordeel. Interviews alleen bewijzen geen uitvoering, en één bestaansgeval bewijst geen duurzame werking.",
   "about": {
    "DORA-COOPERATION-GL36": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Zonder passend geval volgt geen positief bestaanoordeel. Interviews alleen bewijzen geen uitvoering en één geval bewijst geen duurzame werking.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Richtsnoertermijnen en gewijzigde afspraken mogen geen rechtstreeks wettelijke onverwijlde informatieplicht of andere wettelijke termijn opzijzetten.",
  {
   "title": "Wettelijke informatietermijnen blijven voorgaan",
   "about": {
    "DORA-COOPERATION-GL36": {
     "title": "Wettelijke informatietermijnen",
     "text": "Richtsnoertermijnen en gewijzigde afspraken zetten wettelijke termijnen, waaronder onverwijlde informatieplichten, niet opzij.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Voor toepassing: stel autoriteit, eigen taak, aanbieder, geselecteerde handelingen, peildatum en relevante gevallen vast. Interne governance en afzonderlijke wettelijke mandaten blijven behouden.",
  {
   "title": "Onderzoek eigen taak en wettelijke bevoegdheid",
   "about": {
    "DORA-COOPERATION-GL36": {
     "title": "Eigen taak en bevoegdheid",
     "text": "Bepaal autoriteit, eigen taak, aanbieder, handelingen, peildatum en relevante gevallen. Interne governance en afzonderlijke wettelijke mandaten blijven gelden.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Een nog niet beoordeelde externe verwijzing wordt niet via vraag, toets of toelichting tot nieuwe norm. Bronafwijkingen blijven zichtbaar; oorspronkelijke tekst wordt niet aangepast.",
  {
   "title": "Onbeoordeelde verwijzingen worden geen nieuwe norm",
   "about": {
    "DORA-COOPERATION-GL36": {
     "title": "Externe verwijzingen",
     "text": "Een niet beoordeelde externe verwijzing onderbouwt geen nieuwe norm. Bronafwijkingen blijven herkenbaar en de oorspronkelijke tekst blijft behouden.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Richtsnoeren met uiterste-inspanningsstatus, niet een nieuwe rechtstreeks toepasselijke verordening. Een voorbeeld van een beheersmaatregel of bewijsstuk wordt geen extra bronplicht.",
  {
   "title": "Richtsnoeren met uiterste-inspanningsstatus",
   "about": {
    "DORA-INCIDENT-COSTS-GL34": {
     "title": "Aard en onderzoeksvoorstellen",
     "text": "Dit zijn richtsnoeren met uiterste-inspanningsstatus. Voorbeelden van maatregelen of bewijsstukken voegen geen bronplichten toe.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Opzet en bestaan van de gekozen handelingen; geen conclusie over duurzame werking of volledig jaarverlies. Een ontbrekend concreet geval is geen positief bestaansoordeel.",
  {
   "title": "Geen oordeel over volledig jaarverlies of duurzame werking",
   "about": {
    "DORA-INCIDENT-COSTS-GL34": {
     "title": "Onderzoeksgrens",
     "text": "Onderzoek van opzet en bestaan bewijst geen duurzame werking of volledig jaarverlies. Zonder passend geval volgt geen positief bestaanoordeel.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "De jaarselectie en correctiebehandeling gebruiken een expliciete systematische interpretatie met officiële ESA-toelichting. De letterlijke incidentdatumzin in punt 5 blijft zichtbaar; er is geen formele rectificatie vastgesteld.",
  {
   "title": "Jaartoerekening en correcties berusten op uitleg",
   "about": {
    "DORA-INCIDENT-COSTS-GL34": {
     "title": "Jaartoerekening en correcties",
     "text": "Jaartoerekening en correcties volgen een expliciete systematische interpretatie met officiële ESA-toelichting. De incidentdatumzin in punt 5 blijft ongewijzigd; een formele rectificatie is niet vastgesteld.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Oorspronkelijke NL-tekst, voorlopige voorbladpassages en EN-verschillen blijven ongewijzigd bewaard. De expliciete toepassingsdatum is 19 mei 2025; exacte publicatiegebeurtenis blijft afzonderlijk onbevestigd.",
  {
   "title": "Toepassingsdatum bekend; publicatiegebeurtenis onbevestigd",
   "about": {
    "DORA-INCIDENT-COSTS-GL34": {
     "title": "Toepassingsdatum en broneditie",
     "text": "De expliciete toepassingsdatum is 19 mei 2025. De exacte publicatiegebeurtenis is niet afzonderlijk bevestigd. Voorlopige voorbladpassages en verschillen tussen Nederlandse en Engelse tekst blijven behouden.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Duizenden eenheden van aantoonbaar toepasselijke rapportagevaluta zijn begrensd uitgewerkt. Wisselkoers, koersdatum, afronding, consolidatie en technische tekenregels blijven afhankelijk van toepasselijke instructies. Geen ontbrekende dekking verbergen met een brede vraag.",
  {
   "title": "Valuta en rekenregels vragen toepasselijke instructies",
   "about": {
    "DORA-INCIDENT-COSTS-GL34": {
     "title": "Rapportagevaluta en berekening",
     "text": "Duizenden eenheden van de aantoonbaar toepasselijke rapportagevaluta zijn uitgewerkt. Wisselkoers, koersdatum, afronding, consolidatie en technische tekenregels vragen de toepasselijke instructies.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Lidstaten zijn geadresseerden van de wijzigingsrichtlijn. De uitwerkingen geven brongebonden onderzoeksvoorstellen, geen bevestiging van actuele nationale toepasselijkheid.",
  {
   "title": "Richtlijn richt zich tot lidstaten",
   "about": {
    "DORA-SECTOR-2022-2556": {
     "title": "Nationale toepassing",
     "text": "De wijzigingsrichtlijn richt zich tot lidstaten. De onderzoeksvoorstellen bevestigen geen actuele nationale toepasselijkheid.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Bepaal vóór juridische toepassing de concrete actor, relevante sectorversie, omzettingsrecht, peildatum en eventuele uitzonderingen.",
  {
   "title": "Nationale toepassing vooraf vaststellen",
   "about": {
    "DORA-SECTOR-2022-2556": {
     "title": "Nationale toepassing",
     "text": "Bepaal concrete actor, sectorversie, omzettingsrecht, peildatum en uitzonderingen vóór juridische toepassing.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Instellings-, aanvraag-, informatieverstrekkings- en autoriteitsroutes blijven gescheiden. Een informatieobject is geen nieuwe zelfstandige uitvoeringsplicht.",
  {
   "title": "Verschillende rollen en handelingen gescheiden beoordelen",
   "about": {
    "DORA-SECTOR-2022-2556": {
     "title": "Rollen en handelingen onderscheiden",
     "text": "Instellings-, aanvraag-, informatieverstrekkings- en autoriteitsroutes hebben elk hun eigen betekenis. Een informatieobject schept geen zelfstandige uitvoeringsplicht.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Externe DORA-, MAR-, platform- en overige technische criteria moeten voor een inhoudelijk conformiteitsoordeel afzonderlijk worden vastgesteld.",
  {
   "title": "Externe criteria apart onderbouwen",
   "about": {
    "DORA-SECTOR-2022-2556": {
     "title": "Externe criteria",
     "text": "Een inhoudelijk conformiteitsoordeel vraagt afzonderlijke vaststelling van externe DORA-, MAR-, platform- en technische criteria.",
     "section": "scope"
    }
   }
  }
 ],
 [
  "Groepsherstel- en groepsafwikkelingsprocedures zijn niet uitgewerkt. De geselecteerde BRRD-routes zijn individueel afgebakend.",
  {
   "title": "Groepsherstel en groepsafwikkeling niet uitgewerkt",
   "about": {
    "DORA-SECTOR-2022-2556": {
     "title": "Geen groepsherstel of groepsafwikkeling",
     "text": "Groepsherstel en groepsafwikkeling zijn niet uitgewerkt. De geselecteerde BRRD-routes betreffen alleen de individueel afgebakende routes.",
     "section": "point"
    }
   }
  }
 ],
 [
  "Alle oorspronkelijke bronvragen, begrensde oplossingen en niet-vrijgegeven facetten blijven beschikbaar; niets wordt stilzwijgend opgelost.",
  {
   "title": "Open bronvragen en uitgesloten onderdelen blijven behouden",
   "about": {
    "DORA-SECTOR-2022-2556": {
     "title": "Bewaarregel voor bronvragen",
     "text": "",
     "section": "omit"
    }
   }
  }
 ],
 [
  "Een bestaansgeval bewijst geen duurzame werking. Geen extra toetsfase of steekproefomvang toegevoegd.",
  {
   "title": "Reikwijdte 7",
   "about": {
    "DORA-JOINT-TEAMS-420": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Eén bestaansgeval bewijst geen duurzame werking.",
     "section": "method"
    }
   }
  }
 ],
 [
  "Opzet en één bestaansgeval bewijzen geen duurzame werking; geen extra toetsfase, periode of steekproef verzonnen.",
  {
   "title": "Reikwijdte 8",
   "about": {
    "DORA-OVERSIGHT-295": {
     "title": "Onderzoeksvoorstellen en bewijs",
     "text": "Opzet en één bestaansgeval bewijzen geen duurzame werking.",
     "section": "method"
    }
   }
  }
 ]
]);

export function frameworkLimitation(item){
 const reviewed=wording.get(item.text);
 return reviewed?{title:reviewed.title,text:reviewed.text??item.text,guide:reviewed.guide??''}:{title:item.title,text:item.text,guide:''};
}

/** Group only exact, reviewed About notes. Unknown wording remains fully visible. */
export function frameworkAboutLimitations(sourceId,items){
 const sections=[],groups=new Map(),seen=new Set();
 for(const item of items){
  if(seen.has(item.text))continue;
  seen.add(item.text);
  const reading=wording.get(item.text)?.about?.[sourceId];
  if(!reading){sections.push(frameworkLimitation(item));continue;}
  if(reading.section==='omit')continue;
  if(reading.section==='point'){sections.push({title:reading.title,text:reading.text,guide:''});continue;}
  const title=reading.section==='method'?'Onderzoeksvoorstellen en bewijs':'Reikwijdte en brongebruik';
  let group=groups.get(title);
  if(!group){group={title,text:'',guide:''};groups.set(title,group);sections.push(group);}
  if(!group.text.split('\n').includes(reading.text))group.text+=(group.text?'\n':'')+reading.text;
 }
 return sections;
}
