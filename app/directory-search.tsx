'use client';
import {useRef} from 'react';
import {Search,X} from 'lucide-react';

/** Zoekveld boven de tegels. Het heeft dezelfde vorm, maat en plek als het zoekveld in de lijstweergave,
 * zodat het niet verspringt als je wisselt tussen Tegels en Lijst. Het label is er voor schermlezers. */
export default function DirectorySearch({id,label,value,onChange,placeholder}:{id:string;label:string;value:string;onChange:(value:string)=>void;placeholder:string}){
 const input=useRef<HTMLInputElement>(null);
 return <div className="catalogue-table directory-search-row"><div className="catalogue-table-search"><Search size={15} aria-hidden="true"/><input ref={input} id={id} type="search" aria-label={label} value={value} maxLength={500} onChange={event=>onChange(event.target.value)} placeholder={placeholder}/></div>{value&&<button type="button" className="catalogue-tool-clear" onClick={()=>{onChange('');input.current?.focus();}}><X size={14} aria-hidden="true"/>Wis zoekopdracht</button>}</div>;
}
