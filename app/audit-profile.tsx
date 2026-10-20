"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import {
  perspectives,
  auditKinds,
  auditLevels,
  defaultProfile,
  normalizeProfile,
  profileActive,
  relevance,
} from "@/lib/audit-relevance.mjs";
import { labels, basisLabels } from "@/lib/framework-model.mjs";
import type { Line } from "@/lib/framework-types";
export type AuditProfile = {
  perspective: string;
  kind: string;
  level: string;
  strongOnly: boolean;
  sort: string;
};
export function AuditProfilePicker({
  value,
  onChange,
}: {
  value: AuditProfile;
  onChange: (p: AuditProfile) => void;
}) {
  const [open, setOpen] = useState(false),
    p = normalizeProfile(value);
  const short =
    (
      [
        [p.perspective, perspectives],
        [p.kind, auditKinds],
        [p.level, auditLevels],
      ] as const
    )
      .filter(([id]) => id !== "all")
      .map(([id, options]) => options.find(([key]: string[]) => key === id)?.[1])
      .join(" · ") || "Alle perspectieven";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" className="profile-trigger" />}>
        Auditprofiel: {short}
      </PopoverTrigger>
      <PopoverContent className="audit-profile-panel" align="start">
        <PopoverTitle>Auditprofiel</PopoverTitle>
        <p className="profile-caption">
          Rangschik de normen voor uw onderzoek. Uw referentiekader blijft ongewijzigd.
        </p>
        {(
          [
            ["perspective", "Perspectief", perspectives],
            ["kind", "Onderzoekssoort", auditKinds],
            ["level", "Onderzocht organisatieniveau", auditLevels],
          ] as const
        ).map(([key, title, options]) => (
          <label className="profile-select" key={key}>
            {title}
            <select
              aria-label={title}
              value={p[key]}
              onChange={(e) => onChange({ ...p, [key]: e.target.value })}
            >
              {options.map(([id, name]: string[]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="profile-select">
          Volgorde
          <select
            aria-label="Volgorde normen"
            value={p.sort}
            onChange={(e) => onChange({ ...p, sort: e.target.value })}
          >
            <option value="relevance">Meest passend eerst</option>
            <option value="original">Oorspronkelijke volgorde</option>
          </select>
        </label>
        <label className="profile-check" htmlFor="profile-strong-only">
          <Checkbox
            id="profile-strong-only"
            checked={p.strongOnly}
            disabled={!profileActive(p)}
            onCheckedChange={(v) => onChange({ ...p, strongOnly: Boolean(v) })}
          />
          <span>Alleen sterk passend</span>
        </label>
        <p className="profile-caption">
          AI-inschatting van bruikbaarheid, geen oordeel over normgeldigheid. Nieuwe of gewijzigde
          teksten blijven onbeoordeeld.
        </p>
        <div className="profile-actions">
          <Button variant="ghost" onClick={() => onChange({ ...defaultProfile })}>
            Profiel wissen
          </Button>
          <Button onClick={() => setOpen(false)}>Gereed</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
export function RelevancePreview({
  line,
  profile,
  onOpen,
}: {
  line: Line;
  profile: AuditProfile;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const a = relevance(line, profile);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className={"relevance-badge " + a.status}
            aria-label={"Waarom passend: " + line.id}
          />
        }
      >
        {a.label}{" "}
        <Info className="relevance-info-icon" size={16} strokeWidth={2} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="relevance-panel" align="start">
        <PopoverTitle>Waarom passend?</PopoverTitle>
        <p className="profile-caption">
          AI-inschatting · 6 september 2026 · {a.rubricVersion} · brontekst, niet uw bewerkingen
        </p>
        <p>{a.reason}</p>
        <dl>
          {a.fields.map((f: { key: string; label: string; basis: string; reason: string }) => (
            <div key={f.key}>
              <dt>{(labels as Record<string, string>)[f.key]}</dt>
              <dd>
                {f.label}
                <small>{(basisLabels as Record<string, string>)[f.basis]}</small>
              </dd>
            </div>
          ))}
        </dl>
        <p className="profile-caption">
          Sterk passend betekent inhoudelijk bruikbaar. Grondslag, periode en toepasselijkheid
          moeten voor uw audit nog worden bevestigd.
        </p>
        <details className="profile-method">
          <summary>Hoe is dit beoordeeld?</summary>
          <p>
            AI-beoordeling van deze 20 brononderdelen: perspectief, onderzoekssoort en
            organisatiecontext. Het minst passende kernveld begrenst de rijbeoordeling; er worden
            geen percentages gemiddeld. Dit is geen door ADR of Rekenkamer vastgesteld kader.
          </p>
          <p>
            <a
              href="https://www.rijksoverheid.nl/themas/overheid-en-democratie/rijksoverheid/auditbeleid/auditdiensten"
              target="_blank"
              rel="noreferrer"
            >
              Taken ADR
            </a>{" "}
            ·{" "}
            <a
              href="https://www.rekenkamer.nl/over-de-algemene-rekenkamer/positie-en-bevoegdheden"
              target="_blank"
              rel="noreferrer"
            >
              Positie Rekenkamer
            </a>
          </p>
        </details>
        <div className="profile-actions">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Sluiten
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
          >
            Bekijk tekst en bronnen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
