"use client";
import "./research-builder.css";
import { Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
export default function FullTextPreview({
  text,
  label,
  onOpen,
  suspended = false,
  preview,
  eyeLabel,
}: {
  text: string;
  label: string;
  onOpen: () => void;
  suspended?: boolean;
  preview?: { label: string; text: string; basis: string }[];
  eyeLabel?: string;
}) {
  return (
    <div className="full-text-preview">
      <button type="button" className="full-text-trigger" aria-label={label} onClick={onOpen}>
        <span className="cell-preview">{text || "Nog in te vullen"}</span>
      </button>
      <TooltipProvider delay={500}>
        <Tooltip disabled={suspended}>
          <TooltipTrigger
            className="preview-eye"
            data-no-drag
            data-no-drop
            aria-label={eyeLabel ?? label + " — volledige tekst"}
            onClick={onOpen}
          >
            <Eye size={17} aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="full-text-popup">
            {preview ? (
              <div className="norm-preview">
                <strong>{text}</strong>
                <dl>
                  {preview.map((field, i) => (
                    <div key={i}>
                      <dt>
                        {field.label} <small>{field.basis}</small>
                      </dt>
                      <dd>{field.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <span>{text || "Nog in te vullen"}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
