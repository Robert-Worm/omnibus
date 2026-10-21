import type {ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {useViewerVisibility} from './use-viewer-visibility';
import './deferred-viewer.css';

/** Only defer presentation. Counts, filtering and selection retain the full group. */
export default function DeferredViewerSection({children,immediate=false,count=1,label}:{children:ReactNode;immediate?:boolean;count?:number;label?:string}){
 const {visible,placeholder,reveal}=useViewerVisibility<HTMLDivElement>(immediate);
 return visible?children:<div ref={placeholder} className="viewer-section-placeholder">
  <Button variant="ghost" onClick={reveal}>{label||`${count} ${count===1?'norm':'normen'} tonen`}</Button>
 </div>;
}
