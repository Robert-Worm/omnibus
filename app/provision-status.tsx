import {provisionStatusLabel,provisionStatusText} from '@/lib/provision-status.mjs';
import {Button} from '@/components/ui/button';
import {Popover,PopoverTrigger,PopoverContent,PopoverTitle} from '@/components/ui/popover';
export type ProvisionStatusFields={effectiveStatus?:string;effectiveFrom?:string;statusAsOf?:string;statusNote?:string;statusSource?:string};
export default function ProvisionStatus({item}:{item:ProvisionStatusFields|Record<string,unknown>}){
 const label=provisionStatusLabel(item);
 if(!label)return null;
 const short=item.effectiveStatus==='future'?'Voorbereiding':item.effectiveStatus==='optional'?'Optionele vorm':item.effectiveStatus==='conditional'?'Voorwaardelijk':item.effectiveStatus==='draft'?'Concept':'Status onbekend';
 return <Popover><PopoverTrigger render={<Button variant="ghost" className="provision-status" aria-label={`${label}. Toon status en ingangsdatum`} />}>
   {short}
  </PopoverTrigger><PopoverContent className="provision-status-detail" align="start">
   <PopoverTitle>{label}</PopoverTitle><p>{provisionStatusText(item).split('\n').slice(1).join('\n')}</p>
  </PopoverContent></Popover>;
}
