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
  // Plain-text interpolation, not HTML sanitizing: the result is shown as text
  // and exported to Excel. Splitting keeps the placeholders and the inserted
  // text apart, so inserted text is never scanned again.
  const render = variant => variant.split(/(\{\{(?:onderwerp|gebruik)\}\})/).map((part, index) => {
    if (index % 2 === 0) return part;
    const value = values[part.slice(2, -2)];
    if (typeof value !== 'string' || !value.trim()) { missing = true; return ''; }
    return value.trim();
  }).join('');
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
