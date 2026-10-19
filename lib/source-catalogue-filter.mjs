/** Source discovery only: never selects norms or changes a research project.
 * @typedef {{id:string,title:string,keywords:string,sourceIds:string[],question:string,themeId?:string}} CatalogueProcess
 * @typedef {{id:string,title:string,kind:string,usage?:string,edition?:string}} CatalogueSource
 * @typedef {Record<string,{title:string,ids:string[]}>} SourceDomains
 * @typedef {{query?:string,kind?:string,domain?:string,processId?:string,selectedOnly?:boolean,openIds?:string[]}} SourceFilterOptions
 */

/** @param {CatalogueProcess[]} processes @param {SourceDomains} sourceDomains */
export function createSourceFilter(processes, sourceDomains) {
  /** @template {CatalogueSource} T @param {T[]} sources @param {SourceFilterOptions} [options] */
  return function filterSources(sources, {
    query = '', kind = 'all', domain = 'all', processId = '', selectedOnly = false, openIds = [],
  } = {}) {
    const terms = query.toLocaleLowerCase('nl').trim().split(/\s+/).filter(Boolean);
    const process = processes.find(p => p.id === processId);
    return sources
      .filter(s =>
        (kind === 'all' || s.kind === kind) &&
        (domain === 'all' || sourceDomains[domain]?.ids.includes(s.id)) &&
        (!process || process.sourceIds.includes(s.id)) &&
        (!selectedOnly || openIds.includes(s.id)) &&
        terms.every(t => [s.id, s.title, s.usage, s.edition].join(' ').toLocaleLowerCase('nl').includes(t)))
      .sort((a, b) =>
        ['law', 'framework', 'audit', 'model'].indexOf(a.kind) -
          ['law', 'framework', 'audit', 'model'].indexOf(b.kind) || a.title.localeCompare(b.title, 'nl'));
  };
}
