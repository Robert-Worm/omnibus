// The pinned database owns content; the shared module owns checked presentation logic.
import data from 'omnibus-data:lib/model-choice-guide.mjs';
import {createModelChoicePresentation} from '../model-presentation.mjs';
export {modelAttribution} from '../model-presentation.mjs';
export const {modelChoiceGuide, modelChoiceSearchText} = createModelChoicePresentation(data);
