import {z} from 'zod';
import {exportPalettes} from '../lib/export-design.mjs';
import {questionCandidate, voorcontrole} from '../lib/question-quality.mjs';

const text = max => z.string().trim().min(1).max(max);
const key = text(300);
const level = z.enum(['operational', 'management', 'strategic']);
export const searchSchema = z.strictObject({
  query: z.string().max(500).default(''), sourceId: z.string().max(200).default(''),
  kind: z.enum(['', 'report', 'law', 'framework', 'model', 'theme']).default(''),
  limit: z.number().int().min(1).max(40).default(20), offset: z.number().int().min(0).max(100000).default(0),
});
export const itemSchema = z.strictObject({key,
  section: z.enum(['overview', 'sourceText', 'sourceContext', 'trace']).default('overview'),
  offset: z.number().int().min(0).max(1000000).default(0),
  limit: z.number().int().min(100).max(12000).default(8000),
});
const consent = z.literal(true).describe('Alleen true nadat de gebruiker expliciet akkoord gaf voor deze opslag- of exporthandeling.');
export const artifactSchema = z.strictObject({draftId: z.uuid(), consent});
const exportSchema = z.strictObject({
  profile: z.enum(['testing', 'risk', 'interview']),
  testingAspects: z.array(z.enum(['opzet', 'bestaan', 'werking'])).min(1).max(3).default(['opzet', 'bestaan']),
  testingTerminology: z.enum(['obw', 'design-effectiveness']).default('obw'),
  fontFamily: z.enum(['Arial', 'Calibri']).default('Arial'), fontSize: z.union([z.literal(10), z.literal(11), z.literal(12)]).default(11),
  accent: z.enum(Object.keys(exportPalettes)).default('blue'), colorMode: z.enum(['sections', 'uniform']).default('sections'),
  notes: z.boolean().default(true),
  meta: z.strictObject({version: text(80).default('0.1'), author: z.string().max(500).default(''), team: z.string().max(500).default(''),
    scope: z.string().max(2000).default(''), change: z.string().max(2000).default('AI-concept — nog te beoordelen')}).prefault({}),
  interview: z.strictObject({levels: z.array(level).max(3).default([]), starr: z.boolean().default(false),
    triangulation: z.boolean().default(false)}).prefault({}),
});
const draftFields = z.strictObject({
  title: text(500), direction: z.enum(['signaling', 'diagnostic', 'design', 'change', 'evaluative']),
  intake: z.strictObject({object: text(500), purpose: text(2000), scope: text(2000),
    period: z.string().max(500).default(''), roles: z.array(text(200)).max(30).default([]),
    assumptions: z.array(text(500)).max(30).default([])}),
  sector: z.string().max(200).default(''),
  selections: z.array(z.strictObject({key, reason: text(2000)})).min(1).max(250),
  questions: z.array(z.strictObject({key: text(80), parent: text(80).optional(), text: text(2000),
    selections: z.array(key).max(250)})).min(1).max(200),
  interviewQuestions: z.array(z.strictObject({selection: key, level, text: text(2000)})).max(750).default([]),
  export: exportSchema,
});
const validateSpec = (spec, ctx) => {
  const error = message => ctx.addIssue({code: 'custom', message});
  if (new Set(spec.selections.map(s => s.key)).size !== spec.selections.length) error('Een bouwsteen mag maar één keer worden gekozen.');
  if (new Set(spec.interviewQuestions.map(q => q.selection + '|' + q.level)).size !== spec.interviewQuestions.length) error('Dubbele interviewvraag voor dezelfde bouwsteen en hetzelfde niveau.');
  if (spec.export.profile === 'interview' && !spec.export.interview.levels.length) error('Kies minstens één interviewniveau.');
};
// Only new AI proposals pass this gate. Saved specs and user-authored project
// text must not be reclassified, rewritten or dropped when reading/exporting.
const validateProposedQuestions = (spec, ctx) => {
  for (const [field, kind] of [['questions', 'onderzoeksvraag'], ['interviewQuestions', 'interview']]) {
    spec[field].forEach((question, index) => {
      if (questionCandidate(question.text, kind)) return;
      const {uitkomst, meldingen} = voorcontrole(question.text, kind);
      ctx.addIssue({code: 'custom', path: [field, index, 'text'],
        message: `Vraagvoorcontrole (${uitkomst}): ${meldingen.map(m => `${m.regel}: ${m.reden}`).join('; ')}. Er wordt geen concept opgeslagen.`});
    });
  }
};
// Saved concepts predate the explicit call-level consent field. Reading them is
// compatible; every new write still requires fresh consent on the tool call.
export const draftSpecSchema = draftFields.superRefine(validateSpec);
// Publish the structural input contract as JSON Schema. Cross-field semantic
// checks still run in the service before any write.
export const prepareInputSchema = draftFields.extend({consent}).describe(
  'Nieuwe AI-vragen moeten de vraagvoorcontrole halen: onderzoeksvragen als onderzoeksvraag, interviewvragen als interview. Bij schrappen, herschrijven of HOLD wordt niets opgeslagen; de fout noemt de vraagpositie en reden. Door naar inhoudelijke beoordeling betekent geen inhoudelijke goedkeuring. Vraag opnieuw expliciet akkoord voor een aangepast voorstel.');
export const prepareSchema = prepareInputSchema.superRefine(validateSpec).superRefine(validateProposedQuestions);
