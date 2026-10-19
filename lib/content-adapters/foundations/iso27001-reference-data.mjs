// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/foundations/iso27001-reference-data.mjs";
export const ismsAmendment=data.ismsAmendment;
export const ismsAdditionalReferences=r=>['01','02'].includes(r.code)?[{...ismsAmendment,pages:[5],section:`§ ${r.code==='01'?'4.1':'4.2, toegevoegde noot'} · gedrukt p. 1 · PDF p. 5`}]:[];
