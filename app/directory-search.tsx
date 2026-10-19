'use client';
import {useRef} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {TermText} from './term-help';

export default function DirectorySearch({id,label,value,onChange,placeholder}:{id:string;label:string;value:string;onChange:(value:string)=>void;placeholder:string}){
 const input=useRef<HTMLInputElement>(null);
 return <div className="directory-search-row"><div className="directory-search"><span><TermText text={label}/></span><Input ref={input} id={id} aria-label={label} value={value} maxLength={500} onChange={event=>onChange(event.target.value)} placeholder={placeholder}/></div>{value&&<Button variant="ghost" onClick={()=>{onChange('');input.current?.focus();}}>Wis zoekopdracht</Button>}</div>;
}
