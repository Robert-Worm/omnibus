import {cioPoints} from './cio-law-data.mjs';
import {wwkePointMap} from './wwke-law-data.mjs';
import {topicalPackage} from './topical-content.mjs';

// Builder IDs belong to selected materials; collection viewers address their
// original source rows. Resolve identity, never guess from a label or title.
export function buildingBlockViewer(draft,id,reportCatalogue) {
 const material=draft.investigation?.materials?.find(m=>m.id===id);
 const pointId=material?.sourcePointId;
 if(material?.topicalTrace&&topicalPackage(material.foundationId)?.catalogue.points.some(p=>p.id===pointId))return {kind:'topical',sourceId:material.foundationId,pointId};
 if(pointId&&wwkePointMap.has(pointId)&&material?.lawTrace)return {kind:'wwke',pointId};
 if(pointId&&cioPoints.some(p=>p.id===pointId))return {kind:'cio',pointId};
 const point=reportCatalogue.points.find(p=>p.id===pointId);
 const block=reportCatalogue.blocks.find(b=>b.id===(point?.legacy_line_id||material?.originalLineId||id));
 if(block)return {kind:'report',id:block.id,pointId:point?.id};
 // Own materials and model questions have no law/report criterion viewer.
 return {kind:'material',id};
}
