import {useState,type ReactNode} from 'react';

// A collapsed matrix is not part of the first paint. Once opened, keep its
// controls mounted so collapsing it does not discard the user's view settings.
export default function DeferredDetails({summary,className,children}:{summary:string;className?:string;children:ReactNode}) {
  const [visited,setVisited]=useState(false);
  return <details className={className} onToggle={event=>{if(event.currentTarget.open)setVisited(true);}}>
    <summary>{summary}</summary>
    {visited&&children}
  </details>;
}
