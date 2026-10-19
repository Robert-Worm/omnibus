import {useState} from 'react';

export type LawOverview='norms'|'source';
export type LawOverviewProps={overview?:LawOverview;onOverviewChange?:(overview:LawOverview)=>void};

// The open-source workspace owns this choice across source tabs. Standalone
// point viewers retain a local fallback without changing the workspace mode.
export function useLawOverview({overview,onOverviewChange}:LawOverviewProps){
 const [local,setLocal]=useState<LawOverview>('norms');
 return [overview??local,(next:LawOverview)=>{setLocal(next);onOverviewChange?.(next);}] as const;
}
