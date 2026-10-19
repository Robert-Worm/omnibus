'use client';
import type {MatrixTextDensity} from './compact-matrix';
export default function LawReadingControls({value,onChange}:{value:MatrixTextDensity;onChange:(value:MatrixTextDensity)=>void}){
 return <label className="law-reading-control">Tekstweergave<select aria-label="Tekstweergave normen" value={value} onChange={e=>onChange(e.target.value as MatrixTextDensity)}><option value="compact">Compact</option><option value="comfortable">Meer tekst</option><option value="full">Volledige tekst</option></select></label>;
}
