"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import ReportLibrary from './report-library';
import { Button } from '@/components/ui/button';
import { databaseSourceClient, type SourceIndex } from '@/lib/database-source-client.mjs';
import { readingBlocks } from '@/lib/report-reader.mjs';
import { displayReadingBlocks } from '@/lib/reader-display.mjs';
import { reportDisplaySource } from '@/lib/report-display-context.mjs';

type Props = ComponentProps<typeof ReportLibrary>;
type LoadedPage = Awaited<ReturnType<typeof databaseSourceClient.page>>;
type Result = { key: string; index?: SourceIndex; page?: LoadedPage; error?: string };
type Display = { identity: string; input: Props; source: Props['source']; document: NonNullable<Props['readingDocument']> };

export default function DatabaseReportLibrary(props: Props) {
  const ref = props.source.databaseSource!;
  const identity = `${ref.release}:${ref.version}:${ref.indexHash}:${props.source.source_sha256}`;
  const key = `${identity}:${props.page}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Result | null>(null);
  const [display, setDisplay] = useState<Display | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const index = await databaseSourceClient.index(ref, { signal: controller.signal });
        if (index.metadata.source_sha256 !== props.source.source_sha256)
          throw Error('Deze bronindex hoort bij een andere rapportversie.');
        const page = await databaseSourceClient.page(ref, index, props.page, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ key, index, page });
      } catch (error) {
        if (!controller.signal.aborted) setState({ key,
          error: error instanceof Error ? error.message : 'Bronpagina kon niet worden geopend.' });
      }
    })();
    return () => controller.abort();
  }, [key, ref, props.source.source_sha256, props.page, attempt]);
  const result = state?.key === key ? state : null;
  const reading = useMemo(() => {
    if (!result?.page || !result.index) return null;
    const source = reportDisplaySource(props.framework?.report.id,
      { ...props.source, pages: [result.page.page] });
    const current = { ...source.pages[0], start: result.page.start, end: result.page.end };
    return { source, document: { pages: result.index.pages, contents: result.index.contents,
      current: { ...current, blocks: displayReadingBlocks(readingBlocks(current), { readable: true }) } } };
  }, [result, props.source, props.framework?.report.id]);
  // Keep the component state, but freeze the ENTIRE last verified frame while
  // loading. New evidence/offsets must never be applied to the previous page.
  if (reading && (display?.input !== props || display.document !== reading.document))
    setDisplay({ identity, input: props, ...reading });
  const shown = reading ? { identity, input: props, ...reading } : display;
  const error = result?.error;
  useLayoutEffect(() => {
    const current = document.activeElement;
    const previous = lastFocus.current;
    const reader = readerRef.current, status = statusRef.current;
    if (!reading) {
      if (reader?.contains(current) || (current === document.body && previous && reader?.contains(previous))) {
        returnFocus.current = current instanceof HTMLElement && reader?.contains(current) ? current : previous;
        status?.focus({ preventScroll: true });
      } else if (!error && (status?.contains(current) || (current === document.body && previous && status?.contains(previous)))) {
        // Retry hides its button; keep focus on the live loading message.
        status?.focus({ preventScroll: true });
      }
    } else {
      if (status?.contains(current) || (current === document.body && previous && status?.contains(previous))) {
        const target = returnFocus.current;
        if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
        else reader?.querySelector<HTMLInputElement>('input[type="number"]')?.focus({ preventScroll: true });
      }
      returnFocus.current = null;
    }
  }, [reading, error]);
  return <div className="database-report-reader"
    onFocusCapture={event => { lastFocus.current = event.target; }}
    onBlurCapture={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) lastFocus.current = null; }}>
    <div ref={statusRef} hidden={Boolean(reading)} className="report-source-status" data-status-block="" role={error ? 'alert' : 'status'} tabIndex={-1}>
      {error ? <><p>{error}</p><p>Je onderzoek en selecties zijn behouden.</p></> : <p>Bronpagina ophalen…</p>}
      <Button hidden={!error} variant="outline" onClick={() => { setState(null); setAttempt(n => n + 1); }}>Opnieuw proberen</Button>
    </div>
    <div ref={readerRef} hidden={!reading}>
      {shown && <ReportLibrary key={shown.identity} {...shown.input} source={shown.source} readingDocument={shown.document}/>}
    </div>
  </div>;
}
