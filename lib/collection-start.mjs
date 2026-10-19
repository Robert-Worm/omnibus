// Editorial landing suggestions, not a research-method rule or source filter.
// Only the generic transition to step 2 uses these; explicit source links stay explicit.
const defaults={page:'foundations',hash:'#grondslagen',label:'Wetten & kaders'};
const themes={page:'catalogue',hash:'#themas',label:'Thema’s & processen'};
const models={page:'models',hash:'#modellen',label:'Modellen'};
const starts={
 signaling:{...themes,reason:'Verken mogelijke knelpunten, risico’s en praktijkinzichten rond je onderwerp.'},
 diagnostic:{...models,reason:'Verken mogelijke verklaringen met begrippen, variabelen en vragen uit modellen.'},
 design:{...defaults,label:'Kaders',foundationScope:'frameworks',reason:'Zoek eisen en beoordelingscriteria om het voorgestelde ontwerp aan te toetsen.'},
 change:{...models,reason:'Verken invoering, samenwerking en gedrag met passende modellen en vragen.'},
 evaluative:{...themes,reason:'Verbind doelen, uitvoering en resultaten met inzichten rond je onderwerp.'},
};
export function collectionStart(direction='',route='question'){
 return {...(route==='question'&&Object.hasOwn(starts,direction)?starts[direction]:defaults)};
}
