import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';

// Delivery partition only. Every byte is from an already verified publication;
// the original resources remain available to agent/offline readers.
export function projectModelDelivery(content,readResource) {
  const library='lib/model-library.mjs',keys=content.registrations[library]??[];
  if(!keys.length)return null;
  if(keys.some(key=>!key.startsWith('models:'))||!Array.isArray(content.modules[library]?.models)||content.modules[library].models.length)
    throw Error('Unsupported model delivery boundary.');
  const full=structuredClone(content.modules[library]),shared=[];
  for(const key of keys){
    const edits=readResource(content.refs[key]);
    applyCatalogueEdits(full,edits);
    for(const edit of edits){
      if(edit.path[0]!=='models')shared.push(edit);
      else if(edit.path.length!==1||!Array.isArray(edit.value))throw Error('Unsupported model delivery path.');
    }
  }
  const ids=full.models.map(model=>model?.id);
  if(ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]+$/.test(id))||new Set(ids).size!==ids.length)
    throw Error('Invalid model delivery identities.');
  const registrations={};
  for(const [id,originalKeys] of Object.entries(content.registrations)){
    registrations[id]=originalKeys.map(key=>({key:key.startsWith('models:')?'models:shared:'+key:key,ref:content.refs[key]}));
  }
  registrations[library]=[
    ...(shared.length?[{key:'models:shared:library',edits:shared}]:[]),
    ...full.models.map(model=>({key:'models:item:'+model.id,edits:[{path:['models'],value:[model]}]})),
  ];
  // Fail closed if a new publication layout would lose or change any field.
  const restored=structuredClone(content.modules[library]);
  for(const entry of registrations[library])applyCatalogueEdits(restored,entry.edits);
  if(JSON.stringify(restored)!==JSON.stringify(full))throw Error('Model delivery round-trip changed content.');
  return {ids,registrations};
}
