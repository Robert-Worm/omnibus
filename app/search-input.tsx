'use client';
import {useEffect,useRef,useState,type Ref} from 'react';

/**
 * Zoekveld dat het typen zelf bijhoudt. De eigenaar mag de zoekvraag in een overgang (startTransition) verwerken:
 * het veld toont elke toets meteen, ook als de lijst erachter nog tekent. Verandert de eigenaar de waarde zelf
 * (wissen, een onderwerp kiezen), dan neemt het veld die over.
 */
export default function SearchInput({id,label,value,onChange,placeholder,inputRef}:{id:string;label:string;value:string;onChange:(value:string)=>void;placeholder?:string;inputRef?:Ref<HTMLInputElement>}){
 const [text,setText]=useState(value);
 // Wat getypt is en nog bij de eigenaar onderweg kan zijn: een waarde die daarvan terugkomt, is geen wijziging van buiten.
 const sent=useRef<string[]>([]);
 useEffect(()=>{
  const index=sent.current.lastIndexOf(value);
  if(index>=0){sent.current=sent.current.slice(index+1);return;}
  sent.current=[];setText(value);
 },[value]);
 return <input ref={inputRef} id={id} type="search" aria-label={label} placeholder={placeholder} value={text} maxLength={500}
  onChange={event=>{const next=event.target.value;sent.current.push(next);if(sent.current.length>200)sent.current.shift();setText(next);onChange(next);}}/>;
}
