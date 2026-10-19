// Navigation groups only, not a legal eligibility decision.
export const wwkeAudiences=[
 {id:'entities',title:'Kritieke entiteiten',roles:['CRITICAL_ENTITY','EUROPEAN_CRITICAL_ENTITY','ORDERED_CRITICAL_ENTITY']},
 {id:'supervision',title:'Toezicht en uitvoering',roles:['SECTOR_MINISTER','COMPETENT_AUTHORITY','DESIGNATED_INSPECTOR','CYBER_AUTHORITY']},
 {id:'governance',title:'Wetgeving en verantwoording',roles:['NATIONAL_MINISTER','CENTRAL_CONTACT_POINT','DELEGATED_RULEMAKER']},
];
export function wwkeAudienceMatches(point,audience){
 if(!audience)return true;
 // Rule-making by a sector minister belongs with legislation, not supervision.
 if(point.criterion_id==='WWA-C-0016')return audience==='governance';
 const group=wwkeAudiences.find(a=>a.id===audience);
 return Boolean(group&&point.facets.target_roles.some(role=>group.roles.includes(role)));
}
