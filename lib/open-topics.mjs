// Geopende onderwerpen (B-072). Een onderwerp dat je opent, staat naast de geopende bronnen onder "Open wetten & kaders"
// en toont de normen van alle bronnen onder elkaar. Het is een weergave: de selectie blijft die van de bronnen zelf.
// De lijst hoort bij dit browservenster (sessionStorage) en niet bij het project; een onderwerp heropenen kost één klik.
const KEY = 'omnibus-open-topics';
let items = null, wanted = '';
const listeners = new Set();
const empty = [];
function load() {
  if (items) return items;
  items = empty;
  try { const saved = JSON.parse(globalThis.sessionStorage?.getItem(KEY) || '[]'); if (Array.isArray(saved)) items = saved.filter(value => typeof value === 'string' && value).slice(0, 12); } catch { items = empty; }
  return items;
}
function save(next) {
  items = next;
  try { globalThis.sessionStorage?.setItem(KEY, JSON.stringify(next)); } catch { /* opslag is geen voorwaarde */ }
  for (const listener of listeners) listener();
}
export const openTopicId = value => 'onderwerp:' + value;
export const openTopicValue = id => (typeof id === 'string' && id.startsWith('onderwerp:') ? id.slice(10) : '');
/** De geopende onderwerpen, als keuzeteksten ("T5", "T5|5c", …). Dezelfde lijst zolang er niets verandert. */
export const openTopics = () => load();
export const subscribeOpenTopics = listener => { listeners.add(listener); return () => { listeners.delete(listener); }; };
/** Open een onderwerp. Met `show` wordt het ook het onderdeel dat de viewer als eerste toont. */
export function openTopic(value, show = false) {
  if (!value) return;
  if (show) wanted = value;
  if (!load().includes(value)) save([...load(), value]);
}
export function closeTopic(value) { if (load().includes(value)) save(load().filter(item => item !== value)); }
export function closeAllTopics() { wanted = ''; if (load().length) save(empty); }
/** Het onderwerp dat de viewer als eerste moet tonen; wordt één keer afgegeven. */
export const takeWantedTopic = () => { const value = wanted; wanted = ''; return value; };
