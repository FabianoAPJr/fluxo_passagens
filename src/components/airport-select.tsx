"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AIRPORTS, findAirport, searchAirports, type Airport } from "@/lib/airports";

interface AirportSelectProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  ariaInvalid?: boolean;
}

export function AirportSelect({ id, value, onChange, placeholder, ariaInvalid }: AirportSelectProps) {
  const selected = value ? findAirport(value) : undefined;
  const [query, setQuery] = useState(selected ? formatInput(selected) : "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setQuery(selected ? formatInput(selected) : "");
  }, [value]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || (selected && query === formatInput(selected))) {
      return AIRPORTS;
    }
    return searchAirports(trimmed, 80);
  }, [query, selected]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected ? formatInput(selected) : "");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, selected]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLLIElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function selectAirport(airport: Airport) {
    onChange(airport.code);
    setQuery(formatInput(airport));
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[highlight]) {
        e.preventDefault();
        selectAirport(results[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected ? formatInput(selected) : "");
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={query}
        placeholder={placeholder ?? "Busque por código ou cidade"}
        autoComplete="off"
        aria-invalid={ariaInvalid}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("");
        }}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-input bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {results.map((a, i) => (
            <li
              key={a.code}
              role="option"
              aria-selected={value === a.code}
              data-index={i}
              className={cn(
                "cursor-pointer px-2.5 py-1.5 text-sm",
                i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectAirport(a);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className="font-semibold">{a.code}</span>
              <span className="text-muted-foreground"> – {a.name}</span>
              <span className="ml-1 text-xs text-muted-foreground">({a.city}, {a.country})</span>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Nenhum aeroporto encontrado.
        </div>
      )}
    </div>
  );
}

function formatInput(a: Airport): string {
  return `${a.code} - ${a.name}`;
}
