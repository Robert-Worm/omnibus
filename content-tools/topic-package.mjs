// Onderwerppakket (B-079): de indeling van een familie in onderwerpen, met per onderwerp een vraagplan en de
// reviewbesluiten daarbij, als één bestand buiten Git. Dit hulpmiddel controleert zo'n pakket tegen een database en zet
// het in een KOPIE van die database, als nieuwe publicatie op dezelfde bronrelease. Het ontwerpt en beoordeelt niets:
// het weigert een pakket waarin een norm geen plek heeft, een vraag niet door de vormcontrole komt, of een
// reviewbesluit niet bij de huidige versie van het plan hoort.
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {applyCatalogueEdits} from '../lib/catalogue-runtime.mjs';
import {createTopicFamily, validateTopicDefinition} from '../lib/family-topics.mjs';
import {voorcontrole} from '../lib/question-quality.mjs';
import {questionPlanInventory} from '../lib/source-question-plan.mjs';
import {prepareQuestionPlanPublication} from './question-review-publication.mjs';

export const TOPIC_PACKAGE_FORMAT = 'omnibus-topic-package';
const KEY = /^[a-z0-9][a-z0-9-]{0,40}$/u;
export const topicHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Wat de app van de bronnen van een familie krijgt: de pakketversies, de normen (id, titel, tekst) en de selecteerbare
 * toetspunten in de volgorde van de app, ook als ze bij een latere bewerking zijn gesplitst of samengevoegd.
 * @param {string} databaseFile
 * @param {{release:string,publication:string}} pins
 * @param {string[]} sourceIds
 */
export function readTopicRuntime(databaseFile, pins, sourceIds) {
  const db = new DatabaseSync(databaseFile, {readOnly: true});
  try {
    const row = db.prepare('select payload from runtime_publications where release_id = ? and hash = ?').get(pins.release, pins.publication);
    if (!row) throw Error('De publicatie uit de instellingen staat niet in deze database.');
    const value = JSON.parse(String(row.payload)), topical = structuredClone(value.modules['lib/topical-reviewed.json']);
    const resource = db.prepare('select payload from web_resources where release_id = ? and hash = ?');
    const wanted = new Set(sourceIds);
    // Dezelfde samenvoeging als de app (applyCatalogueEdits), zodat volgorde en splitsingen gelijk zijn.
    for (const [key, ref] of Object.entries(value.refs ?? {})) {
      const match = /^foundation:([^:]+):local:lib\/topical-reviewed\.json:\d+$/u.exec(key);
      if (!match || !wanted.has(match[1])) continue;
      const edits = JSON.parse(String(resource.get(pins.release, ref.hash).payload)).filter(edit => edit.path[0] === 'packages');
      applyCatalogueEdits(topical, edits);
    }
    const version = db.prepare("select version from packages where source_id = ? and kind = 'foundation'");
    const records = db.prepare("select id, title, payload from records where version = ? and kind = 'norm' order by position");
    const sources = {};
    for (const id of sourceIds) {
      const pack = topical.packages.find(item => item.id === id), packageVersion = version.get(id)?.version;
      if (!pack || !packageVersion) { sources[id] = null; continue; }
      sources[id] = {packageVersion,
        norms: records.all(packageVersion).map(record => ({id: String(record.id), title: String(record.title), text: JSON.parse(String(record.payload)).data?.text ?? ''})),
        points: (pack.catalogue?.points ?? []).filter(point => point.selection_status === 'SELECTABLE').map(point => ({id: point.id, normId: point.criterion_id, title: point.title}))};
    }
    return {value, sources};
  } finally { db.close(); }
}

/** Alle normen van één plan (onderwerp of deelonderwerp), met hun toetspunten: de hoofdnormen en, bij een heel onderwerp, de verwante. */
export function topicInventory(definition, entry, runtime) {
  const sourceOf = new Map(definition.sources.map(source => [source.id, source]));
  const rows = [];
  for (const [id, [sourceId, main, sub, also, regime, sector]] of Object.entries(definition.index.norms)) {
    const own = main === entry.topic && (!entry.sub || sub === entry.sub), related = !entry.sub && also.includes(entry.topic);
    if (!own && !related) continue;
    const source = runtime.sources[sourceId], norm = source?.norms.find(item => item.id === id);
    rows.push({id, sourceId, laag: sourceOf.get(sourceId)?.laag ?? '', title: norm?.title ?? '', text: norm?.text ?? '', known: Boolean(norm),
      rol: own ? 'hoofd' : 'verwant', sub, regime, sector, toetspunten: (source?.points ?? []).filter(point => point.normId === id).map(({id: pointId, title}) => ({id: pointId, title}))});
  }
  return rows;
}

/** Ontwerpcontrole: elke norm precies één plek, geldige sleutels, brede vragen die hele specifieke vragen bundelen, vormcontrole. */
export function checkTopicDesign(design, inventory) {
  const problems = [], say = message => problems.push(message);
  if (!design || typeof design.central !== 'string' || !Array.isArray(design.specific) || !Array.isArray(design.broad)) return ['Het ontwerp mist central, specific of broad.'];
  const known = new Set(inventory.map(norm => norm.id)), seen = new Map(), keys = new Set();
  for (const question of [{key: 'central', text: design.central}, ...design.specific, ...design.broad]) {
    if (!KEY.test(question.key || '')) say(`Ongeldige sleutel: ${question.key}`);
    const form = voorcontrole(question.text, 'onderzoeksvraag');
    if (form.uitkomst !== 'door') say(`Vraag ${question.key} komt niet door de vormcontrole: ${form.meldingen.map(item => item.regel).join(', ')}`);
  }
  for (const question of design.specific) {
    if (keys.has(question.key)) say(`Dubbele sleutel: ${question.key}`);
    keys.add(question.key);
    if (!question.normIds?.length) say(`Specifieke vraag zonder normen: ${question.key}`);
    for (const id of question.normIds ?? []) {
      if (!known.has(id)) say(`Onbekende norm ${id} in ${question.key}`);
      if (seen.has(id)) say(`Norm ${id} staat bij ${seen.get(id)} en ${question.key}`);
      seen.set(id, question.key);
    }
  }
  for (const item of design.nietGekoppeld ?? []) {
    if (!known.has(item.normId)) say(`Onbekende norm bij nietGekoppeld: ${item.normId}`);
    if (seen.has(item.normId)) say(`Norm ${item.normId} is gekoppeld én niet gekoppeld`);
    if (!item.reden) say(`Niet gekoppelde norm zonder reden: ${item.normId}`);
    seen.set(item.normId, '-');
  }
  for (const id of known) if (!seen.has(id)) say(`Norm zonder plek: ${id}`);
  const pointNorm = new Map(inventory.flatMap(norm => norm.toetspunten.map(point => [point.id, norm.id])));
  for (const move of design.verplaatstePunten ?? []) {
    if (!pointNorm.has(move.pointId)) say(`Onbekend toetspunt: ${move.pointId}`);
    else if (seen.get(pointNorm.get(move.pointId)) === '-') say(`Toetspunt van een niet gekoppelde norm verplaatst: ${move.pointId}`);
    if (move.naar !== null && !keys.has(move.naar)) say(`Toetspunt ${move.pointId} naar onbekende vraag ${move.naar}`);
  }
  const used = new Map();
  for (const broad of design.broad) for (const key of broad.specificKeys ?? []) {
    if (!keys.has(key)) say(`Brede vraag ${broad.key} noemt onbekende vraag ${key}`);
    if (used.has(key)) say(`Specifieke vraag ${key} staat in twee brede vragen`);
    used.set(key, broad.key);
  }
  for (const key of keys) if (!used.has(key)) say(`Specifieke vraag ${key} staat in geen brede vraag`);
  if (design.specific.length < 3 || design.specific.length > 8) say(`Aantal specifieke vragen moet 3 tot 8 zijn (nu ${design.specific.length})`);
  if (design.broad.length < 2 || design.broad.length > 4) say(`Aantal brede vragen moet 2 tot 4 zijn (nu ${design.broad.length})`);
  return problems;
}

/**
 * Maak het vraagplan met de koppeling per toetspunt, en de hashes waaraan reviewbesluiten gebonden zijn.
 * Een toetspunt volgt zijn norm, tenzij het ontwerp het verplaatst; een gesplitst toetspunt (…-S2) volgt zijn ouder.
 */
export function buildTopicPlan(definition, entry, design, inventory, runtime, edition) {
  const norms = new Map(inventory.map(norm => [norm.id, norm]));
  const direct = new Map((design.verplaatstePunten ?? []).map(move => [move.pointId, move.naar]));
  const moved = new Map(inventory.flatMap(norm => norm.toetspunten.flatMap(point => {
    const parent = point.id.replace(/-S\d+$/u, ''), to = direct.has(point.id) ? direct.get(point.id) : direct.has(parent) ? direct.get(parent) : undefined;
    return to === undefined ? [] : [[point.id, to]]; })));
  const originOf = new Map(inventory.flatMap(norm => norm.toetspunten.map(point => [point.id, norm.sourceId + ':' + point.id])));
  const keysOf = question => [...question.normIds.flatMap(id => norms.get(id).toetspunten.filter(point => !moved.has(point.id)).map(point => originOf.get(point.id))),
    ...[...moved].filter(([, to]) => to === question.key).map(([pointId]) => originOf.get(pointId))];
  const specific = design.specific.map(question => ({key: 'specific:' + question.key, level: 'specific', type: 'subquestion', text: question.text, parentKey: 'central', originKeys: keysOf(question)}));
  const broad = design.broad.map(question => ({key: 'broad:' + question.key, level: 'broad', type: 'subquestion', text: question.text, parentKey: 'central',
    originKeys: question.specificKeys.flatMap(key => specific.find(item => item.key === 'specific:' + key).originKeys)}));
  const empty = specific.filter(question => !question.originKeys.length).map(question => question.key);
  const sourceIds = [...new Set(inventory.map(norm => norm.sourceId))];
  const sourceBasis = sourceIds.map(id => ({id, packageVersion: runtime.sources[id]?.packageVersion ?? ''}));
  const plan = {central: design.central, subquestions: specific, broadSubquestions: broad,
    sourceEdition: `${entry.id}-${edition}`, sourceHash: topicHash({sourceBasis, indeling: definition.index.review, normen: inventory.map(norm => [norm.id, norm.rol, norm.regime, norm.sector])}),
    sourceBasis, scope: {object: entry.title, note: design.scope || ''}, discovery: 'selected-mapped-sources', authoredPlanKey: `topic:${definition.id}:${entry.topic}${entry.sub ? ':' + entry.sub : ''}`};
  const process = {id: entry.id, title: entry.title, keywords: '', sourceIds: definition.sources.map(source => source.id), question: design.central,
    topic: {family: definition.id, topic: entry.topic, sub: entry.sub}};
  const questions = questionPlanInventory(plan).map(({id, kind, text}) => ({id, kind, text, questionHash: topicHash({id, kind, text})}));
  return {entry, plan, process, questions, empty, moved,
    itemHash: topicHash({item: plan, questions: questionPlanInventory(plan)}), contextHash: topicHash({process})};
}

/** Leesbaar dossier voor de reviewer: per vraag de normen met tekst en toetspunten, en wat verplaatst of los is. */
export function topicDossier(built, inventory, design) {
  const norms = new Map(inventory.map(norm => [norm.id, norm])), moved = built.moved;
  const target = to => (to ? 'sub:specific:' + to : 'niet gekoppeld');
  return {processId: built.entry.id, titel: built.entry.title, itemHash: built.itemHash, contextHash: built.contextHash, centraal: design.central, afbakening: design.scope,
    vragen: built.questions.map(({id, text}) => ({questionId: id, tekst: text})),
    specifiek: design.specific.map(question => ({questionId: 'sub:specific:' + question.key, tekst: question.text, waarom: question.waarom,
      normen: question.normIds.map(id => { const norm = norms.get(id);
        return {id, bron: norm.sourceId, laag: norm.laag, rol: norm.rol, regime: norm.regime, sector: norm.sector, titel: norm.title, tekst: norm.text,
          toetspunten: norm.toetspunten.filter(point => !moved.has(point.id)).map(point => point.title),
          elders: norm.toetspunten.filter(point => moved.has(point.id) && moved.get(point.id) !== question.key).map(point => ({toetspunt: point.title, id: point.id, naar: target(moved.get(point.id))}))}; }),
      losseToetspunten: [...moved].filter(([, to]) => to === question.key).map(([pointId]) => { const norm = inventory.find(item => item.toetspunten.some(point => point.id === pointId));
        return {toetspunt: norm.toetspunten.find(point => point.id === pointId).title, id: pointId, vanNorm: norm.id, normtitel: norm.title, normtekst: norm.text}; })})),
    breed: design.broad.map(question => ({questionId: 'sub:broad:' + question.key, tekst: question.text, bundelt: question.specificKeys.map(key => 'sub:specific:' + key)})),
    nietGekoppeld: (design.nietGekoppeld ?? []).map(item => ({...item, titel: norms.get(item.normId)?.title, rol: norms.get(item.normId)?.rol}))};
}

/**
 * Controleer een heel pakket tegen wat de database levert. Geeft de problemen (leeg is goed) en per plan het gebouwde
 * vraagplan. Dekking: elke norm van een ingedeelde bron staat in de indeling (in een onderwerp of bewust 'buiten') en
 * elke regel heeft een norm. Elk onderwerp en deelonderwerp heeft een plan, en elk plan een volledige, passende review.
 * @param {any} pkg
 * @param {ReturnType<typeof readTopicRuntime>} runtime
 * @param {{reviews?:boolean}} [options] reviews:false bij het maken van dossiers, vóór de review
 */
export function checkTopicPackage(pkg, runtime, {reviews = true} = {}) {
  const problems = [], say = message => problems.push(message);
  if (pkg?.format !== TOPIC_PACKAGE_FORMAT || pkg.schemaVersion !== 1) return {problems: [`Geen onderwerppakket (format ${TOPIC_PACKAGE_FORMAT}, schemaVersion 1).`], plans: []};
  if (!/^\d{8}\.\d{2}$/u.test(pkg.edition || '')) say('edition ontbreekt (bijvoorbeeld 20261118.01).');
  // De plannen hebben een eigen editie: een nieuwe tekst bij de familie maakt de beoordeelde plannen niet ongeldig.
  if (pkg.planEdition !== undefined && !/^\d{8}\.\d{2}$/u.test(pkg.planEdition)) say('planEdition heeft niet de vorm 20261118.01.');
  const definition = pkg.family, invalid = validateTopicDefinition(definition);
  if (invalid.length) return {problems: [...problems, ...invalid.map(item => 'Indeling: ' + item)], plans: []};
  const family = createTopicFamily(definition);
  for (const source of definition.sources) if (!runtime.sources[source.id]) say(`Bron ontbreekt in de database: ${source.id}`);
  const coverage = family.coverage(Object.fromEntries(Object.entries(runtime.sources).filter(([, source]) => source).map(([id, source]) => [id, source.norms.map(norm => norm.id)])));
  for (const id of coverage.missing) say(`Norm zonder plek in de indeling: ${id}`);
  for (const id of coverage.stale) say(`Regel in de indeling zonder norm in de database: ${id}`);
  const plans = [], byId = new Map((pkg.plans ?? []).map(plan => [plan.id, plan]));
  for (const id of byId.keys()) if (!family.questionPlans.some(entry => entry.id === id)) say(`Plan voor onbekend onderwerp: ${id}`);
  for (const entry of family.questionPlans) {
    const item = byId.get(entry.id);
    if (!item) { say(`Geen vraagplan voor ${entry.id} (${entry.title})`); continue; }
    const inventory = topicInventory(definition, entry, runtime), design = checkTopicDesign(item.design, inventory);
    for (const message of design) say(`${entry.id}: ${message}`);
    if (design.length) continue;
    const built = buildTopicPlan(definition, entry, item.design, inventory, runtime, pkg.planEdition ?? pkg.edition);
    for (const key of built.empty) say(`${entry.id}: vraag ${key} heeft geen toetspunten`);
    if (reviews) for (const message of checkTopicReview(item.review, built)) say(`${entry.id}: ${message}`);
    plans.push({...built, inventory, design: item.design, review: item.review});
  }
  return {problems, plans, family, coverage};
}

/** Hoort de review bij deze versie van het plan, en is elke vraag behouden? */
export function checkTopicReview(review, built) {
  if (!review) return ['geen review'];
  const problems = [];
  if (review.itemHash !== built.itemHash) problems.push(`review hoort bij een andere versie van het plan (${String(review.itemHash).slice(0, 12)} tegen ${built.itemHash.slice(0, 12)})`);
  if (!review.reviewer || !/^\d{4}-\d{2}-\d{2}$/u.test(review.reviewDate || '')) problems.push('review mist reviewer of reviewDate');
  const ids = new Set(built.questions.map(question => question.id)), decisions = review.decisions ?? [];
  if (decisions.length !== ids.size || decisions.some(decision => !ids.has(decision.questionId))) problems.push('de besluiten dekken de vragen niet precies');
  const open = decisions.filter(decision => decision.decision !== 'behouden');
  if (open.length) problems.push(`${open.length} vraag/vragen niet behouden: ${open.map(decision => decision.questionId).join(', ')}`);
  if (decisions.some(decision => !decision.basis)) problems.push('een besluit zonder onderbouwing');
  return problems;
}

/** Zet de reviewbesluiten om in de vorm die de publicatie van vraagplannen eist, en controleer ze daar opnieuw. */
export function publishableTopicPlans(checked) {
  return checked.plans.map(built => {
    const sourceId = 'process:' + built.entry.id, itemId = sourceId + ':question-plan';
    const reviews = built.questions.map((question, index) => { const decision = built.review.decisions.find(item => item.questionId === question.id);
      return {sourceId, itemId, sourceEdition: built.plan.sourceEdition, sourceHash: built.plan.sourceHash, itemHash: built.itemHash, contextHash: built.contextHash,
        questionId: question.id, questionHash: question.questionHash, decision: decision.decision, basis: decision.basis,
        reviewId: `TOPIC-REVIEW-${built.review.reviewDate.replaceAll('-', '')}-${built.entry.id}-${String(index + 1).padStart(2, '0')}`,
        reviewer: built.review.reviewer, reviewDate: built.review.reviewDate, ...(decision.formResolutions ? {formResolutions: decision.formResolutions} : {})}; });
    const result = prepareQuestionPlanPublication({plan: built.plan, sourceId, sourceEdition: built.plan.sourceEdition, sourceHash: built.plan.sourceHash,
      item: built.plan, context: {process: built.process}, reviews, inventoryComplete: true});
    if (result.withheld.length) throw Error(`${built.entry.id}: de publicatie houdt het plan tegen: ${JSON.stringify(result.withheld).slice(0, 300)}`);
    return {process: built.process, plan: result.plan};
  });
}

/**
 * Zet de familie en haar plannen in de procescatalogus van een publicatie. Een familie of plan met dezelfde id wordt
 * vervangen; andere families en processen blijven staan.
 * @param {any} value de runtimepublicatie (wordt aangepast)
 */
export function applyTopicPackageToPublication(value, definition, published) {
  const module = value.modules['lib/process-catalogue.mjs'];
  if (!module || !Array.isArray(module.processes)) throw Error('De publicatie heeft geen procescatalogus.');
  module.topicFamilies = [...(Array.isArray(module.topicFamilies) ? module.topicFamilies.filter(item => item?.id !== definition.id) : []), definition];
  module.questionPlans ??= {};
  for (const key of Object.keys(module.questionPlans)) if (module.processes.some(process => process.id === key && process.topic?.family === definition.id)) delete module.questionPlans[key];
  module.processes = module.processes.filter(process => process.topic?.family !== definition.id);
  for (const {process, plan} of published) { module.processes.push(process); module.questionPlans[process.id] = plan; }
  return value;
}
