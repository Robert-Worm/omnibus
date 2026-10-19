"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { interviewLevels } from "@/lib/interview-structure.mjs";
import type { LibraryItem, LibraryIndicator, LibraryQuestion } from "./model-library";

export default function ModelVariable({
  item,
  disabled,
  level,
  onChange,
}: {
  item: LibraryItem;
  disabled: boolean;
  level: string;
  onChange: (patch: Partial<LibraryItem>) => void;
}) {
  const indicators = item.indicators ?? [];
  const questions = item.questions ?? [];
  const count = questions.filter(
    (q) => q.included && indicators.some((i) => i.id === q.indicatorId && i.included),
  ).length;
  function editIndicator(id: string, patch: Partial<LibraryIndicator>) {
    onChange({ indicators: indicators.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }
  function editQuestion(id: string, patch: Partial<LibraryQuestion>) {
    onChange({
      questions: questions.map((q) =>
        q.id === id
          ? {
              ...q,
              ...patch,
              ...(Object.keys(patch).some((k) => k !== "included") ? { origin: "user" } : {}),
            }
          : q,
      ),
    });
  }
  function addQuestion(indicatorId: string) {
    let n = 1;
    while (questions.some((q) => q.id === item.id + "-E" + n)) n++;
    onChange({
      questions: [
        ...questions,
        {
          id: item.id + "-E" + n,
          dimensionId: item.id,
          indicatorId,
          title: "Eigen vraag",
          question: "",
          probes: "",
          variants: {},
          included: false,
          origin: "user",
          revision: "1.0",
        },
      ],
    });
  }
  return (
    <details className="model-variable">
      <summary>
        {item.title || "Nieuwe variabele"}{" "}
        <span className="creator-help">
          {indicators.length} {indicators.length===1?'indicator':'indicatoren'} · {count} {count===1?'vraag':'vragen'} gekozen
        </span>
      </summary>
      <label className="creator-check" htmlFor={item.id + "-enabled"}>
        <Checkbox
          id={item.id + "-enabled"}
          checked={item.included}
          disabled={disabled}
          onCheckedChange={(v) => onChange({ included: Boolean(v) })}
        />
        Variabele gebruiken
      </label>
      <details>
        <summary>Variabele beschrijven</summary>
        <label htmlFor={item.id + "-name"}>
          Naam
          <Input
            id={item.id + "-name"}
            value={item.title}
            disabled={disabled}
            maxLength={160}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </label>
        <small>
          {item.id}
          {item.originalTitle && " · Oorspronkelijke dimensie: " + item.originalTitle}
        </small>
      </details>
      {indicators.map((indicator) => (
        <details className="model-indicator" key={indicator.id}>
          <summary>
            {indicator.title || "Nieuwe indicator"}{" "}
            <span className="creator-help">
              {questions.filter((q) => q.indicatorId === indicator.id).length} vraagtemplates
            </span>
          </summary>
          <label className="creator-check" htmlFor={indicator.id + "-enabled"}>
            <Checkbox
              id={indicator.id + "-enabled"}
              disabled={disabled || !item.included}
              checked={indicator.included}
              onCheckedChange={(v) => editIndicator(indicator.id, { included: Boolean(v) })}
            />
            Indicator gebruiken
          </label>
          <p>{indicator.definition}</p>
          <p className="creator-help">
            {indicator.id} ·{" "}
            {indicator.origin === "published"
              ? "Indicator uit publicatie"
              : indicator.origin === "legacy"
                ? "Eerder bewaard; indeling te beoordelen"
                : "Eigen indicatorvoorstel — geen gevalideerd meetitem"}
          </p>
          <details>
            <summary>Indicator en bewijssuggesties aanpassen</summary>
            <label htmlFor={indicator.id + "-name"}>
              Naam indicator
              <Input
                id={indicator.id + "-name"}
                value={indicator.title}
                disabled={disabled}
                maxLength={200}
                onChange={(e) =>
                  editIndicator(indicator.id, { title: e.target.value, origin: "user" })
                }
              />
            </label>
            <label htmlFor={indicator.id + "-definition"}>
              Wat wilt u onderzoeken?
              <Textarea
                id={indicator.id + "-definition"}
                value={indicator.definition}
                disabled={disabled}
                maxLength={2000}
                onChange={(e) =>
                  editIndicator(indicator.id, { definition: e.target.value, origin: "user" })
                }
              />
            </label>
            <label htmlFor={indicator.id + "-documents"}>
              Documenten / cijfers die u kunt opvragen
              <Textarea
                id={indicator.id + "-documents"}
                value={indicator.documents}
                disabled={disabled}
                maxLength={2000}
                onChange={(e) =>
                  editIndicator(indicator.id, { documents: e.target.value, origin: "user" })
                }
              />
            </label>
            <label htmlFor={indicator.id + "-observation"}>
              Mogelijke observatie
              <Textarea
                id={indicator.id + "-observation"}
                value={indicator.observation}
                disabled={disabled}
                maxLength={2000}
                onChange={(e) =>
                  editIndicator(indicator.id, { observation: e.target.value, origin: "user" })
                }
              />
            </label>
          </details>
          <div className="model-question-options">
            {questions
              .filter((q) => q.indicatorId === indicator.id)
              .map((q) => (
                <article className="model-question-option" key={q.id}>
                  <label className="creator-check" htmlFor={q.id + "-enabled"}>
                    <Checkbox
                      id={q.id + "-enabled"}
                      disabled={disabled || !item.included || !indicator.included}
                      checked={q.included}
                      onCheckedChange={(v) => editQuestion(q.id, { included: Boolean(v) })}
                    />
                    <span>
                      <strong>{q.title}</strong>
                      <span className="model-question-text">
                        {q.variants?.[level] ||
                          "Voor dit interviewniveau ontbreekt nog een formulering."}
                      </span>
                    </span>
                  </label>
                  <details>
                    <summary>Niveauvarianten en doorvragen aanpassen</summary>
                    <small>
                      {q.id} ·{" "}
                      {q.origin === "user"
                        ? "Eigen / aangepaste vraag"
                        : "Voorbereid vraagvoorstel"}
                    </small>
                    <label htmlFor={q.id + "-name"}>
                      Naam vraagtemplate
                      <Input
                        id={q.id + "-name"}
                        value={q.title}
                        disabled={disabled}
                        maxLength={200}
                        onChange={(e) => editQuestion(q.id, { title: e.target.value })}
                      />
                    </label>
                    {interviewLevels.map((l) => (
                      <label key={l.id} htmlFor={q.id + "-" + l.id}>
                        {l.label}
                        <Textarea
                          id={q.id + "-" + l.id}
                          value={q.variants?.[l.id] ?? ""}
                          disabled={disabled}
                          maxLength={2000}
                          placeholder="Nog te formuleren — geen automatische vervanging"
                          onChange={(e) =>
                            editQuestion(q.id, {
                              variants: { ...q.variants, [l.id]: e.target.value },
                              ...(l.id === "operational" ? { question: e.target.value } : {}),
                            })
                          }
                        />
                      </label>
                    ))}
                    <label htmlFor={q.id + "-probes"}>
                      Aanvullende doorvraag
                      <Textarea
                        id={q.id + "-probes"}
                        value={q.probes}
                        disabled={disabled}
                        maxLength={2000}
                        onChange={(e) => editQuestion(q.id, { probes: e.target.value })}
                      />
                    </label>
                    <label>
                      Onderbrengen bij indicator
                      <select
                        value={q.indicatorId}
                        disabled={disabled}
                        onChange={(e) => editQuestion(q.id, { indicatorId: e.target.value })}
                      >
                        {indicators.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </details>
                </article>
              ))}
          </div>
          <Button
            variant="outline"
            disabled={disabled || questions.length >= 100}
            onClick={() => addQuestion(indicator.id)}
          >
            Vraagtemplate toevoegen
          </Button>
        </details>
      ))}
      <Button
        variant="outline"
        disabled={disabled || indicators.length >= 100}
        onClick={() => {
          let n = 1;
          while (indicators.some((i) => i.id === item.id + "-I" + n)) n++;
          onChange({
            indicators: [
              ...indicators,
              {
                id: item.id + "-I" + n,
                title: "Nieuwe indicator",
                definition: "",
                documents: "",
                observation: "",
                included: false,
                origin: "user",
              },
            ],
          });
        }}
      >
        Indicator toevoegen
      </Button>
    </details>
  );
}
