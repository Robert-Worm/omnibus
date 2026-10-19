import type { ReactNode } from 'react';

/** Reusable decision heading; the page title remains the only h1. */
export function WorkflowIntro({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return <header className="workflow-section-intro">
    <h2 id={id} tabIndex={id ? -1 : undefined}>{title}</h2>
    <p>{children}</p>
  </header>;
}

/** The quiet outcome strip is shared by route, question and export choices. */
export function WorkflowOutcome({ title, children, action }: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return <div className="entry-shared-result">
    <div><strong>{title}</strong><p>{children}</p></div>
    {action && <div className="workflow-outcome-action">{action}</div>}
  </div>;
}
