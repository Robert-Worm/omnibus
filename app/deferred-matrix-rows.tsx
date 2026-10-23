import type {ReactNode} from 'react';
import {useViewerVisibility} from './use-viewer-visibility';
import {TableBody,TableRow,TableCell} from '@/components/ui/table';
import {Button} from '@/components/ui/button';

/** Keep one table and its complete selection scope; mount off-screen controls on approach. */
export default function DeferredMatrixRows({children,immediate,count,columns}:{children:()=>ReactNode;immediate:boolean;count:number;columns:number}){
 const {visible,placeholder,reveal}=useViewerVisibility<HTMLTableSectionElement>(immediate);
 return visible?<TableBody>{children()}</TableBody>:<TableBody ref={placeholder}>
  <TableRow><TableCell colSpan={columns} style={{height:count*160}}>
   <Button variant="ghost" onClick={reveal}>{count} {count===1?'norm':'normen'} tonen</Button>
  </TableCell></TableRow>
 </TableBody>;
}
