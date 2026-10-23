"use client";
import { useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { questionFormulations, cycleQuestionFormulation } from "@/lib/content-adapters/question-formulations.mjs";
import { activeIntegrityModel } from '@/lib/cev-active.mjs';
import DeferredViewerSection from './deferred-viewer-section';
import { hasReviewedQuestion, initialModelLibrary } from '@/lib/model-library.mjs';
import { practiceQuestionRevision } from '@/lib/content-adapters/interview-practice-review.mjs';
import { questionWorkbenchPresentation } from '@/lib/content-adapters/research-models.mjs';
const reviewedQuestions = activeIntegrityModel().items.flatMap(i=>i.questions);
const reviewedModels: LibraryModel[] = initialModelLibrary().models;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { interviewLevels, modelDisplayName } from "@/lib/interview-structure.mjs";
import ModelInformation from './model-information';
import { cevLiterature } from "@/lib/cev-literature.mjs";
import {
  contextualQuestion,
  chooseModelQuestion,
  effectiveModelCount,
  chosenQuestionLevels,
  independentModelLevels,
  modelQuestionApplicable,
} from "@/lib/model-context.mjs";
import type { LibraryModel, LibraryQuestion } from "./model-library";

export default function CevWorkbench({
  model,
  disabled,
  onChange,
  onAbout,
  onClose,
  activeId,
  onActiveChange,
  suggestedSubject = "",
}: {
  model: LibraryModel;
  disabled: boolean;
  onChange: (patch: Partial<LibraryModel>) => void;
  onAbout: () => void;
  onClose: () => void;
  activeId:string;
  onActiveChange:(id:string)=>void;
  suggestedSubject?: string;
}) {
  const setActiveId=onActiveChange;
  const isCev = model.id === 'CEV-AI';
  const presentation = questionWorkbenchPresentation(model);
  const [indicatorId, setIndicatorId] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [evidence, setEvidence] = useState(false);
  const addQuestionButton=useRef<HTMLButtonElement>(null);
  const [removalNotice,setRemovalNotice]=useState('');
  const item = model.items.find((i) => i.id === activeId) ?? model.items[0];
  const level = model.interviewLevel || "operational";
  const subject = model.researchSubject || "";
  const count = effectiveModelCount(model);
  const singleEntryPoints = !isCev && model.items.length === 1;
  const entryPointCount = singleEntryPoints && model.selected && item?.included
    ? item.indicators?.filter(d => d.included && item.questions?.some(q => q.included && q.indicatorId === d.id)).length ?? 0 : 0;
  const incomplete = (i: typeof item) =>
    model.selected &&
    i.included &&
    i.questions?.some(
      (q) =>
        q.included &&
        i.indicators?.some((d) => d.id === q.indicatorId && d.included) &&
        chosenQuestionLevels(model, q).some((l: string) => !q.variants?.[l]?.trim()),
    );
  const questions = (item?.questions ?? []).filter(
    (q) =>
      modelQuestionApplicable(model, q) &&
      (!indicatorId || q.indicatorId === indicatorId) &&
      (!onlySelected ||
        (model.selected &&
          item.included &&
          chosenQuestionLevels(model, q).includes(level) &&
          item.indicators?.some((i) => i.id === q.indicatorId && i.included))),
  );
  function editQuestion(id: string, patch: Partial<LibraryQuestion>) {
    onChange({
      items: model.items.map((i) =>
        i.id !== item.id
          ? i
          : {
              ...i,
              questions: i.questions?.map((q) =>
                q.id === id ? { ...q, ...patch, origin: "user" } : q,
              ),
            },
      ),
    });
  }
  if (!item) return null;
  return (
    <section className="cev-workbench model-question-browser" aria-label={isCev ? 'CEV vragenwerkplaats' : modelDisplayName(model) + ' vragenwerkplaats'}>
      <header className="cev-heading law-browse-intro">
        <div className="law-viewer-heading">
          <h2>{modelDisplayName(model)}</h2>
          <output>{model.items.length} {model.items.length===1?'onderdeel':'onderdelen'}</output>
        </div>
        <div className="cev-heading-actions"><ModelInformation model={model} onAbout={onAbout}/><Button variant="outline" onClick={onClose}>Terug naar modellen</Button></div>
      </header>
      <div className="cev-setup">
      <div className="cev-context">
        <label htmlFor="cev-subject">
          Onderwerp van het gesprek
          <Input
            id="cev-subject"
            placeholder={presentation.placeholder}
            maxLength={240}
            disabled={disabled}
            value={subject}
            onChange={(e) => onChange({ researchSubject: e.target.value })}
          />
        </label>
        {!subject.trim() && suggestedSubject.trim() && <Button variant="outline" disabled={disabled}
          className="use-goal-subject" onClick={() => onChange({researchSubject: suggestedSubject.slice(0,240)})}>
          Gebruik onderwerp uit doelstelling: {suggestedSubject}
        </Button>}
      </div>
      <div className="cev-level-summary" aria-label="Gekozen vragen per gespreksniveau">
        <strong>Met wie spreek je?</strong>
        {interviewLevels.map(l => <Button key={l.id} variant="outline" aria-pressed={level === l.id}
          disabled={disabled} onClick={() => {onChange({...independentModelLevels(model), interviewLevel:l.id}); setEditing(null);}}>
          {l.label} · {model.selected ? model.items.filter(i => i.included).reduce((n,i) => n + (i.questions?.filter(q =>
            chosenQuestionLevels(model,q).includes(l.id) && i.indicators?.some(d => d.id === q.indicatorId && d.included)).length ?? 0),0) : 0}
        </Button>)}
      </div>
      </div>
      <div className="cev-selection">
        <strong>
          {count} {count===1?'vraag':'vragen'} gekozen ·{" "}
          {singleEntryPoints ? entryPointCount :
            model.items.filter(
              (i) =>
                model.selected &&
                i.included &&
                i.questions?.some(
                  (q) =>
                    q.included && i.indicators?.some((d) => d.id === q.indicatorId && d.included),
                ),
            ).length
          }{" "}
          van {singleEntryPoints ? item.indicators?.length ?? 0 : model.items.length} {singleEntryPoints ? 'gespreksingangen' : isCev ? 'dimensies' : 'onderdelen'}
        </strong>
        <output className="model-selection-status">Je vraagselectie wordt direct in je kader bewaard.</output>
        <Button
          variant="ghost"
          disabled={disabled || !count}
          onClick={() =>
            onChange({
              items: model.items.map((i) => ({
                ...i,
                questions: i.questions?.map((q) => ({ ...q, included: false, selectedLevels: [] })),
              })),
            })
          }
        >
          Vraagselectie wissen
        </Button>
      </div>
      {model.items.some(incomplete) && (
        <p role="alert">
          Een gekozen vraag mist tekst bij een gespreksniveau. Controleer de dimensie met ! en vul de vraag aan of vink dat niveau uit.
        </p>
      )}
      <div className="cev-panels">
        <nav className="cev-dimensions" data-single={model.items.length === 1} aria-label={isCev ? 'CEV dimensies' : 'Modelonderdelen'}>
          <div className="cev-dimensions-caption"><span>{isCev ? 'Dimensie' : 'Onderdeel'}</span><span title="Gekozen vragen over alle gespreksniveaus">Gekozen vragen</span></div>
          {model.items.map((i, index) => (
            <Button
              variant="ghost"
              key={i.id}
              aria-pressed={i.id === item.id}
              onClick={() => {
                setActiveId(i.id);
                setIndicatorId("");
                setEditing(null);
              }}
            >
              <span className="cev-dimension-number">{index + 1}</span>
              <span>
                <span className="cev-dimension-heading">
                  <strong>{i.title}{incomplete(i) ? " !" : ""}</strong>
                  <span className="cev-count" title={"Gekozen vragen over alle gespreksniveaus in " + i.title}>
                    <span className="sr-only">Gekozen vragen over alle gespreksniveaus: </span>{model.selected && i.included
                      ? i.questions?.filter(
                          (q) =>
                            q.included &&
                            i.indicators?.some((d) => d.id === q.indicatorId && d.included),
                        ).reduce((n,q) => n + chosenQuestionLevels(model,q).length, 0)
                      : 0}
                  </span>
                </span>
                <span className="cev-dimension-definition">{i.definition}</span>
              </span>
            </Button>
          ))}
        </nav>
        <section className="cev-questions" aria-label={"Vragen voor " + item.title}>
          <header>
            <h3>{item.title}</h3>
            <p className="cev-mobile-definition">{item.definition}</p>
            <p>{item.relevance}</p>
            <p className="cev-note">{item.boundary}</p>
          </header>
          {model.id === 'COM-B' && item.id === 'COMB-C' && <div className="cev-applicability">
            <label htmlFor="comb-physical-tasks">
              <Checkbox id="comb-physical-tasks" disabled={disabled}
                checked={model.physicalTasksRelevant === true}
                onCheckedChange={v => {onChange({physicalTasksRelevant:Boolean(v)}); setIndicatorId('');}} />
              Dit gedrag vraagt om een lichamelijke vaardigheid
            </label>
            <p className="cev-note">Toon vragen over het uitvoeren van een concrete handeling, bijvoorbeeld bij onderhoud of inspecties. Reeds gekozen vragen blijven zichtbaar.</p>
          </div>}
          <div className="cev-filters" aria-label="Indicatorfilter">
            <Button
              variant="outline"
              aria-pressed={!indicatorId}
              onClick={() => setIndicatorId("")}
            >
              Alle vragen
            </Button>
            {item.indicators?.filter(i => item.questions?.some(q => q.indicatorId === i.id && modelQuestionApplicable(model,q))).map((i) => (
              <Button
                key={i.id}
                variant="outline"
                aria-pressed={indicatorId === i.id}
                onClick={() => setIndicatorId(indicatorId === i.id ? "" : i.id)}
              >
                {i.title}
              </Button>
            ))}
          </div>
          <div className="cev-options">
            <label htmlFor="cev-only-selected">
              <Checkbox
                id="cev-only-selected"
                checked={onlySelected}
                onCheckedChange={(v) => setOnlySelected(Boolean(v))}
              />{" "}
              Alleen gekozen
            </label>
            <label htmlFor="cev-evidence">
              <Checkbox
                id="cev-evidence"
                checked={evidence}
                onCheckedChange={(v) => setEvidence(Boolean(v))}
              />{" "}
              Bewijssuggesties tonen
            </label>
          </div>
          {questions.map((q,index) => {
            const indicator = item.indicators?.find((i) => i.id === q.indicatorId);
            const included = model.selected && item.included && indicator?.included && chosenQuestionLevels(model,q).includes(level);
            const wording = contextualQuestion(q.variants?.[level] ?? "", subject);
            const formulations = questionFormulations(q, level);
            const practiceRevision = practiceQuestionRevision(model.id, q,
              reviewedModels.find(m => m.id === model.id)?.items.flatMap(i => i.questions ?? []).find(p => p.id === q.id));
            // Editing a supplied question also sets origin=user; those questions remain protected.
            const ownQuestion=q.origin==='user'&&!reviewedModels.find(m=>m.id===model.id)?.items.some(i=>i.questions?.some(original=>original.id===q.id));
            return (
              <DeferredViewerSection key={q.id} immediate={index<4||editing===q.id} label={`Toon vraag: ${q.title}`}>
              <article className={"cev-question" + (included ? " is-chosen" : "")}>
                <div className="cev-question-heading">
                <label className="cev-question-choice" htmlFor={q.id + "-choose"}>
                  <Checkbox
                    id={q.id + "-choose"}
                    disabled={disabled || (!included && !wording.trim())}
                    checked={Boolean(included)}
                    onCheckedChange={(v) =>
                      onChange(chooseModelQuestion(model, item.id, q.id, Boolean(v), level))
                    }
                  />
                  <span>
                    <span className="cev-question-kind">{q.title}</span>
                    <span className="cev-wording" aria-live="polite">
                      {wording || "Voor dit niveau ontbreekt de vraag. Kies Aanpassen."}
                    </span>
                  </span>
                </label>
                {ownQuestion&&<Button variant="ghost" size="icon-sm" className="cev-remove-question"
                  disabled={disabled} aria-label={'Eigen vraag verwijderen: '+q.title} title="Eigen vraag verwijderen"
                  onClick={()=>{
                    onChange({items:model.items.map(i=>i.id===item.id?{...i,questions:i.questions?.filter(question=>question.id!==q.id)}:i)});
                    if(editing===q.id)setEditing(null);
                    setRemovalNotice('Eigen vraag verwijderd. Herstellen kan met Ongedaan maken.');
                    requestAnimationFrame(()=>addQuestionButton.current?.focus());
                  }}><X size={16} aria-hidden="true"/></Button>}
                </div>
                <details className="cev-question-detail">
                <summary>Doorvragen en auditoruitleg</summary>
                <p className="cev-probe">
                  <strong>Doorvraag</strong> {contextualQuestion(q.probes, subject)}
                </p>
                <p className="cev-note"><strong>Voor de auditor:</strong> {q.purpose || indicator?.definition}</p>
                </details>
                {evidence && (
                  <div className="cev-evidence">
                    <p>
                      <strong>Documenten</strong> {indicator?.documents}
                    </p>
                    <p>
                      <strong>Observatie</strong> {indicator?.observation}
                    </p>
                    <p>
                      Vraag alleen noodzakelijke, zo mogelijk geanonimiseerde informatie. Een
                      ontbrekend document is geen bewijs van ongewenst gedrag.
                    </p>
                  </div>
                )}
                <div className="cev-question-actions">
                {practiceRevision && <Button variant="outline" disabled={disabled}
                  onClick={() => editQuestion(q.id,practiceRevision)}>Gebruik herziene vraag (3 niveaus)</Button>}
                {hasReviewedQuestion(q) && <Button variant="outline" disabled={disabled}
                  onClick={() => {
                    const latest=reviewedQuestions.find(p=>p.id===q.id);
                    if(latest) editQuestion(q.id,{...latest,included:q.included,selectedLevels:q.selectedLevels,formulationBase:{}});
                  }}>Gebruik herziene vraag (3 niveaus)</Button>}
                <Button variant="outline" disabled={disabled || formulations.length < 2}
                  aria-label={"Andere formulering voor " + q.title + " · " + interviewLevels.find(l => l.id === level)?.label}
                  onClick={() => editQuestion(q.id, cycleQuestionFormulation(q,level))}>
                  <RefreshCw size={15} aria-hidden="true" /> Andere formulering
                  {formulations.length > 1 && <span>{Math.max(0,formulations.indexOf(q.variants?.[level] ?? ""))+1}/{formulations.length}</span>}
                </Button>
                <Button
                  variant="outline"
                  aria-expanded={editing === q.id}
                  onClick={() => setEditing(editing === q.id ? null : q.id)}
                >
                  {editing === q.id ? "Bewerking sluiten" : "Vraag aanpassen"}
                </Button>
                </div>
                {editing === q.id && (
                  <div className="cev-question-editor">
                    <label htmlFor={q.id + "-title-edit"}>
                      Korte naam
                      <Input
                        id={q.id + "-title-edit"}
                        value={q.title}
                        disabled={disabled}
                        maxLength={200}
                        onChange={(e) => editQuestion(q.id, { title: e.target.value })}
                      />
                    </label>
                    <label htmlFor={q.id + "-edit"}>
                      Vraag voor {interviewLevels.find((l) => l.id === level)?.label}
                      <Textarea
                        id={q.id + "-edit"}
                        value={q.variants?.[level] ?? ""}
                        disabled={disabled}
                        maxLength={2000}
                        onChange={(e) =>
                          editQuestion(q.id, {
                            variants: { ...q.variants, [level]: e.target.value },
                            formulationBase: { ...q.formulationBase, [level]: e.target.value },
                            ...(level === "operational" ? { question: e.target.value } : {}),
                          })
                        }
                      />
                    </label>
                    <label htmlFor={q.id + '-purpose-edit'}>
                      Wat helpt deze vraag onderzoeken? (voor de auditor)
                      <Textarea id={q.id + '-purpose-edit'} value={q.purpose ?? ''} disabled={disabled}
                        maxLength={1000} onChange={e => editQuestion(q.id,{purpose:e.target.value})} />
                    </label>
                    <p className="cev-note">
                      Gebruik {"{{onderwerp}}"} waar uw onderzoekscontext hoort. Alleen dit niveau
                      wordt aangepast.
                    </p>
                    <label htmlFor={q.id + "-probe-edit"}>
                      Doorvraag
                      <Textarea
                        id={q.id + "-probe-edit"}
                        value={q.probes}
                        disabled={disabled}
                        maxLength={2000}
                        onChange={(e) => editQuestion(q.id, { probes: e.target.value })}
                      />
                    </label>
                  </div>
                )}
              </article>
              </DeferredViewerSection>
            );
          })}
          {!questions.length && (
            <p>
              {onlySelected ? 'Geen gekozen vragen in deze weergave. Zet ‘Alleen gekozen’ uit om vragen te bekijken.' : 'Geen vragen in deze weergave. Kies ‘Alle vragen’ of pas de toepasselijkheid aan.'}
            </p>
          )}
          <Button
            ref={addQuestionButton}
            variant="outline"
            disabled={disabled || (item.questions?.length ?? 0) >= 100}
            onClick={() => {
              // Never reuse a removed question's identity: an adopted copy may still be in the framework.
              const id = item.id + "-E" + crypto.randomUUID();
              setRemovalNotice('');
              onChange({
                items: model.items.map((i) =>
                  i.id !== item.id
                    ? i
                    : {
                        ...i,
                        questions: [
                          ...(i.questions ?? []),
                          {
                            id,
                            dimensionId: item.id,
                            indicatorId: indicatorId || item.indicators?.[0]?.id,
                            title: "Eigen vraag",
                            question: "",
                            probes: "",
                            variants: { operational: "", management: "", strategic: "" },
                            included: false,
                            origin: "user",
                            revision: "1.0",
                          },
                        ],
                      },
                ),
              });
              setOnlySelected(false);
              setEditing(id);
            }}
          >
            Eigen vraag toevoegen
          </Button>
          <output className="sr-only" >{removalNotice}</output>
        </section>
      </div>
      <details className="cev-sources">
        <summary>Bronnen en literatuur: wat betekent dit voor je onderzoek?</summary>
        <ul>
          {model.sources?.filter(s => !isCev || !cevLiterature.some(l => l.id === s.id)).map((s) => (
            <li key={s.id}>
              {s.url ? <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a> : <span>{s.title}</span>}
            </li>
          ))}
        </ul>
        {isCev && <div className="cev-literature-notes">
          {cevLiterature.map(s => <article key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
            <p>{s.contribution}</p>
            <p><strong>Voor je audit · eigen vertaalslag:</strong> {s.application}</p>
            <p className="cev-note">{s.limitation}</p>
          </article>)}
        </div>}
        {isCev && <p className="cev-note">Literatuurverkenning op basis van openbare samenvattingen en publicatiegegevens, niet van de volledige artikelteksten.</p>}
      </details>
    </section>
  );
}
