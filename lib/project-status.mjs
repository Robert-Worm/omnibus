/** @typedef {{savedLocally:boolean, problem:boolean, message:string}} ProjectStatus */

/**
 * Observable status of browser project storage. React subscribes to actual save
 * results rather than copying them into component state after every render.
 * Each editor owns an instance; no project contents or browser storage live here.
 */
export function createProjectStatus() {
  /** @type {Readonly<ProjectStatus>} */
  let snapshot = Object.freeze({
    savedLocally:false,
    problem:false,
    message:'Wijzigingen blijven lokaal. Bewaar een conceptbestand als reservekopie.',
  });
  /** @type {Set<()=>void>} */
  const listeners = new Set();
  /** @param {Partial<ProjectStatus>} patch */
  function update(patch) {
    const next = {...snapshot,...patch};
    if(next.savedLocally===snapshot.savedLocally && next.problem===snapshot.problem && next.message===snapshot.message)return;
    snapshot=Object.freeze(next);
    for(const listener of listeners)listener();
  }
  return {
    getSnapshot:()=>snapshot,
    /** @param {()=>void} listener */
    subscribe:listener=>{listeners.add(listener);return ()=>{listeners.delete(listener);};},
    update,
    /** @param {boolean} problem */
    setProblem:problem=>update({problem}),
    /** @param {string} message */
    setMessage:message=>update({message}),
    /** @param {boolean} savedLocally */
    setSavedLocally:savedLocally=>update({savedLocally}),
  };
}
