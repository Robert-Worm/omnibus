"use client";
import { useEffect, useState, type ComponentProps } from "react";
import type FoundationSourceReader from "./foundation-source-reader";
import { loadFoundationReader } from "./foundation-reader-loader.mjs";
import { Button } from "@/components/ui/button";

export type { FoundationReference } from "./foundation-source-reader";
type Props = ComponentProps<typeof FoundationSourceReader>;

/** Load reader code before mounting its existing catalogue/evidence boundary. */
export default function LazyFoundationReader(props: Props) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ Component?: typeof FoundationSourceReader; error?: string }>(
    {},
  );
  useEffect(() => {
    let current = true;
    loadFoundationReader().then(
      (module) => {
        if (current) setState({ Component: module.default });
      },
      () => {
        if (current)
          setState({
            error:
              "De bronviewer kon niet worden geladen. Je onderzoek en selecties zijn behouden.",
          });
      },
    );
    return () => {
      current = false;
    };
  }, [attempt]);
  if (state.Component) return <state.Component {...props} />;
  if (state.error)
    return (
      <div role="alert" className="report-source-status">
        <p>{state.error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setState({});
            setAttempt((n) => n + 1);
          }}
        >
          Opnieuw proberen
        </Button>
      </div>
    );
  return (
    <output aria-live="polite" className="report-source-status">
      Bronviewer laden…
    </output>
  );
}
