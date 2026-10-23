import type { Draft } from "@/lib/framework-types";
import {useMemo} from 'react';
import {catalogueRevision} from '@/lib/catalogue-runtime.mjs';
import {cioSelectionNotices} from '@/lib/foundation-workspace.mjs';

export default function LegacyCioNotice({ draft }: { draft: Draft }) {
  const investigation=draft.investigation,selectionKey=JSON.stringify(draft.included),revision=catalogueRevision();
  // Export drafts are recreated for settings edits. Only selected IDs, source
  // material and catalogue changes affect this notice, not fonts or authors.
  const {legacy,superseded}=useMemo(()=>{
    const selection={investigation,included:JSON.parse(selectionKey)};
    return {revision,...cioSelectionNotices(selection)};
  },[investigation,selectionKey,revision]);
  if (!legacy.length && !superseded.length) return null;
  return <aside className="legacy-cio-notice" aria-label="Eerdere CIO-selectie">
    {!!superseded.length && <>
      <strong>{superseded.length} eerdere CIO-normen hebben een vervanger</strong>
      <p>Je oude teksten en koppelingen zijn behouden en gaan mee als ze geselecteerd en gekoppeld zijn.
        Vergelijk ze met de herijkte normen voordat je beide versies gebruikt. Oude keuzes tellen niet mee in de nieuwe bibliotheektellers.</p>
      <details><summary>Vervangingen bekijken</summary><ul>{superseded.map((m: {id: string; title: string; replacementId: string; replacementTitle: string}) => <li key={m.id}>
        {m.title} → {m.replacementId} · {m.replacementTitle}
      </li>)}</ul></details>
      <a href="#open-grondslagen">Herijkte CIO-normen kiezen</a>
    </>}
    {!!legacy.length && <>
    <strong>{legacy.length} eerdere CIO-groep{legacy.length === 1 ? "" : "en"} in je selectie</strong>
    <p>Deze bewaarde bouwstenen bevatten meerdere toetspunten. Je bewerkingen en koppelingen zijn behouden.
      Kies de losse normen en haal de oude groepen uit je selectie voordat je afzonderlijke oordelen vastlegt.</p>
    <a href="#open-grondslagen">Losse CIO-normen kiezen</a>
    </>}
  </aside>;
}
