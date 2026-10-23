import load from './model-directory-resource.mjs';
import {registerCatalogueResource,catalogueReady} from './catalogue-runtime.mjs';
import {modelChoiceGuide,modelChoiceSearchText} from './content-adapters/model-choice-guide.mjs';
import {modelDisplayName} from './interview-structure.mjs';
import {modelCatalogueSelection} from './catalogue-selection.mjs';
import {mergeModelDirectory,validateModelDirectory} from './model-directory-core.mjs';

/** @type {import('./model-directory-core.mjs').ModelDirectoryEntry[]} */
let published=[];
if(load)registerCatalogueResource('model-directory',load,value=>{
  const next=validateModelDirectory(value),before=published;
  published=next;
  return ()=>{published=before;};
});
export const modelDirectoryKey=()=>load&&!catalogueReady(['models'])?'model-directory':'models';

/** Shared by the build projection and saved-model presentation.
 * @param {import('./model-library-types').LibraryModel} model
 * @returns {import('./model-directory-core.mjs').ModelDirectoryEntry} */
export function describeModel(model) {
  const selection=modelCatalogueSelection(model);
  return {id:model.id,displayOnly:true,title:modelDisplayName(model),summary:modelChoiceGuide(model).summary,
    searchText:modelChoiceSearchText(model),itemCount:model.items.length,questionCount:selection.total,
    selectedCount:selection.selected,selected:model.selected};
}
export const publishedModelDirectory=()=>published;
/** @param {import('./model-library-types').ModelLibraryState} library
 * @param {import('./model-directory-core.mjs').ModelDirectoryEntry[]} entries */
export const modelDirectory=(library,entries=published)=>mergeModelDirectory(entries,library.models.map(describeModel));
