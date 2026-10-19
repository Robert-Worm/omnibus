import {Button} from '@/components/ui/button';
export default function ReportContextLinks({items,onOpen}:{items:{id:string;title:string}[];onOpen:(id:string)=>void}){
 const links=items.filter(item=>item.id.startsWith('theme:')||item.id.startsWith('process:'));
 if(!links.length)return null;
 return <details className="report-context-links"><summary>Thema’s en processen ({links.length})</summary><div>{links.map(item=><Button key={item.id} variant="link" onClick={()=>onOpen(item.id)}>{item.id.startsWith('process:')?'Proces':'Thema'}: {item.title}</Button>)}</div></details>;
}
