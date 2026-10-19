"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from "@/components/ui/popover";
export default function FilterPicker({
  label,
  options,
  value,
  onChange,
  subtle = false,
}: {
  label: string;
  options: { id: string; title: string; count?: number }[];
  value: string[];
  onChange: (ids: string[]) => void;
  subtle?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open,setOpen]=useState(false);
  return (
    <div className={`filter-picker${subtle?' filter-picker-subtle':''}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant={subtle?'ghost':'outline'} />}>
          {label}
          {!subtle&&value.length ? ` (${value.length})` : ""}
        </PopoverTrigger>
        <PopoverContent className="navigation-filter" align="start">
          <PopoverTitle>{label}</PopoverTitle>
          {options.length>8&&<Input
            aria-label={"Zoek " + label.toLowerCase()}
            placeholder="Zoek…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />}
          <div className="filter-options">
            {options
              .filter((o) =>
                options.length <= 8 || o.title.toLocaleLowerCase("nl").includes(query.toLocaleLowerCase("nl")),
              )
              .map((o) => (
                <label className="filter-option" key={o.id} data-selected={value.includes(o.id)}>
                  <Checkbox
                    checked={value.includes(o.id)}
                    onCheckedChange={(v) =>
                      onChange(v ? [...value, o.id] : value.filter((id) => id !== o.id))
                    }
                  />
                  <span className="filter-option-label">{o.title}</span>
                  {o.count !== undefined && <small>{o.count}</small>}
                </label>
              ))}
          </div>
          {value.length > 0 && (
            <Button variant="ghost" onClick={() => onChange([])}>
              {label==='Kolommen'?'Alle optionele kolommen verbergen':'Filters wissen'}
            </Button>
          )}
          <Button variant="outline" onClick={()=>setOpen(false)}>Gereed</Button>
        </PopoverContent>
      </Popover>
      {!subtle&&value.map((id) => (
        <Button
          key={id}
          variant="ghost"
          className="active-filter"
          aria-label={"Verwijder filter " + (options.find((o) => o.id === id)?.title ?? id)}
          onClick={() => onChange(value.filter((x) => x !== id))}
        >
          {options.find((o) => o.id === id)?.title ?? id} ×
        </Button>
      ))}
    </div>
  );
}
