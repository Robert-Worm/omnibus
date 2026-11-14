import {ChevronDown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuGroup,DropdownMenuLabel} from '@/components/ui/dropdown-menu';
/** Thema's en processen waarin een rapport voorkomt. In de rapportenlijst als compact menu (besluit B-058). */
export default function ReportContextLinks({items,onOpen,compact=false}:{items:{id:string;title:string}[];onOpen:(id:string)=>void;compact?:boolean}){
 const links=items.filter(item=>item.id.startsWith('theme:')||item.id.startsWith('process:'));
 if(!links.length)return compact?<small className="report-context-none">–</small>:null;
 const kind=(id:string)=>id.startsWith('process:')?'Proces':'Thema';
 if(compact){
  const themes=links.filter(l=>kind(l.id)==='Thema').length,processes=links.length-themes;
  const text=[themes&&`${themes} ${themes===1?'thema':'thema’s'}`,processes&&`${processes} ${processes===1?'proces':'processen'}`].filter(Boolean).join(' · ');
  return <DropdownMenu>
   <DropdownMenuTrigger render={<button type="button" className="report-context-trigger" aria-label={`${text}: open de lijst`}/>}>{text}<ChevronDown size={14} aria-hidden="true"/></DropdownMenuTrigger>
   <DropdownMenuContent className="report-context-menu" side="bottom" align="start">
    <DropdownMenuGroup><DropdownMenuLabel>Open een thema of proces</DropdownMenuLabel>
    {links.map(item=><DropdownMenuItem key={item.id} onClick={()=>onOpen(item.id)}><span className="report-context-kind">{kind(item.id)}</span>{item.title}</DropdownMenuItem>)}
    </DropdownMenuGroup>
   </DropdownMenuContent>
  </DropdownMenu>;
 }
 return <details className="report-context-links"><summary>Thema’s en processen ({links.length})</summary><div>{links.map(item=><Button key={item.id} variant="link" onClick={()=>onOpen(item.id)}>{kind(item.id)}: {item.title}</Button>)}</div></details>;
}
