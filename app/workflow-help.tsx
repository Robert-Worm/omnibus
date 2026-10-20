"use client";
import { useRef, useState } from 'react';
import { X, ArrowRight, Compass, PencilLine } from 'lucide-react';
import {claimGuideIntroduction, contextualGuidance, GUIDE_SEEN_KEY} from '@/lib/contextual-guidance.mjs';
import {workflowInstructions} from '@/lib/workflow-instructions.mjs';
import type { Draft } from '@/lib/framework-types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';

export type GuideAction = {page: string; target?: string};
export type ExportGuideStatus = {missing: {id: string; label: string} | null; validation: string};

export default function WorkflowHelp({page, draft, ready, pendingQuestion = false,
  storageBlocked = false, hasModel = false, hasOpenModel = false, exportStatus, onAction}: {
  page: string; draft: Draft; ready: boolean; blocked?: boolean; pendingQuestion?: boolean;
  storageBlocked?: boolean; hasModel?: boolean; hasOpenModel?: boolean; exportStatus: ExportGuideStatus | null;
  onAction: (action: GuideAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [introduction, setIntroduction] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const nextAction = useRef<GuideAction | null>(null);
  const navigating = useRef(false);
  const introducedThisSession = useRef(false);
  const guidance = contextualGuidance({page, draft, ready, pendingQuestion, storageBlocked, hasModel, hasOpenModel, exportStatus});
  // Informational help needs no pretend "next" button that merely dismisses it.
  const action = guidance.next?.id === 'choose' ? null : guidance.next;
  const adviceTitle = action?.title || guidance.title;
  const adviceText = action?.text || guidance.explanation;
  const instructions = workflowInstructions(page);
  function changeOpen(value: boolean) {
    if (value) {
      let firstOpening = !introducedThisSession.current;
      try {
        firstOpening = firstOpening && !window.localStorage.getItem(GUIDE_SEEN_KEY);
        claimGuideIntroduction(window.localStorage);
      } catch { /* With unavailable storage, show the hint once per session on manual opening. */ }
      introducedThisSession.current = true;
      navigating.current = false; setIntroduction(firstOpening);
    }
    setOpen(value);
  }
  return <Dialog open={open} onOpenChange={changeOpen} onOpenChangeComplete={value => {
    if (!value && nextAction.current) {
      const action = nextAction.current; nextAction.current = null;
      onAction(action);
    }
  }}>
    <DialogTrigger render={<Button ref={trigger} variant="outline" className="workflow-help-trigger" aria-label="Wegwijzer: hulp bij deze stap" title="Hulp bij deze stap" />}>
      <Compass className="guide-icon" size={18} aria-hidden="true" /><span>Wegwijzer</span>
    </DialogTrigger>
    <DialogContent className="workflow-help-dialog contextual-help-dialog" showCloseButton={false}
      initialFocus={heading} finalFocus={() => navigating.current ? false : trigger.current}>
      <div className="guide-context"><Compass size={18} aria-hidden="true" /><span>Wegwijzer</span><span aria-hidden="true">·</span><span>{guidance.pageLabel}</span></div>
      <DialogHeader>
        <DialogTitle ref={heading} tabIndex={-1}>{adviceTitle}</DialogTitle>
        <DialogDescription>{adviceText}</DialogDescription>
      </DialogHeader>
      <DialogClose render={<Button variant="ghost" className="workflow-help-close" size="icon-sm" aria-label="Uitleg sluiten" />}><X size={18} aria-hidden="true" /></DialogClose>
      {!ready && <p>Je project wordt geladen. Je kunt de uitleg alvast lezen.</p>}
      <section className="guide-instructions" aria-label={instructions.title}>
        <h3>Zo pak je deze stap aan</h3>
        {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Preserve Safari list semantics when CSS removes list markers. */}
        <ol role="list">{instructions.steps.map((text,index)=>{
          const StepIcon=[Compass,PencilLine,ArrowRight][index];
          return <li key={text}><StepIcon className="guide-instruction-icon" size={18} aria-hidden="true"/><div><strong>{instructions.labels[index]}</strong><p>{text}</p></div></li>;
        })}</ol>
      </section>
      <div className="guide-actions">
        {action && <Button className="guide-primary" variant="default" onClick={() => {
          nextAction.current = {page: action.page, target: action.target};
          navigating.current = true; setOpen(false);
        }}>{action.label}<ArrowRight size={16} aria-hidden="true" /></Button>}
        <DialogClose render={<Button variant="ghost" className="guide-dismiss" />}>Sluiten</DialogClose>
      </div>
      {introduction && <p className="guide-welcome-note">Nieuw hier? Open ‘Alle stappen in het kort’. Begrippen staan onder ‘Over Omnibus’ onderaan.</p>}
      <details className="guide-overview"><summary>Alle stappen in het kort</summary>
      {adviceText !== guidance.explanation && <p>{guidance.explanation}</p>}
      {action?.reason && <p>{action.reason}</p>}
      <h3>Ook om te verkennen</h3>
      <p>Je kunt Omnibus ook gebruiken om bronnen te verkennen, normen te begrijpen en te combineren, zonder direct een volledig referentiekader te maken.</p>
      <h3>Zo werkt Omnibus</h3>
      <ol className="workflow-help-steps">
        <li><strong>Onderzoeksrichting of Verken je onderwerp</strong><p>Begin vraaggestuurd bij de behoefte van je opdrachtgever, of verken vanuit signalen een thema, proces, wet, kader of model. Wisselen van route wist je werk niet.</p></li>
        <li><strong>Verzamel</strong><p>Open inhoud in de viewers en kies relevante toetspunten of modelvragen. De mapjes met aantallen tonen je geopende inhoud. Wetten, kaders en onderwerpen kun je ook in hun geheel selecteren; modelvragen kies je afzonderlijk.</p></li>
        <li><strong>Bouw je kader</strong><p>Bouw je eigen vraag of begin met een voorstel vanuit je selectie. Koppel passende bouwstenen, los of per groep. Deelvragen zijn optioneel; alleen selecteren maakt nog geen koppeling.</p></li>
        <li><strong>Exporteer</strong><p>Kies normtoetsing, een risico-controlmatrix of interviewleidraad. Controleer welke gekoppelde bouwstenen meegaan en bekijk de bronverantwoording. Een losse modelleidraad kies je apart.</p></li>
      </ol>
      <p><strong>Blijf zelf beoordelen.</strong> Controleer afbakening, toepasselijkheid en bron. Een modelvraag of rapportbevinding is niet vanzelf een toetsnorm. De Wegwijzer beoordeelt niet of je onderzoek inhoudelijk volledig of juist is.</p>
      <p><strong>Bewaar project</strong> maakt een heropenbaar projectbestand. Bewaar dit naast je Excelbestand: wijzigingen in Excel worden niet teruggelezen. Bij een opslagprobleem biedt de Wegwijzer toegang tot de opslaginformatie; de opslagmelding staat ook bij Exporteer.</p>
      </details>
    </DialogContent>
  </Dialog>;
}
