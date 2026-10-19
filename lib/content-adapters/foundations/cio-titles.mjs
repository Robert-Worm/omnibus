// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/cio-titles.mjs";
// Reader-facing labels only. Apply AFTER source composition so that criterion text,
// conditions, testing instructions, IDs and saved user snapshots are not rewritten.
export const cioGroupTitles = data.cioGroupTitles;

export const cioCriterionTitles = data.cioCriterionTitles;

export const cioGroupTitle = (id, original) => cioGroupTitles[id] || original;
export const cioCriterionTitle = (id, original) => cioCriterionTitles[id] || original;
