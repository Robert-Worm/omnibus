// Navigation only: these labels neither amend the reviewed source nor decide applicability.
export const cioViewerGroups = [
  {id:'besturing',title:'Besturing en inrichting',objectives:['C26-O-GOV','C26-O-POL','C26-O-COOP']},
  {id:'koers',title:'Koers, portfolio en continuïteit',objectives:['C26-O-PLAN','C26-O-LIFE']},
  {id:'besluitvorming',title:'Advisering en beoordeling',objectives:['C26-O-ADV','C26-O-ASS']},
  {id:'verantwoording',title:'Monitoring en verantwoording',objectives:['C26-O-MON','C26-O-INFO','C26-O-EXC']},
  {id:'beveiliging',title:'Informatiebeveiliging en incidenten',objectives:['C26-O-SEC','C26-O-INC']},
  {id:'ontwikkeling',title:'Informatie en deskundigheid',objectives:['C26-O-DATA','C26-O-LEARN']},
];
export function cioObjectivePoints(points,objectiveId){return points.filter(p=>p.objective_ids.includes(objectiveId));}
export function cioVisibleObjectives(catalogue,points,{group='',objective='',query=''}={}){
 const groupIds=cioViewerGroups.find(g=>g.id===group)?.objectives;
 const q=query.trim().toLocaleLowerCase('nl');
 return catalogue.objectives.filter(o=>(!groupIds||groupIds.includes(o.id))&&(!objective||o.id===objective)&&(!q||[
   o.title,o.text,o.risk,...cioObjectivePoints(points,o.id).flatMap(p=>[p.title,p.text,p.id]),
   ...catalogue.criteria.filter(c=>c.objective_ids.includes(o.id)).flatMap(c=>[c.title,c.text]),
 ].join(' ').toLocaleLowerCase('nl').includes(q)));
}
