import {readQuestionReview} from './question-quality-review.mjs';

// Source-authored plans only. Saved questions and personal wording never enter
// this boundary. Stable keys bind both wording and explicit coverage.
export function questionPlanInventory(plan) {
  if (!plan || typeof plan.central !== 'string' || !Array.isArray(plan.subquestions))
    throw Error('Question plan: central question and subquestions required.');
  if (Object.hasOwn(plan,'broadSubquestions') && !Array.isArray(plan.broadSubquestions))
    throw Error('Question plan: broad questions must be an explicit list.');
  const keys = new Set();
  const questions = [{id:'central',kind:'onderzoeksvraag',text:plan.central,originKeys:[]}];
  for (const q of [...plan.subquestions,...(plan.broadSubquestions||[])]) {
    if (typeof q.key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,150}$/.test(q.key) ||
        keys.has(q.key) || Object.hasOwn(q,'ids') || typeof q.text !== 'string' || !Array.isArray(q.originKeys) ||
        !q.originKeys.length || q.originKeys.some(k=>typeof k!=='string'||!k.trim()) ||
        new Set(q.originKeys).size !== q.originKeys.length)
      throw Error('Question plan: stable unique keys and explicit coverage required.');
    keys.add(q.key);
    questions.push({id:'sub:'+q.key,kind:'onderzoeksvraag',text:q.text,originKeys:[...q.originKeys]});
  }
  if ((plan.broadSubquestions||[]).some(q=>!q.key.startsWith('broad:')) ||
      plan.subquestions.some(q=>q.key.startsWith('broad:')))
    throw Error('Question plan: broad and specific identities must stay distinct.');
  return questions;
}

export function sourceQuestionPlanPresentation(plan, {sourceId,sourceEdition,sourceHash} = {}) {
  // Legacy filtering stays with the existing caller so its positional keys
  // remain stable. Absence of a receipt is never reported as approval.
  if (!Object.hasOwn(plan,'questionReview')) return plan;
  const withheld = {...plan,central:'',subquestions:[],...(Object.hasOwn(plan,'broadSubquestions')?{broadSubquestions:[]}: {})};
  try {
    const inventory=questionPlanInventory(plan), publication=plan.questionReview;
    // Detect changed mappings/inventory as well as changed text. This snapshot
    // is supplied by the publisher from the same reviewed complete inventory.
    if (JSON.stringify(inventory)!==JSON.stringify(publication?.planInventory)) return withheld;
    const approved=q=>readQuestionReview({sourceId,itemId:sourceId+':question-plan',
      question:q,publication,sourceEdition,sourceHash}).approved;
    return {...plan,central:approved(inventory[0])?plan.central:'',
      subquestions:plan.subquestions.filter((_q,i)=>approved(inventory[i+1])),
      ...(Object.hasOwn(plan,'broadSubquestions')?{broadSubquestions:plan.broadSubquestions.filter((_q,i)=>approved(inventory[1+plan.subquestions.length+i]))}: {})};
  } catch { return withheld; }
}
