/** Question wording only: no selection, source evidence or catalogue writes.
 * @typedef {{id:string,title?:string,purpose?:string,question?:string,probes?:string,
 * variants?:Record<string,string>,formulationBase?:Record<string,string>,
 * included?:boolean,selectedLevels?:string[],origin?:string,revision?:string}} WordingQuestion
 */

/** @param {unknown} value @returns {value is Record<string,unknown>} */
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value @returns {value is string[]} */
const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string');
/** @param {unknown} value @returns {value is Record<string,string>} */
const stringMap = value => record(value) && Object.values(value).every(item => typeof item === 'string');
/** @param {unknown} value @returns {value is WordingQuestion & {variants:Record<string,string>}} */
function preparedQuestion(value) {
  return record(value) && typeof value.id === 'string' && stringMap(value.variants) &&
    ['title','purpose','question','probes'].every(key => value[key] === undefined || typeof value[key] === 'string');
}

/** @param {string} clause */
function invitations(clause) {
  return [`Kunt u vertellen ${clause}?`, `Kunt u beschrijven ${clause}?`, `Vertel eens ${clause}.`, `Wilt u vertellen ${clause}?`, `Kunt u uitleggen ${clause}?`];
}
/** @param {string} subject */
function situation(subject) {
  return [`Kunt u vertellen over ${subject}?`, `Vertel eens over ${subject}.`, `Wat kunt u vertellen over ${subject}?`, `Kunt u ${subject} beschrijven?`];
}

/** Read current data so lazy catalogue loading needs no duplicate question cache.
 * @param {unknown} data @param {string} id @param {string} level @param {string} base */
function isPreparedOriginal(data, id, level, base) {
  if (!record(data) || !record(data.reviewed) || !Array.isArray(data.reviewed.items))
    throw Error('Invalid prepared interview questions.');
  for (const item of data.reviewed.items) {
    if (!record(item) || !Array.isArray(item.questions) || !item.questions.every(preparedQuestion))
      throw Error('Invalid prepared interview questions.');
    const found = item.questions.find(question => question.id === id);
    if (found) return found.variants[level] === base;
  }
  return false;
}

/** @param {unknown} data @param {unknown} practice @param {unknown} integrity */
export function createQuestionFormulations(data, practice, integrity) {
  if (!record(data) || !record(data.clauses) || !Object.values(data.clauses).every(strings) ||
      typeof data.strategicExperience !== 'string') throw Error('Invalid interview formulation data.');
  const clauses = data.clauses, strategicExperience = data.strategicExperience;

  /** @param {WordingQuestion} q @param {string} level */
  function questionFormulations(q, level) {
    const base = q.formulationBase?.[level] ?? q.variants?.[level] ?? '';
    if (!record(practice) || !Array.isArray(practice.values)) throw Error('Invalid reviewed interview formulations.');
    // Inspect the current array, including records loaded after this module.
    for (const entry of practice.values) {
      if (!record(entry) || typeof entry.base !== 'string' || !strings(entry.alternatives))
        throw Error('Invalid reviewed interview formulations.');
      if (entry.base === base) return [...entry.alternatives];
    }
    const stem = base.replace(/\?$/, '');
    /** @type {string[]} */
    let alternatives = [];
    /** @type {RegExpMatchArray|null} */
    let match;
    if ((match = stem.match(/^(Als .+), kunt u (?:vertellen|beschrijven) ((?:hoe|wat|welk|welke|hoeveel) .+)$/))) {
      const condition = match[1];
      alternatives = invitations(match[2]).map(invitation => `${condition}, ${invitation[0].toLocaleLowerCase('nl')}${invitation.slice(1)}`);
    } else if ((match = stem.match(/^Kunt u (?:vertellen|beschrijven) (?:over )?((?:hoe|wat|welk|welke|hoeveel) .+)$/))) {
      alternatives = invitations(match[1]);
    } else if ((match = stem.match(/^Kunt u (?:vertellen over|mij meenemen in) (.+)$/))) {
      alternatives = situation(match[1]);
    } else if ((match = stem.match(/^Kunt u (.+?) beschrijven(.*)$/))) {
      alternatives = situation(match[1] + match[2]);
    } else if ((match = stem.match(/^Welke ervaringen heeft (u|uw team|het bestuur) (.+)$/))) {
      alternatives = invitations(`welke ervaringen ${match[1]} heeft ${match[2]}`);
    } else if (isPreparedOriginal(integrity, q.id, level, base)) {
      const entry = Object.hasOwn(clauses, q.id) ? clauses[q.id] : undefined;
      const clause = strings(entry) ? entry[['operational','management','strategic'].indexOf(level)] : undefined;
      if (clause) alternatives = invitations(clause);
      else if (q.id === 'AI04-Q03' && level === 'strategic') alternatives = invitations(strategicExperience);
    }
    return [...new Set([base, ...alternatives])].filter(Boolean).slice(0, 4);
  }

  /** @template {WordingQuestion} T @param {T} q @param {string} level */
  function cycleQuestionFormulation(q, level) {
    const options = questionFormulations(q, level);
    if (options.length < 2) return q;
    const next = options[(options.indexOf(q.variants?.[level] ?? '') + 1) % options.length];
    return {...q, formulationBase: {...q.formulationBase, [level]: q.formulationBase?.[level] ?? q.variants?.[level] ?? ''},
      variants: {...q.variants, [level]: next}, ...(level === 'operational' ? {question:next} : {})};
  }
  return {questionFormulations, cycleQuestionFormulation};
}

/** @param {unknown} data @param {unknown} previous */
export function createPracticeQuestionRevision(data, previous) {
  if (!record(data) || !stringMap(data.previousKotterBarrier)) throw Error('Invalid interview revision data.');
  const previousKotterBarrier = data.previousKotterBarrier;
  /** @type {('title'|'purpose'|'question'|'probes')[]} */
  const textKeys = ['title','purpose','question','probes'];

  /** Only exact, unselected originals may be refreshed; user edits stay untouched.
   * @template {WordingQuestion} T @param {string} modelId @param {T} question
   * @param {WordingQuestion|undefined} latest */
  function practiceQuestionRevision(modelId, question, latest) {
    const barrierDelta = modelId === 'KOTTER' && question.id === 'KT-BARRIERS-Q10' && latest;
    /** @type {(WordingQuestion & {variants:Record<string,string>})|undefined} */
    let old;
    if (barrierDelta) old = {...latest, id:question.id, question:previousKotterBarrier.operational, variants:previousKotterBarrier};
    else {
      if (!record(previous) || !Array.isArray(previous.values)) throw Error('Invalid previous interview questions.');
      for (const model of previous.values) {
        if (!record(model) || typeof model.id !== 'string' || !Array.isArray(model.questions) || !model.questions.every(preparedQuestion))
          throw Error('Invalid previous interview questions.');
        if (model.id === modelId) { old = model.questions.find(q => q.id === question.id); break; }
      }
    }
    if (question.included || question.selectedLevels?.length) return null;
    if (!old || !latest || !latest.variants || question.origin !== 'authored' ||
        textKeys.some(key => question[key] !== old[key]) ||
        Object.keys(old.variants).some(level => question.variants?.[level] !== old.variants[level]) ||
        Object.keys(question.formulationBase ?? {}).length) return null;
    if (textKeys.every(key => question[key] === latest[key]) &&
        Object.keys(latest.variants).every(level => question.variants?.[level] === latest.variants?.[level])) return null;
    return {...question, ...Object.fromEntries(textKeys.map(key => [key, latest[key]])),
      variants:{...latest.variants}, revision:barrierDelta ? '2026-09-18-clarity' : '2026-09-17-practice'};
  }
  return {practiceQuestionRevision};
}
