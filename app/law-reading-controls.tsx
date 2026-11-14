'use client';
import type {MatrixTextDensity} from './compact-matrix';

/** Keuze voor de tekstweergave. Standaard compact. De eenmalige tip ('Meer tekst zien?') is weg (besluit B-055):
 *  de keuzelijst staat zelf zichtbaar met het label Tekstweergave. */
export default function LawReadingControls({value,onChange}:{value:MatrixTextDensity;onChange:(value:MatrixTextDensity)=>void}){
 return <label className="law-reading-control">Tekstweergave<select aria-label="Tekstweergave normen" value={value} onChange={e=>onChange(e.target.value as MatrixTextDensity)}><option value="compact">Compact</option><option value="comfortable">Meer tekst</option><option value="full">Volledige tekst</option></select></label>;
}
