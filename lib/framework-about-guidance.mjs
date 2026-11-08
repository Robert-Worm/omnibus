import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';

// Reviewed About-page guidance for the 2026-11-04 publication. Exact context
// fingerprints prevent applying explanations to revised source scope or limits.
// This is presentation, never source replacement, admission or legal approval.
const guidance=[
 {
  "sourceId": "DORA-2022-2554",
  "contextHash": "10c7190702d1776eed0d850e34fd83dc31b1e1c60efa4b58328271322ffa6ae4",
  "application": "Onderzoek ICT-risicobeheer, incidentbehandeling, weerbaarheidstests of afspraken met ICT-dienstverleners. Kies brede vragen voor de samenhang en specifieke vragen voor een afgebakend onderwerp, en verbind de gekozen toetspunten aan passende bewijsstukken.",
  "audience": [
   "Voor onderzoek bij financiële entiteiten en andere geadresseerde partijen binnen de doelgroep, uitsluitingen en voorwaarden van artikel 2.",
   "Bepaal voor ICT-risicobeheer of de gewone route of de vereenvoudigde route van artikel 16 geldt. Incidenten, tests en ICT-dienstverlening hebben daarnaast hun eigen toepassingsvoorwaarden."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "De vraagkoppelingen tonen welke gekozen toetspunten bijdragen aan een onderzoeksvraag. Een beperkte selectie beantwoordt niet vanzelf de hele vraag.",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-2024-1774",
  "contextHash": "ea2071c9061c99f5237d5f6a44c3f037fedb2124380494513b8fe7694ba38075",
  "application": "Onderzoek hoe de geselecteerde ICT-beheersing is ingericht en in concrete gevallen wordt toegepast. Volg per beheersproces de samenhang tussen beleid, verantwoordelijkheden en uitvoering binnen het toepasselijke raamwerk.",
  "audience": [
   "Voor auditors en verantwoordelijken voor ICT-risicobeheersing bij financiële entiteiten.",
   "Bepaal of het gewone raamwerk van titel II of het vereenvoudigde raamwerk van titel III en DORA-artikel 16 geldt. De status van micro-onderneming geeft op zichzelf geen toegang tot titel III. Sectorvoorwaarden en evenredigheid blijven per toetspunt relevant."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-2024-1772",
  "contextHash": "9624ed4f6ba8c22242f5b7936920fd2996b08e2cd3aa0b9523d69f5d921669cc",
  "application": "Volg concrete incidenten en cyberdreigingen van signalering tot beoordeling en herbeoordeling, met de relevante criteria en drempels. Onderzoek bij autoriteiten afzonderlijk de grensoverschrijdende beoordeling en informatiebehandeling.",
  "audience": [
   "Voor auditors, financiële entiteiten en betrokken autoriteiten, ieder binnen de eigen rol.",
   "De criteria en drempels werken DORA-artikel 18 uit. De beoordeling door een entiteit en de institutionele taken hebben verschillende doelgroepen; bepaal hun toepasselijkheid afzonderlijk vanuit DORA."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-2025-301",
  "contextHash": "715cfc4b067b48f2dcdc1e1d3ca9b8af9a35d24ce5bf6a6ae41901316908ab48",
  "application": "Onderzoek meldinhoud en termijnen vanaf de eerste kennisgeving tot het eindverslag. Verbind algemene en fasespecifieke informatie aan de classificatie en relevante tijdstippen; onderzoek een gekozen vrijwillige dreigingsmelding afzonderlijk.",
  "audience": [
   "Voor auditors, financiële entiteiten en betrokken autoriteiten binnen hun eigen taken in de DORA-artikel 19-meldroute.",
   "De incidentrapportage en de vrijwillige kennisgeving van significante cyberdreigingen zijn afzonderlijke routes. De bevoegdheid om kalenderruimte uit te sluiten behoort aan de bevoegde autoriteit."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-2025-302",
  "contextHash": "e24e6265912f4f34b2a0af2f4c08eb643fdf8bf9fe8d67b0b5bce3a4a4356a14",
  "application": "Volg een incidentrapportage van de interne gegevens en voorbereiding tot het ingediende formulier en de vervolgupdates. Onderzoek de samenhang tussen velden en de voorwaardelijke informatie, of de uitvoering van een gekozen vrijwillige dreigingsmelding.",
  "audience": [
   "Voor auditors, financiële entiteiten en betrokken autoriteiten binnen hun eigen rol bij incidentrapportage.",
   "Bepaal vooraf de entiteit, bevoegde autoriteit en incidentclassificatie. Ernstige ICT-incidenten vallen binnen de toepasselijke DORA-artikel 19-meldroute; de kennisgeving van significante cyberdreigingen is een afzonderlijke, vrijwillige route."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": "De toetspunten groeperen samenhangende inhoud. De veldmatrix bewaart per rij alle fasen, voorwaarden, categorieën en exacte passages."
 },
 {
  "sourceId": "DORA-2024-1773",
  "contextHash": "883abba29d86c0936caaa2e80d34c7ea0cb7c946283d2b7b681a129d6c89cf25",
  "application": "Onderzoek het beleid voor ICT-diensten die kritieke of belangrijke functies ondersteunen en de toepassing daarvan in geselecteerde contractdossiers. Volg de beheersing van leverancierskeuze en contractering tot monitoring en beëindiging.",
  "audience": [
   "Voor auditors en betrokken financiële entiteiten of institutionele actoren, ieder binnen de eigen rol bij het beleid voor ICT-diensten die kritieke of belangrijke functies ondersteunen.",
   "Bepaal de beleidsgrondslag in DORA-artikel 28, lid 2, en de concrete entiteits- of groepsscope. Artikel 1 vraagt een evenredige uitwerking naar omvang, risicoprofiel, aard, schaal en complexiteit. Neem lokale voorwaarden niet over uit andere artikelen."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-2025-532",
  "contextHash": "adf8faca1e3383137d1f6a77b625f5c57263d482dd30e7b99d9756ad4a83326c",
  "application": "Onderzoek in geselecteerde contractdossiers het beleid en de toepassing daarvan bij onderaanneming. Breng de keten en verantwoordelijkheden in beeld en volg risicobeoordeling, contractuele bescherming, herbeoordeling, wijzigingen en beëindigingsrechten.",
  "audience": [
   "Voor auditors, verantwoordelijken voor ICT-risico, inkoop en contractbeheer en de specifiek aangewezen moederonderneming binnen een toepasselijke groep. Financiële entiteiten en institutionele actoren houden hun eigen rol.",
   "Het betreft onderaanneming van ICT-diensten die kritieke of belangrijke functies ondersteunen, en materiële onderdelen waar de bepaling die noemt. Bepaal de concrete entiteits- en groepsscope; artikel 2 heeft een afzonderlijke voorwaardelijke groepsscope.",
   "Er geldt geen algemene intragroepvrijstelling. De beleidsvrijstelling uit 2024/1773 beperkt deze RTS niet."
  ],
  "qualityTitle": "Kritieke of belangrijke functies",
  "qualityNotes": "DORA bepaalt of een functie kritiek of belangrijk is aan de hand van wezenlijke gevolgen voor financiële prestaties, soliditeit of continuïteit, of voor blijvende naleving van vergunning- en financiële verplichtingen. Gebruik deze definitie bij de concrete afbakening.",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-2024-2956",
  "contextHash": "45c2be36b23476ba8b1abce59fcda55643ef748828d23bfd16b7fc85f500e42e",
  "application": "Onderzoek de inrichting en aanwezige vastlegging van het ICT-informatieregister. Vergelijk het register met contracten, functies, diensten en betrokken organisaties en beoordeel de volledigheid en relaties tussen de tabellen.",
  "audience": [
   "Voor auditors, financiële entiteiten die het register bijhouden en moederondernemingen, ieder binnen de eigen toepasselijke rol.",
   "Bepaal het toepasselijke entiteits-, gesubconsolideerde of geconsolideerde niveau. Stel de groepsscope en de lokale voorwaarden per model en rij afzonderlijk vast."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": "De toetspunten groeperen samenhangende registervereisten. De volledige veld- en definitiematrix bewaart lokale instructies, voorwaarden, codes, modelrelaties en de identiteit van de oorspronkelijke tekst en correcties."
 },
 {
  "sourceId": "DORA-2025-1190",
  "contextHash": "1a5c20213029b8a3d267d5f970fbcbb720d163bde24b93dd6dec1205ee1587ca",
  "application": "Onderzoek hoe de gekozen TLPT-taken zijn ingericht en in beschikbare concrete gevallen zijn uitgevoerd. Volg selectie, veilige voorbereiding, uitvoering en afsluiting van de test, met aandacht voor de betrokken rollen en de opvolging van bevindingen en herstelmaatregelen.",
  "audience": [
   "Voor financiële entiteiten, control teams, testers, dreigingsinformatieaanbieders, blue teams en autoriteiten, ieder voor de eigen toepasselijke TLPT-taak.",
   "TLPT is niet algemeen verplicht voor iedere financiële entiteit. Bepaal voor het onderzoek de identificatie, kennisgeving, relevante DORA-uitsluitingen en toepasselijke actor en taak.",
   "Bij gezamenlijk of gepoold testen is de TLPT-autoriteit in artikelen 9–15 in beginsel de leidende autoriteit, tenzij een bepaling anders voorschrijft."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "NOREA-DORA-3-2",
  "contextHash": "2f36585668fe72c9c284df509aa44c70e6d42a6348774eb47e7ebbb2ec364575",
  "application": "Kies een onderwerp van digitale operationele weerbaarheid en verbind passende controls aan brede of specifieke onderzoeksvragen. Leg de praktische NOREA-uitwerking naast de genoemde DORA-, RTS- of ITS-bepalingen en bepaal per gekozen control de bewijsstukken voor de onderzochte fase.",
  "audience": [
   "Voor auditors en betrokken rollen bij een afzonderlijk afgebakende financiële instelling.",
   "Bepaal de organisatie, sector, functies, onderzoeksperiode en onderzoeksfasen. Het kader ondersteunt zowel een brede onderzoeksopzet als onderzoek naar een specifiek onderwerp."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "Selectie bevestigt geen wettelijke toepasselijkheid of volledige DORA-conformiteit. De praktische NOREA-uitwerking en de wetgeving houden hun eigen betekenis.",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-2024-1502",
  "contextHash": "584fc99ece6b1f19dd1aca50ef04e43b4757c1f687e1050668f4411d22c141be",
  "application": "Onderzoek de inrichting en concrete toepassing van de selectie-, beoordelings- en aanwijzingsroute voor kritieke ICT-aanbieders. Beoordeel de gebruikte kwantitatieve indicatoren, kwalitatieve afhankelijkheden en informatiebasis vanuit de taak van de betrokken toezichthouder.",
  "audience": [
   "Voor onderzoek naar de beoordeling en aanwijzing van kritieke ICT-aanbieders door de Europese toezichthoudende autoriteiten (ETA’s) en de specifieke taak van de aangestelde lead overseer. De ETA’s beoordelen en wijzen aan via het Gemengd Comité en op aanbeveling van het toezichtforum.",
   "Financiële entiteiten, aanbieders, kritieke aanbieders en onderaannemers zijn onderscheiden beoordelingsobjecten. Bij een aanbieder die tot een groep behoort, zien de criteria op de ICT-diensten van de groep als geheel, overeenkomstig DORA-artikel 31, lid 3.",
   "Bepaal voor de casus de actor, individuele of groepsdienstscope en toepasselijke aanwijzingsuitsluitingen."
  ],
  "qualityTitle": "Rollen en aanwijzingsuitsluitingen",
  "qualityNotes": "Bevoegde autoriteiten zijn hier actor van een bestaande systeemrelevantieclassificatie; de bron legt hun geen zelfstandige classificatieplicht op. Aanvragers en gezamenlijke onderzoeksteams hebben in deze zes bronpagina’s geen zelfstandige toegewezen taak.\nDe aanwijzingsuitsluitingen betreffen financiële entiteiten die ICT-diensten aan andere financiële entiteiten leveren; aanbieders onder oversightkaders ter ondersteuning van taken uit VWEU-artikel 127, lid 2; intragroepaanbieders; en aanbieders die uitsluitend in één lidstaat diensten verlenen aan financiële entiteiten die alleen in die lidstaat actief zijn. Beoordeel deze uitsluitingen met hun precies gebonden voorwaarden.\nOnzekere toepasselijkheid blijft open; context voegt geen verplichting uit 2024/1502 toe. Subcriterium 1.4 wordt toegepast door de specifiek aangestelde lead overseer.",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-OVERSIGHT-31-44",
  "contextHash": "829ccce47b4c269d384aef54adc4ad79cbc028f18cd020f34ee818b823126e68",
  "application": "Onderzoek de toegewezen toezichtstaken, besluitvorming, informatieverzameling en onderzoekswaarborgen. Volg relevante aanbevelingen tot hun behandeling en houd taken van toezichthouders, ICT-aanbieders en financiële entiteiten afzonderlijk herkenbaar.",
  "audience": [
   "Primair voor auditors bij of voor Europese en nationale toezichthouders. Taken en bevoegdheden van ETA’s, lead overseers, het oversightforum en andere toezichthouders zijn aan de betreffende instantie gebonden.",
   "Onderzoek verplichtingen en rechten van ICT-aanbieders afzonderlijk van toezichtbevoegdheden. Voor financiële entiteiten blijven artikel 31, lid 12, en de eigen risicotaak uit artikel 42, lid 3, afzonderlijke routes."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "De bouwstenen ondersteunen onderzoek naar de gekozen taken; zij geven geen zelfstandig oordeel over naleving van alle DORA-verplichtingen.\nElke onderzoeksroute heeft een centrale vraag en brede en specifieke deelvragen met verwijzingen naar concrete toetspunten. Het kiezen van een brede vraag selecteert geen aanvullende bouwstenen en bewijst geen volledige dekking.\nOpzet en bestaan hebben afzonderlijke toetsvoorstellen. Bewijssoorten zijn voorbeelden tenzij de bron het bewijs voorschrijft. Een interview bewijst op zichzelf geen invoering of werking gedurende een periode.",
  "sourceExplanationExtra": "De verwijzing naar de financiële-entiteitsroutes is als afzonderlijke onderzoeksverbinding voorgesteld; zij dupliceert of wijzigt het entiteitenpakket niet stilzwijgend."
 },
 {
  "sourceId": "DORA-OVERSIGHT-FEES-1505",
  "contextHash": "653ef1dc0f24dea5c5d0b6b73bb1b49dcdf3dc8de1155aad53adab6a14e548c6",
  "application": "Onderzoek de raming, berekening en afhandeling van toezichtvergoedingen voor het gekozen tijdvak. Volg vanuit de eigen rol de gebruikte gegevens, vaststelling, aanlevering en betaling.",
  "audience": [
   "Voor ETA’s, lead overseers en kritieke ICT-dienstverleners binnen hun eigen rol bij toezichtvergoedingen. Vrijwillige aanvragers van kritieke status zijn uitsluitend bij het aanvraagpunt betrokken."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-OVERSIGHT-295",
  "contextHash": "3f89993c2b03593c310da7471b120c017d6389954a23677d7b02ffc69037e158",
  "application": "Onderzoek geselecteerde aanvraag- en informatieprocessen of eigen toezichtstaken rond gevolgen en informatie-uitwisseling. Volg een concreet verzoek of toezichtsonderdeel van aanleiding tot levering, beoordeling en opvolging.",
  "audience": [
   "Voor vrijwillige aanvragers, aangewezen kritieke ICT-aanbieders, bevoegde autoriteiten en lead overseers binnen hun eigen aanvraag-, informatie- of toezichtstaak.",
   "De toepasselijke verplichting hangt af van de actor, het concrete verzoek of de toezichtshandeling. Het kader is geen algemene controlelijst voor iedere financiële entiteit."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-JOINT-TEAMS-420",
  "contextHash": "c668c453c7916f28b2727c80f10a55a6e08c281a77e29aa41cc25fb2679710a9",
  "application": "Onderzoek de taakverdeling, samenstelling, deskundigheid en inzet van gezamenlijke onderzoeksteams. Volg de werkafspraken tussen het team, de lead overseer en de deelnemende autoriteiten voor de gekozen toezichtswerkzaamheden.",
  "audience": [
   "Voor lead overseers, aanwijzende autoriteiten en leden van gezamenlijke onderzoeksteams bij hun eigen taken en werkafspraken.",
   "De vereisten betreffen de toezichtorganisatie; zij vormen geen algemene normenlijst voor financiële entiteiten of ICT-aanbieders."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-COOPERATION-GL36",
  "contextHash": "aa015004f4b516098e4b15edfad8c60e0f302fd2a1f2eb9d30212157b45a44a8",
  "application": "Onderzoek een concrete samenwerkings- of informatieroute tussen toezichthouders. Volg werkafspraken, informatieoverdracht, informatiebescherming en opvolging vanuit de eigen taken van de verzender en ontvanger.",
  "audience": [
   "Voor ETA’s, lead overseers en bevoegde autoriteiten, ieder voor hun eigen taak bij toezichtssamenwerking.",
   "Baken de autoriteit, eigen taak, betrokken aanbieder, handelingen, peildatum en concrete gevallen af. De richtsnoeren zijn geen algemene compliancechecklist voor financiële entiteiten of ICT-aanbieders."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-INCIDENT-COSTS-GL34",
  "contextHash": "2fa5cdec347027ea92203e2f2412264bc21987775f0b6641c7068db945ab0817",
  "application": "Onderzoek hoe incidentkosten, verliezen, terugvorderingen en correcties voor het gekozen tijdvak zijn onderbouwd. Volg de gevraagde modelaanlevering of de eigen toezichtshandelingen en beoordeel bedragen, categorieën en dubbeltellingen.",
  "audience": [
   "Voor onderzoek bij financiële entiteiten waarop de gevraagde aanlevering van toepassing is, met uitzondering van micro-ondernemingen, en bij bevoegde autoriteiten voor hun eigen taken.",
   "De raming wordt op verzoek van de bevoegde autoriteit aangeleverd. Bepaal het relevante verzoek, tijdvak en de incidentpopulatie."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "Een brede onderzoeksvraag vult ontbrekende dekking van handelingen niet aan.",
  "sourceExplanationExtra": ""
 },
 {
  "sourceId": "DORA-SECTOR-2022-2556",
  "contextHash": "333a9ec1aea4ad3b4378561c223e74ab0dde5c3c7b9f7fe77f11f83ce976dc8d",
  "application": "Kies de relevante sector en taakroute en verbind de wijzigingsbepalingen aan de toepasselijke nationale maatstaf. Onderzoek vervolgens de gekozen instellingsinrichting, planinhoud, informatieverschaffing of toezichtshandeling afzonderlijk.",
  "audience": [
   "Voor financiële instellingen en betrokken autoriteiten binnen de gekozen sector- en taakroute. De lidstaten zijn de geadresseerden van de wijzigingsrichtlijn.",
   "Bepaal vóór juridische toepassing de concrete actor, relevante sectorversie, nationale omzetting, peildatum en uitzonderingen. Houd instellings-, aanvraag-, informatieverstrekkings- en autoriteitsroutes afzonderlijk."
  ],
  "qualityTitle": "Gebruik van de onderzoeksvoorstellen",
  "qualityNotes": "",
  "sourceExplanationExtra": ""
 }
];

/** Presentation only: a changed context uses the original complete explanation. */
export function frameworkAboutGuidance(sourceId,context){
 const row=guidance.find(item=>item.sourceId===sourceId);
 if(!row)return undefined;
 const basis=JSON.stringify([context.audience,context.applicability,context.use_cases,context.intro,context.source_explanation,context.limitations.map(item=>[item.title,item.text])]);
 if(bytesToHex(sha256(new TextEncoder().encode(basis)))!==row.contextHash)return undefined;
 return {application:row.application,audience:row.audience,qualityTitle:row.qualityTitle,qualityNotes:row.qualityNotes,sourceExplanationExtra:row.sourceExplanationExtra};
}
