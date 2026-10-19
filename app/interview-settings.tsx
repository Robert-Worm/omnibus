"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { interviewLevels } from "@/lib/interview-structure.mjs";
import type { LibraryModel } from "./model-library";
export type InterviewSettingsValue = {
  levels: string[];
  starr: boolean;
  triangulation: boolean;
  overrides: Record<string, { starr?: boolean; triangulation?: boolean }>;
};
export default function InterviewSettings({
  model,
  value,
  onChange,
  fixedSelection = false,
}: {
  model: LibraryModel;
  value: InterviewSettingsValue;
  onChange: (value: InterviewSettingsValue) => void;
  fixedSelection?: boolean;
}) {
  const selected = model.items
    .filter((i) => i.included)
    .flatMap((i) =>
      (i.questions ?? []).filter(
        (q) => q.included && i.indicators?.some((d) => d.id === q.indicatorId && d.included),
      ),
    );
  const fixedLevels = fixedSelection || (selected.length > 0 && selected.every(q => q.selectedLevels !== undefined));
  return (
    <section className="interview-settings" aria-label="Interview instellen">
      {fixedLevels ? <p className="creator-help">De gekozen vragen behouden hun gespreksniveau en formulering uit Modellen.</p> : <fieldset>
        <legend>Met wie spreekt u?</legend>
        <p className="creator-help">
          Kies niveaus voor vragen zonder vast gespreksniveau. Modelvragen die per niveau zijn gekozen behouden die keuze. Eigen vragen
          behouden uw formulering; pas ze zo nodig aan voor uw gesprekspartner.
        </p>
        {interviewLevels.map((l) => (
          <label className="creator-check" key={l.id} htmlFor={"interview-level-" + l.id}>
            <Checkbox
              id={"interview-level-" + l.id}
              checked={value.levels.includes(l.id)}
              onCheckedChange={(v) =>
                onChange({
                  ...value,
                  levels: v ? [...value.levels, l.id] : value.levels.filter((id) => id !== l.id),
                })
              }
            />
            {l.label}
          </label>
        ))}
      </fieldset>}
      <fieldset>
        <legend>Ondersteuning tijdens het gesprek</legend>
        <label className="creator-check" htmlFor="interview-starr">
          <Checkbox
            id="interview-starr"
            checked={value.starr}
            onCheckedChange={(v) => onChange({ ...value, starr: Boolean(v) })}
          />
          STARR — doorvragen op een concrete ervaring
        </label>
        <label className="creator-check" htmlFor="interview-triangulation">
          <Checkbox
            id="interview-triangulation"
            checked={value.triangulation}
            onCheckedChange={(v) => onChange({ ...value, triangulation: Boolean(v) })}
          />
          Triangulatie — documenten en observaties ter verificatie
        </label>
      </fieldset>
      {selected.length > 0 && (
        <details>
          <summary>Per vraag afwijken ({selected.length})</summary>
          <p className="creator-help">
            Laat op ‘Standaard’ staan om bovenstaande instellingen te volgen.
          </p>
          {selected.map((q) => (
            <div className="interview-override" key={q.id}>
              <p>
                <strong>{q.title}</strong>
                <br />
                {q.question || "Formulering verschilt per niveau"}
              </p>
              {(["starr", "triangulation"] as const).map((key) => (
                <label key={key}>
                  {key === "starr" ? "STARR" : "Triangulatie"}
                  <select
                    value={
                      value.overrides[q.id]?.[key] === undefined
                        ? "inherit"
                        : value.overrides[q.id][key]
                          ? "on"
                          : "off"
                    }
                    onChange={(e) => {
                      const patch = { ...value.overrides[q.id] };
                      if (e.target.value === "inherit") delete patch[key];
                      else patch[key] = e.target.value === "on";
                      onChange({ ...value, overrides: { ...value.overrides, [q.id]: patch } });
                    }}
                  >
                    <option value="inherit">Standaard</option>
                    <option value="on">Aan</option>
                    <option value="off">Uit</option>
                  </select>
                </label>
              ))}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
