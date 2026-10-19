// Interface wording only; the count and underlying selections are unchanged.
const singulars = {bronnen:'bron',modellen:'model',normen:'norm',groepen:'groep',toetspunten:'toetspunt',bouwstenen:'bouwsteen',vragen:'vraag',onderdelen:'onderdeel','thema’s':'thema',processen:'proces',punten:'punt'};
export function countLabel(count, plural) {
  return `${count} ${count === 1 ? singulars[plural] || plural : plural}`;
}
