"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Framework, Evidence } from "@/lib/framework-types";
import {
  rawUnits,
  markedSegments,
  referenceLabel,
} from "@/lib/report-reader.mjs";
import type { Unit } from "@/lib/report-reader.mjs";
import type { IndexedPage, ReadingBlock } from "@/lib/report-reader.mjs";
import type { DatabaseSource } from "@/lib/database-source-client.mjs";
import {createSourceReaderDocument} from '@/lib/source-reader-document.mjs';
import {reportPdfLink} from '@/lib/report-pdf-link.mjs';
import ReportContextLinks from './report-context-links';
export default function ReportLibrary({
  framework,
  source,
  reportThemes,
  page,
  onPage,
  onTopic,
  onRisks,
  evidence,
  onClearEvidence,
  onReturn,
  document,
  sourcePassages = [],
  sourceTarget,
  sourceFocusRequest = 0,
  compactSource = false,
  readingDocument,
}: {
  framework?: Framework;
  document?: {id:string; title:string; localPdf?:string; pdf_hash?:string; format?:string; source_file_hash?:string; attribution?:string;licenseUrl?:string;selectionNotice?:string;sourceUrl?:string};
  sourcePassages?: {start:number;end:number;page:number;label:string;quote:string}[];
  sourceTarget?: number;
  sourceFocusRequest?: number;
  compactSource?: boolean;
  readingDocument?: { pages: {page:number}[]; contents: {page:number;start:number;text:string}[]; current: IndexedPage & {blocks:ReadingBlock[]} };
  source: { source_sha256: string; databaseSource?: DatabaseSource; pages: { page: number; text: string; incompleteText?:boolean;visualContext?:{id:string;label:string;text:string;image_hashes:{sha256:string}[];transcription?:{text:string;method:string}}[];label?:string;cells?:{sheet:string;cell:string;mergeRange:string;masterCell?:string;text:string;start:number;end:number}[] }[] };
  reportThemes: { id: string; title: string }[];
  page: number;
  onPage: (page: number) => void;
  onTopic: (id: string) => void;
  onRisks?: ()=>void;
  evidence?: Evidence;
  onClearEvidence: () => void;
  onReturn: () => void;
}) {
  const report = document ?? framework!.report;
  const reader = useMemo(() => readingDocument ? null : createSourceReaderDocument(source.pages), [source.pages, readingDocument]);
  const pages = readingDocument?.pages ?? reader!.pages;
  const contents = readingDocument?.contents ?? reader!.contents;
  const current = readingDocument?.current ?? reader!.read(page)!;
  const [mode, setMode] = useState("reading");
  const [target, setTarget] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [pageEntry, setPageEntry] = useState({ page, text: String(page), error: "" });
  const pageInput = pageEntry.page === page ? pageEntry.text : String(page);
  const pageError = pageEntry.page === page ? pageEntry.error : "";
  const readerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // A source tab can be mounted but hidden. Do not steal focus from the criterion.
    if (!readerRef.current?.getClientRects().length) return;
    // Tab panels can stay mounted. Only a visible passage can receive focus.
    const marks=Array.from(readerRef.current.querySelectorAll<HTMLElement>('mark[data-passage-start]'))
      .filter(node=>node.getClientRects().length);
    const requested = target ?? sourceTarget;
    const node =
      requested !== undefined && requested !== null
        ? marks.find(node =>
          Number(node.dataset.passageStart) <= requested && Number(node.dataset.passageEnd) > requested)
          ?? Array.from(readerRef.current.querySelectorAll<HTMLElement>(`[data-source-start="${requested}"]`)).find(node=>node.getClientRects().length)
        : marks[0];
    const focused = node ?? (sourcePassages.length ? marks[0] : null);
    if (focused) {
      const comparison = compactSource ? focused.closest<HTMLElement>('.comparison-source') : null;
      if (comparison && comparison.scrollHeight > comparison.clientHeight) {
        // Keep the surrounding point and source controls in place. Only the
        // embedded document scrolls to its passage, never the whole workspace.
        const rect = focused.getBoundingClientRect(), frame = comparison.getBoundingClientRect();
        comparison.scrollTop += rect.top - frame.top - comparison.clientHeight / 2 + rect.height / 2;
      } else if (!compactSource) focused.scrollIntoView({ block: "center", inline:"nearest" });
      focused.focus({ preventScroll: true });
    }
    // Changing reading/raw mode alone leaves keyboard focus on the chosen tab.
  }, [page, evidence?.id, target, focusRequest, sourceTarget, sourceFocusRequest, compactSource, sourcePassages.length]);
  function marked(units: Unit[]) {
    return markedSegments(units, sourcePassages.length ? sourcePassages : evidence).map((part, i) =>
      part.marked ? (
        <mark tabIndex={-1} key={i} data-passage-start={part.start} data-passage-end={part.end}>
          {part.text}
        </mark>
      ) : (
        part.text
      ),
    );
  }
  function submitPage() {
    const n = Number(pageInput);
    if (Number.isInteger(n) && n >= 1 && n <= pages.length) {
      setTarget(null);
      setPageEntry({ page: n, text: String(n), error: "" });
      onPage(n);
    } else
      setPageEntry({
        page,
        text: pageInput,
        error: `Vul een pagina van 1 tot en met ${pages.length} in.`,
      });
  }
  const visibleEvidence = evidence && evidence.start < current.end && evidence.end > current.start;
  const layoutNotice = <>
    <p className="reader-layout-notice">Zachte woordafbrekingen zijn samengevoegd. De opgeslagen brontekst en markeringen zijn ongewijzigd; bekijk de exacte extractie via ‘Ongewijzigde brontekst’.</p>
    {current.blocks.some(block => block.kind === 'verbatim') && <p className="reader-layout-notice">
      Bij blokken met ruime tussenstanden zijn indeling en volledigheid niet gecontroleerd. Controleer tabellen en figuren in de oorspronkelijke bron.
    </p>}
  </>;
  if(document?.format==='xlsx-cells'){
    const fragment=source.pages.find(p=>p.page===current.page)!;
    return <section className="report-library spreadsheet-reader" aria-label="Spreadsheet broncellen">
      <div className="report-card"><div><p className="eyebrow">SELECTIE UIT BRONWERKMAP</p><h1>{document.title}</h1><p>{pages.length} bronfragmenten · oorspronkelijke celadressen</p></div></div>
      <p className="edit-note">Letterlijke broncellen · <a href={document.sourceUrl} target="_blank" rel="noreferrer">Bronpagina bij de uitgever ↗</a></p>
      <nav className="report-navigation" aria-label="Bronfragment kiezen">
        <Button variant="outline" disabled={current.page===1} onClick={()=>onPage(current.page-1)}>← Vorig bronfragment</Button>
        <label>Bronfragment <select value={current.page} onChange={e=>onPage(Number(e.target.value))}>{source.pages.map(p=><option key={p.page} value={p.page}>{p.label}</option>)}</select></label>
        <Button variant="outline" disabled={current.page===pages.length} onClick={()=>onPage(current.page+1)}>Volgend bronfragment →</Button>
      </nav>
      <article ref={readerRef} className="report-reading" aria-label={fragment.label}>
        <h2>{fragment.label}</h2>
        {fragment.cells?.map(c=><section key={c.cell} data-source-start={c.start} data-source-end={c.end} tabIndex={-1}>
          <h3>{c.sheet}!{c.cell}</h3><p className="edit-note">{c.mergeRange===c.cell?'Celadres':'Samengevoegd bronbereik'}: {c.mergeRange}</p>
          {c.text?<pre className="report-page-text" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{marked(rawUnits(c.text,c.start))}</pre>:<p className="edit-note">{c.masterCell?`Gedekte cel binnen ${c.mergeRange}. De bronwaarde staat in hoofdcel ${c.masterCell}.`:'Lege broncel'}</p>}
        </section>)}
      </article>
      <details className="reader-method"><summary>Over deze bronselectie</summary>
        <p>{document.selectionNotice} Dit is geen volledige spreadsheetweergave. Bronfragmentnummers zijn navigatie, geen oorspronkelijke paginanummers.</p>
        <p>{document.attribution} · <a href={document.licenseUrl} target="_blank" rel="noreferrer">Licentie</a>. Selectie en presentatie aangepast; celinhoud niet herschreven. Oorspronkelijke werkmap niet lokaal meegeleverd.</p>
        <p>Alleen expliciet vrijgegeven celposities zijn opgenomen. Niet meegeleverde cellen worden niet gereconstrueerd. Markeringen verwijzen naar de letterlijke waarden van deze bronversie; ze bevestigen geen actuele wettelijke juistheid.</p>
        <p>Interne broncode: {document.id}</p><p className="hash">Controlegetal publieke fragmenttekst (SHA-256): {source.source_sha256}</p>
        <p className="hash">Controlegetal oorspronkelijke XLSX (niet meegeleverd): {document.source_file_hash}</p>
      </details>
    </section>;
  }
  return (
    <section className="report-library">
      {!compactSource && <div className="report-card">
        <div>
          <p className="eyebrow">{document ? "BRONDOCUMENT" : "RAPPORTBIBLIOTHEEK"}</p>
          <h1>
            <span className="reader-report-id">{report.id}</span> {report.title}
          </h1>
          <p>
            {!document && framework && (framework.report.date
              ? `Rapportdatum ${framework.report.date.split("-").reverse().join("-")}`
              : `Verslagjaar ${framework.report.year}`)}{!document && ' · '}
            {pages.length} pagina’s{document && ' · lokale bronversie'}
          </p>
          {!document && framework?.report.scope && <details className="report-scope-summary"><summary>Waar gaat dit rapport over?</summary><p>{framework.report.scope}</p></details>}
        </div>
        {!document&&<div className="report-overview-actions">{onRisks&&<Button onClick={onRisks}>Bekijk normen en toetspunten →</Button>}<ReportContextLinks items={reportThemes} onOpen={onTopic}/></div>}
      </div>}
      {report.localPdf && !source.databaseSource && <p className="edit-note">
        <a href={reportPdfLink(report,current.page)||undefined} target="_blank" rel="noreferrer">Open pagina {current.page} in de lokale PDF</a>
        {current.incompleteText && ' · Deze pagina heeft geen volledige tekstlaag. Lees de oorspronkelijke PDF.'}
      </p>}
      {source.pages.find(p => p.page === current.page)?.visualContext?.map(note => (
        <aside key={note.id} className="reader-evidence" aria-label="Visuele broncontext">
          <strong>{note.label}</strong>
          <p className="edit-note">Deze afzonderlijke weergave verandert de opgeslagen brontekst niet en heeft geen letterlijke tekstmarkering. Controleer de oorspronkelijke PDF; beperkingen en toegeschreven standpunten blijven gelden.</p>
          <p style={{whiteSpace:'pre-wrap'}}>{note.text}</p>
          {note.transcription&&<details><summary>Lees de visuele transcriptie</summary><p className="edit-note">{note.transcription.method}</p><p style={{whiteSpace:'pre-wrap'}}>{note.transcription.text}</p></details>}
          <details><summary>Herkomst van de visuele lezing</summary>
            <p>Referentie: {note.id}</p>
            {note.image_hashes.map((image, i) => <p className="hash" key={i}>Controlegetal gelezen paginabeeld (SHA-256): {image.sha256}</p>)}
          </details>
        </aside>
      ))}
      {evidence && framework && (
        <aside className="reader-evidence" aria-label="Geselecteerde passage">
          <strong>{referenceLabel(framework, evidence.id)}</strong>
          <p>
            {visibleEvidence
              ? "De geselecteerde passage is geel gemarkeerd."
              : "U bekijkt een andere pagina dan de geselecteerde passage."}
          </p>
          <div>
            <Button
              variant="outline"
              onClick={() => {
                setTarget(null);
                setFocusRequest((n) => n + 1);
                onPage(evidence.page);
              }}
            >
              Naar geselecteerde passage
            </Button>
            <Button variant="outline" onClick={onReturn}>
              Terug naar onderbouwing
            </Button>
            <Button variant="ghost" onClick={onClearEvidence}>
              Markering wissen
            </Button>
          </div>
          <details>
            <summary>Letterlijke passage bekijken</summary>
            <blockquote>{evidence.quote}</blockquote>
          </details>
        </aside>
      )}
      {!compactSource && <details className="reader-contents">
        <summary>Inhoud verkennen</summary>
        <p className="edit-note">
          Automatisch herkende koppen; geen volledige oorspronkelijke inhoudsopgave.
        </p>
        <nav aria-label="Herkende rapportkoppen">
          {contents.map((item) => (
            <Button
              key={item.start}
              variant="link"
              onClick={() => {
                setMode("reading");
                setTarget(item.start);
                setFocusRequest((n) => n + 1);
                onPage(item.page);
              }}
            >
              <span>{item.text}</span>
              <span>p. {item.page}</span>
            </Button>
          ))}
        </nav>
      </details>}
      <form
        className="report-navigation"
        onSubmit={(e) => {
          e.preventDefault();
          submitPage();
        }}
      >
        <Button
          type="button"
          variant="outline"
          disabled={current.page === 1}
          onClick={() => {
            setTarget(null);
            onPage(current.page - 1);
          }}
        >
          ← Vorige pagina
        </Button>
        <label htmlFor="report-page">Pagina</label>
        <Input
          id="report-page"
          type="number"
          min={1}
          max={pages.length}
          value={pageInput}
          aria-invalid={Boolean(pageError)}
          aria-describedby={pageError ? "report-page-error" : undefined}
          onChange={(e) => setPageEntry({ page, text: e.target.value, error: "" })}
        />
        <span>van {pages.length}</span>
        <Button type="submit" variant="outline">
          Ga
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={current.page === pages.length}
          onClick={() => {
            setTarget(null);
            onPage(current.page + 1);
          }}
        >
          Volgende pagina →
        </Button>
      </form>
      {pageError && (
        <p id="report-page-error" role="alert">
          {pageError}
        </p>
      )}
      <Tabs value={mode} onValueChange={(value) => setMode(String(value))}>
        <TabsList variant="line" aria-label="Rapportweergave">
          <TabsTrigger value="reading">Leesweergave</TabsTrigger>
          <TabsTrigger value="raw">Ongewijzigde brontekst</TabsTrigger>
        </TabsList>
        <div ref={readerRef}>
          <TabsContent value="reading">
            <article className="report-reading" aria-label={`Leesweergave pagina ${current.page}`}>
              <p className="reader-page-label">Pagina {current.page} · leesweergave</p>
              {!compactSource && layoutNotice}
              {current.blocks.map((block) => {
                const props = { "data-source-start": block.start, "data-source-end": block.end, tabIndex: -1 };
                if (block.kind === "heading")
                  return (
                    <h2 key={block.start} {...props}>
                      {marked(block.units)}
                    </h2>
                  );
                if (block.kind === "verbatim")
                  return (
                    <section key={block.start} {...props} className="reader-verbatim">
                      <pre>{marked(block.units)}</pre>
                    </section>
                  );
                return (
                  <p
                    key={block.start}
                    {...props}
                    className={block.kind === "list" ? "reader-list-item" : undefined}
                  >
                    {marked(block.units)}
                  </p>
                );
              })}
            </article>
            {compactSource && layoutNotice}
          </TabsContent>
          <TabsContent value="raw">
            <p className="edit-note">
              Exact dezelfde tekst als de extractie, inclusief afgebroken regels en
              paginamarkeringen. Dit is geen facsimile van de PDF.
            </p>
            <pre
              className="report-page-text"
              aria-label={`Ongewijzigde brontekst pagina ${current.page}`}
            >
              {marked(rawUnits(current.text, current.start))}
            </pre>
          </TabsContent>
        </div>
      </Tabs>
      <details className="reader-method">
        <summary>Over deze leesweergave en bron</summary>
        <p>Dit is uitgelezen tekst, geen weergave van de oorspronkelijke PDF. Figuren en tabellen kunnen onvolledig zijn. Controleer belangrijke passages in de oorspronkelijke PDF.</p>
        <p>
          Alleen de presentatie is aangepast: regelafbrekingen en overtollige witruimte zijn
          samengevoegd, koppen en alinea’s zijn automatisch herkend. Zachte afbreektekens zijn verborgen;
          tussen letters is ook de daaropvolgende witruimte samengevoegd. Gewone koppeltekens en
          consolidatiemarkeringen blijven staan. De inhoud is niet herschreven of aangevuld. Een paginagrens kan midden in
          een alinea vallen.
        </p>
        <p>Interne broncode: {report.id}</p>
        <p className="hash">Controlegetal uitgelezen tekst (SHA-256): {source.source_sha256}</p>
        {report.pdf_hash && (
          <p className="hash">
            Controlegetal oorspronkelijke PDF (SHA-256): {report.pdf_hash}
          </p>
        )}
      </details>
    </section>
  );
}
