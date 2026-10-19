'use client';
import {Scale,BookOpen,Brain} from 'lucide-react';
import {TermText} from './term-help';
export function CatalogueHeader({title,description}:{title:string;description?:string}){
 return <header className="directory-heading"><div><h2>{title}</h2>{description&&<p className="directory-lead"><TermText text={description}/></p>}</div></header>;
}
export function SourceChoices({value,onChange}:{value:string;onChange:(value:'laws'|'frameworks')=>void}){
 return <fieldset className="directory-axis"  aria-label="Bronnen verkennen"><button type="button" aria-pressed={value==='laws'} onClick={()=>onChange('laws')}><Scale size={22} aria-hidden="true"/><span><strong>Wetten</strong><small>Verken wettelijke eisen</small></span></button><button type="button" aria-pressed={value==='frameworks'} onClick={()=>onChange('frameworks')}><BookOpen size={22} aria-hidden="true"/><span><strong>Kaders</strong><small>Verken beheersing en normen</small></span></button></fieldset>;
}
export function ModelChoice({onReset}:{onReset:()=>void}){
 return <fieldset className="directory-axis"  aria-label="Modellen verkennen"><button type="button" aria-pressed={true} onClick={onReset}><Brain size={22} aria-hidden="true"/><span><strong>Wetenschappelijke modellen</strong><small>Verken begrippen, variabelen en vragen</small></span></button></fieldset>;
}
