import review from './research-direction-reviews.mjs';
import {voorcontrole} from './question-quality.mjs';

// Code-owned editorial templates, not source receipts or saved-project flags.
// Exact wording is the binding: a new or changed template remains unavailable
// until its substantive decision is recorded. Never infer approval from `door`.
export function createReviewedResearchRenderer(reviews) {
 const variants = new Map();
 for (const row of reviews) for (const text of row.variants) {
  if (variants.has(text)) throw Error('Duplicate research template review.');
  variants.set(text, row);
 }
 return function renderReviewedResearchQuestion(template, values = {}) {
  const row = variants.get(template);
  if (!row || row.decision !== 'behouden') return '';
  let missing = false;
  // One pass: a dollar sign or placeholder inside personal text is never code
  // or another interpolation. Do not rewrite any existing project questions.
  const render = variant => variant.replace(/\{\{(onderwerp|gebruik)\}\}/g, (_match, key) => {
    const value = values[key];
    if (typeof value !== 'string' || !value.trim()) { missing = true; return ''; }
    return value.trim();
  });
  const text = render(template), offered = row.variants.map(render);
  if (missing || offered.some(value=>/\{\{|\}\}/u.test(value))) return '';
  // Compound research questions are allowed only with the explicit substantive
  // resolution for that exact template. Never override other form failures.
  return offered.every(value=>{
    const form=voorcontrole(value,'onderzoeksvraag');
    return form.uitkomst==='door' || row.compoundResolved===true && form.uitkomst==='HOLD' &&
      form.meldingen.every(item=>item.regel==='samengesteld');
  }) ? text : '';
 };
}

export const renderReviewedDirectionQuestion = createReviewedResearchRenderer(review);
