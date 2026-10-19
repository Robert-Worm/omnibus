import data from 'omnibus-data:lib/research-models.mjs';
import {createQuestionWorkbenchPresentation} from '../model-presentation.mjs';
export const {usesQuestionWorkbench, questionWorkbenchPresentation} = createQuestionWorkbenchPresentation(data);
