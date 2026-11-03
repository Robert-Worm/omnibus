// Shared by the runtime projection and admission checks. A framework may contain
// multiple source documents; point interviews follow their primary source.
export function topicalPointDocument(packet, point) {
 const primary=point.source_links?.find(link=>link.contribution==='PRIMARY');
 const record=packet.bank.records.find(row=>row.id===primary?.record_id);
 const page=record?.source_spans?.[0]?.page;
 return packet.documents.find(document=>{
  const identity=packet.manifest.documents.find(row=>row.id===document.packageDocumentId);
  return identity && page>=identity.first_package_page && page<=identity.last_package_page;
 }) || packet.documents[0];
}

/** Missing format is the original PDF-only package contract. */
export function topicalSourceFormat(document) {
 if(document.format==='workbook-cells')return {notice:'Werkboek: tekstprojectie per rij/cel',pageLabel:'tekstdeel',locationLabel:'tekstdeel'};
 if(document.format && document.format!=='pdf')return {notice:'Brontekst: tekstweergave',pageLabel:'tekstdeel',locationLabel:'tekstdeel'};
 return {notice:'fysieke PDF-pagina’s',pageLabel:'p.',locationLabel:'PDF-pagina'};
}

export function topicalSpanLocation(documents,span){
 const d=documents.find(d=>span.page>=d.first_package_page&&span.page<=d.last_package_page);
 if(!d)throw Error('Bronpagina valt buiten de vastgelegde documenten.');
 const location=d.format==='workbook-cells'&&span.originalCell?.id
  ?`cel ${span.originalCell.id}`
  :`${topicalSourceFormat(d).locationLabel} ${span.page-d.first_package_page+1}`;
 return `${d.original_path?.split(/[\\/]/).pop()||d.file||d.id} · ${location}`;
}
