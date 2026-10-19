"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {isBrowserNoticeDismissed,rememberBrowserNoticeDismissal} from '@/lib/notice-preference.mjs';

// Dismissing a notice is presentation only: it must never unblock storage,
// acknowledge a conflicting revision or discard the recovery original.
export default function ProjectNotice({message,onRecover,onReload}: {
  message:string; onRecover?:()=>void; onReload:()=>void;
}) {
  const [expanded,setExpanded]=useState(()=>!isBrowserNoticeDismissed(message));
  function closeNotice(){rememberBrowserNoticeDismissal(message);setExpanded(false);}
  if(!expanded)return null;
  return <div className="save-error project-notice" role="alert">
    <p>{message}</p>
    <div className="project-notice-actions">
      {onRecover && <Button variant="outline" onClick={onRecover}>Download herstelbestand</Button>}
      <Button variant="outline" onClick={onReload}>Herlaad opgeslagen project</Button>
      <Button variant="ghost" aria-label="Opslagmelding sluiten" onClick={closeNotice}>Sluiten ×</Button>
    </div>
  </div>;
}
