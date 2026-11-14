'use client';
import type {MatrixTextDensity} from './compact-matrix';
import {ToolSelect} from './catalogue-table';

/** Keuze voor de tekstweergave. Standaard compact. De eenmalige tip ('Meer tekst zien?') is weg (besluit B-055):
 *  de keuzelijst staat zelf zichtbaar met het label Tekst, in dezelfde vorm als de filters in de lijsten (B-058). */
export default function LawReadingControls({value,onChange}:{value:MatrixTextDensity;onChange:(value:MatrixTextDensity)=>void}){
 return <ToolSelect label="Tekst:" value={value} onChange={next=>onChange(next as MatrixTextDensity)} options={[{value:'compact',label:'Compact'},{value:'comfortable',label:'Meer tekst'},{value:'full',label:'Volledige tekst'}]}/>;
}
