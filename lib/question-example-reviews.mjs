// Question-review skill: substantive reading by ChatGPT Astra, 29 October 2026.
// Single review, not an independent second opinion. Only these editorial
// writing templates and listed wording variants are covered. Bracketed slots
// remain visible drafting aids, not established scope, criteria or source claims.
// Personal text and catalogue questions are outside this approval. Reasons
// remain in comments so they do not add bytes to the browser bundle.
export default [
  // EX-01-00: Afbakening: onderwerp, organisatie, periode en normen bepalen één nalevingsonderzoek; invulvelden zijn zichtbare schrijfsteun, geen vastgestelde eisen.
  {"id":"EX-01-00","variants":["In hoeverre voldoet de werkwijze voor {{onderwerp}} bij [organisatieonderdeel] in [periode] aan [toetsingscriteria]?","In welke mate voldoet de werkwijze voor {{onderwerp}} bij [organisatieonderdeel] in [periode] aan [toetsingscriteria]?"],"decision":"behouden"},
  // EX-01-01: Dekking: stelt eerst vast welke normen relevant zijn, zonder toepasselijkheid of naleving vooraf te bevestigen.
  {"id":"EX-01-01","variants":["Welke toetsingscriteria zijn van toepassing op de werkwijze voor {{onderwerp}}?"],"decision":"behouden"},
  // EX-01-02: Beantwoordbaarheid: vraagt naar de feitelijke werkwijze in het afgebakende onderdeel en tijdvak.
  {"id":"EX-01-02","variants":["Hoe wordt bij [organisatieonderdeel] in [periode] daadwerkelijk gewerkt aan {{onderwerp}}?","Op welke wijze wordt bij [organisatieonderdeel] in [periode] daadwerkelijk gewerkt aan {{onderwerp}}?","Op welke manier wordt bij [organisatieonderdeel] in [periode] daadwerkelijk gewerkt aan {{onderwerp}}?"],"decision":"behouden"},
  // EX-01-03: Eén onderwerp: voldoen en eventueel niet voldoen zijn de twee mogelijke uitkomsten van dezelfde normvergelijking.
  {"id":"EX-01-03","variants":["Op welke punten voldoet de werkwijze voor {{onderwerp}} aan de toetsingscriteria en op welke punten eventueel niet?"],"decision":"behouden","compoundResolved":true},
  // EX-01-04: Dekking: verbindt de relevante normen met taken en verantwoordelijkheden binnen dezelfde werkwijze.
  {"id":"EX-01-04","variants":["Hoe zijn de toetsingscriteria voor {{onderwerp}} vertaald naar taken en verantwoordelijkheden?","Op welke wijze zijn de toetsingscriteria voor {{onderwerp}} vertaald naar taken en verantwoordelijkheden?","Op welke manier zijn de toetsingscriteria voor {{onderwerp}} vertaald naar taken en verantwoordelijkheden?"],"decision":"behouden"},
  // EX-01-05: Begrenzing: moeten voorkomen beschrijft het beoogde doel van waarborgen, niet hun bewezen werking.
  {"id":"EX-01-05","variants":["Welke waarborgen in de werkwijze voor {{onderwerp}} moeten fouten voorkomen of tijdig signaleren?"],"decision":"behouden"},
  // EX-01-06: Beantwoordbaarheid: aantoonbare toepassing is begrensd tot onderzochte gevallen; geen uitspraak over alle gevallen.
  {"id":"EX-01-06","variants":["In hoeverre zijn deze waarborgen voor {{onderwerp}} in de onderzochte gevallen aantoonbaar toegepast?","In welke mate zijn deze waarborgen voor {{onderwerp}} in de onderzochte gevallen aantoonbaar toegepast?"],"decision":"behouden"},
  // EX-01-07: Eén onderwerp: vastgestelde afwijkingen en hun betekenis onderbouwen samen het oordeel over het resultaat van de werkwijze.
  {"id":"EX-01-07","variants":["Welke afwijkingen bij {{onderwerp}} zijn vastgesteld en wat betekenen die voor het beoogde resultaat?"],"decision":"behouden","compoundResolved":true},
  // EX-01-08: Neutraliteit na herstel: vraagt naar beoordeling en vastlegging van uitzonderingen zonder te veronderstellen dat ze al zijn goedgekeurd.
  {"id":"EX-01-08","variants":["Hoe worden uitzonderingen op de werkwijze voor {{onderwerp}} beoordeeld en vastgelegd?","Op welke wijze worden uitzonderingen op de werkwijze voor {{onderwerp}} beoordeeld en vastgelegd?","Op welke manier worden uitzonderingen op de werkwijze voor {{onderwerp}} beoordeeld en vastgelegd?"],"decision":"behouden"},
  // EX-01-09: Afbakening na herstel: beschrijft verschillen tussen zelf af te bakenen teams of locaties; voegt geen tweede causaliteitsonderzoek toe.
  {"id":"EX-01-09","variants":["Welke verschillen in de uitvoering van {{onderwerp}} zijn zichtbaar tussen [teams of locaties]?"],"decision":"behouden"},
  // EX-01-10: Begrenzing: bewijsbeperkingen blijven deel van het oordeel; de vraag belooft geen zekerheid die de gegevens niet dragen.
  {"id":"EX-01-10","variants":["Welke beperkingen in het beschikbare bewijs begrenzen het oordeel over de werkwijze voor {{onderwerp}}?"],"decision":"behouden"},
  // EX-02-00: Afbakening: vergelijkt beoogde en bereikte resultaten voor één onderwerp, onderdeel en periode; in hoeverre laat nulresultaat toe.
  {"id":"EX-02-00","variants":["In hoeverre bereikt [organisatieonderdeel] in [periode] de beoogde resultaten voor {{onderwerp}}?","In welke mate bereikt [organisatieonderdeel] in [periode] de beoogde resultaten voor {{onderwerp}}?"],"decision":"behouden"},
  // EX-02-01, EX-03-01: Dekking: legt de beoogde resultaten en periode vast vóór vergelijking; dezelfde vraag is passend als uitgangspunt voor de verklarende route.
  {"id":"EX-02-01","variants":["Welke resultaten wil [organisatieonderdeel] voor {{onderwerp}} in [periode] bereiken?"],"decision":"behouden"},
  // EX-02-02: Beantwoordbaarheid: vraagt naar aantoonbare resultaten in de gekozen periode, geen activiteiten als automatisch resultaat.
  {"id":"EX-02-02","variants":["Welke resultaten zijn voor {{onderwerp}} in die periode aantoonbaar bereikt?"],"decision":"behouden"},
  // EX-02-03: Dekking: vergelijkt feitelijke resultaten met de bedoeling, zonder doelbereiking te veronderstellen.
  {"id":"EX-02-03","variants":["Hoe verhouden de bereikte resultaten voor {{onderwerp}} zich tot de beoogde resultaten?","Op welke wijze verhouden de bereikte resultaten voor {{onderwerp}} zich tot de beoogde resultaten?","Op welke manier verhouden de bereikte resultaten voor {{onderwerp}} zich tot de beoogde resultaten?"],"decision":"behouden"},
  // EX-02-04: Beantwoordbaarheid: beoordeelt of doelen voldoende concreet zijn om resultaatmeting mogelijk te maken. Ja/nee is hier passend bij een onderzoeksvraag.
  {"id":"EX-02-04","variants":["Zijn de doelen voor {{onderwerp}} voldoende concreet om de bereikte resultaten te beoordelen?"],"decision":"behouden"},
  // EX-02-05: Eén onderwerp: bruikbaarheid en blinde vlekken bepalen samen de dekking van de indicatoren voor dezelfde resultaten.
  {"id":"EX-02-05","variants":["Welke indicatoren geven een bruikbaar beeld van de resultaten voor {{onderwerp}} en wat blijft buiten beeld?"],"decision":"behouden","compoundResolved":true},
  // EX-02-06: Beantwoordbaarheid: volledigheid en betrouwbaarheid bepalen gezamenlijk de bruikbaarheid van dezelfde resultaatgegevens.
  {"id":"EX-02-06","variants":["In hoeverre zijn de gegevens over de resultaten voor {{onderwerp}} volledig en betrouwbaar?","In welke mate zijn de gegevens over de resultaten voor {{onderwerp}} volledig en betrouwbaar?"],"decision":"behouden"},
  // EX-02-07: Afbakening: verschillen blijven bij de nog in te vullen groepen; geen representativiteit of algemene geldigheid wordt beloofd.
  {"id":"EX-02-07","variants":["Hoe verschillen de resultaten voor {{onderwerp}} tussen [doelgroepen, teams of locaties]?","Op welke wijze verschillen de resultaten voor {{onderwerp}} tussen [doelgroepen, teams of locaties]?","Op welke manier verschillen de resultaten voor {{onderwerp}} tussen [doelgroepen, teams of locaties]?"],"decision":"behouden"},
  // EX-02-08: Neutraliteit: alleen onbedoelde effecten die uit beschikbaar bewijs blijken; ook geen aantoonbaar effect is een mogelijke uitkomst.
  {"id":"EX-02-08","variants":["Welke onbedoelde effecten van {{onderwerp}} blijken uit het beschikbare bewijs?"],"decision":"behouden"},
  // EX-02-09: Begrenzing: vraagt een bruikbare vergelijking en stelt een willekeurige uitgangssituatie of groep niet automatisch gelijk aan causaal bewijs.
  {"id":"EX-02-09","variants":["Hoe verhouden de resultaten voor {{onderwerp}} zich tot een bruikbare uitgangssituatie of vergelijkingsgroep?","Op welke wijze verhouden de resultaten voor {{onderwerp}} zich tot een bruikbare uitgangssituatie of vergelijkingsgroep?","Op welke manier verhouden de resultaten voor {{onderwerp}} zich tot een bruikbare uitgangssituatie of vergelijkingsgroep?"],"decision":"behouden"},
  // EX-02-10: Eén onderwerp: mogelijke en niet mogelijke conclusies markeren samen de bewijsgrens van dezelfde resultaatbeoordeling.
  {"id":"EX-02-10","variants":["Welke conclusies over {{onderwerp}} zijn mogelijk en welke niet, gegeven de meetperiode en bewijskwaliteit?"],"decision":"behouden","compoundResolved":true},
  // EX-03-00: Neutraliteit: factoren helpen verklaren in hoeverre doelen worden bereikt; geen enkelvoudige oorzaak of bereikt resultaat vooraf aangenomen.
  {"id":"EX-03-00","variants":["Welke factoren helpen verklaren in hoeverre [organisatieonderdeel] in [periode] de beoogde resultaten voor {{onderwerp}} bereikt?"],"decision":"behouden"},
  // EX-03-02: Beantwoordbaarheid: aantoonbare resultaatbereiking gaat vooraf aan het verklaren ervan.
  {"id":"EX-03-02","variants":["In hoeverre zijn deze resultaten voor {{onderwerp}} aantoonbaar bereikt?","In welke mate zijn deze resultaten voor {{onderwerp}} aantoonbaar bereikt?"],"decision":"behouden"},
  // EX-03-03: Neutraliteit: interne en externe factoren zijn mogelijke verklaringen, geen vastgestelde oorzaken.
  {"id":"EX-03-03","variants":["Welke factoren binnen en buiten [organisatieonderdeel] kunnen de resultaten voor {{onderwerp}} verklaren?"],"decision":"behouden"},
  // EX-03-04: Neutraliteit: vraagt zowel naar ondersteuning als naar weerlegging van mogelijke verklaringen.
  {"id":"EX-03-04","variants":["Welke aanwijzingen ondersteunen of weerspreken deze mogelijke verklaringen voor de resultaten van {{onderwerp}}?"],"decision":"behouden"},
  // EX-03-05: Begrenzing: het mechanisme is expliciet verondersteld; een hypothese in onderzoeksontwerp is hier geen hypothetische interviewvraag.
  {"id":"EX-03-05","variants":["Via welk verondersteld mechanisme zouden de onderzochte factoren de resultaten voor {{onderwerp}} beïnvloeden?"],"decision":"behouden"},
  // EX-03-06: Beantwoordbaarheid: tijdsvolgorde helpt verklaringen onderzoeken maar wordt niet gelijkgesteld aan causaliteit.
  {"id":"EX-03-06","variants":["In welke volgorde traden de relevante veranderingen en resultaten bij {{onderwerp}} op?"],"decision":"behouden"},
  // EX-03-07: Beantwoordbaarheid: vergelijkingsgevallen dienen om verklaringen te toetsen; de gebruiker moet hun vergelijkbaarheid onderbouwen.
  {"id":"EX-03-07","variants":["Welke verschillen tussen [gevallen of locaties] helpen verklaringen voor {{onderwerp}} te toetsen?"],"decision":"behouden"},
  // EX-03-08: Neutraliteit: alternatieve verklaringen blijven expliciet onderdeel van het onderzoek.
  {"id":"EX-03-08","variants":["Welke alternatieve verklaringen voor de resultaten van {{onderwerp}} zijn onderzocht?"],"decision":"behouden"},
  // EX-03-09: Dekking: vraagt ook naar externe ontwikkelingen; geen rol of een onzekere rol blijft een mogelijke bevinding.
  {"id":"EX-03-09","variants":["Welke rol speelden externe ontwikkelingen bij de resultaten voor {{onderwerp}}?"],"decision":"behouden"},
  // EX-03-10: Begrenzing: maakt expliciet dat samenhang niet als oorzaak mag worden aangemerkt en vraagt naar bewijskracht.
  {"id":"EX-03-10","variants":["Hoe sterk is het bewijs voor een bijdrage aan de resultaten van {{onderwerp}}, zonder samenhang als oorzaak aan te merken?"],"decision":"behouden"},
  // EX-04-00: Afbakening: relevante risico’s, acceptatiegrenzen, onderdeel en periode bepalen één risicobeheersingsonderzoek; grenzen zijn niet door dit voorbeeld vastgesteld.
  {"id":"EX-04-00","variants":["In hoeverre beheerst [organisatieonderdeel] in [periode] de voor {{onderwerp}} relevante risico’s binnen [vastgestelde grenzen]?","In welke mate beheerst [organisatieonderdeel] in [periode] de voor {{onderwerp}} relevante risico’s binnen [vastgestelde grenzen]?"],"decision":"behouden"},
  // EX-04-01: Dekking: verbindt risico’s aan mogelijke gevolgen voor doelen, zonder die gevolgen als feit te presenteren.
  {"id":"EX-04-01","variants":["Welke doelen voor {{onderwerp}} kunnen door de onderzochte risico’s worden geraakt?"],"decision":"behouden"},
  // EX-04-02: Eén onderwerp: onderbouwde risico’s en onzekere signalen bepalen samen de kwaliteit van hetzelfde risicobeeld.
  {"id":"EX-04-02","variants":["Welke risico’s voor {{onderwerp}} zijn onderbouwd en welke signalen zijn nog onzeker?"],"decision":"behouden","compoundResolved":true},
  // EX-04-03: Beantwoordbaarheid: vraagt naar de afweging achter prioriteiten en acceptatiegrenzen; geen universele grens voorgeschreven.
  {"id":"EX-04-03","variants":["Hoe zijn de prioriteiten en grenzen voor het accepteren van risico’s bij {{onderwerp}} bepaald?","Op welke wijze zijn de prioriteiten en grenzen voor het accepteren van risico’s bij {{onderwerp}} bepaald?","Op welke manier zijn de prioriteiten en grenzen voor het accepteren van risico’s bij {{onderwerp}} bepaald?"],"decision":"behouden"},
  // EX-04-04: Begrenzing: vraagt welke maatregelen de risico’s moeten beperken, zonder daadwerkelijke beperking te claimen.
  {"id":"EX-04-04","variants":["Welke maatregelen moeten de belangrijkste risico’s voor {{onderwerp}} beperken?"],"decision":"behouden"},
  // EX-04-05: Dekking: beoordeelt passendheid van het ontwerp; dit is geen conclusie over bestaan of werking.
  {"id":"EX-04-05","variants":["Zijn de maatregelen voor {{onderwerp}} passend ontworpen voor de beoogde risico’s?"],"decision":"behouden"},
  // EX-04-06: Afbakening na herstel: aantoonbare aanwezigheid op een in te vullen peildatum houdt bestaan apart van werking over een periode.
  {"id":"EX-04-06","variants":["Waren de maatregelen voor {{onderwerp}} op [peildatum] aantoonbaar aanwezig?"],"decision":"behouden"},
  // EX-04-07: Begrenzing: werking volgt uit onderzochte gevallen; de onderzoeker moet periode, populatie en selectie bepalen, zoals de centrale scope al vraagt.
  {"id":"EX-04-07","variants":["Wat blijkt uit onderzochte gevallen over de werking van de maatregelen voor {{onderwerp}}?"],"decision":"behouden"},
  // EX-04-08: Neutraliteit na herstel: restrisico’s en besluitvorming over hun aanvaardbaarheid vormen één beheersvraag; acceptatie wordt niet als feit aangenomen.
  {"id":"EX-04-08","variants":["Welke restrisico’s voor {{onderwerp}} zijn zichtbaar en hoe wordt over hun aanvaardbaarheid besloten?"],"decision":"behouden","compoundResolved":true},
  // EX-04-09: Dekking: signalering en opvolging vormen dezelfde cyclus voor incidenten en veranderingen in risico’s.
  {"id":"EX-04-09","variants":["Hoe worden incidenten en veranderingen in risico’s voor {{onderwerp}} gesignaleerd en opgevolgd?","Op welke wijze worden incidenten en veranderingen in risico’s voor {{onderwerp}} gesignaleerd en opgevolgd?","Op welke manier worden incidenten en veranderingen in risico’s voor {{onderwerp}} gesignaleerd en opgevolgd?"],"decision":"behouden"},
  // EX-04-10: Begrenzing: onzekerheden blijven zichtbaar in het oordeel over risicobeheersing.
  {"id":"EX-04-10","variants":["Welke onzekerheden begrenzen het oordeel over de risicobeheersing van {{onderwerp}}?"],"decision":"behouden"},
  // EX-05-00: Afbakening: tijdige, onderbouwde besluitvorming is de meetbare bedoeling van dezelfde sturing, binnen onderdeel en periode.
  {"id":"EX-05-00","variants":["In hoeverre ondersteunt de sturing op {{onderwerp}} bij [organisatieonderdeel] in [periode] tijdige en onderbouwde besluitvorming?","In welke mate ondersteunt de sturing op {{onderwerp}} bij [organisatieonderdeel] in [periode] tijdige en onderbouwde besluitvorming?"],"decision":"behouden"},
  // EX-05-01: Dekking: bepaalt eerst welke besluiten en niveaus relevant zijn; geen bevoegdheid wordt door dit voorbeeld toegekend.
  {"id":"EX-05-01","variants":["Welke besluiten over {{onderwerp}} moeten op welk niveau worden genomen?"],"decision":"behouden"},
  // EX-05-02: Dekking: taken, bevoegdheden en verantwoordelijkheden vormen één samenhangende inrichting.
  {"id":"EX-05-02","variants":["Hoe zijn taken, bevoegdheden en verantwoordelijkheden voor {{onderwerp}} verdeeld?","Op welke wijze zijn taken, bevoegdheden en verantwoordelijkheden voor {{onderwerp}} verdeeld?","Op welke manier zijn taken, bevoegdheden en verantwoordelijkheden voor {{onderwerp}} verdeeld?"],"decision":"behouden"},
  // EX-05-03: Eén onderwerp: aansluiting, leemten en overlap beschrijven gezamenlijk de verdeling van verantwoordelijkheden; afwezigheid van leemten blijft mogelijk.
  {"id":"EX-05-03","variants":["Waar sluiten verantwoordelijkheden voor {{onderwerp}} op elkaar aan en waar ontstaan leemten of overlap?"],"decision":"behouden","compoundResolved":true},
  // EX-05-04: Beantwoordbaarheid: inhoud en moment van informatie zijn samen nodig om de informatiepositie van dezelfde beslisser te beoordelen.
  {"id":"EX-05-04","variants":["Welke informatie ontvangen beslissers over {{onderwerp}} en op welk moment?"],"decision":"behouden"},
  // EX-05-05: Beantwoordbaarheid: informatiekwaliteit wordt gerelateerd aan haar concrete gebruik voor doelen, risico’s en afwijkingen.
  {"id":"EX-05-05","variants":["In hoeverre is deze informatie over {{onderwerp}} geschikt om doelen, risico’s en afwijkingen te beoordelen?","In welke mate is deze informatie over {{onderwerp}} geschikt om doelen, risico’s en afwijkingen te beoordelen?"],"decision":"behouden"},
  // EX-05-06: Neutraliteit: onderzoekt afweging van belangen en alternatieven, zonder een bepaalde keuze als correct te presenteren.
  {"id":"EX-05-06","variants":["Hoe zijn relevante belangen en alternatieven in besluiten over {{onderwerp}} afgewogen?","Op welke wijze zijn relevante belangen en alternatieven in besluiten over {{onderwerp}} afgewogen?","Op welke manier zijn relevante belangen en alternatieven in besluiten over {{onderwerp}} afgewogen?"],"decision":"behouden"},
  // EX-05-07: Dekking: verbindt besluitvorming aan uitvoerbare opdrachten, zonder uitvoering daarmee bewezen te achten.
  {"id":"EX-05-07","variants":["Hoe worden besluiten over {{onderwerp}} vertaald naar uitvoerbare opdrachten?","Op welke wijze worden besluiten over {{onderwerp}} vertaald naar uitvoerbare opdrachten?","Op welke manier worden besluiten over {{onderwerp}} vertaald naar uitvoerbare opdrachten?"],"decision":"behouden"},
  // EX-05-08: Eén onderwerp: bespreken en waar nodig escaleren zijn vervolgstappen in dezelfde behandeling van afwijkingen; escalatie is geen automatische verplichting.
  {"id":"EX-05-08","variants":["Hoe worden afwijkingen bij {{onderwerp}} besproken en waar nodig geëscaleerd?","Op welke wijze worden afwijkingen bij {{onderwerp}} besproken en waar nodig geëscaleerd?","Op welke manier worden afwijkingen bij {{onderwerp}} besproken en waar nodig geëscaleerd?"],"decision":"behouden","compoundResolved":true},
  // EX-05-09: Beantwoordbaarheid: opvolging en terugkoppeling worden aan onderzochte besluiten getoetst.
  {"id":"EX-05-09","variants":["Wat blijkt uit onderzochte besluiten over de opvolging en terugkoppeling bij {{onderwerp}}?"],"decision":"behouden"},
  // EX-05-10: Eén onderwerp: werkzame en te verbeteren sturingspraktijken vormen samen een onderbouwde beoordeling van dezelfde sturing; beide kanten moeten aantoonbaar zijn.
  {"id":"EX-05-10","variants":["Welke sturingspraktijken bij {{onderwerp}} werken aantoonbaar goed en waar is verbetering nodig?"],"decision":"behouden","compoundResolved":true},
  // EX-06-00: Afbakening: geschiktheid van informatie wordt gekoppeld aan expliciet in te vullen gebruik, onderdeel en periode.
  {"id":"EX-06-00","variants":["In hoeverre is de informatie over {{onderwerp}} bij [organisatieonderdeel] in [periode] geschikt voor [beoogd gebruik]?","In welke mate is de informatie over {{onderwerp}} bij [organisatieonderdeel] in [periode] geschikt voor [beoogd gebruik]?"],"decision":"behouden"},
  // EX-06-01: Dekking: informatiebehoeften van de beoogde gebruikers vormen het startpunt, niet een willekeurige technische norm.
  {"id":"EX-06-01","variants":["Welke informatie over {{onderwerp}} hebben de beoogde gebruikers nodig?"],"decision":"behouden"},
  // EX-06-02: Dekking: stelt toepasselijke kwaliteitseisen vast zonder die zelf te verzinnen.
  {"id":"EX-06-02","variants":["Welke kwaliteitseisen gelden voor die informatie over {{onderwerp}}?"],"decision":"behouden"},
  // EX-06-03: Eén onderwerp: ontstaan en bewerkingen beschrijven dezelfde gegevensketen die voor betrouwbaarheid moet worden gevolgd.
  {"id":"EX-06-03","variants":["Hoe ontstaan de gegevens over {{onderwerp}} en welke bewerkingen ondergaan ze?","Op welke wijze ontstaan de gegevens over {{onderwerp}} en welke bewerkingen ondergaan ze?","Op welke manier ontstaan de gegevens over {{onderwerp}} en welke bewerkingen ondergaan ze?"],"decision":"behouden","compoundResolved":true},
  // EX-06-04: Beantwoordbaarheid: volledigheid is beperkt tot de onderzochte gegevens, niet de gehele onbekende populatie.
  {"id":"EX-06-04","variants":["In hoeverre zijn de onderzochte gegevens over {{onderwerp}} volledig?","In welke mate zijn de onderzochte gegevens over {{onderwerp}} volledig?"],"decision":"behouden"},
  // EX-06-05: Beantwoordbaarheid: juistheid en controleerbaarheid vragen naar de kwaliteit en verifieerbaarheid van dezelfde gegevens.
  {"id":"EX-06-05","variants":["In hoeverre zijn de onderzochte gegevens over {{onderwerp}} juist en controleerbaar?","In welke mate zijn de onderzochte gegevens over {{onderwerp}} juist en controleerbaar?"],"decision":"behouden"},
  // EX-06-06: Afbakening: tijdigheid wordt beoordeeld ten opzichte van het beoogde gebruik, zonder willekeurige termijn.
  {"id":"EX-06-06","variants":["Is informatie over {{onderwerp}} tijdig beschikbaar voor het beoogde gebruik?"],"decision":"behouden"},
  // EX-06-07: Beantwoordbaarheid: consistente toepassing van begrippen is toetsbaar bij de betrokkenen; dit is geen interviewopening.
  {"id":"EX-06-07","variants":["Worden begrippen en definities voor {{onderwerp}} door betrokkenen consistent gebruikt?"],"decision":"behouden"},
  // EX-06-08: Dekking: vinden en herstellen vormen één foutbehandelingscyclus.
  {"id":"EX-06-08","variants":["Hoe worden fouten in informatie over {{onderwerp}} gevonden en hersteld?","Op welke wijze worden fouten in informatie over {{onderwerp}} gevonden en hersteld?","Op welke manier worden fouten in informatie over {{onderwerp}} gevonden en hersteld?"],"decision":"behouden"},
  // EX-06-09: Begrenzing: beperkingen en onzekerheden moeten zichtbaar zijn voor de gebruikers van de informatie.
  {"id":"EX-06-09","variants":["Welke beperkingen en onzekerheden in informatie over {{onderwerp}} zijn voor gebruikers zichtbaar?"],"decision":"behouden"},
  // EX-06-10: Neutraliteit na herstel: eventuele informatiegebreken kunnen afwezig zijn; vraagt naar hun betekenis voor besluiten, zonder gebreken vooraf vast te stellen.
  {"id":"EX-06-10","variants":["Wat betekenen eventuele informatiegebreken voor beslissingen over {{onderwerp}}?"],"decision":"behouden"},
  // EX-07-00: Afbakening: uitvoering wordt vergeleken met afgesproken dienstverlening en behoeften van de in te vullen doelgroep in een bepaalde periode.
  {"id":"EX-07-00","variants":["In hoeverre sluit de uitvoering van {{onderwerp}} bij [organisatieonderdeel] in [periode] aan op [afgesproken dienstverlening] en de behoeften van [doelgroep]?","In welke mate sluit de uitvoering van {{onderwerp}} bij [organisatieonderdeel] in [periode] aan op [afgesproken dienstverlening] en de behoeften van [doelgroep]?"],"decision":"behouden"},
  // EX-07-01: Eén onderwerp: behoeften en de manier waarop ze zijn vastgesteld bepalen samen de onderbouwing van het klantbeeld.
  {"id":"EX-07-01","variants":["Welke behoeften heeft de doelgroep bij {{onderwerp}} en hoe zijn die vastgesteld?"],"decision":"behouden","compoundResolved":true},
  // EX-07-02: Dekking: kwaliteit en tijdigheid horen bij dezelfde dienstverleningsafspraken; de vraag stelt geen nieuwe norm.
  {"id":"EX-07-02","variants":["Welke afspraken over kwaliteit en tijdigheid gelden voor {{onderwerp}}?"],"decision":"behouden"},
  // EX-07-03: Beantwoordbaarheid: toegankelijkheid wordt tussen te bepalen gebruikersgroepen onderzocht, niet namens alle burgers ingevuld.
  {"id":"EX-07-03","variants":["Hoe toegankelijk is {{onderwerp}} voor verschillende groepen gebruikers?"],"decision":"behouden"},
  // EX-07-04: Dekking: informatie over verloop en voorwaarden betreft één informatiebehoefte van de gebruiker.
  {"id":"EX-07-04","variants":["Welke informatie krijgen gebruikers over het verloop en de voorwaarden van {{onderwerp}}?"],"decision":"behouden"},
  // EX-07-05: Beantwoordbaarheid: vergelijkt uitvoering met afgesproken doorlooptijden, zonder naleving vooraf te concluderen.
  {"id":"EX-07-05","variants":["In hoeverre voldoet de uitvoering van {{onderwerp}} aan de afgesproken doorlooptijden?","In welke mate voldoet de uitvoering van {{onderwerp}} aan de afgesproken doorlooptijden?"],"decision":"behouden"},
  // EX-07-06: Afbakening: zorgvuldigheid en consistentie worden binnen vergelijkbare gevallen onderzocht; de criteria moeten nog worden bepaald.
  {"id":"EX-07-06","variants":["Hoe zorgvuldig en consistent worden vergelijkbare gevallen bij {{onderwerp}} behandeld?"],"decision":"behouden"},
  // EX-07-07: Dekking: onderzoekt de omgang met bijzondere omstandigheden zonder uitzonderingsrechten zelf vast te stellen.
  {"id":"EX-07-07","variants":["Hoe worden uitzonderlijke omstandigheden van gebruikers bij {{onderwerp}} meegewogen?","Op welke wijze worden uitzonderlijke omstandigheden van gebruikers bij {{onderwerp}} meegewogen?","Op welke manier worden uitzonderlijke omstandigheden van gebruikers bij {{onderwerp}} meegewogen?"],"decision":"behouden"},
  // EX-07-08: Begrenzing: ervaringen en klachten geven bewijs over ervaren kwaliteit, geen automatische representativiteit.
  {"id":"EX-07-08","variants":["Wat blijkt uit ervaringen en klachten over de kwaliteit van {{onderwerp}}?"],"decision":"behouden"},
  // EX-07-09: Neutraliteit: vergelijkt gerapporteerde prestaties met ervaringen zonder vooraf te kiezen welke weergave juist is.
  {"id":"EX-07-09","variants":["Welke verschillen bestaan tussen gerapporteerde prestaties en ervaringen met {{onderwerp}}?"],"decision":"behouden"},
  // EX-07-10: Neutraliteit na herstel: in hoeverre laat toe dat gebruikerssignalen niet of beperkt worden benut; benutting bewijst nog geen gerealiseerde verbetering.
  {"id":"EX-07-10","variants":["In hoeverre worden signalen van gebruikers benut bij het verbeteren van {{onderwerp}}?","In welke mate worden signalen van gebruikers benut bij het verbeteren van {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-00: Afbakening: dezelfde ketenuitvoering, betrokken partijen en periode begrenzen het onderzoek; de vraag stelt samenwerking niet vanzelf gelijk aan betrouwbaarheid.
  {"id":"EX-08-00","variants":["In hoeverre ondersteunt de samenwerking tussen [betrokken partijen] in [periode] een betrouwbare uitvoering van {{onderwerp}}?","In welke mate ondersteunt de samenwerking tussen [betrokken partijen] in [periode] een betrouwbare uitvoering van {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-01: Dekking: gezamenlijke beoogde resultaten moeten eerst duidelijk worden voor beoordeling van de keten.
  {"id":"EX-08-01","variants":["Welke gezamenlijke resultaten beogen de betrokken partijen met {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-02: Dekking: afspraken en verantwoordelijkheden verbinden de partijen in hetzelfde proces.
  {"id":"EX-08-02","variants":["Hoe zijn afspraken en verantwoordelijkheden voor {{onderwerp}} tussen partijen verdeeld?","Op welke wijze zijn afspraken en verantwoordelijkheden voor {{onderwerp}} tussen partijen verdeeld?","Op welke manier zijn afspraken en verantwoordelijkheden voor {{onderwerp}} tussen partijen verdeeld?"],"decision":"behouden"},
  // EX-08-03: Beantwoordbaarheid: kritieke overdrachtsmomenten worden geïdentificeerd binnen het gekozen onderwerp.
  {"id":"EX-08-03","variants":["Welke overdrachtsmomenten zijn kritisch voor {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-04: Dekking: beschikbaarheid en begrijpelijkheid zijn samen voorwaarden voor bruikbare overdrachtsinformatie.
  {"id":"EX-08-04","variants":["Welke informatie moet bij overdrachten voor {{onderwerp}} beschikbaar en begrijpelijk zijn?"],"decision":"behouden"},
  // EX-08-05: Beantwoordbaarheid: kwaliteit en tijdigheid volgen uit concrete onderzochte overdrachten.
  {"id":"EX-08-05","variants":["Wat blijkt uit onderzochte gevallen over de kwaliteit en tijdigheid van overdrachten bij {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-06: Dekking: onderzoekt de invloed van belangen en prioriteiten; bewijs en alternatieve verklaringen blijven nodig om invloed vast te stellen.
  {"id":"EX-08-06","variants":["Hoe beïnvloeden verschillende belangen of prioriteiten de uitvoering van {{onderwerp}}?","Op welke wijze beïnvloeden verschillende belangen of prioriteiten de uitvoering van {{onderwerp}}?","Op welke manier beïnvloeden verschillende belangen of prioriteiten de uitvoering van {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-07: Neutraliteit na herstel: vraagt naar de gezamenlijke omgang met knelpunten, zonder te veronderstellen dat ze zijn opgelost.
  {"id":"EX-08-07","variants":["Hoe gaan partijen gezamenlijk om met knelpunten bij {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-08: Begrenzing: vraagt naar voorbereiding op uitval of vertraging, niet naar een garantie dat continuïteit verzekerd is.
  {"id":"EX-08-08","variants":["Hoe is voorzien in de uitval of vertraging van een betrokken partij bij {{onderwerp}}?","Op welke wijze is voorzien in de uitval of vertraging van een betrokken partij bij {{onderwerp}}?","Op welke manier is voorzien in de uitval of vertraging van een betrokken partij bij {{onderwerp}}?"],"decision":"behouden"},
  // EX-08-09: Beantwoordbaarheid: gezamenlijke informatie moet ketenprestaties zichtbaar maken; de gegevenskwaliteit blijft te beoordelen.
  {"id":"EX-08-09","variants":["Welke gezamenlijke informatie maakt de ketenprestaties voor {{onderwerp}} inzichtelijk?"],"decision":"behouden"},
  // EX-08-10: Eén onderwerp: werkzame en aan te passen afspraken vormen samen de beoordeling van dezelfde samenwerking.
  {"id":"EX-08-10","variants":["Welke samenwerkingsafspraken voor {{onderwerp}} werken in de praktijk en welke vragen aanpassing?"],"decision":"behouden","compoundResolved":true},
  // EX-09-00: Afbakening: beheerst invoeren en behoud van een in te vullen kritieke dienst zijn verbonden aspecten van dezelfde verandering.
  {"id":"EX-09-00","variants":["In hoeverre wordt de verandering rond {{onderwerp}} bij [organisatieonderdeel] in [periode] beheerst ingevoerd met behoud van [kritieke dienstverlening]?","In welke mate wordt de verandering rond {{onderwerp}} bij [organisatieonderdeel] in [periode] beheerst ingevoerd met behoud van [kritieke dienstverlening]?"],"decision":"behouden"},
  // EX-09-01: Eén onderwerp: het te verhelpen probleem en verwachte resultaten bepalen samen de bedoeling van de verandering; geen gerealiseerd effect geclaimd.
  {"id":"EX-09-01","variants":["Welk probleem moet de verandering rond {{onderwerp}} oplossen en welke resultaten worden verwacht?"],"decision":"behouden","compoundResolved":true},
  // EX-09-02: Dekking: reikwijdte en succescriteria bepalen gezamenlijk wat bij deze verandering wordt onderzocht.
  {"id":"EX-09-02","variants":["Hoe zijn reikwijdte en succescriteria voor de verandering rond {{onderwerp}} vastgesteld?","Op welke wijze zijn reikwijdte en succescriteria voor de verandering rond {{onderwerp}} vastgesteld?","Op welke manier zijn reikwijdte en succescriteria voor de verandering rond {{onderwerp}} vastgesteld?"],"decision":"behouden"},
  // EX-09-03: Dekking: mensen, processen en systemen zijn verschillende gevolgengebieden van dezelfde verandering; vraagt wat is onderzocht, niet wat vaststaat.
  {"id":"EX-09-03","variants":["Welke gevolgen van de verandering rond {{onderwerp}} zijn voor mensen, processen en systemen onderzocht?"],"decision":"behouden"},
  // EX-09-04: Beantwoordbaarheid: duidelijkheid over verantwoordelijkheden en beslismomenten kan worden vastgesteld; geen interviewopening.
  {"id":"EX-09-04","variants":["Zijn verantwoordelijkheden en beslismomenten voor de invoering van {{onderwerp}} duidelijk?"],"decision":"behouden"},
  // EX-09-05: Dekking: capaciteit en deskundigheid zijn beide voorwaarden voor uitvoerbaarheid.
  {"id":"EX-09-05","variants":["Hoe zijn benodigde capaciteit en deskundigheid voor de verandering rond {{onderwerp}} geregeld?","Op welke wijze zijn benodigde capaciteit en deskundigheid voor de verandering rond {{onderwerp}} geregeld?","Op welke manier zijn benodigde capaciteit en deskundigheid voor de verandering rond {{onderwerp}} geregeld?"],"decision":"behouden"},
  // EX-09-06: Beantwoordbaarheid: proeven of tests moeten concrete ingebruiknamebesluiten onderbouwen; hun aanwezigheid is niet automatisch voldoende bewijs.
  {"id":"EX-09-06","variants":["Welke tests of proeven onderbouwen besluiten over ingebruikname bij {{onderwerp}}?"],"decision":"behouden"},
  // EX-09-07: Dekking: afhankelijkheden en invoeringsrisico’s horen bij dezelfde beheerstaak tijdens verandering.
  {"id":"EX-09-07","variants":["Hoe worden afhankelijkheden en invoeringsrisico’s rond {{onderwerp}} beheerst?","Op welke wijze worden afhankelijkheden en invoeringsrisico’s rond {{onderwerp}} beheerst?","Op welke manier worden afhankelijkheden en invoeringsrisico’s rond {{onderwerp}} beheerst?"],"decision":"behouden"},
  // EX-09-08: Dekking: voorbereiding en ondersteuning betreffen dezelfde gebruikers bij de verandering.
  {"id":"EX-09-08","variants":["Hoe worden gebruikers voorbereid en ondersteund bij de verandering rond {{onderwerp}}?","Op welke wijze worden gebruikers voorbereid en ondersteund bij de verandering rond {{onderwerp}}?","Op welke manier worden gebruikers voorbereid en ondersteund bij de verandering rond {{onderwerp}}?"],"decision":"behouden"},
  // EX-09-09: Begrenzing: vraagt naar bewijs tijdens invoering over dienstbehoud, zonder continuïteit vooraf te garanderen.
  {"id":"EX-09-09","variants":["Wat blijkt tijdens invoering over het behoud van de kritieke dienstverlening rond {{onderwerp}}?"],"decision":"behouden"},
  // EX-09-10: Dekking: afwijkingen en leerpunten worden verbonden aan vervolgbesluiten over dezelfde invoering.
  {"id":"EX-09-10","variants":["Hoe worden afwijkingen en leerpunten bij de invoering van {{onderwerp}} verwerkt in vervolgbesluiten?","Op welke wijze worden afwijkingen en leerpunten bij de invoering van {{onderwerp}} verwerkt in vervolgbesluiten?","Op welke manier worden afwijkingen en leerpunten bij de invoering van {{onderwerp}} verwerkt in vervolgbesluiten?"],"decision":"behouden"},
  // EX-10-00: Afbakening: afgesproken maatregelen worden getoetst aan herstel van vastgestelde tekortkomingen binnen een periode; in hoeverre laat uitblijvend herstel toe.
  {"id":"EX-10-00","variants":["In hoeverre leiden de afgesproken verbetermaatregelen voor {{onderwerp}} bij [organisatieonderdeel] in [periode] tot aantoonbaar herstel van [vastgestelde tekortkomingen]?","In welke mate leiden de afgesproken verbetermaatregelen voor {{onderwerp}} bij [organisatieonderdeel] in [periode] tot aantoonbaar herstel van [vastgestelde tekortkomingen]?"],"decision":"behouden"},
  // EX-10-01: Dekking: vereist eerst een vastgelegd uitgangspunt van de verbetering; de route is alleen passend als tekortkomingen zijn vastgesteld.
  {"id":"EX-10-01","variants":["Welke tekortkomingen bij {{onderwerp}} vormen het uitgangspunt voor de verbetermaatregelen?"],"decision":"behouden"},
  // EX-10-02: Beantwoordbaarheid: onderzochte en onderbouwde oorzaken zijn nodig om maatregelen te kunnen beoordelen.
  {"id":"EX-10-02","variants":["Welke oorzaken van tekortkomingen bij {{onderwerp}} zijn onderzocht en onderbouwd?"],"decision":"behouden"},
  // EX-10-03: Neutraliteit na herstel: de aansluiting van maatregelen op oorzaken kan onvoldoende zijn; geen passende maatregel vooraf aangenomen.
  {"id":"EX-10-03","variants":["In hoeverre sluiten de maatregelen voor {{onderwerp}} aan op deze oorzaken?","In welke mate sluiten de maatregelen voor {{onderwerp}} aan op deze oorzaken?"],"decision":"behouden"},
  // EX-10-04: Dekking: verantwoordelijkheden, middelen en termijnen bepalen samen de uitvoerbaarheid van dezelfde verbetermaatregel.
  {"id":"EX-10-04","variants":["Zijn verantwoordelijkheden, middelen en termijnen voor verbetering van {{onderwerp}} vastgelegd?"],"decision":"behouden"},
  // EX-10-05: Beantwoordbaarheid: uitvoering moet aantoonbaar zijn; uitvoeren is nog geen herstel.
  {"id":"EX-10-05","variants":["Welke maatregelen voor {{onderwerp}} zijn aantoonbaar uitgevoerd?"],"decision":"behouden"},
  // EX-10-06: Dekking: afsluitcriteria begrenzen wanneer dezelfde maatregel kan worden afgesloten; de vraag verzint geen verplichte norm.
  {"id":"EX-10-06","variants":["Welke criteria worden gebruikt om een verbetermaatregel voor {{onderwerp}} af te sluiten?"],"decision":"behouden"},
  // EX-10-07: Neutraliteit na herstel: bewijs kan ook geen verbetering of verslechtering tonen; de vraag stelt vermindering niet vooraf vast.
  {"id":"EX-10-07","variants":["Wat blijkt uit het beschikbare bewijs over veranderingen in de vastgestelde tekortkomingen bij {{onderwerp}}?"],"decision":"behouden"},
  // EX-10-08: Beantwoordbaarheid: terugkerende problemen worden gevolgd na maatregelen; geen problemen is ook een mogelijke bevinding.
  {"id":"EX-10-08","variants":["Welke terugkerende problemen bij {{onderwerp}} zijn ondanks de maatregelen zichtbaar?"],"decision":"behouden"},
  // EX-10-09: Dekking: vraagt naar bijsturing bij vertraging of onvoldoende werking, zonder een specifieke ingreep voor te schrijven.
  {"id":"EX-10-09","variants":["Hoe worden vertraagde of onvoldoende werkende verbetermaatregelen voor {{onderwerp}} bijgestuurd?","Op welke wijze worden vertraagde of onvoldoende werkende verbetermaatregelen voor {{onderwerp}} bijgestuurd?","Op welke manier worden vertraagde of onvoldoende werkende verbetermaatregelen voor {{onderwerp}} bijgestuurd?"],"decision":"behouden"},
  // EX-10-10: Begrenzing na herstel: afspraken en controles zijn bedoeld voor behoud van eventueel bereikte verbetering; geen garantie van duurzame werking.
  {"id":"EX-10-10","variants":["Welke afspraken en controles zijn bedoeld om bereikte verbeteringen van {{onderwerp}} na afsluiting te behouden?"],"decision":"behouden"}
];
