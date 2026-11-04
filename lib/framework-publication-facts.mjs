// Presentation metadata checked against the original publications already in
// the viewer (title page and final provision). These dates do not establish
// current legal status, change the selected edition or confirm applicability.
const parliament='Europees Parlement en de Raad van de Europese Unie';
const commission='Europese Commissie';
const esas='EBA, EIOPA en ESMA (gezamenlijke Europese toezichthouders)';
const regulation=(publication,adopted,published,effective,article,issuer=commission,application='')=>({
 issuer,publication,adopted,published,effective,dateLabel:'Gepubliceerd op',
 entryNote:`Artikel ${article} van de oorspronkelijke publicatie.`,application,
});
const dora=regulation('Publicatieblad L 333, Verordening (EU) 2022/2554','14 december 2022','27 december 2022','16 januari 2023','64',parliament,'Van toepassing vanaf 17 januari 2025 (artikel 64).');
export const frameworkPublicationFacts={
 'DORA-2022-2554':dora,
 'DORA-OVERSIGHT-31-44':dora,
 'DORA-2024-1774':regulation('Publicatieblad L, 2024/1774','13 maart 2024','25 juni 2024','15 juli 2024','42'),
 'DORA-2024-1772':regulation('Publicatieblad L, 2024/1772','13 maart 2024','25 juni 2024','15 juli 2024','13'),
 'DORA-2024-1773':regulation('Publicatieblad L, 2024/1773','13 maart 2024','25 juni 2024','15 juli 2024','11'),
 'DORA-2025-301':regulation('Publicatieblad L, 2025/301','23 oktober 2024','20 februari 2025','12 maart 2025','7'),
 'DORA-2025-302':regulation('Publicatieblad L, 2025/302','23 oktober 2024','20 februari 2025','12 maart 2025','9'),
 'DORA-2025-532':regulation('Publicatieblad L, 2025/532','24 maart 2025','2 juli 2025','22 juli 2025','7'),
 'DORA-2024-2956':regulation('Publicatieblad L, 2024/2956','29 november 2024','2 december 2024','22 december 2024','7'),
 'DORA-2025-1190':regulation('Publicatieblad L, 2025/1190','13 februari 2025','18 juni 2025','8 juli 2025','17'),
 'DORA-2024-1502':regulation('Publicatieblad L, 2024/1502','22 februari 2024','30 mei 2024','19 juni 2024','7',commission,'Subcriterium 1.4 wordt vanaf 16 januari 2025 toegepast; zie artikel 7.'),
 'DORA-OVERSIGHT-FEES-1505':regulation('Publicatieblad L, 2024/1505','22 februari 2024','30 mei 2024','19 juni 2024','7'),
 'DORA-OVERSIGHT-295':regulation('Publicatieblad L, 2025/295','24 oktober 2024','13 februari 2025','5 maart 2025','7'),
 'DORA-JOINT-TEAMS-420':regulation('Publicatieblad L, 2025/420','16 december 2024','24 maart 2025','13 april 2025','6'),
 'DORA-SECTOR-2022-2556':regulation('Publicatieblad L 333, Richtlijn (EU) 2022/2556','14 december 2022','27 december 2022','16 januari 2023','10',parliament,'Nationale omzetting uiterlijk op 17 januari 2025 en toepassing vanaf die datum (artikel 9). Controleer de relevante nationale wetgeving.'),
 'DORA-COOPERATION-GL36':{
  issuer:esas,publication:'JC/GL/2024/36',dateLabel:'Datum op de richtsnoeren',published:'6 november 2024',
  application:'Van toepassing vanaf 17 januari 2025 (deel 5). Dit is geen inwerkingtredingsdatum van een verordening.',
 },
 'DORA-INCIDENT-COSTS-GL34':{
  issuer:esas,publication:'JC 2024 34',dateLabel:'Datum op de opgenomen Nederlandse tekst',published:'5 juni 2024',
  application:'De opgenomen Nederlandse tekst bevat nog een voorwaardelijke toepassingsdatum. Het bronpakket vermeldt 19 mei 2025; zie de afzonderlijke bronvergelijking en open punten.',
 },
 'NOREA-DORA-3-2':{
  issuer:'NOREA, Taskforce DORA',publication:'DORA in Control, gids en werkboek v3.2',
  dateLabel:'Uitgavejaar volgens de gids',published:'2025',
  application:'Praktische handreiking; geen wettelijke inwerkingtreding. De precieze publicatiedag van deze uitgave is niet vastgelegd.',
 },
};

/** @param {string} id */
export function frameworkPublication(id){
 return Object.hasOwn(frameworkPublicationFacts,id)?frameworkPublicationFacts[id]:undefined;
}
