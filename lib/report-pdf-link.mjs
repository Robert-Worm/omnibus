// Integration-only asset location. Do not rewrite the sealed report metadata.
export function reportPdfLink(report,page){
 if(report.id==='CIBGBIO24')return `./bronnen/CIBGBIO24.pdf#page=${page}`;
 const path=report.id==='ERP25'?'../../2025-10-02_de-inrichting-van-regie-op-erp-systemen.pdf':report.id==='BEGVOORB25'?'../../2025-10-01_beheeronderzoek-begrotingsvoorbereiding.pdf':report.id==='HVP25'?'../../2025-07-21_onderzoek-naar-de-uitvoering-van-het-nederlandse-hvp.pdf':report.id==='BSA2324'?'../../2025-07-17_onderzoek-bsa-contractvoorwaarden-2023-2024.pdf':report.id==='F35V25'?'../../2025-07-01_accountantsrapport-bij-de-25e-voortgangsrapportage-groot-project-verwerving-f-35.pdf':report.localPdf;
 return path?`${path}#page=${page}`:null;
}
