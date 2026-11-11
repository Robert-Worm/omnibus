// Editorial landing suggestions, not a research-method rule or source filter.
// Only the generic transition to step 2 uses these; explicit source links stay explicit.
const defaults={page:'foundations',hash:'#grondslagen',label:'Wetten & kaders',reason:'Begin bij wetten en kaders die bij je onderwerp passen. Thema’s, modellen en rapporten staan in de andere tabbladen.'};
const themes={page:'catalogue',hash:'#themas',label:'Thema’s & processen'};
const models={page:'models',hash:'#modellen',label:'Modellen'};
// Stap 2 begint altijd bij Wetten & kaders, het eerste tabblad (besluit beheerder 11 november 2026: beginnen bij
// Modellen of Thema's verraste). Alleen bij een ontwerpvraag staat het filter meteen op kaders.
const begin='Begin bij wetten en kaders die bij je onderwerp passen. Thema’s, modellen en rapporten staan in de andere tabbladen.';
const starts={
 signaling:{...defaults,reason:begin},
 diagnostic:{...defaults,reason:begin},
 design:{...defaults,label:'Kaders',foundationScope:'frameworks',reason:'Zoek eisen en beoordelingscriteria om het voorgestelde ontwerp aan te toetsen.'},
 change:{...defaults,reason:begin},
 evaluative:{...defaults,reason:begin},
};
export function collectionStart(direction='',route='question'){
 return {...(route==='question'&&Object.hasOwn(starts,direction)?starts[direction]:defaults)};
}

const destinations={
 foundations:defaults, catalogue:themes, models,
 processes:{page:'processes',hash:'#processen',label:'Processen'},
 topics:{page:'topics',hash:'#open-themas',label:'Open thema’s & processen'},
 'foundation-workspace':{page:'foundation-workspace',hash:'#open-grondslagen',label:'Open wetten & kaders'},
 'model-workspace':{page:'model-workspace',hash:'#open-modellen',label:'Open modellen'},
 reports:{page:'reports',hash:'#rapporten',label:'Rapporten'},
 'report-themes':{page:'report-themes',hash:'#rapportthemas',label:'Rapportuitwerkingen'},
};
export function rememberCollectionPage(page,previous=''){
 return Object.hasOwn(destinations,page)?page:Object.hasOwn(destinations,previous)?previous:'';
}
// An explicit visit wins over the editorial first-visit suggestion.
export function collectionDestination(lastPage='',direction='',route='question'){
 return Object.hasOwn(destinations,lastPage)?{...destinations[lastPage]}:collectionStart(direction,route);
}
