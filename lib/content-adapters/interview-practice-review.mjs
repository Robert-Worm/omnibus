import data from 'omnibus-data:lib/interview-practice-review.mjs';
import previous from 'omnibus-data:lib/interview-practice-previous.json';
import {createPracticeQuestionRevision} from '../interview-wording.mjs';
export const {practiceQuestionRevision} = createPracticeQuestionRevision(data, previous);
