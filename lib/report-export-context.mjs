// Presentation adapter only: the sealed BEGVOORB25 package stores its report-level
// scope under `scope`, while earlier packages also expose `exportContext`.
// Never rewrite the frozen report, evidence, or item-level limitations.
export function reportExportContext(report){
 return report.exportContext || (report.id==='BEGVOORB25'?report.scope:'') || '';
}
