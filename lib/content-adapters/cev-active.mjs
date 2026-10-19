// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/cev-active.mjs";
export const {activeIntegrityDimensions,prePracticalCevQuestions}=data;
export function activeIntegrityModel(reviewed=true){return structuredClone({items:[],...data[reviewed?"reviewed":"unreviewed"]});}
export default data;
