// Grondslag van een uitgewerkt kader (#305). Een Europese verordening, gedelegeerde of
// uitvoeringsverordening (RTS, ITS) of richtlijn is wettelijk (W), zoals bij andere wetten in de
// export. Dat blijkt uit het officiële publicatieadres, niet uit een inschatting. Een
// beroepshandreiking als NOREA is een afgeleide toetsuitwerking (A); richtsnoeren en
// beroepsnormen houden N voor het primaire toetspunt.
const EU_WET=/^https:\/\/(eur-lex\.europa\.eu\/eli\/(reg|reg_del|reg_impl|dir)\/|publications\.europa\.eu\/resource\/celex\/3\d{4}[RL])/;
export function topicalBasis(sourceUrl,contribution){
 if(EU_WET.test(sourceUrl||''))return 'W';
 if(/^https:\/\/(www\.)?norea\.nl\//.test(sourceUrl||''))return 'A';
 return contribution==='PRIMARY'?'N':'A';
}
