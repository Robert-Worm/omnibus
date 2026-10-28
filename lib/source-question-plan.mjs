import {readQuestionReview} from './question-quality-review.mjs';

// Source-authored plans only. Saved questions and personal wording never enter
// this boundary. Stable keys bind both wording and explicit coverage.
export function questionPlanInventory(plan) {
  if (!plan || typeof plan.central !== 'string' || !Array.isArray(plan.subquestions))
    throw Error('Question plan: central question and subquestions required.');
  const keys = new Set();
  const questions = [{id:'central',kind:'onderzoeksvraag',text:plan.central,originKeys:[]}];
  for (const q of plan.subquestions) {
    if (typeof q.key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,150}$/.test(q.key) ||
        keys.has(q.key) || Object.hasOwn(q,'ids') || typeof q.text !== 'string' || !Array.isArray(q.originKeys) ||
        !q.originKeys.length || q.originKeys.some(k=>typeof k!=='string'||!k.trim()) ||
        new Set(q.originKeys).size !== q.originKeys.length)
      throw Error('Question plan: stable unique keys and explicit coverage required.');
    keys.add(q.key);
    questions.push({id:'sub:'+q.key,kind:'onderzoeksvraag',text:q.text,originKeys:[...q.originKeys]});
  }
  return questions;
}

export function sourceQuestionPlanPresentation(plan, {sourceId,sourceEdition,sourceHash} = {}) {
  // Legacy filtering stays with the existing caller so its positional keys
  // remain stable. Absence of a receipt is never reported as approval.
  if (!Object.hasOwn(plan,'questionReview')) return plan;
  const withheld = {...plan,central:'',subquestions:[]};
  try {
    const inventory=questionPlanInventory(plan), publication=plan.questionReview;
    // Detect changed mappings/inventory as well as changed text. This snapshot
    // is supplied by the publisher from the same reviewed complete inventory.
    if (JSON.stringify(inventory)!==JSON.stringify(publication?.planInventory)) return withheld;
    const approved=q=>readQuestionReview({sourceId,itemId:sourceId+':question-plan',
      question:q,publication,sourceEdition,sourceHash}).approved;
    return {...plan,central:approved(inventory[0])?plan.central:'',
      subquestions:plan.subquestions.filter((_q,i)=>approved(inventory[i+1]))};
  } catch { return withheld; }
}
