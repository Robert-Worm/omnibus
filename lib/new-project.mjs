import {initialDraft} from './framework-model.mjs';
import {emptyInvestigation} from './investigation.mjs';
import {initialModelLibrary} from './model-library.mjs';
import {makeProject} from './project-session.mjs';

// Construct from the catalogue, never from the preceding project's selections or edits.
export function newProject(framework) {
  return makeProject({...initialDraft(framework),title:'Mijn referentiekader',included:[],
    research:{questions:[],links:[]},investigation:emptyInvestigation()},
    structuredClone(initialModelLibrary()),{openIds:[],activeId:null},{page:'entry',researchRoute:''});
}
export {clearProjectBrowsePreferences} from './browse-reset.mjs';
