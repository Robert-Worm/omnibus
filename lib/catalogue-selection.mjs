import {chosenQuestionLevels,chooseModelQuestion,modelQuestionApplicable} from './model-context.mjs';
import {selectLines} from './workspace-view.mjs';

export function catalogueSelection(draft,ids) {
 const unique=[...new Set(ids)];const selected=unique.filter(id=>draft.included.includes(id)).length;
 return {total:unique.length,selected,all:unique.length>0&&selected===unique.length,partial:selected>0&&selected<unique.length};
}
export function chooseCatalogueItems(draft,ids,include,framework) {
 const allowed=new Set(framework.lines.map(line=>line.id));
 return selectLines(draft,[...new Set(ids)].filter(id=>allowed.has(id)),include);
}
export function modelCatalogueSelection(model) {
 const level=model.interviewLevel||'operational';
 const items=model.items.flatMap(item=>(item.questions||[]).filter(q=>modelQuestionApplicable(model,q)).map(question=>({item,question})));
 const selected=items.filter(({item,question})=>model.selected&&item.included&&chosenQuestionLevels(model,question).includes(level)&&(!item.indicators||item.indicators.some(i=>i.id===question.indicatorId&&i.included))).length;
 return {level,items,total:items.length,selected,all:items.length>0&&selected===items.length,partial:selected>0&&selected<items.length};
}
export function chooseModelCatalogueQuestions(model,include) {
 const {level,items}=modelCatalogueSelection(model);
 return items.reduce((next,{item,question})=>chooseModelQuestion(next,item.id,question.id,include,level),model);
}
