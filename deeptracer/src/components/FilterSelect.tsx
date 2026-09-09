"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type FilterOption<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: Array<FilterOption<T>>;
  onChange: (value: T) => void;
}

export default function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!selected || options.length === 0) return null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-md border border-zinc-800/80 bg-[#111113] px-2.5 py-2 text-[12px] text-zinc-300 hover:border-zinc-700"
      >
        <span className="shrink-0 text-zinc-600">{label}</span>
        {selected.icon}
        <span className="min-w-0 truncate">{selected.label}</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 4.25 6 7.75l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-30 mt-1 max-h-64 min-w-full overflow-y-auto rounded-md border border-zinc-800 bg-[#141416] py-1 shadow-xl"
        >
          {options.map((option) => {
            const active = option.id === value;
            return (
              <li key={option.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-left text-[12px] ${
                    active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
