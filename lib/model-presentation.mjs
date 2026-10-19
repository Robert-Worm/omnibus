/** Presentation inputs only; selections, questions and source evidence are not edited here.
 * @typedef {{id:string, title:string, officialName?:string, author?:string, source?:string,
 * usage?:string, limitation?:string, kind?:string,
 * items?:{title:string, indicators?:{title:string}[]}[]}} ModelSummary
 * @typedef {{use:string, concepts:string, boundary:string}} ChoiceGuide
 * @typedef {{structure:string, placeholder:string, hint:string, title?:string}} WorkbenchPresentation
 */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is ChoiceGuide} */
function choiceGuide(value) {
  return record(value) && typeof value.use === 'string' &&
    typeof value.concepts === 'string' && typeof value.boundary === 'string';
}

/** @param {unknown} value @returns {value is WorkbenchPresentation} */
function presentation(value) {
  return record(value) && typeof value.structure === 'string' &&
    typeof value.placeholder === 'string' && typeof value.hint === 'string' &&
    (value.title === undefined || typeof value.title === 'string');
}

/** @template T @param {unknown} value @param {(entry:unknown)=>entry is T} check
 * @returns {value is Record<string,T>} */
function dictionary(value, check) {
  return record(value) && Object.values(value).every(check);
}

/** @param {unknown} value @returns {value is string} */
const text = value => typeof value === 'string';

/** Narrow the database boundary rather than declaring unchecked JSON to be typed.
 * @param {unknown} data */
export function createModelChoicePresentation(data) {
  if (!record(data) || !dictionary(data.guides, choiceGuide) || !dictionary(data.summaries, text))
    throw Error('Invalid model choice presentation data.');
  const {guides, summaries} = data;

  /** @param {ModelSummary} model */
  function modelChoiceGuide(model) {
    const guide = (Object.hasOwn(guides, model.id) ? guides[model.id] : undefined) ?? {
      use: model.usage || 'Bekijk de bron en bepaal of dit model bij je vraagstuk past.',
      concepts: (model.items ?? []).map(item => item.title).join(', '),
      boundary: model.limitation || '',
    };
    return {...guide, summary: (Object.hasOwn(summaries, model.id) && summaries[model.id]) || guide.use};
  }

  /** @param {ModelSummary} model */
  function modelChoiceSearchText(model) {
    const guide = modelChoiceGuide(model);
    return [model.officialName, model.title, model.source, model.author, model.usage, model.id,
      guide.summary, guide.use, guide.concepts,
      ...(model.items ?? []).flatMap(item => [item.title, ...(item.indicators ?? []).map(i => i.title)]),
      model.kind === 'kaptein' ? 'soft controls ethische cultuur integriteit kaptein' : '',
    ].join(' ').toLowerCase();
  }
  return {modelChoiceGuide, modelChoiceSearchText};
}

/** Editorial disclaimers remain in the explanation, not the author line.
 * @param {Pick<ModelSummary, 'author'|'source'>} model */
export function modelAttribution(model) {
  return (model.author || model.source || 'Bronvermelding niet beschikbaar').replace(/; eigen\b.*$/iu, '').trim();
}

/** @param {unknown} data */
export function createQuestionWorkbenchPresentation(data) {
  if (!record(data) || !Array.isArray(data.ids) || !data.ids.every(text) ||
      !dictionary(data.presentations, presentation))
    throw Error('Invalid model workbench presentation data.');
  const {ids, presentations} = data;

  /** @param {{id:string}|null|undefined} model */
  function usesQuestionWorkbench(model) {
    return Boolean(model && ids.includes(model.id));
  }

  /** @param {ModelSummary & {items:NonNullable<ModelSummary['items']>}} model */
  function questionWorkbenchPresentation(model) {
    const p = Object.hasOwn(presentations, model.id) ? presentations[model.id] : undefined;
    return p ? {title: model.id === 'CEV-AI' ? (model.officialName || model.title) : model.title, ...p} : {
      title: model.officialName || model.title,
      structure: `${model.author} · ${model.items.length} onderdelen`,
      placeholder: 'Bijvoorbeeld: het vastleggen van besluiten', hint: '',
    };
  }
  return {usesQuestionWorkbench, questionWorkbenchPresentation};
}
