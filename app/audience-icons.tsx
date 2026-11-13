'use client';
// Doelgroepen als symbolen: één vast symbool per doelgroep, met de uitleg bij aanwijzen of focus.
import {Building2,ClipboardCheck,Eye,Landmark,Server,Zap} from 'lucide-react';
import {audienceGroups} from '@/lib/source-scope.mjs';

const icons={rijk:Landmark,financieel:Building2,ict:Server,kritiek:Zap,toezicht:Eye,audit:ClipboardCheck};
export function AudienceIcons({groups,text}:{groups:(keyof typeof audienceGroups)[];text:string}){
 return <span className="audience-icons">{groups.map((group,index)=>{const Icon=icons[group],info=audienceGroups[group];
  return <button type="button" key={group} className="audience-icon" data-audience={group} aria-label={info.label+(index===0&&text?': '+text:'')}>
   <Icon size={15} aria-hidden="true"/>
   <span className="audience-tip" aria-hidden="true"><strong>{info.label}</strong>{info.description}{text&&<em>Deze bron: {text}</em>}</span>
  </button>;})}</span>;
}
