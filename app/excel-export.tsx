"use client";
import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { exportAuditXlsx } from "@/lib/excel-export.mjs";
import { excelMime, exportFields, exportThemes, auditWorkbookModel } from "@/lib/excel-model.mjs";
import { Checkbox } from "@/components/ui/checkbox";
import type { Framework, Draft } from "@/lib/framework-types";

export default function ExcelExport({
  framework,
  draft,
  disabled,
  onMarkdown,
}: {
  framework: Framework;
  draft: Draft;
  disabled: boolean;
  onMarkdown: () => void;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [meta, setMeta] = useState({
    version: "0.1",
    author: "",
    team: "",
    scope: "",
    change: "Eerste opzet",
  });
  const themes: { id: string; title: string; lineIds: string[] }[] = exportThemes(framework, draft);
  const [excludedThemes, setExcludedThemes] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>(
    exportFields.filter((f) => f.default).map((f) => f.id),
  );
  const [questions, setQuestions] = useState(true);
  const [notes, setNotes] = useState(false);
  const [accent, setAccent] = useState("blue");
  const choices = {
    themeIds: themes.filter((t) => !excludedThemes.includes(t.id)).map((t) => t.id),
    fields,
    questions,
    notes,
    accent,
  };
  const count = auditWorkbookModel(framework, draft, choices).selection.norms;
  async function save() {
    setBusy(true);
    setError("");
    try {
      const exportedAt = new Date().toISOString();
      const data = exportAuditXlsx(framework, draft, { ...meta, ...choices, exportedAt });
      const url = URL.createObjectURL(new Blob([new Uint8Array(data).buffer], { type: excelMime }));
      const a = document.createElement("a");
      a.href = url;
      const title =
        draft.title
          .replace(/[^\p{L}\p{N} _-]/gu, "")
          .trim()
          .slice(0, 80) || "Referentiekader";
      a.download =
        title +
        "-v" +
        meta.version.replace(/[^a-zA-Z0-9._-]/g, "_") +
        "-" +
        exportedAt.slice(0, 10) +
        ".xlsx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel-export is niet gelukt.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) setOpen(v);
      }}
    >
      <DialogTrigger render={<Button disabled={disabled} />}>
        <FileSpreadsheet size={17} />
        Exporteer Excel
      </DialogTrigger>
      <DialogContent className="excel-export-dialog">
        <DialogHeader>
          <DialogTitle>Referentiekader naar Excel</DialogTitle>
          <DialogDescription>Een bewerkbaar startpunt voor uw onderzoek.</DialogDescription>
        </DialogHeader>
        <div className="export-meta-grid">
          {(
            [
              ["version", "Versie"],
              ["author", "Naam"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <Input
                value={meta[key]}
                maxLength={100}
                onChange={(e) => setMeta((v) => ({ ...v, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="export-wide" htmlFor="export-scope">
            Onderwerp / proces
            <Textarea
              id="export-scope"
              value={meta.scope}
              maxLength={2000}
              onChange={(e) => setMeta((v) => ({ ...v, scope: e.target.value }))}
            />
          </label>
          <label className="export-wide" htmlFor="export-change">
            Wat is gewijzigd?
            <Input
              id="export-change"
              value={meta.change}
              maxLength={1000}
              onChange={(e) => setMeta((v) => ({ ...v, change: e.target.value }))}
            />
          </label>
        </div>
        <fieldset className="export-options">
          <legend>Teamleden voor de keuzelijsten</legend>
          <div className="export-meta-grid">
            {Array.from({ length: 5 }, (_, i) => (
              <label key={i} htmlFor={"export-team-" + i}>
                Teamlid {i + 1}
                <Input
                  id={"export-team-" + i}
                  maxLength={100}
                  value={meta.team.split("\n")[i] ?? ""}
                  onChange={(e) =>
                    setMeta((v) => {
                      const names = Array.from(
                        { length: 5 },
                        (_, j) => v.team.split("\n")[j] ?? "",
                      );
                      names[i] = e.target.value;
                      return { ...v, team: names.join("\n") };
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="export-options">
          <legend>Thema’s in deze export</legend>
          {themes.map((t) => (
            <label key={t.id}>
              <Checkbox
                checked={!excludedThemes.includes(t.id)}
                onCheckedChange={(checked) =>
                  setExcludedThemes((v) => (checked ? v.filter((id) => id !== t.id) : [...v, t.id]))
                }
              />
              {t.title}
            </label>
          ))}
          <small>{count} geselecteerde normen · uw referentiekader blijft ongewijzigd</small>
        </fieldset>
        <details className="export-customize">
          <summary>Indeling aanpassen</summary>
          <fieldset className="export-options">
            <legend>Kolommen in het referentiekader</legend>
            {exportFields.map((f) => (
              <label key={f.id}>
                <Checkbox
                  checked={fields.includes(f.id)}
                  disabled={f.id === "criterion"}
                  onCheckedChange={(checked) =>
                    setFields((v) => (checked ? [...v, f.id] : v.filter((id) => id !== f.id)))
                  }
                />
                {f.label}
              </label>
            ))}
          </fieldset>
          <p className="export-note">
            Bewijs en interviewvragen zijn voorstellen. Bevindingen en administratie blijven leeg.
          </p>
          <label className="export-check" htmlFor="export-questions">
            <Checkbox
              id="export-questions"
              checked={questions}
              onCheckedChange={(v) => setQuestions(Boolean(v))}
            />
            Vraagoverzicht als apart werkblad
          </label>
          <label className="export-check" htmlFor="export-notes">
            <Checkbox
              id="export-notes"
              checked={notes}
              onCheckedChange={(v) => setNotes(Boolean(v))}
            />
            Bestaande auditnotities opnemen
          </label>
          <label className="export-color">
            Accentkleur
            <select value={accent} onChange={(e) => setAccent(e.target.value)}>
              <option value="blue">Blauw</option>
              <option value="green">Groen</option>
              <option value="slate">Grijsblauw</option>
            </select>
          </label>
        </details>
        <p className="export-note">
          {questions ? "3" : "2"} werkbladen: Versiebeheer,{" "}
          {questions ? "Onderzoeksvragen en " : ""}Referentiekader. Het team houdt het wijzigingslog zelf
          bij. Excel-wijzigingen worden niet teruggelezen.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="export-actions">
          <Button
            disabled={busy || !meta.version.trim() || count === 0}
            onClick={() => void save()}
          >
            {busy ? "Excel maken…" : "Download Excel (.xlsx)"}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onMarkdown}>
            Tekstversie (.md)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
