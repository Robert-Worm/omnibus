import {discoveryProcesses} from './content-discovery.mjs';

// Navigation only: retain all explicit memberships, rather than inventing a
// primary process or repeating the same source item under multiple headings.
export function reportBrowseGroups(lines) {
 const groups=new Map();
 for(const line of lines){
  const memberships=discoveryProcesses.filter(p=>p.lineIds.includes(line.id));
  const id=memberships.map(p=>p.id).join('+')||'other';
  if(!groups.has(id))groups.set(id,{id,title:memberships.map(p=>p.title).join(' · ')||'Overige onderwerpen',lines:[]});
  groups.get(id).lines.push(line);
 }
 return [...groups.values()];
}
