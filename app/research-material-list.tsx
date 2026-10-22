import {useState, type ReactNode} from 'react';
import type {Framework} from '@/lib/framework-types';
import {viewerRowBatches} from '@/lib/viewer-rendering.mjs';
import DeferredViewerSection from './deferred-viewer-section';

type MaterialListProps = {
  lines: Framework['lines'];
  renderItem: (line: Framework['lines'][number]) => ReactNode;
};

// Keep the callback inside a child component: constructing all item previews
// before passing them to DeferredViewerSection would still do the hidden work.
function MaterialBatch({lines, renderItem}: MaterialListProps) {
  return <>{lines.map(renderItem)}</>;
}

export function ResearchMaterialList({lines, renderItem}: MaterialListProps) {
  return <>{viewerRowBatches(lines).map((batch: Framework['lines'], index: number) =>
    <DeferredViewerSection key={batch[0].id} immediate={index === 0} count={batch.length}
      label={`${batch.length} bouwstenen tonen`}>
      <MaterialBatch lines={batch} renderItem={renderItem}/>
    </DeferredViewerSection>)}</>;
}

/** Native disclosure behavior; once opened, controls and their focus stay alive. */
export function ResearchDisclosure({open=false, summary, children, className}: {
  open?: boolean;
  summary: ReactNode;
  children: () => ReactNode;
  className?: string;
}) {
  const [visited, setVisited] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const [previousDefault, setPreviousDefault] = useState(open);
  if (previousDefault !== open) {
    setPreviousDefault(open);
    setExpanded(open);
    if (open) setVisited(true);
  }
  return <details className={className} open={expanded} onToggle={event => {
    setExpanded(event.currentTarget.open);
    if (event.currentTarget.open) setVisited(true);
  }}>
    <summary>{summary}</summary>
    {(expanded || visited) && children()}
  </details>;
}

export function ResearchMaterialGroup({open, summary, lines, renderItem}: MaterialListProps & {
  open: boolean;
  summary: ReactNode;
}) {
  return <ResearchDisclosure open={open} summary={summary}>
    {()=><ResearchMaterialList lines={lines} renderItem={renderItem}/>}
  </ResearchDisclosure>;
}
