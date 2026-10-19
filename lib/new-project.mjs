import {initialDraft} from './framework-model.mjs';
import {emptyInvestigation} from './investigation.mjs';
import {initialModelLibrary} from './model-library.mjs';
import {makeProject} from './project-session.mjs';

// Construct from the catalogue, never from the preceding project's selections or edits.
export function newProject(framework) {
  return makeProject({...initialDraft(framework),title:'Mijn auditkader',included:[],
    research:{questions:[],links:[]},investigation:emptyInvestigation()},
    structuredClone(initialModelLibrary()),{openIds:[],activeId:null},{page:'entry',researchRoute:''});
}
export function clearProjectBrowsePreferences(storage) {
  const keys=[];
  for(let i=0;i<storage.length;i++) {
    const key=storage.key(i);
    if(key==='rijksmap-view-theme-catalogue' || key==='rijksmap-view-report-catalogue' || key?.startsWith('rijksmap-view-matrix-'))keys.push(key);
  }
  for(const key of keys)storage.removeItem(key);
}
