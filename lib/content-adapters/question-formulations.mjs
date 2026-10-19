// Data stays in the pinned publication; this adapter does not edit source questions.
import data from 'omnibus-data:lib/question-formulations.mjs';
import practice from 'omnibus-data:lib/interview-practice-formulations.json';
import integrity from 'omnibus-data:lib/cev-active.mjs';
import {createQuestionFormulations} from '../interview-wording.mjs';
export const {questionFormulations, cycleQuestionFormulation} = createQuestionFormulations(data, practice, integrity);
