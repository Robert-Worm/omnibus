// Reviewed editorial cautions, separate from the untouched workbook cells.
import {doraFrameworkSourceHash} from './foundations/dorafc-notes.mjs';
const cbwHash='87b21b0ce55eb0e9e18aa06716379e1f6fa350ac1756d685182c2be7920c4488';
const cbw={
 'CBW-14.2':'Bronbeperking: de tweejaarstermijn in F194 heeft geen startdatum. Stel de toepasselijke termijn en overgangsregeling afzonderlijk vast.',
 'CBW-16.1':'Bronafwijking: F204 gebruikt een onjuist startmoment voor 72 uur. De criteriumtoelichting onderscheidt de juiste meldfasen, termijnen en uitzonderingen.',
 'CBW-17.1':'Bronbeperking: F209 combineert incidentinformatie en dreigingsadvies. De criteriumtoelichting onderscheidt wanneer elke communicatiestroom nodig is.',
};
const doraFramework={
 '2.5':'Bronafwijking: de jaarlijkse review kent een micro-uitzondering. De norm onderscheidt jaarlijks en periodiek.',
 '4.4':'Primaire aanvulling: op termijn niet uitsluitend op certificaten en auditrapporten steunen. Zie de norm voor de voorwaarden en eigen auditrechten.',
 '6.3':'Primaire verduidelijking: noodwijzigingen moeten ook na invoering worden beoordeeld en goedgekeurd.',
 '9.6':'Bronafwijking: jaarlijkse continuïteitstesten betreffen alle functies. Extra scenario’s en sectorregels hebben eigen voorwaarden; de bronverwijzing naar art.24 is niet de testuitwerking.',
 '10.1':'Bronafwijking: de hoofdcel mist de voorafgaande voorwaarde over getroffen kritieke diensten. Twee losse impactdrempels zijn niet vanzelf voldoende.',
 '11.3':'Bronafwijking: dreigingsmelding is vrijwillig. Klantinformatie en incidentmeldtermijnen hebben voorwaarden en uitzonderingen; die staan bij de norm.',
 '12.2':'Bronafwijking: de primaire regel kent geen micro-uitzondering voor melding van de testuitzondering aan de ICT-risicofunctie.',
 '12.4':'Primaire afbakening: broncodeonderzoek bij externe en opensourcesoftware is waar haalbaar, geen onvoorwaardelijke plicht tot toegang tot alle broncode.',
 '15.4':'Primaire aanvulling: incidenthulp is kosteloos of vooraf geprijsd. Medewerking betreft ook de afwikkelingsautoriteit.',
 '17.6':'Bronafwijking: tijdige melding van geplande kritieke uitbesteding is iets anders dan iedere overeenkomst onmiddellijk melden.',
 '19.3':'Bronafwijking: TLPT geldt alleen na aanwijzing, met gevalideerde scope en aanpasbare frequentie. De selectielijst in de werkmap is niet volledig.',
 '20.2':'Primaire aanvulling: significant geclassificeerde kredietinstellingen gebruiken uitsluitend externe TLPT-testers.',
 '24.2':'Primaire correctie: onveilige sleutels vervangen, niet hergebruiken na herstel. Certificaten moeten ook tijdig worden vernieuwd.',
 '25.1':'Aanvullende afbakening: de primaire regel omvat ook systeemidentiteiten; de hoofdcel beschrijft medewerkers.',
 '25.4':'Primaire aanvulling: sterke authenticatie betreft ook publiek toegankelijke ICT-middelen, die in de hoofdcel ontbreken.',
};
export function sourceCellNotice(reference={}){
 if(reference.sourceHash===doraFrameworkSourceHash){
  return doraFramework[reference.sourceControlId?.replace(/^DORAFC-/, '')]||'';
 }
 return reference.sourceHash===cbwHash ? cbw[reference.sourceControlId]||'' : '';
}
