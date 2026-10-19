// Presentation only: retain every reviewed link and its original index.
// A scope/exception provision that is PRIMARY for a point remains its core norm.
export function cioSourceGroups(links){
 const entries=links.map((link,index)=>({link,index}));
 return [
  {id:'substance',title:'Inhoudelijke onderbouwing',entries:entries.filter(({link})=>!['SCOPE','EXCEPTION'].includes(link.contribution))},
  {id:'context',title:'Reikwijdte en uitzonderingen',entries:entries.filter(({link})=>['SCOPE','EXCEPTION'].includes(link.contribution))},
 ].filter(group=>group.entries.length);
}
