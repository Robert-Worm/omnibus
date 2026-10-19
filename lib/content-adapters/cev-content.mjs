// Runtime logic retained from the reviewed local application; content comes from the pinned database.
import data from "omnibus-data:lib/cev-content.mjs";
import { kapteinQuestions } from "@/lib/kaptein-questions.mjs";

export const cevMetadata = data.cevMetadata;

// Authored operationalisation of the eight CEV dimensions. These are NOT survey items.
const indicatorContent = data.indicatorContent;
export function cevIndicators(variableId) {
  if (!/^SC00[1-8]$/.test(variableId)) return [];
  const n = Number(variableId.slice(2)) - 1;
  if (!Number.isInteger(n) || n < 0 || n > 7) return [];
  return indicatorContent.slice(n * 2, n * 2 + 2).map((v, index) => ({
    id: variableId + "-I0" + (index + 1),
    title: v[0],
    definition: v[1],
    questionNumbers: v[2],
    documents: v[3],
    observation: v[4],
    origin: "authored",
    sourceIds: ["CEV-2008"],
    revision: "1.0",
  }));
}

// Prepared wording, not generated during download. Each pair = management / boardroom.
const levelWording = data.levelWording;
export function cevQuestionContent(question) {
  const index = kapteinQuestions.findIndex((q) => q.id === question.id);
  if (index < 0) return null;
  const canonical = kapteinQuestions[index];
  const indicator = cevIndicators(canonical.dimensionId).find((i) =>
    i.questionNumbers.includes(Number(question.id.split("-Q")[1])),
  );
  return {
    indicatorId: indicator.id,
    revision: "1.0",
    origin: "authored",
    sourceIds: ["CEV-2008"],
    variants: {
      operational: canonical.question,
      management: levelWording[index][0],
      strategic: levelWording[index][1],
    },
  };
}
