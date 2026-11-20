// Een knop die iets aan- en weer uitzet (Kies alle / Deselecteer) mag bij een dubbelklik niet twee keer schakelen:
// de tweede klik van een dubbelklik (event.detail 2 of meer) wordt genegeerd. Toetsenbord en gewone klik werken als altijd.
// Gebruik: onClick={event=>isRepeatClick(event)||doeIets()} of onClick={event=>{if(isRepeatClick(event))return;…}}.
export const isRepeatClick=(event:{detail:number})=>event.detail>1;
