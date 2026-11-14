'use client';
import {ChevronDown, ListChecks} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator} from '@/components/ui/dropdown-menu';

/** Eén knop "Selectie" met de keuzes die eerst als twee losse knoppen naast de titel stonden (besluit B-056):
 *  alleen normen met gekozen toetspunten tonen, en alle normen (de)selecteren. */
export default function SelectionMenu({selectedOnly,onSelectedOnly,allChosen,onToggleAll,disabled,allTitle}:{
  selectedOnly:boolean;onSelectedOnly:(value:boolean)=>void;allChosen:boolean;onToggleAll:()=>void;disabled?:boolean;allTitle?:string;
}){
 return <DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="outline" className="selection-menu-trigger" data-active={selectedOnly||undefined}/>}>
   <ListChecks size={15} aria-hidden="true"/>Selectie{selectedOnly&&<span className="selection-menu-flag">· alleen gekozen</span>}<ChevronDown size={15} aria-hidden="true"/>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="selection-menu" align="end">
   <DropdownMenuCheckboxItem checked={selectedOnly} onCheckedChange={value=>onSelectedOnly(value===true)}>Toon alleen normen met gekozen toetspunten</DropdownMenuCheckboxItem>
   <DropdownMenuSeparator/>
   <DropdownMenuItem disabled={disabled} title={allTitle} onClick={onToggleAll}>{allChosen?'Deselecteer alle normen':'Selecteer alle normen'}</DropdownMenuItem>
  </DropdownMenuContent>
 </DropdownMenu>;
}
