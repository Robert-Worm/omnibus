import {z} from 'zod';
import {exportPalettes} from '../lib/export-design.mjs';

const text = max => z.string().trim().min(1).max(max);
const key = text(300);
const level = z.enum(['operational', 'management', 'strategic']);
export const searchSchema = z.object({
  query: z.string().max(500).default(''), sourceId: z.string().max(200).default(''),
  kind: z.enum(['', 'report', 'law', 'framework', 'model', 'theme']).default(''),
  limit: z.number().int().min(1).max(40).default(20), offset: z.number().int().min(0).max(100000).default(0),
}).strict();
export const itemSchema = z.object({key,
  section: z.enum(['overview', 'sourceText', 'sourceContext', 'trace']).default('overview'),
  offset: z.number().int().min(0).max(1000000).default(0),
  limit: z.number().int().min(100).max(12000).default(8000),
}).strict();
const consent = z.literal(true).describe('Alleen true nadat de gebruiker expliciet akkoord gaf voor deze opslag- of exporthandeling.');
export const artifactSchema = z.object({draftId: z.string().uuid(), consent}).strict();
const exportSchema = z.object({
  profile: z.enum(['testing', 'risk', 'interview']),
  testingAspects: z.array(z.enum(['opzet', 'bestaan', 'werking'])).min(1).max(3).default(['opzet', 'bestaan']),
  testingTerminology: z.enum(['obw', 'design-effectiveness']).default('obw'),
  fontFamily: z.enum(['Arial', 'Calibri']).default('Arial'), fontSize: z.union([z.literal(10), z.literal(11), z.literal(12)]).default(11),
  accent: z.enum(Object.keys(exportPalettes)).default('blue'), colorMode: z.enum(['sections', 'uniform']).default('sections'),
  notes: z.boolean().default(true),
  meta: z.object({version: text(80).default('0.1'), author: z.string().max(500).default(''), team: z.string().max(500).default(''),
    scope: z.string().max(2000).default(''), change: z.string().max(2000).default('AI-concept — nog te beoordelen')}).strict().default({}),
  interview: z.object({levels: z.array(level).max(3).default([]), starr: z.boolean().default(false),
    triangulation: z.boolean().default(false)}).strict().default({}),
}).strict();
const draftFields = z.object({
  title: text(500), direction: z.enum(['signaling', 'diagnostic', 'design', 'change', 'evaluative']),
  intake: z.object({object: text(500), purpose: text(2000), scope: text(2000),
    period: z.string().max(500).default(''), roles: z.array(text(200)).max(30).default([]),
    assumptions: z.array(text(500)).max(30).default([])}).strict(),
  sector: z.string().max(200).default(''),
  selections: z.array(z.object({key, reason: text(2000)}).strict()).min(1).max(250),
  questions: z.array(z.object({key: text(80), parent: text(80).optional(), text: text(2000),
    selections: z.array(key).max(250)}).strict()).min(1).max(200),
  interviewQuestions: z.array(z.object({selection: key, level, text: text(2000)}).strict()).max(750).default([]),
  export: exportSchema,
}).strict();
const validateSpec = (spec, ctx) => {
  const error = message => ctx.addIssue({code: z.ZodIssueCode.custom, message});
  if (new Set(spec.selections.map(s => s.key)).size !== spec.selections.length) error('Een bouwsteen mag maar één keer worden gekozen.');
  if (new Set(spec.interviewQuestions.map(q => q.selection + '|' + q.level)).size !== spec.interviewQuestions.length) error('Dubbele interviewvraag voor dezelfde bouwsteen en hetzelfde niveau.');
  if (spec.export.profile === 'interview' && !spec.export.interview.levels.length) error('Kies minstens één interviewniveau.');
};
// Saved concepts predate the explicit call-level consent field. Reading them is
// compatible; every new write still requires fresh consent on the tool call.
export const draftSpecSchema = draftFields.superRefine(validateSpec);
// The SDK publishes a ZodObject as JSON Schema; a ZodEffects wrapper would
// advertise an empty object. Cross-field checks still run in the service.
export const prepareInputSchema = draftFields.extend({consent});
export const prepareSchema = prepareInputSchema.superRefine(validateSpec);
