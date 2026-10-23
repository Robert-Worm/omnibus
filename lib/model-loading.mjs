import ids from './model-resource-routing.mjs';

// Unknown IDs may be user-created models. They still need shared validation and
// wording data, but must never cause every published model to be downloaded.
export function modelContentKeys(requested) {
  if(!ids)return ['models'];
  const known=new Set(ids);
  return ['models:shared',...[...new Set(requested)].filter(id=>known.has(id)).map(id=>'models:item:'+id)];
}
export function projectModelIds(value) {
  return [...new Set([
    ...(value?.modelLibrary?.models??[]).map(model=>model?.id),
    ...(value?.view?.openModelIds??[]),
    ...(value?.view?.page==='model-workspace'?[value?.view?.activeModel]:[]),
    ...((value?.draft??value)?.investigation?.materials??[]).filter(m=>m.kind==='model-question').map(m=>m.originKey?.split(':')[0]),
  ].filter(id=>typeof id==='string'&&id))];
}
