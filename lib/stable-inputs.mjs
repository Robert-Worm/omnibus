// De webapp wijzigt een project nooit ter plekke: elke wijziging levert nieuwe objecten op. Alleen dan mag een
// uitkomst per object worden onthouden. Buiten de webapp (tests, scripts) staat dit uit, zodat elke aanroep
// opnieuw en volledig controleert.
let trusted = false;
export const stableInputs = () => trusted;
export function trustStableInputs(value = true) { trusted = value === true; }
