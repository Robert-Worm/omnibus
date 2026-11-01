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
