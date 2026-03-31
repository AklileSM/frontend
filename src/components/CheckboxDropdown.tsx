import React, { useEffect, useRef, useState } from 'react';

interface CheckboxDropdownProps {
  label: string;
  options: string[];
  hidden: Set<string>;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const CheckboxDropdown: React.FC<CheckboxDropdownProps> = ({
  label,
  options,
  hidden,
  onToggle,
  onSelectAll,
  onClearAll,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visibleCount = options.length - hidden.size;
  const allSelected = hidden.size === 0;
  const noneSelected = hidden.size === options.length;

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
          ${open
            ? 'border-primary bg-primary text-white'
            : 'border-stroke bg-white text-black hover:border-primary hover:text-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:border-primary dark:hover:text-primary'
          }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {/* Filter icon */}
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
        </svg>
        <span>{label}</span>
        {/* Badge */}
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none transition-colors
          ${open ? 'bg-white/20 text-white' : 'bg-primary text-white'}`}>
          {visibleCount}/{options.length}
        </span>
        {/* Chevron */}
        <svg
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-[9999] mt-2 w-52 overflow-hidden rounded-xl border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-gray-800"
          role="listbox"
        >
          {/* Header actions row */}
          <div className="flex items-stretch border-b border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/40">
            <label className="flex flex-1 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allSelected && !noneSelected;
                }}
                onChange={(e) => {
                  if (e.target.checked) onSelectAll();
                  else onClearAll();
                }}
                className="h-3.5 w-3.5 accent-primary"
              />
              Select all
            </label>
            <button
              type="button"
              onClick={onClearAll}
              className="border-l border-stroke dark:border-strokedark px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-400 hover:text-danger dark:text-gray-500 dark:hover:text-danger transition-colors"
            >
              None
            </button>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((opt) => {
              const checked = !hidden.has(opt);
              return (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors
                    ${checked
                      ? 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary font-medium'
                      : 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4'
                    }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors
                    ${checked
                      ? 'border-primary bg-primary'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    }`}>
                    {checked && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(opt)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckboxDropdown;
