export const PROJECT_VERSION = 2;
const unsupported=()=>Error('Deze projectversie wordt niet ondersteund. Het huidige project blijft behouden.');

// One synchronous shape-only step per source version. Never repair source
// evidence or grant admission here; the ordinary restore validators run after it.
// The factory also lets tests exercise a fictional chain without enabling it.
export function createProjectMigrator(currentVersion, steps) {
  if(!Number.isSafeInteger(currentVersion)||currentVersion<1)throw unsupported();
  const migrations=new Map(steps);
  return value=>{
    if(value?.format!=='rijksmap-project'||!Number.isSafeInteger(value.version)||value.version<1||value.version>currentVersion)throw unsupported();
    const fromVersion=value.version;
    if(fromVersion===currentVersion)return {value,migration:null};
    // A failed or mutating step must never damage the caller's original object.
    let next=structuredClone(value);
    for(let version=fromVersion;version<currentVersion;version++) {
      const step=migrations.get(version);
      if(typeof step!=='function')throw unsupported();
      next=step(next);
      if(next?.format!=='rijksmap-project'||next.version!==version+1)throw unsupported();
    }
    return {value:next,migration:{fromVersion,toVersion:currentVersion}};
  };
}

// v1 showed every available source. Keep that scope without inventing historic
// provenance. Ordinary source validators still run before binding the runtime.
export const migrateProject=createProjectMigrator(PROJECT_VERSION, [[1,value=>({
  ...value,version:2,collections:{mode:'both',origins:[]},
})]]);
